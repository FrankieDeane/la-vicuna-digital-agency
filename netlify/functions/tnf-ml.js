// Datos del demo The North Face en Mercado Libre para /automatizaciones (lógica en lib/tnf-ml.js).
//
// GET  [?fecha=AAAA-MM-DD]  → { vista, historia: [{ fecha, p, r }], fechas }   (público: es un demo)
//      Sin fecha, el último día relevado. La historia son los últimos 60 días.
//      Si todavía no hay relevamientos → { vacio: true } y la página muestra datos de ejemplo.
// POST { estado?, reiniciar? } → avanza el relevamiento de hoy ~8 s. El navegador repite el POST hasta que listo = true.
//      Público: botón "Actualizar datos". Solo releva The North Face (la marca no viene del navegador), usa el
//      estado guardado en el servidor, no puede reiniciar un día ya completo y tiene límite por IP y por día.
//      Admin: además puede mandar el estado y reiniciar.

const { avanzar, vista, hoyAR, VERSION } = require('./lib/tnf-ml');
const { tiendaTnf, leer, leerDia, guardar, estadoNuevo, hayQueRehacer } = require('./lib/tnf-ml-tienda');
const { esAdmin } = require('./lib/admin-auth');
const crypto = require('crypto');
const { accessToken, tokenDeApp } = require('./lib/meli-api');

const PRESUPUESTO_MS = 8000;
const DIAS_HISTORIA = 60;
const MAX_POST_IP_DIA = 60;      // un relevamiento completo son ~10-25 pasos
const MAX_POST_TOTAL_DIA = 300;
const esFecha = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const responder = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

async function dentroDelLimite(store, event, fecha) {
  const ip = String(event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'sin-ip').split(',')[0].trim();
  const claves = [
    'pub/' + fecha + '/ip-' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24),
    'pub/' + fecha + '/total',
  ];
  const topes = [MAX_POST_IP_DIA, MAX_POST_TOTAL_DIA];
  const cuentas = await Promise.all(claves.map(k => leer(store, k)));
  if (cuentas.some((c, i) => ((c && c.n) || 0) >= topes[i])) return false;
  await Promise.all(claves.map((k, i) => store.setJSON(k, { n: ((cuentas[i] && cuentas[i].n) || 0) + 1 })));
  return true;
}

// GET ?diag=1 → qué responde Mercado Libre (sin mostrar tokens ni claves): variables cargadas,
// token de la cuenta conectada, token de la app y 3 consultas de prueba con y sin token.
async function diagnostico(event) {
  const r = {
    variables: { MELI_CLIENT_ID: !!process.env.MELI_CLIENT_ID, MELI_CLIENT_SECRET: !!process.env.MELI_CLIENT_SECRET, MELI_REFRESH_TOKEN: !!process.env.MELI_REFRESH_TOKEN },
  };
  let token = null;
  try { const t = await accessToken(event); token = t.token; r.token = { ok: true, cuenta: t.userId || 'app (sin cuenta)' }; }
  catch (e) { r.token = { ok: false, error: e.message }; }
  try { await tokenDeApp(); r.tokenDeApp = { ok: true }; }
  catch (e) { r.tokenDeApp = { ok: false, error: e.message }; }
  const pruebas = {
    busqueda: '/sites/MLA/search?q=campera&limit=1',
    masVendidos: '/highlights/MLA/category/MLA109096',
    catalogo: '/products/search?status=active&site_id=MLA&q=campera%20the%20north%20face&limit=1',
  };
  r.pruebas = {};
  for (const [nombre, ruta] of Object.entries(pruebas)) {
    const prueba = async conToken => {
      try {
        const res = await fetch('https://api.mercadolibre.com' + ruta, {
          headers: { Accept: 'application/json', ...(conToken ? { Authorization: `Bearer ${token}` } : {}) },
          signal: AbortSignal.timeout(6000),
        });
        const cuerpo = res.ok ? {} : await res.json().catch(() => ({}));
        return res.ok ? 'OK' : `HTTP ${res.status} ${cuerpo.message || cuerpo.error || ''}`.trim();
      } catch (e) { return 'falló: ' + e.message; }
    };
    r.pruebas[nombre] = { conToken: token ? await prueba(true) : 'sin token', sinToken: await prueba(false) };
  }
  // De dónde sale el precio de un producto de catálogo: buy box o publicaciones que compiten
  try {
    const h = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const get = ruta => fetch('https://api.mercadolibre.com' + ruta, { headers: h, signal: AbortSignal.timeout(6000) })
      .then(async res => ({ status: res.status, cuerpo: await res.json().catch(() => ({})) }));
    const bus = await get(pruebas.catalogo.replace('limit=1', 'limit=5'));
    r.precio = [];
    for (const p of (bus.cuerpo.results || []).slice(0, 5)) {
      const d = await get(`/products/${p.id}`);
      const v = await get(`/products/${p.id}/items?limit=5`);
      r.precio.push({
        producto: p.id,
        detalle: d.status === 200 ? 'OK' : `HTTP ${d.status} ${d.cuerpo.message || ''}`.trim(),
        buyBox: d.cuerpo.buy_box_winner ? d.cuerpo.buy_box_winner.price : null,
        publicaciones: v.status === 200 ? (v.cuerpo.results || []).map(x => x.price) : `HTTP ${v.status} ${v.cuerpo.message || ''}`.trim(),
      });
    }
  } catch (e) { r.precio = 'falló: ' + e.message; }
  return r;
}

exports.handler = async (event) => {
  const t0 = Date.now();
  const admin = esAdmin(event);
  let store;
  try {
    store = tiendaTnf(event);
  } catch (e) {
    return responder(503, { error: 'Netlify Blobs no está disponible: ' + e.message });
  }

  try {
    if (event.httpMethod === 'GET' && (event.queryStringParameters || {}).diag) {
      if (!admin && !(await dentroDelLimite(store, event, hoyAR()))) {
        return responder(429, { error: 'Hoy ya se usó mucho. Probá mañana.' });
      }
      return responder(200, await diagnostico(event));
    }

    if (event.httpMethod === 'GET') {
      // Solo días completos: la serie se guarda recién cuando el relevamiento del día terminó
      const { blobs: series = [] } = (await store.list({ prefix: 'serie/' })) || {};
      const fechas = series.map(b => b.key.slice(6)).filter(esFecha).sort();
      const pedida = (event.queryStringParameters || {}).fecha;
      const fecha = esFecha(pedida) && fechas.includes(pedida) ? pedida : fechas[fechas.length - 1];
      if (!fecha) return responder(200, { vacio: true, fechas: [] });

      const claves = fechas.slice(-DIAS_HISTORIA).map(f => 'serie/' + f);
      const [st, ...historia] = await Promise.all([leerDia(store, fecha), ...claves.map(k => leer(store, k))]);
      if (!st) return responder(200, { vacio: true, fechas });
      // Sin caché: después de relevar, la página vuelve a pedir estos datos y tiene que ver los nuevos
      return responder(200, { vista: vista(st), historia: historia.filter(Boolean), fechas });
    }

    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });

    const body = JSON.parse(event.body || '{}');
    const fecha = hoyAR();

    // Público: límites por IP y por día, para que el botón no se use para gastar la cuota de Mercado Libre
    if (!admin && !(await dentroDelLimite(store, event, fecha))) {
      return responder(429, { error: 'Hoy ya se usó mucho este botón. Probá de nuevo mañana.' });
    }

    // Sin cuenta conectada no se corta: el motor sigue con las páginas públicas de Mercado Libre
    const [guardado, cache] = await Promise.all([leerDia(store, fecha), leer(store, 'vendedores')]);
    let st = guardado;
    const enviado = body.estado;
    if (admin && enviado && enviado.version === VERSION && enviado.fecha === fecha &&
        (!st || String(enviado.actualizado || '') >= String(st.actualizado || ''))) st = enviado;
    const rehacer = await hayQueRehacer(event, st);
    if (!admin && st && st.listo && (st.ranking || []).length && !rehacer) {
      return responder(200, { vista: vista(st), yaListo: true });
    }
    if (!st || (admin && body.reiniciar) || rehacer || (st.listo && !(st.ranking || []).length)) st = estadoNuevo(fecha);

    const cacheV = cache || {};
    if (!st.listo) {
      const { cacheCambio } = await avanzar({ event, st, cache: cacheV, presupuestoMs: PRESUPUESTO_MS - (Date.now() - t0) });
      await guardar(store, st, cacheV, cacheCambio);
    }
    return responder(200, admin ? { estado: st, vista: vista(st) } : { vista: vista(st) });
  } catch (e) {
    return responder(500, { error: e.message });
  }
};
