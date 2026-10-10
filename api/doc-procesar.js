// POST /api/doc-procesar  { sesionId }
// Descarga el documento del bucket privado, lo valida y extrae su texto.
// La sesión sólo pasa a 'listo' si el procesamiento fue correcto; si falla queda
// en 'error' (reintentable) y NO se cobra nada (aquí no se toca el saldo).
import { ApiError, autenticar, admin, manejar, readJson, rpc, send, UUID_RE } from './_lib/http.js';
import { getConfig } from './_lib/env.js';
import { extraer, ExtractError } from './_lib/extract.js';

const HTTP = { en_proceso: 409, demasiados_intentos: 429, archivo_no_encontrado: 404, no_encontrada: 404 };

export default manejar(async (req, res) => {
  const cfg = getConfig();
  const user = await autenticar(req);
  const { sesionId } = await readJson(req);
  if (!UUID_RE.test(String(sesionId || ''))) throw new ApiError(400, 'datos_invalidos');

  const t = await rpc('doc_svc_comenzar_procesamiento', { p_user: user.id, p_id: sesionId });
  if (!t.ok) throw new ApiError(HTTP[t.codigo] || 409, t.codigo);
  if (t.codigo === 'ya_procesada') return send(res, 200, { ok: true, codigo: 'ya_procesada', sesion: t.sesion });

  const fallar = async (codigo, status) => {
    await rpc('doc_svc_marcar_error', { p_user: user.id, p_id: sesionId, p_codigo: codigo }).catch(() => {});
    throw new ApiError(status, codigo);
  };

  let buf;
  try {
    const { data, error } = await admin().storage.from(cfg.bucket).download(t.storage_path);
    if (error || !data) {
      const noExiste = /not.?found|404|does not exist/i.test(`${error?.message || ''} ${error?.statusCode || ''} ${error?.status || ''}`);
      return await fallar(noExiste ? 'archivo_no_encontrado' : 'almacenamiento_no_disponible', noExiste ? 404 : 503);
    }
    buf = Buffer.from(await data.arrayBuffer());
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return await fallar('almacenamiento_no_disponible', 503);
  }

  let r;
  try { r = await extraer(buf, t.formato, cfg); }
  catch (e) {
    if (e instanceof ExtractError) return await fallar(e.codigo, e.codigo === 'tiempo_agotado' ? 504 : 422);
    console.error('[doc-procesar] extracción:', e && e.message);
    return await fallar('error_interno', 500);
  }

  const g = await rpc('doc_svc_guardar_texto', { p_user: user.id, p_id: sesionId, p_texto: r.texto, p_paginas: r.paginas });
  if (!g.ok) throw new ApiError(409, g.codigo);
  return send(res, 200, { ok: true, codigo: 'lista', sesion: g.sesion });
});
