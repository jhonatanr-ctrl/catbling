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
        errorMessage = 'Se alcanzó temporalmente el límite de envío de correos de verificación. No realices más intentos por ahora. Espera un momento y vuelve a intentarlo.';
      } else if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
        errorMessage = 'Este correo ya está registrado. Inicia sesión en lugar de registrarte.';
      } else if (lowerMsg.includes('invalid email')) {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (lowerMsg.includes('weak password') || lowerMsg.includes('password too weak') || lowerMsg.includes('password too short')) {
        errorMessage = 'La contraseña es demasiado débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.';
      } else if (lowerMsg.includes('invalid credentials') || lowerMsg.includes('invalid login')) {
        errorMessage = 'Credenciales inválidas.';
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
      throw new Error('Error desconocido al registrar');
    }
  });
}

async function apiLogin(email, password) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
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

async function rpcRegistrarRondaPreguntas(dificultad, area, preguntasTotal, correctas, monedasGanadas) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_ronda_preguntas', {
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

async function rpcRegistrarRespuestaPregunta(dificultad, esCorrecta) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_respuesta_pregunta', {
      p_dificultad: dificultad,
      p_es_correcta: esCorrecta
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_respuesta_pregunta');
}

// RPC genérica ya existente (usada también por compra_tienda/apuesta_casino/
// recarga_gratis). Se reutiliza para el motivo 'entrada_pregunta' — costo de
// entrada de la ronda de Preguntas, cobrado una sola vez al iniciarla.
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

// Exponer RPCs globalmente para que los juegos las usen directamente
window.apiRpc = {
  reclamarRecargaGratis: rpcReclamarRecargaGratis,
  comprarItem: rpcComprarItem,
  registrarRondaPreguntas: rpcRegistrarRondaPreguntas,
  registrarRespuestaPregunta: rpcRegistrarRespuestaPregunta,
  transaccionMonedas: rpcTransaccionMonedas,
  registrarSesionCasino: rpcRegistrarSesionCasino,
  getMonedas: rpcGetMonedas
};
