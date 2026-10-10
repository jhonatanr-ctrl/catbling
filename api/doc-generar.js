// POST /api/doc-generar  { sesionId, dificultad }
// Genera y valida EXACTAMENTE 15 preguntas ANTES de cobrar nada. El cobro de la
// entrada ocurre después, en la RPC doc_iniciar_examen (una sola vez).
import { ApiError, autenticar, manejar, readJson, rpc, send, UUID_RE } from './_lib/http.js';
import { getConfig } from './_lib/env.js';
import { generarPreguntas, IaError } from './_lib/gemini.js';

const HTTP = {
  saldo_insuficiente: 402, generacion_en_curso: 409, demasiado_rapido: 429, limite_generaciones: 429,
  demasiados_intentos: 429, ya_iniciada: 409, estado_invalido: 409, no_encontrada: 404,
};

export default manejar(async (req, res) => {
  const cfg = getConfig();
  const user = await autenticar(req);
  const { sesionId, dificultad } = await readJson(req);
  if (!UUID_RE.test(String(sesionId || '')) || !['facil', 'normal', 'dificil'].includes(dificultad)) throw new ApiError(400, 'datos_invalidos');

  const rsv = await rpc('doc_svc_reservar_generacion', { p_user: user.id, p_id: sesionId, p_dificultad: dificultad });
  if (!rsv.ok) throw new ApiError(HTTP[rsv.codigo] || 409, rsv.codigo, { saldo: rsv.saldo, coste: rsv.coste, faltan: rsv.faltan });
  if (rsv.codigo === 'ya_generadas') return send(res, 200, { ok: true, codigo: 'ya_generadas', coste: rsv.coste, sesion: rsv.sesion });

  const liberar = codigo => rpc('doc_svc_liberar_generacion', { p_user: user.id, p_id: sesionId, p_codigo: codigo }).catch(() => {});
  let gen;
  try { gen = await generarPreguntas(cfg, { texto: rsv.texto, dificultad }); }
  catch (e) {
    const codigo = e instanceof IaError ? e.codigo : 'error_interno';
    await liberar(codigo);
    throw new ApiError(e instanceof IaError ? e.status : 500, codigo);
  }

  const g = await rpc('doc_svc_guardar_preguntas', { p_user: user.id, p_id: sesionId, p_dificultad: dificultad, p_modelo: gen.modelo, p_preguntas: gen.preguntas });
  if (!g.ok) { await liberar(g.codigo); throw new ApiError(502, 'ia_respuesta_invalida'); }
  return send(res, 200, { ok: true, codigo: 'generadas', coste: rsv.coste, sesion: g.sesion });
});
