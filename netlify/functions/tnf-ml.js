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
const { tiendaTnf, leer, leerDia, guardar, estadoNuevo } = require('./lib/tnf-ml-tienda');
const { esAdmin } = require('./lib/admin-auth');
const crypto = require('crypto');

const PRESUPUESTO_MS = 8000;
const DIAS_HISTORIA = 60;
const MAX_POST_IP_DIA = 60;      // un relevamiento completo son ~10-25 pasos
const MAX_POST_TOTAL_DIA = 300;
const esFecha = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const responder = (statusCode, body, cache) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cache || 'no-store' },
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
    if (event.httpMethod === 'GET') {
      // Solo días completos: la serie se guarda recién cuando el relevamiento del día terminó
      const { blobs: series = [] } = (await store.list({ prefix: 'serie/' })) || {};
      const fechas = series.map(b => b.key.slice(6)).filter(esFecha).sort();
      const pedida = (event.queryStringParameters || {}).fecha;
      const fecha = esFecha(pedida) && fechas.includes(pedida) ? pedida : fechas[fechas.length - 1];
      if (!fecha) return responder(200, { vacio: true, fechas: [] }, 'public, max-age=300');

      const claves = fechas.slice(-DIAS_HISTORIA).map(f => 'serie/' + f);
      const [st, ...historia] = await Promise.all([leerDia(store, fecha), ...claves.map(k => leer(store, k))]);
      if (!st) return responder(200, { vacio: true, fechas }, 'public, max-age=300');
      return responder(200, { vista: vista(st), historia: historia.filter(Boolean), fechas }, 'public, max-age=900');
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
    if (!admin && st && st.listo && (st.ranking || []).length) {
      return responder(200, { vista: vista(st), yaListo: true });
    }
    if (!st || (admin && body.reiniciar) || (st.listo && !(st.ranking || []).length)) st = estadoNuevo(fecha);

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
