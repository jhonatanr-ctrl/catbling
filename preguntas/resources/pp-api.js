// pp-api.js — comunicación con Supabase (RPC doc_*, Storage) y con /api (Gemini).
// Reutiliza _supabaseRequest de resources/api.js y se registra en window.apiRpc.
(function () {
  'use strict';
  const C = window.PP_CONFIG;

  function rpc(nombre, args) {
    return _supabaseRequest(async () => {
      const { data, error } = await window.supabase.rpc(nombre, args || {});
      if (error) throw error;
      return data;
    }, nombre);
  }
  // Normaliza: {success:false} (red) => {ok:false, codigo:'error_red'}
  async function llamar(nombre, args) {
    const r = await rpc(nombre, args);
    if (!r.success) {
      const m = String(r.error || '');
      // Distingue red de fallo del servidor: antes TODO se mostraba como "error de red".
      if (/could not find the function|schema cache|PGRST202|42883|does not exist/i.test(m)) return { ok: false, codigo: 'migracion_pendiente' };
      if (/JWT|not authenticated|No autenticado|PGRST30/i.test(m)) return { ok: false, codigo: 'no_autenticado' };
      if (/fetch|network|NetworkError|timeout|Load failed/i.test(m)) return { ok: false, codigo: 'error_red' };
      return { ok: false, codigo: 'error_interno' };
    }
    return r.data && typeof r.data === 'object' ? r.data : { ok: false, codigo: 'error_interno' };
  }

  function apiUrl(nombre) {
    try { return new URL('api/' + nombre, CATBLING_CONFIG_ROOT).href; } catch (e) { return '/api/' + nombre; }
  }
  async function postApi(nombre, cuerpo) {
    const token = await apiGetToken();
    if (!token) return { ok: false, codigo: 'no_autenticado' };
    try {
      const r = await fetch(apiUrl(nombre), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json().catch(() => null);
      if (!j) return { ok: false, codigo: r.status === 404 ? 'servidor_no_disponible' : 'error_interno' };
      return j;
    } catch (e) { return { ok: false, codigo: 'error_red' }; }
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }

  async function subir(path, file, formato) {
    const { error } = await window.supabase.storage.from(C.BUCKET).upload(path, file, { contentType: C.FORMATOS[formato], upsert: false });
    if (error && !/already exists|duplicate/i.test(error.message || '')) return { ok: false, codigo: 'error_subida' };
    return { ok: true };
  }
  async function copiar(desde, hacia) {
    const { error } = await window.supabase.storage.from(C.BUCKET).copy(desde, hacia);
    if (error && !/already exists|duplicate/i.test(error.message || '')) return { ok: false, codigo: 'error_subida' };
    return { ok: true };
  }
  async function descargar(path) {
    const { data, error } = await window.supabase.storage.from(C.BUCKET).download(path);
    if (error || !data) return null;
    return data;
  }
  async function borrarArchivo(path) {
    if (!path) return;
    try { await window.supabase.storage.from(C.BUCKET).remove([path]); } catch (e) { /* mejor esfuerzo */ }
  }

  window.ppApi = {
    uuid, subir, copiar, descargar, borrarArchivo,
    crearSesion: (id, nombre, formato, tamano, origen) => llamar('doc_crear_sesion', { p_id: id, p_nombre: nombre, p_formato: formato, p_tamano: tamano, p_origen: origen || null }),
    listar: () => llamar('doc_listar_sesiones'),
    obtenerSesion: id => llamar('doc_obtener_sesion', { p_id: id }),
    obtenerTexto: id => llamar('doc_obtener_texto', { p_id: id }),
    iniciarExamen: (id, dif) => llamar('doc_iniciar_examen', { p_id: id, p_dificultad: dif }),
    obtenerExamen: id => llamar('doc_obtener_examen', { p_id: id }),
    responder: (id, preguntaId, indice) => llamar('doc_responder', { p_id: id, p_pregunta_id: preguntaId, p_indice: indice }),
    eliminar: id => llamar('doc_eliminar_sesion', { p_id: id }),
    procesar: sesionId => postApi('doc-procesar', { sesionId }),
    generar: (sesionId, dificultad) => postApi('doc-generar', { sesionId, dificultad }),
  };
  // Convención del proyecto: las RPC viven en window.apiRpc.
  if (window.apiRpc) Object.assign(window.apiRpc, {
    docCrearSesion: window.ppApi.crearSesion, docListarSesiones: window.ppApi.listar,
    docIniciarExamen: window.ppApi.iniciarExamen, docResponder: window.ppApi.responder,
  });
})();
