// api.js — Cliente API unificado (Supabase Auth + RPCs)
// Mantiene las mismas firmas que la versión PHP para compatibilidad con config.js y juegos

// ─── Utilidad interna ────────────────────────────────────────
async function _supabaseRequest(fn, rpcName) {
  try {
    // fn() ya consulta Supabase, ya maneja su propio {data,error} y ya
    // lanza (throw) si Supabase reporta error. El valor resuelto aquí
    // ES el objeto de dominio final (ej. {ok, nuevo_saldo}, {monedas}),
    // no la respuesta cruda de Supabase — no debe volver a destructurarse.
    const result = await fn();
    return { success: true, data: result };
  } catch (e) {
    console.error('[CATBLING][ECONOMIA] Supabase RPC exception', {
      rpc: rpcName,
      name: e.name,
      message: e.message,
      stack: e.stack
    });
    return { success: false, error: e.message };
  }
}

// ─── Sesión / Autenticación ──────────────────────────────────────────
async function apiGetToken() {
  const { data: { session } } = await window.supabase?.auth?.getSession?.() || { data: { session: null } };
  return session?.access_token ?? null;
}

async function apiGetUser() {
  const { data: { user } } = await window.supabase?.auth?.getUser?.() || { data: { user: null } };
  return user ?? null;
}

async function apiIsAuthenticated() {
  const { data: { session } } = await window.supabase?.auth?.getSession?.() || { data: { session: null } };
  return !!session;
}

async function apiLogout() {
  const { error } = await window.supabase?.auth?.signOut?.();
  localStorage.removeItem('catbling-auth');
  if (error) throw error;
}

// ─── Auth ────────────────────────────────────────────────────
async function apiRegister(username, email, password) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: username },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) {
      // Parse Supabase error messages for user-friendly messages
      const lowerMsg = error.message.toLowerCase();
      let errorMessage = error.message;
      
      if (lowerMsg.includes('rate limit')) {
        errorMessage = (typeof __ === 'function') ? __('error_rate_limit_registro') : 'Se alcanzó temporalmente el límite de envío de correos de verificación. No realices más intentos por ahora. Espera un momento y vuelve a intentarlo.';
      } else if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
        errorMessage = (typeof __ === 'function') ? __('error_correo_ya_registrado') : 'Este correo ya está registrado. Inicia sesión en lugar de registrarte.';
      } else if (lowerMsg.includes('invalid email')) {
        errorMessage = (typeof __ === 'function') ? __('error_correo_invalido') : 'El correo electrónico no es válido.';
      } else if (lowerMsg.includes('weak password') || lowerMsg.includes('password too weak') || lowerMsg.includes('password too short')) {
        errorMessage = (typeof __ === 'function') ? __('error_contrasena_debil') : 'La contraseña es demasiado débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.';
      } else if (lowerMsg.includes('invalid credentials') || lowerMsg.includes('invalid login')) {
        errorMessage = (typeof __ === 'function') ? __('error_credenciales_invalidas') : 'Credenciales inválidas.';
      }
      
      throw new Error(errorMessage);
    }
    
    // Check if user was created but email confirmation is required (session is null)
    const needsEmailConfirmation = data.user && !data.session;
    
    if (data.user && data.session) {
      // Supabase ya persiste la sesión completa en `catbling-auth`.
      // No se debe reemplazar por un objeto parcial porque perdería los
      // metadatos necesarios para restaurar y renovar la sesión.
      return { 
        user: data.user, 
        session: data.session,
        needsEmailConfirmation: false
      };
    } else if (needsEmailConfirmation) {
      // User created but email confirmation required
      return { 
        user: data.user, 
        session: null,
        needsEmailConfirmation: true,
        email: email
      };
    } else {
      throw new Error((typeof __ === 'function') ? __('error_desconocido_registro', 'Error desconocido al registrar') : 'Error desconocido al registrar');
    }
  });
}

async function apiLogin(email, password) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      // A diferencia de apiRegister, este mapeo de mensajes no existía
      // aquí: cualquier error de login llegaba al usuario en inglés y
      // sin traducir (p. ej. "Email not confirmed" o "Invalid login
      // credentials" tal cual los devuelve Supabase). Esto es, en la
      // práctica, buena parte de lo que se percibía como "intentar
      // iniciar sesión nuevamente puede producir un error": no es un
      // fallo de la sesión, sino un mensaje crudo sin traducir — más
      // notorio justo después de registrarse si el proyecto tiene
      // habilitada la confirmación de correo (Authentication → Providers
      // → Email → "Confirm email") y la cuenta nueva intenta iniciar
      // sesión antes de confirmar el correo.
      const lowerMsg = error.message.toLowerCase();
      let errorMessage = error.message;

      if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('email_not_confirmed')) {
        errorMessage = (typeof __ === 'function') ? __('error_correo_no_confirmado') : 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada (y spam).';
      } else if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid credentials')) {
        errorMessage = (typeof __ === 'function') ? __('error_correo_o_contrasena_incorrectos') : 'Correo o contraseña incorrectos.';
      } else if (lowerMsg.includes('rate limit')) {
        errorMessage = (typeof __ === 'function') ? __('error_demasiados_intentos') : 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
      } else if (lowerMsg.includes('invalid email')) {
        errorMessage = (typeof __ === 'function') ? __('error_correo_invalido') : 'El correo electrónico no es válido.';
      }

      throw new Error(errorMessage);
    }
    // Supabase persiste la sesión completa mediante el cliente configurado.
    return { user: data.user, session: data.session };
  });
}

async function apiLoginWithOAuth(provider, redirectTo) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) throw error;
    return { data };
  });
}

async function apiForgotPassword(email) {
  return _supabaseRequest(async () => {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/principalpage.html'
    });
    if (error) throw error;
    return { message: 'Email de recuperación enviado' };
  });
}

async function apiResetPassword(password) {
  return _supabaseRequest(async () => {
    const { error } = await window.supabase.auth.updateUser({ password });
    if (error) throw error;
    return { message: 'Contraseña actualizada' };
  });
}

// ─── Configuración (idioma, volumen, animaciones) ────────────
async function apiGetConfig() {
  return _supabaseRequest(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await window.supabase
      .from('profiles')
      .select('idioma, vol_musica, vol_efectos, animaciones')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { config: data };
  });
}

async function apiSetConfig(config) {
  return _supabaseRequest(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const allowed = ['idioma', 'vol_musica', 'vol_efectos', 'animaciones'];
    const updates = {};
    for (const key of allowed) {
      if (config[key] !== undefined) updates[key] = config[key];
    }
    if (Object.keys(updates).length === 0) throw new Error('Nada que actualizar');

    const { error } = await window.supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    return { success: true };
  });
}

// ─── Monedas ─────────────────────────────────────────────────
async function apiGetCoins() {
  // NOTA: apiGetCoins() usaba window.supabase.rpc('get_monedas'), pero esa
  // función NO existe en el SQL del proyecto (verificado contra
  // supabase/migrations/001_initial_schema.sql: no hay ninguna
  // "CREATE FUNCTION get_monedas"). Cada llamada fallaba silenciosamente
  // (RPC inexistente), lo que impedía que coinsAPI.fetch() actualizara
  // caché/UI en preguntas, tienda, casino y recarga, aunque el saldo real
  // en profiles.monedas sí se modificaba correctamente en Supabase.
  // Se usa la consulta REST directa (misma política RLS profiles_select_own,
  // auth.uid() = id, ya verificada correcta), que es la misma implementación
  // de apiGetCoinsREST() más abajo en este archivo.
  return _supabaseRequest(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await window.supabase
      .from('profiles')
      .select('monedas')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { monedas: data?.monedas ?? 0 };
  }, 'apiGetCoins (REST)');
}

// Fallback REST API (legacy)
async function apiGetCoinsREST() {
  return _supabaseRequest(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await window.supabase
      .from('profiles')
      .select('monedas')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { monedas: data?.monedas ?? 0 };
  });
}

async function apiSetCoins(monedas) {
  return { success: false, error: 'Operación no permitida. Usa RPCs: reclamar_recarga_gratis, comprar_item, registrar_ronda_preguntas, registrar_sesion_casino' };
}

// ─── Petición genérica (compatibilidad) ──────────────────────
async function apiRequest(endpoint, body) {
  return { success: false, error: `Endpoint legacy no soportado: ${endpoint}` };
}

// ─── RPCs de monedas (nuevas, para uso directo desde juegos) ──
async function rpcReclamarRecargaGratis() {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('reclamar_recarga_gratis');
    if (error) throw error;
    return data[0];
  }, 'reclamar_recarga_gratis');
}

async function rpcComprarItem(itemId, cantidad = 1) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('comprar_item', {
      p_item_id: itemId,
      p_cantidad: cantidad
    });
    if (error) throw error;
    return data[0];
  }, 'comprar_item');
}

async function rpcRegistrarRondaPreguntas(nivelAcademico, dificultad, area, preguntasTotal, correctas, monedasGanadas) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_ronda_preguntas', {
      p_nivel_academico: nivelAcademico,
      p_dificultad: dificultad,
      p_area: area,
      p_preguntas_total: preguntasTotal,
      p_correctas: correctas,
      p_monedas_ganadas: monedasGanadas
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_ronda_preguntas');
}

// Ya NO se envía un booleano "es_correcta": el servidor determina la
// corrección comparando p_indice_elegido contra su propia copia del
// índice correcto (tabla respuestas_correctas, no legible desde el
// cliente). Requiere haber llamado antes a marcarPreguntaServida con el
// MISMO preguntaId (ver rpcMarcarPreguntaServida más abajo).
async function rpcRegistrarRespuestaPregunta(nivelAcademico, dificultad, preguntaId, indiceElegido) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_respuesta_pregunta', {
      p_nivel_academico: nivelAcademico,
      p_dificultad: dificultad,
      p_pregunta_id: preguntaId,
      p_indice_elegido: indiceElegido
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_respuesta_pregunta');
}

// Debe llamarse justo cuando se muestra una pregunta en pantalla, ANTES
// de que el usuario pueda responderla. Arranca en servidor el mínimo de
// tiempo de lectura (1.2s) y registra qué pregunta concreta se le
// mostró, para que registrar_respuesta_pregunta pueda exigir que la
// respuesta corresponda a algo realmente servido.
async function rpcMarcarPreguntaServida(nivelAcademico, dificultad, preguntaId) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('marcar_pregunta_servida', {
      p_nivel_academico: nivelAcademico,
      p_dificultad: dificultad,
      p_pregunta_id: preguntaId
    });
    if (error) throw error;
    return data[0];
  }, 'marcar_pregunta_servida');
}

// Costo de entrada de la ronda de Preguntas, cobrado una sola vez al
// iniciarla. RPC dedicada (ya NO se reutiliza transaccion_monedas con el
// motivo 'entrada_pregunta', que esa función nunca aceptó — el costo se
// calcula y valida enteramente en servidor a partir de la dificultad).
async function rpcCobrarEntradaPreguntaRonda(dificultad) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('cobrar_entrada_pregunta_ronda', {
      p_dificultad: dificultad
    });
    if (error) throw error;
    return data[0];
  }, 'cobrar_entrada_pregunta_ronda');
}

async function rpcObtenerDominioActual(nivelAcademico, dificultad) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('obtener_dominio_actual', {
      p_nivel_academico: nivelAcademico,
      p_dificultad: dificultad
    });
    if (error) throw error;
    return data[0];
  }, 'obtener_dominio_actual');
}

// RPC genérica ya existente (usada por compra_tienda/apuesta_casino/
// recarga_gratis).
async function rpcTransaccionMonedas(delta, motivo, ref) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('transaccion_monedas', {
      p_delta: delta,
      p_motivo: motivo,
      p_ref: ref
    });
    if (error) throw error;
    return data[0];
  }, 'transaccion_monedas');
}

async function rpcRegistrarSesionCasino(juego, apuesta, resultadoMonedas, gano) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_sesion_casino', {
      p_juego: juego,
      p_apuesta: apuesta,
      p_resultado_monedas: resultadoMonedas,
      p_gano: gano
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_sesion_casino');
}

async function rpcGetMonedas() {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('get_monedas');
    if (error) throw error;
    return data[0] ?? { monedas: 0 };
  }, 'get_monedas');
}

// ---------------------------------------------------------------------
// Carreras — apuesta por puesto (Fase 7): a diferencia de
// rpcRegistrarSesionCasino, estas dos RPC nunca reciben del cliente
// "cuánto gané" ni el costo/multiplicador — sólo la clasificación real
// (para registrarla) y el caballo/puestos elegidos (para liquidar
// contra esa clasificación ya guardada). Ver 006_carreras_apuesta_puesto_segura.sql.
// ---------------------------------------------------------------------
async function rpcRegistrarResultadoCarrera(clasificacion) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_resultado_carrera', {
      p_clasificacion: clasificacion
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_resultado_carrera');
}

async function rpcLiquidarApuestaPuestoCarrera(resultadoId, caballoId, puestosSeleccionados) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('liquidar_apuesta_puesto_carrera', {
      p_resultado_id: resultadoId,
      p_caballo_id: caballoId,
      p_puestos_seleccionados: puestosSeleccionados
    });
    if (error) throw error;
    return data[0];
  }, 'liquidar_apuesta_puesto_carrera');
}

// Exponer RPCs globalmente para que los juegos las usen directamente
window.apiRpc = {
  reclamarRecargaGratis: rpcReclamarRecargaGratis,
  comprarItem: rpcComprarItem,
  registrarRondaPreguntas: rpcRegistrarRondaPreguntas,
  registrarRespuestaPregunta: rpcRegistrarRespuestaPregunta,
  marcarPreguntaServida: rpcMarcarPreguntaServida,
  cobrarEntradaPreguntaRonda: rpcCobrarEntradaPreguntaRonda,
  obtenerDominioActual: rpcObtenerDominioActual,
  transaccionMonedas: rpcTransaccionMonedas,
  registrarSesionCasino: rpcRegistrarSesionCasino,
  getMonedas: rpcGetMonedas,
  registrarResultadoCarrera: rpcRegistrarResultadoCarrera,
  liquidarApuestaPuestoCarrera: rpcLiquidarApuestaPuestoCarrera
};
