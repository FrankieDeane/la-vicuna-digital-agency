// Blobs del monitor The North Face en Mercado Libre (store "tnf-ml").
//   dia/AAAA-MM-DD    trabajo completo del día (ver lib/tnf-ml.js)
//   serie/AAAA-MM-DD  resumen compacto del día, para la evolución de puestos y precios
//   vendedores        apodos y reputación de vendedores (cache de 30 días)

const { getStore, connectLambda } = require('@netlify/blobs');
const { estadoNuevo, serie, VERSION } = require('./tnf-ml');

function tiendaTnf(event) {
  connectLambda(event);
  return getStore({ name: 'tnf-ml', consistency: 'strong' });
}

const leer = (store, clave) => store.get(clave, { type: 'json' }).catch(() => null);

async function leerDia(store, fecha) {
  const st = await leer(store, 'dia/' + fecha);
  return st && st.version === VERSION ? st : null;
}

async function guardar(store, st, cache, cacheCambio) {
  await store.setJSON('dia/' + st.fecha, st);
  if (st.listo) await store.setJSON('serie/' + st.fecha, serie(st));
  if (cacheCambio) await store.setJSON('vendedores', cache);
}

module.exports = { tiendaTnf, leer, leerDia, guardar, estadoNuevo };
