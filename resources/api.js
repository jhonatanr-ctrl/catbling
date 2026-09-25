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

// ─── Política mínima de contraseña (registro y restablecimiento) ─────
// Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo. Esta validación en
// cliente es sólo la primera barrera: debe existir la misma exigencia en
// Supabase Auth (Authentication → Sign In / Providers → Email → longitud mínima
// 8 y "Password requirements"); un cliente modificado puede saltarse el JS.
const CATBLING_PASSWORD_MIN_LENGTH = 8;
// Mismo conjunto de símbolos que usa Supabase Auth para "symbols".
const CATBLING_PASSWORD_SYMBOLS = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/`~]/;

function apiValidarPassword(password) {
  const pw = typeof password === 'string' ? password : '';
  const faltantes = [];
  if (pw.length < CATBLING_PASSWORD_MIN_LENGTH) faltantes.push('longitud');
  if (!/[A-Z]/.test(pw)) faltantes.push('mayuscula');
  if (!/[0-9]/.test(pw)) faltantes.push('numero');
  if (!CATBLING_PASSWORD_SYMBOLS.test(pw)) faltantes.push('simbolo');
  return { ok: faltantes.length === 0, faltantes };
}

function apiMensajePasswordPolitica() {
  return (typeof __ === 'function')
    ? __('contrasena_politica')
    : 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo (por ejemplo: Catbling2026!).';
}

// getSession() sólo lee el almacenamiento local: una cuenta eliminada o
// invalidada seguiría "autenticada" hasta que caduque el token. getUser()
// consulta a Auth. Sólo se cierra la sesión local ante un rechazo real del
// servidor (401/403/usuario inexistente); un fallo de red NO cierra la sesión.
async function apiVerificarSesionServidor() {
  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) return false;
    const { data, error } = await window.supabase.auth.getUser();
    if (error) {
      const status = error.status;
      const rechazada = status === 401 || status === 403 || status === 404 ||
        /user.*not.*found|invalid jwt|session.*(missing|not found)/i.test(error.message || '');
      if (rechazada) {
        console.warn('[CATBLING][AUTH] Sesión local rechazada por el servidor; se cierra localmente.', error.message);
        await window.supabase.auth.signOut({ scope: 'local' });
        return false;
      }
      return true;
    }
    return !!data?.user;
  } catch (e) {
    console.warn('[CATBLING][AUTH] No se pudo verificar la sesión (red):', e.message);
    return true;
  }
}

// URL de retorno para correos de Auth (confirmación, recuperación) y OAuth (Google).
// Siempre la principalpage.html de ESTE despliegue (Vercel, localhost, subcarpeta),
// nunca una URL fija. Debe estar permitida en Supabase → Authentication → URL Configuration
// → Redirect URLs (p. ej. https://TU-DOMINIO/** y http://localhost:3000/**).
function apiRedirectUrl() {
  try {
    if (typeof CATBLING_CONFIG_ROOT !== 'undefined') {
      return new URL('principalpage.html', CATBLING_CONFIG_ROOT).href;
    }
  } catch (e) { /* cae al origen */ }
  return window.location.origin + '/principalpage.html';
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
    if (!apiValidarPassword(password).ok) {
      throw new Error(apiMensajePasswordPolitica());
    }
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: username },
        emailRedirectTo: apiRedirectUrl()
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
      } else if (error.code === 'weak_password' || lowerMsg.includes('weak password') || lowerMsg.includes('password too weak') || lowerMsg.includes('password too short') || lowerMsg.includes('password should')) {
        errorMessage = apiMensajePasswordPolitica();
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

// Inicio de sesión / registro con Google mediante Supabase Auth (OAuth). Es el mismo
// flujo para usuarios nuevos y existentes: si el correo de Google ya pertenece a una
// cuenta, Supabase enlaza la identidad al MISMO usuario (mismo auth.users.id, mismo
// perfil, monedas e inventario); si no existe, crea el usuario y el trigger
// handle_new_user crea su perfil. No se consulta ni expone si un correo está registrado.
async function apiLoginWithGoogle() {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: apiRedirectUrl(),
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) throw error;
    return { url: data && data.url };
  }, 'signInWithOAuth(google)');
}

// Garantiza que el usuario autenticado tenga fila en profiles (idempotente).
async function apiAsegurarPerfil() {
  try {
    const { data, error } = await window.supabase.rpc('ensure_profile');
    if (error) throw error;
    const fila = data && data[0];
    return !!(fila && fila.ok);
  } catch (e) {
    console.warn('[CATBLING][AUTH] ensure_profile falló:', e && e.message);
    return false;
  }
}

async function apiForgotPassword(email) {
  return _supabaseRequest(async () => {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: apiRedirectUrl()
    });
    if (error) throw error;
    return { message: 'Email de recuperación enviado' };
  });
}

async function apiResetPassword(password) {
  return _supabaseRequest(async () => {
    if (!apiValidarPassword(password).ok) {
      throw new Error(apiMensajePasswordPolitica());
    }
    const { error } = await window.supabase.auth.updateUser({ password });
    if (error) {
      const lowerMsg = (error.message || '').toLowerCase();
      if (error.code === 'weak_password' || lowerMsg.includes('password should')) {
        throw new Error(apiMensajePasswordPolitica());
      }
      if (error.code === 'same_password' || lowerMsg.includes('different from the old')) {
        throw new Error((typeof __ === 'function') ? __('error_misma_contrasena') : 'La nueva contraseña debe ser distinta de la anterior.');
      }
      if (lowerMsg.includes('session missing') || lowerMsg.includes('auth session')) {
        throw new Error((typeof __ === 'function') ? __('error_enlace_recuperacion_invalido') : 'El enlace de recuperación ya se usó o expiró. Solicita uno nuevo.');
      }
      throw error;
    }
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
      .maybeSingle();

    if (error) throw error;
    // Cuenta de Auth sin fila en profiles: se intenta crear el perfil (ensure_profile,
    // idempotente) una vez; si aun así no existe, se informa. Antes .single() lanzaba
    // un error genérico (PGRST116) y el saldo local desactualizado seguía en pantalla.
    if (!data) {
      if (await apiAsegurarPerfil()) {
        const r2 = await window.supabase.from('profiles').select('monedas').eq('id', user.id).maybeSingle();
        if (r2.data) return { monedas: r2.data.monedas ?? 0 };
      }
      throw new Error('perfil_no_encontrado');
    }
    return { monedas: data.monedas ?? 0 };
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
    const fila = data && data[0];
    if (!fila) throw new Error('Respuesta vacía de comprar_item');
    if (fila.codigo === undefined) {
      // Compatibilidad con la versión previa de la RPC (sin columna `codigo`).
      const m = String(fila.mensaje || '').toLowerCase();
      fila.codigo = fila.ok ? 'ok'
        : m.includes('saldo insuficiente') ? 'saldo_insuficiente'
        : m.includes('no autenticado') ? 'no_autenticado'
        : m.includes('perfil') ? 'perfil_no_encontrado'
        : 'error';
    }
    return fila;
  }, 'comprar_item');
}

// Inventario real del usuario (fuente de verdad: inventario_items en Supabase).
// Devuelve [{ item_id, cantidad }].
async function apiGetInventario() {
  return _supabaseRequest(async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await window.supabase
      .from('inventario_items')
      .select('item_id, cantidad')
      .eq('user_id', user.id)
      .order('item_id', { ascending: true });
    if (error) throw error;
    return { items: data || [] };
  }, 'inventario_items (select)');
}

// Consumo de UNA unidad en el servidor (RPC usar_item). Sin unidades => ok:false.
async function rpcUsarItem(itemId) {
  return _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('usar_item', { p_item_id: itemId });
    if (error) throw error;
    const fila = data && data[0];
    if (!fila) throw new Error('Respuesta vacía de usar_item');
    return fila;
  }, 'usar_item');
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
  const resp = await _supabaseRequest(async () => {
    const { data, error } = await window.supabase.rpc('registrar_sesion_casino', {
      p_juego: juego,
      p_apuesta: apuesta,
      p_resultado_monedas: resultadoMonedas,
      p_gano: gano
    });
    if (error) throw error;
    return data[0];
  }, 'registrar_sesion_casino');

  // CAUSA RAÍZ compartida por TODOS los juegos: _supabaseRequest devuelve
  // success:true siempre que la llamada HTTP no falle, aunque el servidor
  // haya respondido ok:false (saldo insuficiente, datos inválidos). Cada juego
  // sólo comprobaba `r.success`, así que un rechazo del servidor pasaba por
  // aceptado y la pantalla mostraba una victoria/pérdida que Supabase nunca
  // registró. Se corrige en un único punto: ok:false ⇒ success:false, se
  // resincroniza el saldo real y, si de verdad no alcanzaba, se muestra el
  // overlay de saldo insuficiente ya existente.
  if (resp.success && !(resp.data && resp.data.ok === true)) {
    await _manejarRechazoEconomia(apuesta);
    return { success: false, error: 'operacion_rechazada', data: resp.data };
  }
  if (!resp.success) {
    // Fallo de red / excepción: tampoco se registró nada. No se deja en pantalla un
    // resultado como si estuviera guardado.
    await _manejarRechazoEconomia(apuesta);
  }
  return resp;
}

async function _manejarRechazoEconomia(cantidadNecesaria) {
  try {
    let saldo = null;
    if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
      saldo = await window.coinsAPI.fetch();
    }
    // El resultado que el juego ya mostró NO quedó registrado: se retira el overlay de
    // victoria/derrota y se informa (el saldo mostrado es el real, ya resincronizado).
    ['win-overlay', 'lose-overlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active', 'visible', 'show');
    });
    if (typeof saldo === 'number' && saldo < cantidadNecesaria &&
        typeof mostrarOverlayGlobal === 'function') {
      mostrarOverlayGlobal(cantidadNecesaria);
    } else if (typeof window.mostrarPartidaNoRegistrada === 'function') {
      window.mostrarPartidaNoRegistrada();
    } else {
      console.warn('[CATBLING][ECONOMIA] Operación rechazada por el servidor (saldo real:', saldo, ', requerido:', cantidadNecesaria, ')');
    }
  } catch (e) {
    console.warn('[CATBLING][ECONOMIA] No se pudo resincronizar tras un rechazo:', e);
  }
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
  usarItem: rpcUsarItem,
  getInventario: apiGetInventario,
  asegurarPerfil: apiAsegurarPerfil,
  registrarResultadoCarrera: rpcRegistrarResultadoCarrera,
  liquidarApuestaPuestoCarrera: rpcLiquidarApuestaPuestoCarrera
};
