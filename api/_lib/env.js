// Configuración del backend. TODO viene de variables de entorno del servidor
// (Vercel → Settings → Environment Variables, o .env en local). Nada de esto se
// expone jamás al navegador.
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

export function getConfig() {
  const e = process.env;
  return {
    supabaseUrl: e.SUPABASE_URL || '',
    serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY || '',
    geminiKey: e.GEMINI_API_KEY || '',
    geminiBase: (e.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/+$/, ''),
    // Primer modelo = principal; el resto, respaldo ante cuota agotada / error.
    geminiModels: (e.GEMINI_MODELS || 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite')
      .split(',').map(s => s.trim()).filter(Boolean),
    geminiTimeoutMs: num(e.GEMINI_TIMEOUT_MS, 40000),
    // Presupuesto total de una petición (Vercel maxDuration = 60 s en vercel.json).
    deadlineMs: num(e.DOC_DEADLINE_MS, 55000),
    bucket: e.DOC_BUCKET || 'documentos-catbling',
    maxFileBytes: num(e.DOC_MAX_FILE_BYTES, 5 * 1024 * 1024),
    maxPages: num(e.DOC_MAX_PAGES, 60),
    maxTextChars: num(e.DOC_MAX_TEXT_CHARS, 80000),
    minTextChars: num(e.DOC_MIN_TEXT_CHARS, 800),
  };
}
