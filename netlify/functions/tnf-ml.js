// Datos del demo The North Face en Mercado Libre para /automatizaciones (lógica en lib/tnf-ml.js).
//
// GET  [?fecha=AAAA-MM-DD]  → { vista, historia: [{ fecha, p, r }], fechas }   (público: es un demo)
//      Sin fecha, el último día relevado. La historia son los últimos 60 días.
//      Si todavía no hay relevamientos → { vacio: true } y la página muestra datos de ejemplo.
// POST { estado?, reiniciar? } → solo admin: avanza el relevamiento de hoy ~8 s y devuelve { estado, vista }.
//      El navegador repite el POST (mandando el estado que recibió) hasta que listo = true.

const { avanzar, vista, hoyAR, VERSION } = require('./lib/tnf-ml');
const { tiendaTnf, leer, leerDia, guardar, estadoNuevo } = require('./lib/tnf-ml-tienda');
const { accessToken } = require('./lib/meli-api');
const { esAdmin } = require('./lib/admin-auth');

const PRESUPUESTO_MS = 8000;
const DIAS_HISTORIA = 60;
const esFecha = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const responder = (statusCode, body, cache) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cache || 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const t0 = Date.now();
  if (event.httpMethod === 'POST' && !esAdmin(event)) return responder(401, { error: 'Solo el admin puede relevar.' });
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
    try { await accessToken(event); } catch (e) {
      return responder(200, { sinCuenta: true, detalle: e.message });
    }
    const [guardado, cache] = await Promise.all([leerDia(store, fecha), leer(store, 'vendedores')]);
    let st = guardado;
    const enviado = body.estado;
    if (enviado && enviado.version === VERSION && enviado.fecha === fecha &&
        (!st || String(enviado.actualizado || '') >= String(st.actualizado || ''))) st = enviado;
    if (!st || body.reiniciar || (st.listo && !(st.ranking || []).length)) st = estadoNuevo(fecha);

    const cacheV = cache || {};
    if (!st.listo) {
      const { cacheCambio } = await avanzar({ event, st, cache: cacheV, presupuestoMs: PRESUPUESTO_MS - (Date.now() - t0) });
      await guardar(store, st, cacheV, cacheCambio);
    }
    return responder(200, { estado: st, vista: vista(st) });
  } catch (e) {
    return responder(500, { error: e.message });
  }
};
