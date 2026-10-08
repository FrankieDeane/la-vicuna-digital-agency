// Sesión del admin del sitio (zona "Otros links" y acciones del monitor de Mercado Libre).
//
// La clave nunca vive en el repo ni en el navegador: se compara del lado del servidor
// contra un hash PBKDF2 guardado en las variables de entorno de Netlify. Al loguearse se
// emite una cookie HttpOnly firmada con HMAC que vence sola.
//
// Variables de entorno (mismos nombres y formato que Frankie Analytics):
//   AUTH_USER        usuario admin
//   AUTH_PASS_HASH   "pbkdf2:<iteraciones>:<salt_hex>:<hash_hex>" (ver tools/hash-password.js)
//   AUTH_SECRET      secreto largo para firmar la sesión (hex o texto, 32+ bytes)

const crypto = require('crypto');

const COOKIE = 'lv_admin';
const DURACION_S = 8 * 3600;

const iguales = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function configurado() {
  return !!(process.env.AUTH_USER && process.env.AUTH_PASS_HASH && (process.env.AUTH_SECRET || '').length >= 32);
}

function verificarClave(clave) {
  const partes = String(process.env.AUTH_PASS_HASH || '').split(':');
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false;
  const [, iter, salt, esperado] = partes;
  const n = parseInt(iter, 10);
  if (!n || n < 10000 || !salt || !esperado) return false;
  const derivado = crypto.pbkdf2Sync(String(clave), Buffer.from(salt, 'hex'), n, 32, 'sha256').toString('hex');
  return iguales(derivado, esperado);
}

function verificarCredenciales(usuario, clave) {
  if (!configurado()) return false;
  // Se calcula siempre el hash para no revelar por tiempo si el usuario existe
  const claveOk = verificarClave(String(clave || '').trim());
  return iguales(String(usuario || '').trim().toLowerCase(), process.env.AUTH_USER.toLowerCase()) && claveOk;
}

const firmar = datos => crypto.createHmac('sha256', process.env.AUTH_SECRET).update(datos).digest('base64url');

function cookieDeSesion() {
  const vence = Math.floor(Date.now() / 1000) + DURACION_S;
  const datos = `${Buffer.from(process.env.AUTH_USER).toString('base64url')}.${vence}`;
  return `${COOKIE}=${datos}.${firmar(datos)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACION_S}`;
}

const cookieDeSalida = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function leerCookie(event, nombre) {
  const raw = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const par = raw.split(';').map(s => s.trim()).find(s => s.startsWith(nombre + '='));
  return par ? par.slice(nombre.length + 1) : '';
}

/** true si la request trae una sesión admin válida y vigente. */
function esAdmin(event) {
  if (!configurado()) return false;
  const valor = leerCookie(event, COOKIE);
  const partes = valor.split('.');
  if (partes.length !== 3) return false;
  const [usuario, vence, firma] = partes;
  if (!iguales(firma, firmar(`${usuario}.${vence}`))) return false;
  if (Number(vence) * 1000 < Date.now()) return false;
  return iguales(Buffer.from(usuario, 'base64url').toString(), process.env.AUTH_USER);
}

module.exports = { esAdmin, verificarCredenciales, cookieDeSesion, cookieDeSalida, configurado, leerCookie };
