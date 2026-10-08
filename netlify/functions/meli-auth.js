// Conecta la cuenta de Mercado Libre del monitor The North Face (una sola vez, solo el admin).
//
// GET sin parámetros  → redirige al login de Mercado Libre.
// GET ?code=…&state=… → Mercado Libre vuelve acá; se canjea el code por tokens,
//                       se guardan en Netlify Blobs y se vuelve a la tab.
//
// La URL de esta función tiene que estar cargada tal cual como "Redirect URI"
// en la app de Mercado Libre: https://<tu-sitio>/.netlify/functions/meli-auth

const crypto = require('crypto');
const { canjearCodigo, urlDeLogin } = require('./lib/meli-api');
const { esAdmin } = require('./lib/admin-auth');

const VUELTA = '/automatizaciones/#admin';

function redirectUri(event) {
  if (process.env.MELI_REDIRECT_URI) return process.env.MELI_REDIRECT_URI;
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  return `https://${host}/.netlify/functions/meli-auth`;
}

function leerCookie(event, nombre) {
  const raw = event.headers.cookie || '';
  const par = raw.split(';').map(s => s.trim()).find(s => s.startsWith(nombre + '='));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : '';
}

function pagina(statusCode, titulo, detalle) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html><meta charset="utf-8"><title>Mercado Libre</title>
<body style="font-family:sans-serif;max-width:560px;margin:60px auto;padding:0 16px">
<h2>${titulo}</h2><p>${detalle}</p><p><a href="${VUELTA}">← Volver</a></p></body>`,
  };
}

const escapar = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};

  // Conectar (o reconectar) la cuenta es solo para el admin logueado. La vuelta desde
  // Mercado Libre no trae la cookie admin (SameSite=Strict): ahí la valida el state,
  // que solo se emite a un admin.
  if (!q.code && !q.error && !esAdmin(event)) {
    return pagina(401, 'Solo para el admin', 'Iniciá sesión en la zona admin de /automatizaciones y volvé a tocar el link.');
  }

  if (q.error) {
    return pagina(400, 'Mercado Libre no autorizó la conexión', escapar(q.error_description || q.error));
  }

  try {
    if (!q.code) {
      const state = crypto.randomBytes(16).toString('hex');
      return {
        statusCode: 302,
        headers: {
          Location: urlDeLogin(redirectUri(event), state),
          'Set-Cookie': `meli_state=${state}; Path=/.netlify/functions/meli-auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
        body: '',
      };
    }

    // El state evita que un link armado por un tercero conecte otra cuenta.
    const esperado = leerCookie(event, 'meli_state');
    if (!esperado || esperado !== q.state) {
      return pagina(400, 'La conexión expiró', 'Pasaron más de 10 minutos o se abrió en otro navegador. Volvé a tocar "Conectar Mercado Libre" en la zona admin.');
    }

    await canjearCodigo(event, q.code, redirectUri(event));
    return {
      statusCode: 302,
      headers: {
        Location: VUELTA,
        'Set-Cookie': 'meli_state=; Path=/.netlify/functions/meli-auth; Max-Age=0',
      },
      body: '',
    };
  } catch (e) {
    return pagina(500, 'No se pudo conectar Mercado Libre', escapar(e.message));
  }
};
