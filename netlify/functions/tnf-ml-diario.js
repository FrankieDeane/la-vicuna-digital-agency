// Corrida programada del monitor The North Face en Mercado Libre (ver lib/tnf-ml.js).
// netlify.toml la dispara cada 15 minutos entre las 9 y las 11:45 (hora argentina):
// la primera arranca el relevamiento del día y las siguientes lo terminan si quedó
// a medias. Si ya está listo, no hace nada. Sin cuenta de ML conectada, usa las páginas públicas.

const { avanzar, hoyAR } = require('./lib/tnf-ml');
const { tiendaTnf, leer, leerDia, guardar, estadoNuevo } = require('./lib/tnf-ml-tienda');

const PRESUPUESTO_MS = 22000; // las funciones programadas cortan a los 30 s

exports.handler = async (event) => {
  const t0 = Date.now();
  try {
    const store = tiendaTnf(event);
    const fecha = hoyAR();
    const [st0, cache] = await Promise.all([leerDia(store, fecha), leer(store, 'vendedores')]);
    const sinRanking = st0 && st0.listo && !(st0.ranking || []).length;
    let st = st0;
    if (!st0 || (sinRanking && (st0.rehechos || 0) < 3)) {
      st = estadoNuevo(fecha);
      if (sinRanking) st.rehechos = (st0.rehechos || 0) + 1;
    }
    if (st.listo) return { statusCode: 200, body: JSON.stringify({ ok: true, fecha, yaEstaba: true }) };
    const cacheV = cache || {};
    const { cacheCambio } = await avanzar({ event, st, cache: cacheV, presupuestoMs: PRESUPUESTO_MS - (Date.now() - t0) });
    await guardar(store, st, cacheV, cacheCambio);
    console.log(`tnf-ml ${fecha}: paso ${st.paso}, listo ${st.listo}, ${st.llamadas} llamadas, ${st.errores.length} errores`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, fecha, paso: st.paso, listo: st.listo }) };
  } catch (e) {
    console.error('tnf-ml-diario:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
