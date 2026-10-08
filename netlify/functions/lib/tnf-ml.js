// Monitor diario de The North Face en Mercado Libre para el demo de /automatizaciones.
// Releva una sola marca (The North Face): más vendidos por categoría, qué marcas ocupan el ranking, quién vende cada producto
// The North Face y a qué precio, y cómo se compara la marca contra la competencia.
//
// Fuentes, en orden (si una falla, se sigue con la siguiente y queda anotado):
//   1. API oficial de Mercado Libre con el token de la cuenta conectada (zona admin → "Conectar Mercado Libre")
//      - /sites/MLA/domain_discovery/search  → categoría de cada tipo de producto
//      - /highlights/MLA/category/{cat}       → ranking "Más vendidos" de la categoría
//      - /products/search, /products/{id}     → productos de catálogo de la marca y su buy box
//      - /products/{id}/items                 → todos los vendedores de ese producto con su precio
//      - /sites/MLA/search                    → publicaciones sueltas (fuera de catálogo)
//      - /users/{id}                          → apodo y reputación de cada vendedor
//   2. Páginas públicas (listado y "más vendidos"), leyendo el JSON que trae cada página.
//   3. Si el ranking no sale ni por API ni por página: orden del catálogo (/products/search).
//      Si ML pide captcha, se anota y se sigue: no se intenta saltear.
//
// El trabajo del día se guarda por pasos en Netlify Blobs (store "tnf-ml", clave dia/AAAA-MM-DD).
//
// Variables de entorno opcionales:
//   TNF_ML_CATEGORIAS   términos para encontrar las categorías (coma)
//   TNF_ML_BUSQUEDAS    términos para buscar productos de la marca (coma)
//   TNF_ML_MARCA        nombre de la marca para las búsquedas. Def.: The North Face
//   TNF_ML_MARCA_REGEX  regex de la marca. Def.: The North Face / TNF
//   TNF_ML_PROPIOS      seller_id de la tienda oficial (coma), para marcar su precio

const { accessToken } = require('./meli-api');

const API = 'https://api.mercadolibre.com';
const SITIO = 'MLA';
const VERSION = 1;
const CATEGORIAS_DEF = ['campera de abrigo', 'campera impermeable', 'campera de pluma', 'mochila de trekking',
  'zapatillas de trekking', 'botas de trekking', 'buzo polar', 'pantalon de trekking', 'carpa camping', 'bolsa de dormir'];
const nombreCat = c => c.nombre;
const BUSQUEDAS_DEF = ['campera', 'campera impermeable', 'mochila', 'zapatillas', 'buzo polar', 'pantalon', 'chaleco'];
const MARCA_BUSQUEDA = process.env.TNF_ML_MARCA || 'The North Face';
const TOP_RANKING = 20;   // puestos que se guardan de cada ranking de categoría
const MAX_MARCA = 80;      // productos The North Face de catálogo a los que se les releva la competencia
const EN_PARALELO = 8;
const INTENTOS = 2;
const VENDEDOR_VIGENCIA_MS = 30 * 86400000;
const PASOS = ['descubrir', 'ranking', 'detalles', 'competencia', 'sueltas', 'vendedores', 'cerrar'];

const lista = (env, def) => (process.env[env] ? process.env[env].split(',').map(s => s.trim()).filter(Boolean) : def);
const RE_MARCA = new RegExp(process.env.TNF_ML_MARCA_REGEX || String.raw`\bthe\s*north\s*face\b|\btnf\b`, 'i');
// Marcas de outdoor y deporte más comunes en ML Argentina, para nombrar la marca cuando
// la publicación no trae el atributo BRAND (lecturas de páginas públicas)
const MARCAS = ['The North Face', 'Columbia', 'Montagne', 'Salomon', 'Merrell', 'Patagonia', 'Quechua', 'Doite', 'Ansilta',
  'Mormaii', 'Kodiak', 'Lippi', 'Nike', 'Adidas', 'Puma', 'Topper', 'Fila', 'Under Armour', 'Reebok', 'Jack Wolfskin',
  'Arc\'teryx', 'Marmot', 'Hi-Tec', 'Hoka', 'Timberland', 'Caterpillar', 'Head', 'Rip Curl', 'Billabong', 'Quiksilver',
  'Osprey', 'Deuter', 'Wenger', 'Discovery', 'National Geographic', 'Waterdog', 'Nexxt', 'Alpine Skate', 'Iael', 'Spinit',
  // Outdoor y montaña con presencia en Argentina
  'Mammut', 'Black Diamond', 'Fjällräven', 'Helly Hansen', 'Mountain Hardwear', 'Rab', 'Millet', 'Vaude', 'Lowa',
  'Scarpa', 'La Sportiva', 'Keen', 'Teva', 'Oakley', 'CamelBak', 'Coleman', 'Thule', 'Gregory', 'Ferrino',
  'Trangoworld', 'Outdoor Research', 'Eddie Bauer', 'Regatta', 'Northland', 'Cardón', 'Andesgear', 'Asics', 'New Balance'];
const RE_MARCAS = MARCAS.map(m => [m, new RegExp('\\b' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*') + '\\b', 'i')]);

function esMarca(nombre, atributos) {
  const marca = (atributos || []).find(a => a && a.id === 'BRAND')?.value_name;
  if (marca) return RE_MARCA.test(marca);
  return RE_MARCA.test(nombre || '');
}

function marcaDe(nombre, atributos) {
  const marca = (atributos || []).find(a => a && a.id === 'BRAND')?.value_name;
  if (marca) return RE_MARCA.test(marca) ? 'The North Face' : marca;
  if (RE_MARCA.test(nombre || '')) return 'The North Face';
  const hit = RE_MARCAS.find(([, re]) => re.test(nombre || ''));
  return hit ? hit[0] : null;
}

const espera = ms => new Promise(r => setTimeout(r, ms));
const restante = ctx => ctx.deadline - Date.now();
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const urlItem = id => `https://articulo.mercadolibre.com.ar/${String(id).replace(/^([A-Z]{3})(\d+)$/, '$1-$2')}`;

function anotar(ctx, donde, e) {
  const msg = `${donde}: ${e && e.message ? e.message : e}`.slice(0, 300);
  ctx.st.errores.push({ ts: new Date().toISOString(), msg });
  if (ctx.st.errores.length > 60) ctx.st.errores = ctx.st.errores.slice(-60);
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function traer(url, opciones, ctx) {
  const ms = Math.max(1000, Math.min(8000, restante(ctx) - 300));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// GET a la API: con token si hay; reintenta una vez ante 429/5xx; ante 401/403 con token
// prueba sin token (algunos recursos son públicos y el token puede no tener ese permiso).
async function api(ctx, ruta) {
  let usarToken = !!ctx.token;
  let conToken = null; // error con token, para no perderlo detrás del reintento sin token
  for (let intento = 0; intento < 2; intento++) {
    const res = await traer(`${API}${ruta}`, {
      headers: { Accept: 'application/json', ...(usarToken ? { Authorization: `Bearer ${ctx.token}` } : {}) },
    }, ctx);
    ctx.llamadas++;
    if (res.ok) return res.json();
    const cuerpo = await res.json().catch(() => ({}));
    if ((res.status === 429 || res.status >= 500) && intento === 0 && restante(ctx) > 3000) { await espera(1200); continue; }
    if ((res.status === 401 || res.status === 403) && usarToken && intento === 0) {
      conToken = `con token HTTP ${res.status} ${cuerpo.message || cuerpo.error || ''}`.trim();
      usarToken = false;
      continue;
    }
    const e = new Error(`HTTP ${res.status} ${cuerpo.message || cuerpo.error || ''}`.trim() + (conToken ? ` (${conToken})` : ''));
    e.status = res.status;
    throw e;
  }
}

// Página pública de ML. Si responde con verificación/captcha se corta ahí.
async function pagina(ctx, url) {
  const res = await traer(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
    redirect: 'follow',
  }, ctx);
  ctx.llamadas++;
  const html = await res.text();
  if (!res.ok || /account-verification|captcha|negative_traffic/i.test(res.url) || /g-recaptcha|px-captcha/i.test(html.slice(0, 20000))) {
    const e = new Error(res.ok ? 'Mercado Libre pidió verificación anti-bot' : `HTTP ${res.status}`);
    e.bloqueo = true;
    throw e;
  }
  return html;
}

// ─── Lectura de páginas públicas ──────────────────────────────────────────────
// Las tarjetas de producto ("polycard") vienen en un JSON dentro de la página.
// Si no está, se cae a leer el HTML de cada tarjeta.

function textoLimpio(t) {
  // Las marcas de ícono vienen como {icon_cockade}; otros {valor} son texto (p. ej. el nombre de la tienda)
  return String(t || '').replace(/\{([^}]*)\}/g, (m, x) => (/icon|cockade|svg/i.test(x) ? '' : x)).replace(/\s+/g, ' ').replace(/^por\s+/i, '').trim();
}

function tarjetaDePolycard(pc) {
  const comp = pc.components || [];
  const de = tipo => comp.find(c => c && c.type === tipo) || {};
  const precio = de('price').price || {};
  const md = pc.metadata || {};
  const id = String(md.id || '');
  return {
    id,
    producto: md.product_id || (String(md.url || '').match(/\/p\/(MLA\d+)/) || [])[1] || null,
    titulo: de('title').title?.text || '',
    precio: Number(precio.current_price?.value) || null,
    original: Number(precio.previous_price?.value) || null,
    vendedorTexto: textoLimpio(de('seller').seller?.text) || null,
    destacado: textoLimpio(de('highlight').highlight?.text) || null,
    permalink: md.url ? (String(md.url).startsWith('http') ? md.url : `https://${md.url}`) : urlItem(id),
    foto: pc.pictures?.pictures?.[0]?.id ? `https://http2.mlstatic.com/D_NQ_NP_${pc.pictures.pictures[0].id}-O.webp` : null,
  };
}

function tarjetasDeHTML(html) {
  const out = [];
  const vistos = new Set();
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
  for (const sc of scripts) {
    if (!sc.includes('"polycard"')) continue;
    const cuerpo = sc.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    let json;
    try { json = JSON.parse(cuerpo.slice(cuerpo.indexOf('{'), cuerpo.lastIndexOf('}') + 1)); } catch { continue; }
    const pila = [json];
    while (pila.length) {
      const n = pila.pop();
      if (!n || typeof n !== 'object') continue;
      if (n.polycard && n.polycard.metadata && n.polycard.metadata.id && !vistos.has(n.polycard.metadata.id)) {
        vistos.add(n.polycard.metadata.id);
        out.push(tarjetaDePolycard(n.polycard));
        continue;
      }
      // Al revés, para recorrer en el orden de la página (importa en el ranking)
      const hijos = Object.values(n).filter(x => x && typeof x === 'object');
      for (let i = hijos.length - 1; i >= 0; i--) pila.push(hijos[i]);
    }
  }
  if (out.length) return out;

  // Plan C: HTML de las tarjetas
  html.split(/class="[^"]*poly-card[ "]/).slice(1).forEach(trozo => {
    const a = trozo.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*poly-component__title[^"]*"[^>]*>([\s\S]*?)<\/a>/) ||
              trozo.match(/class="[^"]*poly-component__title[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) return;
    const url = a[1].replace(/&amp;/g, '&');
    const id = (url.match(/(MLA)-?(\d+)/) || []).slice(1).join('');
    if (!id || vistos.has(id)) return;
    vistos.add(id);
    const frac = (trozo.match(/andes-money-amount__fraction[^>]*>([\d.]+)</) || [])[1];
    const vend = (trozo.match(/poly-component__seller[^>]*>([\s\S]*?)<\/span>/) || [])[1];
    out.push({
      id, producto: (url.match(/\/p\/(MLA\d+)/) || [])[1] || null,
      titulo: a[2].replace(/<[^>]+>/g, '').trim(),
      precio: frac ? Number(frac.replace(/\./g, '')) : null, original: null,
      vendedorTexto: vend ? textoLimpio(vend.replace(/<[^>]+>/g, '')) : null,
      destacado: null, permalink: url.split('#')[0], foto: null,
    });
  });
  return out;
}

const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─── Estado del día ───────────────────────────────────────────────────────────

function estadoNuevo(fecha) {
  return {
    version: VERSION, fecha, inicio: new Date().toISOString(), actualizado: null, listo: false, paso: 0,
    propios: [], categorias: [], ranking: [], catalogo: {}, items: {}, sueltas: [], busquedas: {},
    vendedores: {}, fuentes: {}, errores: [], intentos: {}, llamadas: 0,
  };
}

function sumarProducto(st, id, datos) {
  if (!id) return;
  st.catalogo[id] = { id, ...(st.catalogo[id] || {}), ...datos };
}

// Una "oportunidad" más para reintentar; después de INTENTOS se da por perdida.
function puedeIntentar(st, clave) {
  return (st.intentos[clave] || 0) < INTENTOS;
}
function intento(st, clave) {
  st.intentos[clave] = (st.intentos[clave] || 0) + 1;
}

async function enPool(ctx, tareas, fn) {
  let i = 0;
  const trabajador = async () => {
    while (i < tareas.length && restante(ctx) > 1800) {
      const t = tareas[i++];
      try { await fn(t); } catch (e) { anotar(ctx, String(t.id || t), e); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, tareas.length) }, trabajador));
  return i >= tareas.length;
}

function fuente(st, nombre, ok, detalle) {
  st.fuentes[nombre] = { ok, detalle: detalle ? String(detalle).slice(0, 200) : null, ts: new Date().toISOString() };
}

// ─── Pasos ────────────────────────────────────────────────────────────────────

const PASO = {
  // Categorías de cada tipo de producto + productos de catálogo The North Face
  async descubrir(ctx) {
    const st = ctx.st;
    const cats = lista('TNF_ML_CATEGORIAS', CATEGORIAS_DEF);
    const vistas = new Set(st.categorias.map(c => c.id));
    await enPool(ctx, cats.filter(t => !st.categorias.some(c => c.termino === t) && puedeIntentar(st, 'cat:' + t)), async t => {
      intento(st, 'cat:' + t);
      const r = await api(ctx, `/sites/${SITIO}/domain_discovery/search?limit=1&q=${encodeURIComponent(t)}`);
      const c = Array.isArray(r) ? r[0] : null;
      if (!c || !c.category_id) throw new Error('sin categoría para "' + t + '"');
      if (vistas.has(c.category_id)) return;
      vistas.add(c.category_id);
      st.categorias.push({ termino: t, id: c.category_id, nombre: c.category_name || t, dominio: c.domain_id || null });
    });

    const busq = lista('TNF_ML_BUSQUEDAS', BUSQUEDAS_DEF);
    let okCat = 0, errCat = null;
    const completo = await enPool(ctx, busq.filter(t => !st.busquedas['cat:' + t] && puedeIntentar(st, 'pb:' + t)), async t => {
      intento(st, 'pb:' + t);
      try {
        const r = await api(ctx, `/products/search?status=active&site_id=${SITIO}&q=${encodeURIComponent(MARCA_BUSQUEDA + ' ' + t)}&limit=50`);
        (r.results || []).forEach(p => {
          if (esMarca(p.name, p.attributes)) sumarProducto(ctx.st, p.id, { nombre: p.name, tnf: true, buscado: true });
        });
        st.busquedas['cat:' + t] = true;
        okCat++;
      } catch (e) { errCat = e; throw e; }
    });
    if (okCat) fuente(st, 'catalogo', true, `${Object.values(st.catalogo).filter(p => p.tnf).length} productos The North Face de catálogo`);
    else if (errCat) fuente(st, 'catalogo', false, errCat.message);
    return completo && restante(ctx) > 1800;
  },

  // "Más vendidos" de cada categoría (API; si la niega, la página pública)
  async ranking(ctx) {
    const st = ctx.st;
    const pendientes = st.categorias.filter(c => !c.listo && puedeIntentar(st, 'rk:' + c.id));
    return enPool(ctx, pendientes, async c => {
      intento(st, 'rk:' + c.id);
      try {
        const r = await api(ctx, `/highlights/${SITIO}/category/${c.id}`);
        (r.content || []).slice(0, TOP_RANKING).forEach((x, i) => {
          st.ranking.push({ cat: c.id, pos: x.position || i + 1, id: x.id, tipo: x.type === 'ITEM' ? 'item' : 'producto' });
          if (x.type === 'ITEM') st.items[x.id] = st.items[x.id] || { id: x.id };
          else sumarProducto(st, x.id, {});
        });
        c.listo = true;
        c.fuente = 'api';
        fuente(st, 'ranking', true, 'API de más vendidos');
      } catch (eApi) {
        try {
          const html = await pagina(ctx, `https://www.mercadolibre.com.ar/mas-vendidos/${c.id}`);
          const tarjetas = tarjetasDeHTML(html).slice(0, TOP_RANKING);
          if (!tarjetas.length) throw new Error('la página no trajo productos');
          tarjetas.forEach((t, i) => {
            const id = t.producto || t.id;
            st.ranking.push({ cat: c.id, pos: i + 1, id, tipo: t.producto ? 'producto' : 'item' });
            const datos = { nombre: t.titulo, tnf: esMarca(t.titulo), marca: marcaDe(t.titulo), permalink: t.permalink, foto: t.foto,
              buyBox: { precio: t.precio, original: t.original, vendedorTexto: t.vendedorTexto } };
            if (t.producto) sumarProducto(st, id, { ...datos, detalle: true });
            else st.items[id] = { id, titulo: t.titulo, precio: t.precio, original: t.original, vendedorTexto: t.vendedorTexto, permalink: t.permalink, foto: t.foto, tnf: esMarca(t.titulo), marca: marcaDe(t.titulo), detalle: true };
          });
          c.listo = true;
          c.fuente = 'pagina';
          fuente(st, 'ranking', true, `API: ${eApi.message} → se leyó la página pública`);
        } catch (eHtml) {
          // 3. Orden del catálogo de ML para el tipo de producto (API autorizada, sin anti-bot).
          // No es el "Más vendidos" oficial: es el orden de relevancia del buscador de catálogo,
          // que ML arma con ventas y conversión. Se marca así en pantalla.
          try {
            const r = await api(ctx, `/products/search?status=active&site_id=${SITIO}&q=${encodeURIComponent(c.termino || c.nombre)}${c.dominio ? '&domain_id=' + encodeURIComponent(c.dominio) : ''}&limit=${TOP_RANKING}`);
            const prods = (r.results || []).slice(0, TOP_RANKING);
            if (!prods.length) throw new Error('el catálogo no trajo productos');
            prods.forEach((p, i) => {
              st.ranking.push({ cat: c.id, pos: i + 1, id: p.id, tipo: 'producto' });
              sumarProducto(st, p.id, { nombre: p.name, tnf: esMarca(p.name, p.attributes) || !!st.catalogo[p.id]?.tnf,
                marca: marcaDe(p.name, p.attributes) || st.catalogo[p.id]?.marca || null });
            });
            c.listo = true;
            c.fuente = 'catalogo';
            fuente(st, 'ranking', true, `Más vendidos: API ${eApi.message} · página ${eHtml.message} → se usó el orden del catálogo de ML`);
          } catch (eCat) {
            fuente(st, 'ranking', false, `API: ${eApi.message} · página: ${eHtml.message} · catálogo: ${eCat.message}`);
            throw new Error(`ranking ${c.nombre}: API ${eApi.message} / página ${eHtml.message} / catálogo ${eCat.message}`);
          }
        }
      }
    });
  },

  // Nombre, marca y buy box de cada producto; título, precio y vendedor de cada publicación
  async detalles(ctx) {
    const st = ctx.st;
    const prods = Object.values(st.catalogo).filter(p => !p.detalle && puedeIntentar(st, 'pd:' + p.id));
    const ok1 = await enPool(ctx, prods, async p => {
      intento(st, 'pd:' + p.id);
      const r = await api(ctx, `/products/${p.id}`);
      const bb = r.buy_box_winner || null;
      sumarProducto(st, p.id, {
        detalle: true,
        nombre: r.name || p.nombre,
        marca: marcaDe(r.name, r.attributes) || p.marca || null,
        tnf: p.tnf || esMarca(r.name, r.attributes),
        permalink: r.permalink || `https://www.mercadolibre.com.ar/p/${p.id}`,
        foto: r.pictures?.[0]?.url || null,
        buyBox: bb ? {
          item: bb.item_id, vendedor: bb.seller_id, precio: bb.price, original: bb.original_price || null,
          tienda: bb.official_store_id || null, envioGratis: !!bb.shipping?.free_shipping, full: bb.shipping?.logistic_type === 'fulfillment',
        } : null,
      });
    });
    if (!ok1) return false;

    const items = Object.values(st.items).filter(x => !x.detalle && puedeIntentar(st, 'it:' + x.id)).map(x => x.id);
    const lotes = [];
    for (let i = 0; i < items.length; i += 20) lotes.push({ id: items.slice(i, i + 20).join(','), ids: items.slice(i, i + 20) });
    return enPool(ctx, lotes, async l => {
      l.ids.forEach(id => intento(st, 'it:' + id));
      const r = await api(ctx, `/items?ids=${l.id}&attributes=id,title,price,original_price,seller_id,permalink,thumbnail,catalog_product_id,official_store_id,attributes,shipping`);
      (Array.isArray(r) ? r : []).forEach(x => {
        const b = x && x.code === 200 && x.body;
        if (!b) return;
        st.items[b.id] = {
          id: b.id, detalle: true, titulo: b.title, precio: b.price, original: b.original_price || null, vendedor: b.seller_id,
          permalink: b.permalink, foto: b.thumbnail, producto: b.catalog_product_id || null, tienda: b.official_store_id || null,
          envioGratis: !!b.shipping?.free_shipping, full: b.shipping?.logistic_type === 'fulfillment', tnf: esMarca(b.title, b.attributes), marca: marcaDe(b.title, b.attributes),
        };
      });
    });
  },

  // Todos los vendedores de cada producto The North Face de catálogo, con su precio
  async competencia(ctx) {
    const st = ctx.st;
    const enRanking = new Set(st.ranking.map(r => r.id));
    const tnf = Object.values(st.catalogo).filter(p => p.tnf)
      .sort((a, b) => (enRanking.has(b.id) - enRanking.has(a.id)))
      .slice(0, MAX_MARCA)
      .filter(p => !p.vendedores && puedeIntentar(st, 'pv:' + p.id));
    let ok = 0, err = null;
    const completo = await enPool(ctx, tnf, async p => {
      intento(st, 'pv:' + p.id);
      try {
        const r = await api(ctx, `/products/${p.id}/items?limit=100`);
        p.vendedores = (r.results || []).map(x => ({
          item: x.item_id, vendedor: x.seller_id, precio: x.price, original: x.original_price || null,
          tienda: x.official_store_id || null, envioGratis: !!x.shipping?.free_shipping,
          full: x.shipping?.logistic_type === 'fulfillment', tipo: x.listing_type_id || null, condicion: x.condition || null,
        }));
        ok++;
      } catch (e) {
        // 404 = el producto no tiene publicaciones activas compitiendo
        if (e.status === 404) { p.vendedores = []; ok++; return; }
        err = e;
        throw e;
      }
    });
    if (ok) fuente(st, 'vendedores', true, `${ok} productos con sus vendedores`);
    else if (err) fuente(st, 'vendedores', false, err.message);
    return completo;
  },

  // Publicaciones The North Face fuera de catálogo (o de catálogo que no apareció antes)
  async sueltas(ctx) {
    const st = ctx.st;
    const vistas = new Set(st.sueltas.map(x => x.id));
    const agregar = x => {
      if (!x.id || vistas.has(x.id) || !x.tnf) return;
      vistas.add(x.id);
      st.sueltas.push(x);
    };
    const terminos = lista('TNF_ML_BUSQUEDAS', BUSQUEDAS_DEF).filter(t => !st.busquedas['it:' + t] && puedeIntentar(st, 'bs:' + t));
    return enPool(ctx, terminos, async t => {
      intento(st, 'bs:' + t);
      try {
        const r = await api(ctx, `/sites/${SITIO}/search?q=${encodeURIComponent(MARCA_BUSQUEDA + ' ' + t)}&limit=50`);
        (r.results || []).forEach(x => agregar({
          id: x.id, titulo: x.title, precio: x.price, original: x.original_price || null,
          vendedor: x.seller?.id || null, vendedorTexto: x.seller?.nickname || null, tienda: x.official_store_id || null,
          producto: x.catalog_product_id || null, permalink: x.permalink, foto: x.thumbnail,
          envioGratis: !!x.shipping?.free_shipping, full: x.shipping?.logistic_type === 'fulfillment',
          tnf: esMarca(x.title, x.attributes), fuente: 'api',
        }));
        st.busquedas['it:' + t] = 'api';
        fuente(st, 'busqueda', true, 'API de búsqueda');
      } catch (eApi) {
        try {
          const html = await pagina(ctx, `https://listado.mercadolibre.com.ar/${slug(MARCA_BUSQUEDA + ' ' + t)}`);
          const tarjetas = tarjetasDeHTML(html);
          if (!tarjetas.length) throw new Error('la página no trajo publicaciones');
          tarjetas.forEach(x => agregar({ ...x, vendedor: null, tnf: esMarca(x.titulo), fuente: 'pagina' }));
          st.busquedas['it:' + t] = 'pagina';
          fuente(st, 'busqueda', true, `API: ${eApi.message} → se leyó el listado público`);
        } catch (eHtml) {
          fuente(st, 'busqueda', false, `API: ${eApi.message} · listado: ${eHtml.message}`);
          throw new Error(`búsqueda "${t}": API ${eApi.message} / listado ${eHtml.message}`);
        }
      }
    });
  },

  // Apodo y reputación de cada vendedor (se cachea 30 días entre corridas)
  async vendedores(ctx) {
    const st = ctx.st;
    const ids = new Set();
    Object.values(st.catalogo).forEach(p => {
      if (p.buyBox?.vendedor) ids.add(p.buyBox.vendedor);
      (p.vendedores || []).forEach(v => ids.add(v.vendedor));
    });
    Object.values(st.items).forEach(x => x.vendedor && ids.add(x.vendedor));
    st.sueltas.forEach(x => x.vendedor && ids.add(x.vendedor));
    const faltan = [...ids].filter(id => {
      const c = ctx.cache[id];
      return (!c || Date.now() - c.ts > VENDEDOR_VIGENCIA_MS) && puedeIntentar(st, 'us:' + id);
    }).map(id => ({ id }));
    const completo = await enPool(ctx, faltan, async ({ id }) => {
      intento(st, 'us:' + id);
      const u = await api(ctx, `/users/${id}`);
      ctx.cache[id] = {
        nick: u.nickname || String(id), nivel: u.seller_reputation?.level_id || null,
        lider: u.seller_reputation?.power_seller_status || null, ts: Date.now(),
      };
      ctx.cacheCambio = true;
    });
    ids.forEach(id => {
      const c = ctx.cache[id];
      if (c) st.vendedores[id] = { nick: c.nick, nivel: c.nivel, lider: c.lider };
    });
    return completo;
  },

  async cerrar(ctx) {
    ctx.st.listo = true;
    ctx.st.fin = new Date().toISOString();
    return true;
  },
};

/**
 * Avanza el trabajo del día hasta terminar o quedarse sin tiempo.
 * @param {object} op { event, st, cache, presupuestoMs }
 */
async function avanzar({ event, st, cache, presupuestoMs }) {
  const ctx = { st, cache, deadline: Date.now() + presupuestoMs, llamadas: 0, cacheCambio: false, token: null };
  try {
    const { token } = await accessToken(event);
    ctx.token = token;
    // La cuenta conectada es de la agencia, no de la marca: solo cuentan las tiendas declaradas
    st.propios = lista('TNF_ML_PROPIOS', []).map(Number);
    fuente(st, 'token', true, 'cuenta conectada');
  } catch (e) {
    fuente(st, 'token', false, e.message);
    st.propios = lista('TNF_ML_PROPIOS', []).map(Number);
  }
  while (st.paso < PASOS.length && restante(ctx) > 1800) {
    let terminado = false;
    try {
      terminado = await PASO[PASOS[st.paso]](ctx);
    } catch (e) {
      anotar(ctx, PASOS[st.paso], e);
    }
    // Un paso que no terminó por errores (no por tiempo) se da por cerrado: lo que falló queda anotado
    if (terminado || restante(ctx) > 1800) st.paso++;
    else break;
  }
  st.llamadas = (st.llamadas || 0) + ctx.llamadas;
  st.actualizado = new Date().toISOString();
  return { cacheCambio: ctx.cacheCambio };
}

// ─── Vista para el dashboard ──────────────────────────────────────────────────

const mediana = xs => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const https = u => (u ? String(u).replace(/^http:/, 'https:') : null);
const dif = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b ? (a / b - 1) * 100 : null);

function vista(st) {
  const propios = new Set((st.propios || []).map(Number));
  const nick = id => st.vendedores?.[id]?.nick || (id == null ? null : /^\d+$/.test(String(id)) ? `#${id}` : String(id));
  const cats = new Map(st.categorias.map(c => [c.id, nombreCat(c)]));

  const posiciones = new Map(); // id producto/publicación → [{ cat, catId, pos }]
  st.ranking.forEach(r => {
    if (!posiciones.has(r.id)) posiciones.set(r.id, []);
    posiciones.get(r.id).push({ cat: cats.get(r.cat) || r.cat, catId: r.cat, pos: r.pos });
  });

  const categorias = st.categorias.map(c => {
    const top = st.ranking.filter(r => r.cat === c.id).sort((a, b) => a.pos - b.pos).map(r => {
      const p = r.tipo === 'producto' ? st.catalogo[r.id] || {} : st.items[r.id] || {};
      const bb = r.tipo === 'producto' ? p.buyBox || {} : p;
      return {
        pos: r.pos, id: r.id, tipo: r.tipo, nombre: p.nombre || p.titulo || r.id, marca: p.marca || null, tnf: !!p.tnf,
        precio: bb.precio ?? null, vendedor: nick(bb.vendedor) || bb.vendedorTexto || null,
        permalink: p.permalink || (r.tipo === 'item' ? urlItem(r.id) : null), foto: https(p.foto),
      };
    });
    const tnf = top.filter(t => t.tnf);
    const comp = top.filter(t => !t.tnf);
    const conteo = {};
    comp.forEach(t => { if (t.marca) conteo[t.marca] = (conteo[t.marca] || 0) + 1; });
    const lider = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    const medianaTnf = mediana(tnf.map(t => t.precio));
    const medianaComp = mediana(comp.map(t => t.precio));
    return {
      id: c.id, nombre: nombreCat(c), fuente: c.fuente || null, top,
      resumen: {
        tnfEnTop: tnf.length, mejorPuestoTnf: tnf.length ? tnf[0].pos : null,
        medianaTnf, medianaComp, dif: dif(medianaTnf, medianaComp),
        lider: lider ? { marca: lider[0], n: lider[1] } : null,
      },
    };
  });
  const medianaCompCat = new Map(categorias.map(c => [c.id, c.resumen.medianaComp]));

  const productos = Object.values(st.catalogo).filter(p => p.tnf).map(p => {
    const vs = (p.vendedores || []).filter(v => Number.isFinite(v.precio)).map(v => ({
      nick: nick(v.vendedor), precio: v.precio, tienda: !!v.tienda, oficial: propios.has(Number(v.vendedor)),
      full: v.full, envioGratis: v.envioGratis, permalink: v.item ? urlItem(v.item) : p.permalink || null,
    })).sort((a, b) => a.precio - b.precio);
    const precios = vs.map(v => v.precio);
    const pos = posiciones.get(p.id) || [];
    const mejor = pos.slice().sort((a, b) => a.pos - b.pos)[0] || null;
    const catId = mejor ? mejor.catId : null;
    const precio = p.buyBox?.precio ?? (precios.length ? precios[0] : null);
    return {
      id: p.id, nombre: p.nombre || p.id, permalink: p.permalink, foto: https(p.foto), catId,
      categoria: mejor ? mejor.cat : null, posiciones: pos,
      buyBox: p.buyBox ? { precio: p.buyBox.precio, vendedor: nick(p.buyBox.vendedor) || p.buyBox.vendedorTexto || null } : null,
      n: vs.length, min: precios.length ? precios[0] : precio, max: precios.length ? precios[precios.length - 1] : precio,
      mediana: mediana(precios), minVendedor: vs[0]?.nick || null,
      compMediana: catId ? medianaCompCat.get(catId) ?? null : null,
      dif: catId ? dif(precio, medianaCompCat.get(catId)) : null,
      vendedores: vs.slice(0, 12),
    };
  }).sort((a, b) => {
    const pa = Math.min(...a.posiciones.map(x => x.pos), 999), pb = Math.min(...b.posiciones.map(x => x.pos), 999);
    return pa - pb || b.n - a.n || String(a.nombre).localeCompare(String(b.nombre));
  });

  // Top marcas: cuántos lugares ocupa cada marca en los rankings de todas las categorías
  const porMarca = new Map();
  categorias.forEach(c => c.top.forEach(t => {
    const m = t.tnf ? 'The North Face' : t.marca || 'Sin marca identificada';
    if (!porMarca.has(m)) porMarca.set(m, { marca: m, apariciones: 0, top3: 0, mejorPuesto: 999, tnf: !!t.tnf });
    const g = porMarca.get(m);
    g.apariciones++;
    if (t.pos <= 3) g.top3++;
    g.mejorPuesto = Math.min(g.mejorPuesto, t.pos);
  }));
  const totalLugares = categorias.reduce((s, c) => s + c.top.length, 0) || 1;
  const marcas = [...porMarca.values()]
    .map(g => ({ ...g, share: (g.apariciones / totalLugares) * 100 }))
    .sort((a, b) => b.apariciones - a.apariciones || a.mejorPuesto - b.mejorPuesto);

  return {
    marca: MARCA_BUSQUEDA, fecha: st.fecha, listo: st.listo, paso: st.paso, pasos: PASOS.length,
    pasoNombre: PASOS[st.paso] || 'listo', inicio: st.inicio, actualizado: st.actualizado,
    fuentes: st.fuentes, errores: (st.errores || []).slice(-15), llamadas: st.llamadas,
    categorias, productos, marcas,
  };
}

// Serie diaria compacta para los gráficos por fecha:
//   p: por producto de la marca [mínimo, mediana, buy box, n vendedores, mejor puesto, nombre, categoría]
//   r: por categoría { n: nombre, t: [[puesto, id, nombre, es la marca (1/0), precio, marca]] }
function serie(st) {
  const v = vista(st);
  const p = {};
  v.productos.forEach(x => {
    p[x.id] = [x.min, x.mediana, x.buyBox?.precio ?? null, x.n,
      x.posiciones.length ? Math.min(...x.posiciones.map(y => y.pos)) : null, String(x.nombre).slice(0, 90), x.catId];
  });
  const r = {};
  v.categorias.forEach(c => {
    if (c.top.length) r[c.id] = { n: c.nombre, t: c.top.slice(0, TOP_RANKING).map(t => [t.pos, t.id, String(t.nombre).slice(0, 90), t.tnf ? 1 : 0, t.precio, t.marca]) };
  });
  return { fecha: st.fecha, p, r };
}

module.exports = { avanzar, estadoNuevo, vista, serie, hoyAR, esMarca, marcaDe, PASOS, VERSION };
