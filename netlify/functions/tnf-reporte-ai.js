// Reporte automatizado con IA del demo The North Face (botón "Crear reporte automatizado con IA").
//
// GET [?nuevo=1] → { text, modelo, fecha, cache } | { ejemplo: true } | { error, motivo }
//
// - El prompt se arma ACÁ con los datos del último relevamiento guardado: el navegador no manda
//   datos ni texto, así que nadie puede usar este endpoint como chat libre de IA.
// - El reporte se guarda por fecha de relevamiento: los visitantes leen el mismo reporte en caché
//   y la IA se llama una sola vez por relevamiento. "nuevo=1" (regenerar) es solo admin.
// - Límites contra abuso: pocas generaciones por IP y por día, y un tope diario global.
// - Si todavía no hay un relevamiento real → { ejemplo: true } y la página muestra un reporte de ejemplo.
//
// Variables de entorno: GROQ_API_KEY (la misma de Frankie Analytics), GROQ_MODEL (opcional).

const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { pedirAnalisis } = require('./lib/groq');
const { vista } = require('./lib/tnf-ml');
const { tiendaTnf, leer, leerDia } = require('./lib/tnf-ml-tienda');
const { esAdmin } = require('./lib/admin-auth');

const POR_IP_DIA = 3;
const GLOBAL_DIA = 40;

const responder = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});
const n = v => (v == null || isNaN(v) ? 'S/D' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 }));
const txt = (s, max = 80) => String(s ?? '').replace(/\s+/g, ' ').slice(0, max);
const hoy = () => new Date().toISOString().slice(0, 10);

// Correlación de rangos (Spearman): ¿el precio relativo explica el puesto?
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 5) return null;
  const rangos = a => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(n);
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const rx = rangos(xs), ry = rangos(ys), m = (n + 1) / 2;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (rx[i] - m) * (ry[i] - m); dx += (rx[i] - m) ** 2; dy += (ry[i] - m) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}
const mediana = xs => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const pct = d => (d == null ? 'S/D' : (d > 0 ? '+' : '') + Math.round(d) + '%');

function armarPrompt(v, historia, en) {
  const cats = v.categorias.filter(c => c.top.length).slice(0, 10);
  const bloques = cats.map(c => {
    const r = c.resumen;
    const top = c.top.slice(0, 10).map(t => `  #${t.pos} ${t.tnf ? '[TNF] ' : ''}${txt(t.nombre)} (${txt(t.marca, 24) || 'sin marca'}) · ${t.stock === 'sin' ? 'SIN STOCK' : '$ ' + n(t.precio)}`).join('\n');
    return `CATEGORÍA ${txt(c.nombre, 60).toUpperCase()} · TNF en el top 20: ${n(r.tnfEnTop)} · mejor puesto: ${r.mejorPuestoTnf ? '#' + r.mejorPuestoTnf : 'ninguno'} · ` +
      `precio mediano TNF $ ${n(r.medianaTnf)} vs competencia $ ${n(r.medianaComp)} (índice ${r.dif == null ? 'S/D' : Math.round(100 + r.dif)}) · ` +
      `sin stock: ${n(r.sinStock)} de ${n(r.n)} (TNF ${n(r.sinStockTnf)}) · competidor líder: ${r.lider ? r.lider.marca + ' (' + r.lider.n + ')' : 'S/D'}\nTop 10:\n${top}`;
  }).join('\n\n');

  // Análisis: precio relativo a la categoría contra puesto
  const puntos = [];
  cats.forEach(c => {
    const med = mediana(c.top.map(t => t.precio));
    if (med) c.top.forEach(t => { if (Number.isFinite(t.precio)) puntos.push([t.pos, t.precio / med * 100, t.tnf]); });
  });
  const rho = spearman(puntos.map(p => p[0]), puntos.map(p => p[1]));
  const tnfIdx = mediana(puntos.filter(p => p[2]).map(p => p[1]));

  // Dispersión de precios entre vendedores del mismo producto TNF
  const disp = v.productos.filter(p => p.n >= 2 && p.min && p.max).map(p => ({ p, sp: (p.max / p.min - 1) * 100 })).sort((a, b) => b.sp - a.sp);
  const dispTxt = disp.slice(0, 6).map(x => `  - ${txt(x.p.nombre, 60)}: ${x.p.n} vendedores, de $ ${n(x.p.min)} a $ ${n(x.p.max)} (+${Math.round(x.sp)}%)`).join('\n');
  const sinStockTnf = v.productos.filter(p => p.estado === 'sinStock' && p.posiciones.length).slice(0, 8).map(p => `  - ${txt(p.nombre, 60)} (#${Math.min(...p.posiciones.map(x => x.pos))} en ${txt(p.categoria, 30)})`).join('\n');

  const marcas = v.marcas.slice(0, 8).map(m => `${m.marca}: ${m.apariciones} lugares (${Math.round(m.share)}%), ${m.top3} en el top 3`).join(' · ');
  const movs = v.productos.map(p => {
    const serie = historia.map(h => h.p && h.p[p.id] && h.p[p.id][4]).filter(x => x != null);
    if (serie.length < 2) return null;
    return `  - ${txt(p.nombre, 60)}: puesto ${serie[0]} → ${serie[serie.length - 1]} en ${serie.length} días`;
  }).filter(Boolean).slice(0, 12).join('\n');
  const st = v.stock || {};

  const secciones = en
    ? '## Executive summary\n## Ranking position\n## Price and competitiveness\n## Stock and availability\n## Competitors\n## Risks and opportunities\n## Action plan (next 7 days)'
    : '## Resumen ejecutivo\n## Posicionamiento en los rankings\n## Precio y competitividad\n## Stock y disponibilidad\n## Competencia\n## Riesgos y oportunidades\n## Plan de acción (próximos 7 días)';

  return `Sos un consultor senior de marketplaces y paid media en Argentina. Redactá un REPORTE AUTOMATIZADO completo para el equipo de ecommerce de ${v.marca} sobre su desempeño en Mercado Libre Argentina, con datos del ${txt(v.fecha, 10)} (${historia.length} días de historia).

${bloques}

RESUMEN GLOBAL
- Lugares del top 20 sin stock: ${n(st.sinStock)} de ${n(st.lugares)} (TNF: ${n(st.sinStockTnf)} de ${n(st.lugaresTnf)}).
- Marcas con más lugares: ${marcas}
- Índice de precio mediano de TNF contra su categoría (100 = mediana de la categoría): ${tnfIdx == null ? 'S/D' : Math.round(tnfIdx)}.
- Correlación de rangos entre puesto y precio relativo (Spearman, ${puntos.length} productos): ${rho == null ? 'S/D' : rho.toFixed(2)} (positivo = los más caros quedan más abajo).
Productos TNF del top 20 sin stock:\n${sinStockTnf || '  ninguno'}
Dispersión de precios entre vendedores de un mismo producto TNF:\n${dispTxt || '  sin datos de varios vendedores'}
Movimiento de puestos de productos ${v.marca}:\n${movs || '  sin historia suficiente'}

${en ? 'Write in clear English' : 'Respondé en español rioplatense, claro y para decidir'}, en markdown con exactamente estas secciones (títulos con ##):
${secciones}
En cada sección: 2 a 4 bullets con números concretos de arriba (puestos, precios, índices, cantidades sin stock) y qué significan para el negocio. El resumen ejecutivo va en 3 oraciones. El plan de acción tiene 4 a 5 acciones numeradas, con responsable sugerido (pricing, catálogo, stock, paid media) y el indicador para medirla.
Reglas: usá solo los datos de arriba; no inventes ventas, conversiones ni CPC reales (si algo es estimación, decilo); explicá la correlación en palabras simples; si un dato dice S/D, decilo en vez de suponer; máximo 650 palabras.`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return responder(405, { error: 'Método no permitido' });
  const q = event.queryStringParameters || {};
  const nuevo = q.nuevo === '1';
  const en = q.lang === 'en';
  if (nuevo && !esAdmin(event)) return responder(401, { error: 'Solo el admin puede regenerar el reporte.' });

  let store, blobs;
  try {
    store = tiendaTnf(event);
    connectLambda(event);
    blobs = getStore('tnf-ai');
  } catch (e) {
    return responder(503, { error: 'Netlify Blobs no está disponible: ' + e.message });
  }

  try {
    const { blobs: series = [] } = (await store.list({ prefix: 'serie/' })) || {};
    const fechas = series.map(b => b.key.slice(6)).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
    const fecha = fechas[fechas.length - 1];
    if (!fecha) return responder(200, { ejemplo: true });

    if (!nuevo) {
      const guardado = await leer(blobs, 'reporte/v2/' + fecha + (en ? '-en' : ''));
      if (guardado && guardado.text) return responder(200, { ...guardado, cache: true });
    }

    // Límites de uso (solo cuando hay que llamar a la IA)
    if (!esAdmin(event)) {
      const dia = hoy();
      const ip = String(event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'sin-ip').split(',')[0].trim();
      const kIp = `uso/${dia}/${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24)}`;
      const kGlobal = `uso/${dia}/global`;
      const [uIp, uGlobal] = await Promise.all([leer(blobs, kIp), leer(blobs, kGlobal)]);
      if ((uGlobal?.n || 0) >= GLOBAL_DIA) return responder(429, { error: 'Hoy se alcanzó el límite de reportes del demo. Probá mañana.' });
      if ((uIp?.n || 0) >= POR_IP_DIA) return responder(429, { error: 'Alcanzaste el límite de reportes de hoy. Probá mañana.' });
      await Promise.all([blobs.setJSON(kIp, { n: (uIp?.n || 0) + 1 }), blobs.setJSON(kGlobal, { n: (uGlobal?.n || 0) + 1 })]);
    }

    const st = await leerDia(store, fecha);
    if (!st) return responder(200, { ejemplo: true });
    const historia = (await Promise.all(fechas.slice(-30).map(f => leer(store, 'serie/' + f)))).filter(Boolean);
    const r = await pedirAnalisis(armarPrompt(vista(st), historia, en), { maxTokens: 1800 });
    if (r.error) {
      console.error('tnf-reporte-ai:', r.motivo, r.error); // el detalle queda en los logs, no en la pantalla
      return responder(200, { error: 'La IA no está disponible en este momento.', motivo: r.motivo });
    }
    const reporte = { text: r.text, modelo: r.modelo, fecha, generado: new Date().toISOString() };
    await blobs.setJSON('reporte/v2/' + fecha + (en ? '-en' : ''), reporte);
    return responder(200, reporte);
  } catch (e) {
    return responder(500, { error: e.message });
  }
};
