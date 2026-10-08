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

function armarPrompt(v, historia, en) {
  const cats = v.categorias.filter(c => c.top.length).slice(0, 8).map(c => {
    const r = c.resumen;
    const top = c.top.slice(0, 10).map(t => `  #${t.pos} ${t.tnf ? '[TNF] ' : ''}${txt(t.nombre)} (${txt(t.marca, 24) || 'sin marca'}) · $ ${n(t.precio)}`).join('\n');
    return `CATEGORÍA ${txt(c.nombre, 60).toUpperCase()} · The North Face en el top 20: ${n(r.tnfEnTop)} · mejor puesto: ${r.mejorPuestoTnf ? '#' + r.mejorPuestoTnf : 'ninguno'} · ` +
      `precio mediano TNF $ ${n(r.medianaTnf)} vs competencia $ ${n(r.medianaComp)} (${r.dif == null ? 'S/D' : (r.dif > 0 ? '+' : '') + Math.round(r.dif) + '%'}) · competidor líder: ${r.lider ? r.lider.marca + ' (' + r.lider.n + ')' : 'S/D'}\nTop 10:\n${top}`;
  }).join('\n\n');
  const marcas = v.marcas.slice(0, 8).map(m => `${m.marca}: ${m.apariciones} lugares (${Math.round(m.share)}%)`).join(' · ');
  const movs = v.productos.map(p => {
    const serie = historia.map(h => h.p && h.p[p.id] && h.p[p.id][4]).filter(x => x != null);
    if (serie.length < 2) return null;
    return `  - ${txt(p.nombre, 60)}: puesto ${serie[0]} → ${serie[serie.length - 1]} en ${serie.length} días`;
  }).filter(Boolean).slice(0, 12).join('\n');
  return `Sos un consultor senior de marketplaces y paid media en Argentina. Redactá un REPORTE AUTOMATIZADO de una página para el equipo de ecommerce de ${v.marca} sobre su desempeño en Mercado Libre Argentina, con datos del ${txt(v.fecha, 10)} (${historia.length} días de historia).

${cats}

Marcas con más lugares en los rankings: ${marcas}
Movimiento de puestos de productos ${v.marca}:\n${movs || '  sin historia suficiente'}

${en ? 'Write in clear English' : 'Respondé en español rioplatense, claro y para decidir'}, en markdown con exactamente estas secciones (títulos con ##)${en ? ' (translated: ## Summary, ## What worked, ## What did not work, ## What to try this week)' : ''}:
## Resumen
2 o 3 oraciones con lo más importante.
## Qué funcionó
3 a 4 bullets con números (puestos, precios, participación).
## Qué no funcionó
2 a 3 bullets con números.
## Qué probar esta semana
3 a 4 acciones numeradas y concretas (precios, pauta de Product Ads / CPC, catálogo, categorías).
Reglas: usá solo los datos de arriba; no inventes ventas, conversiones ni CPC reales (si algo es estimación, decilo); máximo 350 palabras.`;
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
      const guardado = await leer(blobs, 'reporte/' + fecha + (en ? '-en' : ''));
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
    const r = await pedirAnalisis(armarPrompt(vista(st), historia, en), { maxTokens: 900 });
    if (r.error) {
      console.error('tnf-reporte-ai:', r.motivo, r.error); // el detalle queda en los logs, no en la pantalla
      return responder(200, { error: 'La IA no está disponible en este momento.', motivo: r.motivo });
    }
    const reporte = { text: r.text, modelo: r.modelo, fecha, generado: new Date().toISOString() };
    await blobs.setJSON('reporte/' + fecha + (en ? '-en' : ''), reporte);
    return responder(200, reporte);
  } catch (e) {
    return responder(500, { error: e.message });
  }
};
