// Zona admin de /automatizaciones: login, logout y "Otros links" (solo para el admin).
//
// GET                         → { admin: bool, links? }  (los links solo viajan con sesión válida)
// POST { accion: 'login', usuario, clave }
// POST { accion: 'logout' }
// POST { accion: 'agregar', titulo, url }   (requiere sesión)
// POST { accion: 'quitar', id }             (requiere sesión)
//
// Los links se guardan en Netlify Blobs (store "admin"), nunca en el HTML público.
// Los intentos fallidos de login se limitan por IP (5 cada 15 minutos).

const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { esAdmin, verificarCredenciales, cookieDeSesion, cookieDeSalida, configurado } = require('./lib/admin-auth');

const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const MAX_LINKS = 60;

// Links con los que arranca la zona admin (se pueden quitar y sumar desde la página)
const LINKS_INICIALES = [
  { titulo: 'Conectar Mercado Libre (monitor The North Face)', url: '/.netlify/functions/meli-auth' },
];

const base = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const responder = (statusCode, body, cookie) => ({
  statusCode,
  headers: cookie ? { ...base, 'Set-Cookie': cookie } : base,
  body: JSON.stringify(body),
});

function tienda(event) {
  try { connectLambda(event); } catch { /* fuera de Netlify */ }
  try { return getStore('admin'); } catch { return null; }
}

const leer = (store, k) => (store ? store.get(k, { type: 'json' }).catch(() => null) : null);

async function links(store) {
  const guardados = await leer(store, 'links');
  if (Array.isArray(guardados)) return guardados;
  return LINKS_INICIALES.map((l, i) => ({ id: 'ini' + i, ...l }));
}

function urlValida(u) {
  if (/^\/(?!\/)/.test(u)) return true; // ruta del propio sitio
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch { return false; }
}

const claveIP = event => 'fallos/' + crypto.createHash('sha256')
  .update(String(event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'sin-ip').split(',')[0].trim())
  .digest('hex').slice(0, 32);

exports.handler = async (event) => {
  const store = tienda(event);

  if (event.httpMethod === 'GET') {
    if (!esAdmin(event)) return responder(200, { admin: false, configurado: configurado() });
    return responder(200, { admin: true, links: await links(store) });
  }
  if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });

  // Solo desde el propio sitio (defensa extra contra CSRF, además de SameSite=Strict)
  const origen = event.headers.origin || '';
  const host = event.headers['x-forwarded-host'] || event.headers.host || '';
  let hostOrigen = null;
  try { hostOrigen = origen ? new URL(origen).host : null; } catch { hostOrigen = 'invalido'; }
  if (hostOrigen && host && hostOrigen !== host) return responder(403, { error: 'Origen no permitido' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return responder(400, { error: 'JSON inválido' }); }

  if (body.accion === 'login') {
    if (!configurado()) return responder(503, { error: 'El acceso admin todavía no está configurado en Netlify.' });
    const k = claveIP(event);
    const reg = (await leer(store, k)) || { n: 0, desde: Date.now() };
    if (Date.now() - reg.desde > VENTANA_MS) { reg.n = 0; reg.desde = Date.now(); }
    if (reg.n >= MAX_FALLOS) return responder(429, { error: 'Demasiados intentos. Probá de nuevo en 15 minutos.' });

    if (!verificarCredenciales(body.usuario, body.clave)) {
      reg.n++;
      if (store) await store.setJSON(k, reg).catch(() => null);
      await new Promise(r => setTimeout(r, 600)); // frena la fuerza bruta
      return responder(401, { error: 'Usuario o clave incorrectos.' });
    }
    if (store) await store.delete(k).catch(() => null);
    return responder(200, { admin: true, links: await links(store) }, cookieDeSesion());
  }

  if (body.accion === 'logout') return responder(200, { admin: false }, cookieDeSalida());

  if (!esAdmin(event)) return responder(401, { error: 'Necesitás iniciar sesión.' });
  if (!store) return responder(503, { error: 'Netlify Blobs no está disponible.' });

  const actuales = await links(store);
  if (body.accion === 'agregar') {
    const titulo = String(body.titulo || '').trim().slice(0, 80);
    const url = String(body.url || '').trim().slice(0, 500);
    if (!titulo || !urlValida(url)) return responder(400, { error: 'Poné un título y una URL que empiece con https://' });
    if (actuales.length >= MAX_LINKS) return responder(400, { error: 'Llegaste al máximo de links.' });
    const nuevos = [...actuales, { id: crypto.randomBytes(6).toString('hex'), titulo, url }];
    await store.setJSON('links', nuevos);
    return responder(200, { admin: true, links: nuevos });
  }
  if (body.accion === 'quitar') {
    const nuevos = actuales.filter(l => l.id !== body.id);
    await store.setJSON('links', nuevos);
    return responder(200, { admin: true, links: nuevos });
  }
  return responder(400, { error: 'Acción desconocida' });
};
