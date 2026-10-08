// Blobs del monitor The North Face en Mercado Libre (store "tnf-ml").
//   dia/AAAA-MM-DD    trabajo completo del día (ver lib/tnf-ml.js)
//   serie/AAAA-MM-DD  resumen compacto del día, para la evolución de puestos y precios
//   vendedores        apodos y reputación de vendedores (cache de 30 días)

const { getStore, connectLambda } = require('@netlify/blobs');
const { estadoNuevo, serie, VERSION } = require('./tnf-ml');

// connectLambda no informa uncachedEdgeURL y con consistency 'strong' Blobs falla al leer.
// Se usa la misma URL de borde para lecturas fuertes; si algo falla, lectura normal.
function tiendaTnf(event) {
  connectLambda(event);
  try {
    const d = JSON.parse(Buffer.from(event.blobs, 'base64').toString('utf8'));
    return getStore({ name: 'tnf-ml', consistency: 'strong', uncachedEdgeURL: d.url });
  } catch {
    return getStore({ name: 'tnf-ml' });
  }
}

const leer = (store, clave) => store.get(clave, { type: 'json' }).catch(() => null);

async function leerDia(store, fecha) {
  const st = await leer(store, 'dia/' + fecha);
  return st && st.version === VERSION ? st : null;
}

async function guardar(store, st, cache, cacheCambio) {
  await store.setJSON('dia/' + st.fecha, st);
  // Un día sin ranking (Mercado Libre bloqueó o no respondió) no reemplaza los datos que ya se ven
  if (st.listo && (st.ranking || []).length) await store.setJSON('serie/' + st.fecha, serie(st));
  if (cacheCambio) await store.setJSON('vendedores', cache);
}

module.exports = { tiendaTnf, leer, leerDia, guardar, estadoNuevo };
