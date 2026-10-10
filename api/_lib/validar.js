// Validación estricta de lo que devuelve la IA. Nada llega a la base de datos
// sin pasar por aquí (y la base de datos vuelve a validar: 15 x 3 opciones, índice 0..2).
import { randomInt } from 'node:crypto';

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// Opciones que vuelven ambigua una pregunta de respuesta única.
const OPCION_PROHIBIDA = /^(todas|ninguna|ambas|las dos|a y b|b y c|a y c|all of the above|none of the above|both)\b/;

function jaccard(a, b) {
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i || 1);
}

export function validarPreguntas(raw, textoDocumento) {
  const problemas = [];
  const lista = raw && Array.isArray(raw.preguntas) ? raw.preguntas : null;
  if (!lista) return { ok: false, problemas: ['La respuesta no contiene el arreglo "preguntas".'] };
  if (lista.length !== 15) problemas.push(`Se esperaban EXACTAMENTE 15 preguntas y llegaron ${lista.length}.`);

  const docNorm = norm(textoDocumento);
  const out = []; const vistos = [];
  lista.forEach((p, i) => {
    const n = i + 1;
    const enun = typeof p?.enunciado === 'string' ? p.enunciado.trim() : '';
    const ops = Array.isArray(p?.opciones) ? p.opciones.map(o => (typeof o === 'string' ? o.trim() : '')) : [];
    const idx = p?.indice_correcto;
    const expl = typeof p?.explicacion === 'string' ? p.explicacion.trim() : '';
    if (enun.length < 10 || enun.length > 500) problemas.push(`Pregunta ${n}: enunciado vacío o fuera de 10–500 caracteres.`);
    if (ops.length !== 3) problemas.push(`Pregunta ${n}: debe tener exactamente 3 opciones.`);
    else {
      if (ops.some(o => o.length < 1 || o.length > 250)) problemas.push(`Pregunta ${n}: opción vacía o demasiado larga.`);
      if (new Set(ops.map(norm)).size !== 3) problemas.push(`Pregunta ${n}: opciones repetidas.`);
      if (ops.some(o => OPCION_PROHIBIDA.test(norm(o)))) problemas.push(`Pregunta ${n}: no uses "todas/ninguna de las anteriores" ni combinaciones.`);
    }
    if (!Number.isInteger(idx) || idx < 0 || idx > 2) problemas.push(`Pregunta ${n}: indice_correcto debe ser 0, 1 o 2.`);
    if (expl.length < 10 || expl.length > 1000) problemas.push(`Pregunta ${n}: explicación vacía o fuera de 10–1000 caracteres.`);
    const en = norm(enun);
    if (vistos.some(v => v === en || jaccard(v, en) > 0.8)) problemas.push(`Pregunta ${n}: repetida o casi idéntica a otra.`);
    vistos.push(en);

    // Referencia: sólo se conserva si el fragmento existe realmente en el documento.
    let ref = typeof p?.referencia === 'string' ? p.referencia.trim().slice(0, 300) : '';
    if (ref && !docNorm.includes(norm(ref).slice(0, 120))) ref = '';
    out.push({ enunciado: enun, opciones: ops, indice_correcto: idx, explicacion: expl, referencia: ref || null });
  });
  if (problemas.length) return { ok: false, problemas };
  return { ok: true, preguntas: out, problemas: [] };
}

// Fisher–Yates con crypto: evita el sesgo de posición típico de los LLM
// (la correcta casi siempre en la misma letra) y recalcula el índice correcto.
export function barajarOpciones(preguntas) {
  return preguntas.map(p => {
    const orden = [0, 1, 2];
    for (let i = 2; i > 0; i--) { const j = randomInt(i + 1); [orden[i], orden[j]] = [orden[j], orden[i]]; }
    return { ...p, opciones: orden.map(k => p.opciones[k]), indice_correcto: orden.indexOf(p.indice_correcto) };
  });
}
