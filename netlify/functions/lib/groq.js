// Cliente compartido de Groq para todos los botones de IA del dashboard.
//
// Existe por un problema concreto: las cuatro funciones de IA pedían un modelo
// fijo por su nombre. Cuando Groq da de baja ese modelo, los cuatro botones
// dejan de responder a la vez y el error no llega a la pantalla. Acá el modelo
// se puede configurar por entorno, y si el pedido falla porque el modelo ya no
// existe, se le pregunta a Groq qué modelos tiene y se reintenta con uno vivo.

const API = 'https://api.groq.com/openai/v1';

// Orden de preferencia cuando hay que elegir un reemplazo. Lo que no esté en la
// lista igual sirve: si ninguno coincide se usa el primer modelo de chat que
// devuelva la cuenta.
const PREFERIDOS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'moonshotai/kimi-k2-instruct',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];

const MODELO_POR_DEFECTO = process.env.GROQ_MODEL || PREFERIDOS[0];

// Modelos que no sirven para un resumen de texto
const NO_CHAT = /whisper|tts|guard|prompt-?guard|embed/i;

function esProblemaDeModelo(mensaje, status) {
  if (status === 404) return true;
  return /decommission|does not exist|not found|no longer|unsupported|invalid.*model|model_not_found/i
    .test(mensaje || '');
}

async function pedir(modelo, prompt, maxTokens) {
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const crudo = await res.text();
  let data;
  try {
    data = JSON.parse(crudo);
  } catch {
    return { ok: false, status: res.status, mensaje: `respuesta no-JSON: ${crudo.slice(0, 200)}` };
  }
  if (!res.ok || data.error) {
    return { ok: false, status: res.status, mensaje: data?.error?.message || `HTTP ${res.status}` };
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return { ok: false, status: res.status, mensaje: 'la respuesta vino sin contenido' };
  return { ok: true, text, modelo };
}

async function modelosDisponibles() {
  const res = await fetch(`${API}/models`, {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data.data || []).map(m => m.id).filter(id => id && !NO_CHAT.test(id));
}

function elegirReemplazo(disponibles, yaProbado) {
  const preferido = PREFERIDOS.find(m => m !== yaProbado && disponibles.includes(m));
  return preferido || disponibles.find(m => m !== yaProbado) || null;
}

/**
 * Pide un texto a Groq.
 * Devuelve { text, modelo } o { error, motivo } — nunca lanza.
 */
async function pedirAnalisis(prompt, { maxTokens = 1200, modelo = MODELO_POR_DEFECTO } = {}) {
  if (!process.env.GROQ_API_KEY) {
    return {
      error: 'Falta la variable GROQ_API_KEY en el entorno de Netlify. ' +
             'Se carga en Site configuration → Environment variables.',
      motivo: 'sin-api-key',
    };
  }

  let r;
  try {
    r = await pedir(modelo, prompt, maxTokens);
  } catch (e) {
    return { error: 'No se pudo contactar a Groq: ' + e.message, motivo: 'sin-red' };
  }
  if (r.ok) return { text: r.text, modelo: r.modelo };

  // Si el modelo configurado ya no existe, buscamos uno vivo en la cuenta.
  if (esProblemaDeModelo(r.mensaje, r.status)) {
    let disponibles = [];
    try {
      disponibles = await modelosDisponibles();
    } catch { /* nos quedamos con el error original */ }

    const reemplazo = elegirReemplazo(disponibles, modelo);
    if (reemplazo) {
      try {
        const r2 = await pedir(reemplazo, prompt, maxTokens);
        if (r2.ok) return { text: r2.text, modelo: r2.modelo, modeloOriginal: modelo, reemplazado: true };
        return {
          error: `El modelo «${modelo}» no está disponible y el reemplazo «${reemplazo}» falló: ${r2.mensaje}`,
          motivo: 'modelo-caido',
        };
      } catch (e) {
        return { error: 'No se pudo contactar a Groq con el modelo de reemplazo: ' + e.message, motivo: 'sin-red' };
      }
    }
    return {
      error: `El modelo «${modelo}» no está disponible en Groq (${r.mensaje}) y no se encontró reemplazo. ` +
             'Se puede fijar otro con la variable GROQ_MODEL.',
      motivo: 'modelo-caido',
    };
  }

  // Clave inválida, límite de uso, o cualquier otro rechazo: se pasa tal cual.
  return { error: 'Groq rechazó el pedido: ' + r.mensaje, motivo: 'error-groq' };
}

module.exports = { pedirAnalisis, PREFERIDOS, MODELO_POR_DEFECTO };
