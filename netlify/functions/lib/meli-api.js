// Cliente compartido de la API de Mercado Libre.
//
// Mercado Libre rota el refresh token: cada vez que se usa, deja de servir y
// viene uno nuevo en la respuesta. Por eso no alcanza con una variable de
// entorno (quedaría vencida después del primer uso): el último par de tokens se
// guarda en Netlify Blobs y se lee de ahí en cada invocación.
//
// Variables de entorno:
//   MELI_CLIENT_ID, MELI_CLIENT_SECRET  — de la app creada en developers.mercadolibre.com.ar
//   MELI_REFRESH_TOKEN (opcional)       — semilla alternativa si no se usa el botón "Conectar"

const { getStore, connectLambda } = require('@netlify/blobs');

const API        = 'https://api.mercadolibre.com';
const AUTH_URL   = 'https://auth.mercadolibre.com.ar/authorization';
const STORE_NAME = 'meli-auth';
const TOKEN_KEY  = 'tokens';

// Margen para no usar un access token que vence en medio de la carga.
const MARGEN_MS = 5 * 60 * 1000;

let memoria = null; // { access_token, refresh_token, expires_at, user_id }

function credenciales() {
  const clientId     = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const e = new Error('Faltan MELI_CLIENT_ID y/o MELI_CLIENT_SECRET en las variables de entorno de Netlify.');
    e.code = 'sin-credenciales';
    throw e;
  }
  return { clientId, clientSecret };
}

function tienda(event) {
  // Las funciones con exports.handler reciben el contexto de Blobs en el evento.
  if (event) {
    try { connectLambda(event); } catch { /* fuera de Netlify: se sigue sin Blobs */ }
  }
  try {
    return getStore(STORE_NAME);
  } catch {
    return null;
  }
}

async function leerGuardado(store) {
  if (!store) return null;
  try {
    return await store.get(TOKEN_KEY, { type: 'json' });
  } catch {
    return null;
  }
}

async function guardar(store, tokens) {
  memoria = tokens;
  if (!store) return;
  await store.setJSON(TOKEN_KEY, tokens);
}

async function pedirToken(params) {
  const { clientId, clientSecret } = credenciales();
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const e = new Error(data.message || data.error || `HTTP ${res.status}`);
    e.code = data.error || 'token-error';
    throw e;
  }
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    user_id:       data.user_id,
    expires_at:    Date.now() + (Number(data.expires_in) || 21600) * 1000,
  };
}

/** Canjea el code del login por tokens y los guarda. */
async function canjearCodigo(event, code, redirectUri) {
  const tokens = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  await guardar(tienda(event), tokens);
  return tokens;
}

function urlDeLogin(redirectUri, state) {
  const { clientId } = credenciales();
  const u = new URL(AUTH_URL);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

/**
 * Devuelve { token, userId }. Refresca si hace falta.
 * Lanza un error con code 'sin-conexion' si nunca se conectó la cuenta.
 */
async function accessToken(event) {
  if (memoria && memoria.expires_at - MARGEN_MS > Date.now()) {
    return { token: memoria.access_token, userId: memoria.user_id };
  }

  const store    = tienda(event);
  const guardado = await leerGuardado(store);
  if (guardado && guardado.expires_at - MARGEN_MS > Date.now()) {
    memoria = guardado;
    return { token: guardado.access_token, userId: guardado.user_id };
  }

  // Candidatos a refresh token: primero el guardado (el más nuevo), después la
  // variable de entorno por si alguien la regeneró a mano.
  const candidatos = [guardado?.refresh_token, process.env.MELI_REFRESH_TOKEN]
    .filter((v, i, a) => v && a.indexOf(v) === i);

  if (!candidatos.length) {
    const e = new Error('La cuenta de Mercado Libre todavía no está conectada.');
    e.code = 'sin-conexion';
    throw e;
  }

  let ultimoError;
  for (const rt of candidatos) {
    try {
      const nuevo = await pedirToken({ grant_type: 'refresh_token', refresh_token: rt });
      await guardar(store, nuevo);
      return { token: nuevo.access_token, userId: nuevo.user_id };
    } catch (e) {
      ultimoError = e;
      // Dos invocaciones en paralelo pueden haber refrescado a la vez: si otra
      // ya guardó un token vigente, se usa ese.
      const releido = await leerGuardado(store);
      if (releido && releido.expires_at - MARGEN_MS > Date.now()) {
        memoria = releido;
        return { token: releido.access_token, userId: releido.user_id };
      }
    }
  }

  const e = new Error(
    'Mercado Libre rechazó el refresh token (' + ultimoError.message + '). ' +
    'Volvé a conectar la cuenta con el botón "Conectar Mercado Libre".'
  );
  e.code = 'sin-conexion';
  throw e;
}

/** GET autenticado contra la API. */
async function meliGet(ruta, token, timeoutMs = 8000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res  = await fetch(`${API}${ruta}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(`Mercado Libre ${res.status}: ${data.message || data.error || 'error'}`);
      e.status = res.status;
      throw e;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { accessToken, canjearCodigo, urlDeLogin, meliGet };
