// 🌍 CONFIG GLOBAL COMPARTIDA

const DEFAULT_CONFIG = {
  musica: 5,
  efectos: 5,
  animaciones: true,
  idioma: "es",
  monedas: 0,
  pantallaCompleta: false,
  mostrarTutorial: true
};

function cargarConfig() {
  try {
    const guardado = localStorage.getItem("config");
    return guardado ? JSON.parse(guardado) : { ...DEFAULT_CONFIG };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function guardarConfig(config) {
  localStorage.setItem("config", JSON.stringify(config));
}

let config = cargarConfig();
const CATBLING_CONFIG_ROOT = document.currentScript?.src
  ? new URL('../', document.currentScript.src)
  : new URL('./', window.location.href);

// ════════════════════════════════════════════════════════════════════════════
// 💰 SISTEMA DE MONEDAS POR USUARIO (delegado a window.coinsAPI / window.apiRpc)
// ════════════════════════════════════════════════════════════════════════════

window.sincronizarMonedasConUsuario = async function() {
  if (!(await apiIsAuthenticated())) return;
  // Las mutaciones de monedas se realizan via RPCs desde juegos/tienda
  // Esta función se mantiene por compatibilidad pero no realiza operaciones directas
};

window.cargarMonedasDeUsuario = async function() {
  if (!(await apiIsAuthenticated())) return;
  // Reutiliza coinsAPI.fetch() (coins.js): consulta profiles.monedas real
  // y actualiza el caché y la UI de forma atómica.
  if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
    try {
      await window.coinsAPI.fetch();
    } catch (e) {
      console.warn('[config] cargarMonedasDeUsuario error:', e);
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURACIÓN DE USUARIO (idioma, volumen, animaciones)
// ════════════════════════════════════════════════════════════════════════════

window.sincronizarConfigConUsuario = async function() {
  if (!(await apiIsAuthenticated())) return;
  if (typeof apiSetConfig !== 'function') return;
  try {
    await apiSetConfig({
      idioma: config.idioma || 'es',
      vol_musica: config.musica || 5,
      vol_efectos: config.efectos || 5,
      animaciones: config.animaciones !== undefined ? config.animaciones : true,
    });
  } catch (e) {
    console.warn('[config] sincronizarConfigConUsuario error:', e);
  }
};

window.cargarConfigDeUsuario = async function() {
  if (!(await apiIsAuthenticated())) return;
  if (typeof apiGetConfig !== 'function') return;
  try {
    const res = await apiGetConfig();
    if (res.success && res.data) {
      const local = cargarConfig();
      if (local.idioma === undefined || local.idioma === null) config.idioma = res.data.idioma || 'es';
      if (local.musica === undefined || local.musica === null) config.musica = res.data.vol_musica ?? 5;
      if (local.efectos === undefined || local.efectos === null) config.efectos = res.data.vol_efectos ?? 5;
      if (local.animaciones === undefined || local.animaciones === null) config.animaciones = res.data.animaciones ?? true;
      guardarConfig(config);
      aplicarConfig();
    }
  } catch (e) {
    console.warn('[config] cargarConfigDeUsuario error:', e);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 🔐 AUTENTICACIÓN CON SUPABASE (vía api.js)
// ════════════════════════════════════════════════════════════════════════════

window.registrarUsuarioPHP = async function(username, email, password) {
  if (typeof apiRegister !== 'function') {
    return { success: false, error: 'API no disponible' };
  }
  return await apiRegister(username, email, password);
};

window.iniciarSesionPHP = async function(email, password) {
  if (typeof apiLogin !== 'function') {
    return { success: false, error: 'API no disponible' };
  }
  return await apiLogin(email, password);
};

window.actualizarMonedasUI = function(monedascantidad) {
  document.querySelectorAll('[id*="cantidad-moned"]').forEach(el => {
    if (el) el.textContent = monedascantidad;
  });
  document.querySelectorAll('[id*="icono-moned"]').forEach(icono => {
    if (icono && icono.dataset) {
      if (monedascantidad > 0 && icono.dataset.srcLleno) {
        icono.src = icono.dataset.srcLleno;
      } else if (icono.dataset.srcVacio) {
        icono.src = icono.dataset.srcVacio;
      }
    }
  });
};

window.cerrarSesion = async function() {
  document.getElementById("confirmacion-cerrar-sesion").classList.remove("active");
  await window.sincronizarConfigConUsuario();
  if (typeof apiLogout === 'function') await apiLogout();
  if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
  window.setInventarioSession([]);
  localStorage.setItem("monedas", 0);
  sessionStorage.setItem("showAuth", "true");
  window.location.href = new URL('principalpage.html', CATBLING_CONFIG_ROOT).href;
};

window.mostrarConfirmacionCerrarSesion = function() {
  var menuOpc = document.getElementById("menu-opciones");
  var overlayOpc = document.getElementById("overlay-menu");
  if (menuOpc) menuOpc.classList.remove("active");
  if (overlayOpc) overlayOpc.classList.remove("active");
  document.getElementById("confirmacion-cerrar-sesion").classList.add("active");
};

document.addEventListener("DOMContentLoaded", function() {
  const btnSi = document.getElementById("btn-confirmar-si");
  const btnNo = document.getElementById("btn-confirmar-no");
  if (btnSi) btnSi.addEventListener("click", window.cerrarSesion);
  if (btnNo) {
    btnNo.addEventListener("click", function() {
      document.getElementById("confirmacion-cerrar-sesion").classList.remove("active");
    });
  }
});

// Mostrar/ocultar overlay de autenticación
function toggleAuthOverlay(mostrar) {
  const overlay = document.getElementById("auth-overlay");
  if (overlay) {
    if (mostrar) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }
}

function actualizarCerrarSesionUI() {
  const cerrarSesionOpcion = document.getElementById("opcion-cerrar-sesion");
  if (!cerrarSesionOpcion) return;
  const span = cerrarSesionOpcion.querySelector("span");
  const btn = cerrarSesionOpcion.querySelector("button");

  // Nota: aquí se usaba "esModoInvitado()" (función async, definida en
  // guest.js) sin `await` como condición booleana. Igual que con
  // invitadoPuedeJugar()/invitadoPuedeComprar() (ver guest.js), una
  // Promise es siempre truthy, así que la rama de "modo invitado" de
  // este menú se ejecutaba siempre que el usuario no estuviera
  // autenticado, sin comprobar el valor real. Se usa la variante
  // síncrona ya existente en guest.js (_esModoInvitadoSync()), pensada
  // exactamente para este tipo de sitios no-async.
  if (typeof apiIsAuthenticated === 'function') {
    apiIsAuthenticated().then(autenticado => {
      const span = cerrarSesionOpcion.querySelector("span");
      const btn = cerrarSesionOpcion.querySelector("button");
      if (autenticado) {
        cerrarSesionOpcion.style.display = "flex";
        if (span) span.textContent = __("cerrar_sesion");
        if (btn) { btn.textContent = __("salir"); btn.onclick = window.mostrarConfirmacionCerrarSesion; }
      } else if (typeof _esModoInvitadoSync === 'function' && _esModoInvitadoSync()) {
        cerrarSesionOpcion.style.display = "flex";
        if (span) span.textContent = __("ingresar_texto");
        if (btn) { btn.textContent = __("ingresar_btn"); btn.onclick = window.mostrarAuthIngresar; }
      } else {
        cerrarSesionOpcion.style.display = "none";
      }
    });
  } else {
    const guest = typeof _esModoInvitadoSync === 'function' && _esModoInvitadoSync();
    if (guest) {
      cerrarSesionOpcion.style.display = "flex";
      if (span) span.textContent = __("ingresar_texto");
      if (btn) { btn.textContent = __("ingresar_btn"); btn.onclick = window.mostrarAuthIngresar; }
    } else {
      cerrarSesionOpcion.style.display = "none";
    }
  }
}

window.mostrarAuthIngresar = function() {
  const overlay = document.getElementById("auth-overlay");
  if (overlay) {
    reiniciarFormulariosAuth();
    toggleAuthOverlay(true);
  } else {
    requerirAutenticacion();
  }
};

function reiniciarFormulariosAuth() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  if (loginForm) { loginForm.reset(); loginForm.style.display = "flex"; }
  if (registerForm) { registerForm.reset(); registerForm.style.display = "none"; }
  const errL = document.getElementById("login-error");
  const errR = document.getElementById("register-error");
  const errT = document.getElementById("terms-error");
  if (errL) errL.textContent = "";
  if (errR) errR.textContent = "";
  if (errT) { errT.textContent = ""; errT.classList.remove("visible"); }
  document.querySelectorAll(".auth-tab").forEach(function(t) { t.classList.remove("active"); });
  var loginTab = document.querySelector('.auth-tab[data-tab="login"]');
  if (loginTab) loginTab.classList.add("active");
  var forgotForm = document.getElementById("forgot-password-form");
  var resetForm = document.getElementById("reset-password-form");
  var googleSection = document.querySelector(".auth-google");
  var authTitle = document.querySelector(".auth-title");
  var authTabs = document.querySelector(".auth-tabs");
  if (forgotForm) forgotForm.style.display = "none";
  if (resetForm) resetForm.style.display = "none";
  if (googleSection) googleSection.style.display = "";
  if (authTitle) authTitle.style.display = "";
  if (authTabs) authTabs.style.display = "";
}

// ═════════════════════════════════════════════════════════════════════════════
// 👁 TOGGLE VISIBILIDAD CONTRASEÑA
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener("click", function(e) {
  const toggle = e.target.closest(".toggle-password");
  if (!toggle) return;
  const targetId = toggle.dataset.target;
  const input = document.getElementById(targetId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    toggle.textContent = "🙈";
  } else {
    input.type = "password";
    toggle.textContent = "👁️";
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔑 RECUPERACIÓN DE CONTRASEÑA
// ════════════════════════════════════════════════════════════════════════════

function mostrarForgotPassword() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.querySelectorAll(".auth-tab").forEach(t => t.style.display = "none");
  document.querySelector(".auth-title").style.display = "none";
  document.getElementById("forgot-password-form").style.display = "flex";
  document.getElementById("forgot-error").textContent = "";
  document.getElementById("forgot-success").style.display = "none";
}

function mostrarLoginDesdeForgot() {
  window._recuperacionResuelta = true;
  window._modoRecuperacion = false;
  document.getElementById("forgot-password-form").style.display = "none";
  document.getElementById("reset-password-form").style.display = "none";
  document.querySelectorAll(".auth-tab").forEach(t => t.style.display = "");
  document.querySelector(".auth-title").style.display = "";
  document.getElementById("login-form").style.display = "flex";
  document.getElementById("register-form").style.display = "none";
  document.querySelector('.auth-tab[data-tab="login"]').classList.add("active");
  document.querySelector('.auth-tab[data-tab="register"]').classList.remove("active");
}

document.addEventListener("DOMContentLoaded", function() {
  const forgotLink = document.getElementById("forgot-password-link");
  if (forgotLink) {
    forgotLink.addEventListener("click", function(e) {
      e.preventDefault();
      mostrarForgotPassword();
    });
  }

  const forgotBackLink = document.getElementById("forgot-back-link");
  if (forgotBackLink) {
    forgotBackLink.addEventListener("click", function(e) {
      e.preventDefault();
      mostrarLoginDesdeForgot();
    });
  }

  const forgotSubmitBtn = document.getElementById("forgot-submit-btn");
  if (forgotSubmitBtn) {
    forgotSubmitBtn.addEventListener("click", async function() {
      const email = document.getElementById("forgot-email").value.trim();
      const errorEl = document.getElementById("forgot-error");
      const successEl = document.getElementById("forgot-success");
      errorEl.textContent = "";

      if (!email) {
        errorEl.textContent = __("correo_requerido");
        return;
      }

      forgotSubmitBtn.disabled = true;
      forgotSubmitBtn.textContent = __("enviando");

      const result = await apiForgotPassword(email);
      forgotSubmitBtn.disabled = false;
      forgotSubmitBtn.textContent = __("enviar");

      if (result.success) {
        successEl.style.display = "block";
        successEl.textContent = __("email_sent", "Se ha enviado un enlace de recuperación a tu correo.");
        // Nota: el bloque "_debug_token" que existía aquí era código
        // legado de un esquema de recuperación por token propio (estilo
        // PHP), pero apiForgotPassword() (api.js) usa el flujo real de
        // Supabase (resetPasswordForEmail) y nunca devuelve
        // "_debug_token": esa rama nunca se ejecutaba. Se retira porque
        // el enlace real que sí llega por correo se procesa ahora al
        // vuelo mediante el evento PASSWORD_RECOVERY (ver
        // inicializarAuthStateListener más abajo), no mediante un token
        // manual en la URL.
      } else {
        errorEl.textContent = result.error;
      }
    });
  }

  // ─── Reset password ──────────────────────────────────────────
  const resetBackLink = document.getElementById("reset-back-link");
  if (resetBackLink) {
    resetBackLink.addEventListener("click", function(e) {
      e.preventDefault();
      mostrarLoginDesdeForgot();
    });
  }

  const resetSubmitBtn = document.getElementById("reset-submit-btn");
  if (resetSubmitBtn) {
    resetSubmitBtn.addEventListener("click", async function() {
      const password = document.getElementById("reset-password").value;
      const confirm = document.getElementById("reset-confirm").value;
      const errorEl = document.getElementById("reset-error");
      const successEl = document.getElementById("reset-success");
      errorEl.textContent = "";

      if (!apiValidarPassword(password).ok) {
        errorEl.textContent = apiMensajePasswordPolitica();
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = __("contrasenas_no_coinciden");
        return;
      }

      // CAUSA RAÍZ (recuperación de contraseña): este handler exigía un
      // parámetro "?reset_token=" propio (legado del esquema PHP) que el
      // flujo real de Supabase NUNCA genera. Supabase envía el enlace de
      // recuperación con su propio token en la URL (#access_token=...&
      // type=recovery), que el cliente (supabase-client.js tiene
      // detectSessionInUrl:true) consume automáticamente al cargar la
      // página y con eso deja una sesión de recuperación ya activa en el
      // navegador. Por eso apiResetPassword(password) (api.js) sólo
      // necesita la contraseña nueva: internamente llama a
      // supabase.auth.updateUser({password}) sobre esa sesión, no a un
      // token manual. Como "token" nunca llegaba a existir, este formulario
      // era inalcanzable (ver también el nuevo caso 'PASSWORD_RECOVERY'
      // en inicializarAuthStateListener, que es quien ahora abre este
      // formulario cuando el enlace del correo carga la página).
      resetSubmitBtn.disabled = true;
      resetSubmitBtn.textContent = __("restableciendo");

      const result = await apiResetPassword(password);
      resetSubmitBtn.disabled = false;
      resetSubmitBtn.textContent = __("restablecer");

      if (result.success) {
        successEl.style.display = "block";
        successEl.textContent = __("reset_success", "Contraseña restablecida. Ya puedes iniciar sesión.");
        setTimeout(function() {
          mostrarLoginDesdeForgot();
        }, 3000);
      } else {
        errorEl.textContent = result.error;
      }
    });
  }

});
 
// 🔐 LOGIN / REGISTER FORM SUBMIT HANDLERS
document.addEventListener("DOMContentLoaded", function() {
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var email = document.getElementById("login-email").value.trim();
      var password = document.getElementById("login-password").value;
      var errorEl = document.getElementById("login-error");
      if (!email || !password) {
        errorEl.textContent = __("campos_incompletos");
        return;
      }
      errorEl.textContent = "";
      var submitBtn = loginForm.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = __("entrando");
      var result = await window.iniciarSesionPHP(email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = __("entrar");
      if (result.success) {
        if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
        window.cargarMonedasDeUsuario();
        window.cargarConfigDeUsuario();
        toggleAuthOverlay(false);
        actualizarCerrarSesionUI();
      } else {
        errorEl.textContent = result.error || __("error_login");
      }
});
  }
 
  // 📜 MODAL DE TÉRMINOS Y CONDICIONES
  var termsOverlay = document.getElementById("terms-overlay");
  var termsLink = document.getElementById("terms-link");
  var termsCloseBtn = document.getElementById("terms-modal-close");
  var termsCheckboxEl = document.getElementById("register-terms");

  function abrirTerminos() {
    if (termsOverlay) termsOverlay.classList.add("active");
  }
  function cerrarTerminos() {
    if (termsOverlay) termsOverlay.classList.remove("active");
    // Cerrar el modal NO afecta la casilla de aceptación ni el formulario.
  }
  if (termsLink) {
    termsLink.addEventListener("click", function(e) {
      e.preventDefault();
      abrirTerminos();
    });
  }
  if (termsCloseBtn) {
    termsCloseBtn.addEventListener("click", function(e) {
      e.preventDefault();
      cerrarTerminos();
    });
  }
  if (termsOverlay) {
    termsOverlay.addEventListener("click", function(e) {
      if (e.target === termsOverlay) cerrarTerminos();
    });
  }
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && termsOverlay && termsOverlay.classList.contains("active")) {
      cerrarTerminos();
    }
  });
  if (termsCheckboxEl) {
    termsCheckboxEl.addEventListener("change", function() {
      if (termsCheckboxEl.checked) {
        var termsErrorEl = document.getElementById("terms-error");
        if (termsErrorEl) { termsErrorEl.textContent = ""; termsErrorEl.classList.remove("visible"); }
      }
    });
  }

  var registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var username = document.getElementById("register-username").value.trim();
      var email = document.getElementById("register-email").value.trim();
      var password = document.getElementById("register-password").value;
      var confirm = document.getElementById("register-confirm").value;
      var errorEl = document.getElementById("register-error");
      var termsCheckbox = document.getElementById("register-terms");
      var termsErrorEl = document.getElementById("terms-error");
      if (termsErrorEl) { termsErrorEl.textContent = ""; termsErrorEl.classList.remove("visible"); }
      if (termsCheckbox && !termsCheckbox.checked) {
        if (termsErrorEl) {
          termsErrorEl.textContent = __("error_debe_aceptar_terminos");
          termsErrorEl.classList.add("visible");
        }
        return;
      }
      if (!username || !email || !password || !confirm) {
        errorEl.textContent = __("campos_incompletos");
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = __("contrasenas_no_coinciden");
        return;
      }
      if (!apiValidarPassword(password).ok) {
        errorEl.textContent = apiMensajePasswordPolitica();
        return;
      }
      errorEl.textContent = "";
      var submitBtn = registerForm.querySelector('button[type="submit"]');
      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = __("registrando");
      var result = await window.registrarUsuarioPHP(username, email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      // BUG encontrado en la auditoría (confirmado con pruebas): registrarUsuarioPHP
      // devuelve { success, data }, igual que iniciarSesionPHP. `success` sí vive en
      // la raíz (por eso el login funcionaba), pero `needsEmailConfirmation` y `email`
      // están dentro de `data`. Al leerlos directamente de `result` siempre eran
      // undefined, así que TODO registro exitoso caía en la rama de "sesión iniciada":
      // nunca se mostraba el aviso de confirmar el correo y el modal se cerraba dando
      // a entender que había sesión, cuando Supabase exige confirmación (email_confirmed_at
      // queda null hasta que el usuario abre el enlace). El usuario creía estar
      // autenticado sin estarlo.
      var datosResultado = result.data || {};
      if (result.success) {
        if (datosResultado.needsEmailConfirmation) {
          // Registro exitoso pero requiere confirmación por email
          errorEl.style.color = "#4CAF50";
          var userEmail = datosResultado.email || email;
          errorEl.textContent = __f("registro_email_confirmacion", { email: userEmail });
          // No cerrar el overlay, el usuario debe ver el mensaje
        } else {
          // Registro exitoso con sesión iniciada
          if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
          window.cargarMonedasDeUsuario();
          window.cargarConfigDeUsuario();
          toggleAuthOverlay(false);
          actualizarCerrarSesionUI();
        }
      } else {
        errorEl.style.color = "";
        errorEl.textContent = result.error || __("error_registro");
      }
    });
  }
});
 
  // 🔐 LOGIN / REGISTER TAB SWITCHING
  document.querySelectorAll(".auth-tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      var tabType = this.getAttribute("data-tab");
      var loginForm = document.getElementById("login-form");
      var registerForm = document.getElementById("register-form");
      if (!loginForm || !registerForm) return;
 
      document.querySelectorAll(".auth-tab").forEach(function(t) { t.classList.remove("active"); });
      this.classList.add("active");
 
      if (tabType === "login") {
        document.getElementById("login-form").style.display = "flex";
        document.getElementById("register-form").style.display = "none";
      } else if (tabType === "register") {
        document.getElementById("login-form").style.display = "none";
        document.getElementById("register-form").style.display = "flex";
      }
    });
  });
 
  // 🎮 CONTROLES (GLOBAL)
function cambiarVolumen(v) {
  config.musica = Math.max(0, Math.min(10, config.musica + v));
  guardarConfig(config);
  aplicarConfig();
}

function cambiarEfectos(v) {
  config.efectos = Math.max(0, Math.min(10, config.efectos + v));
  guardarConfig(config);
  aplicarConfig();
  window.dispatchEvent(new CustomEvent("cambioEfectos", { detail: config.efectos }));
}

function toggleAnimaciones() {
  config.animaciones = !config.animaciones;
  guardarConfig(config);
  aplicarConfig();
}

function toggleTutorial() {
  config.mostrarTutorial = !config.mostrarTutorial;
  guardarConfig(config);
  aplicarConfig();
  if (config.mostrarTutorial) {
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('tutorial_dismissed_') === 0) {
        localStorage.removeItem(keys[i]);
      }
    }
  }
}

function setIdioma(id) {
  config.idioma = id;
  guardarConfig(config);
  aplicarConfig();
  window.dispatchEvent(new CustomEvent("cambioIdioma", { detail: id }));
}

// ════════════════════════════════════════════════════════════════════════════
// 🌍 SISTEMA CENTRALIZADO DE INTERNACIONALIZACIÓN (i18n) — 6 IDIOMAS
// ════════════════════════════════════════════════════════════════════════════
// Todo el texto traducible de la interfaz vive aquí, en un único objeto
// centralizado por clave -> { es, en, ru, ja, zh, de }. Cualquier página del
// proyecto puede sumar nuevas claves a este mismo objeto: nunca se debe
// crear un segundo sistema de traducciones en paralelo.
//
// EXCEPCIÓN: el nombre "Let's go Catbling" nunca se traduce y no aparece
// en este diccionario a propósito.

const IDIOMAS_DISPONIBLES = [
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "zh", flag: "🇨🇳", name: "中文" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" }
];

const TRADUCCIONES = {
  // ── Menú de opciones ──────────────────────────────────────────────
  opciones:       { es: "OPCIONES", en: "OPTIONS", ru: "НАСТРОЙКИ", ja: "オプション", zh: "选项", de: "OPTIONEN" },
  musica:         { es: "Música", en: "Music", ru: "Музыка", ja: "音楽", zh: "音乐", de: "Musik" },
  efectos:        { es: "Efectos", en: "Effects", ru: "Звуки", ja: "効果音", zh: "音效", de: "Effekte" },
  animaciones:    { es: "Animaciones", en: "Animations", ru: "Анимации", ja: "アニメーション", zh: "动画", de: "Animationen" },
  mostrar_tutorial: { es: "Mostrar tutorial", en: "Show tutorial", ru: "Показывать обучение", ja: "チュートリアルを表示", zh: "显示教程", de: "Tutorial anzeigen" },
  idioma:         { es: "Idioma", en: "Language", ru: "Язык", ja: "言語", zh: "语言", de: "Sprache" },
  config:         { es: "Configuración", en: "Settings", ru: "Настройки", ja: "設定", zh: "设置", de: "Einstellungen" },
  reset:          { es: "RESET", en: "RESET", ru: "СБРОС", ja: "リセット", zh: "重置", de: "ZURÜCKSETZEN" },
  on:             { es: "ON", en: "ON", ru: "ВКЛ", ja: "オン", zh: "开", de: "AN" },
  off:            { es: "OFF", en: "OFF", ru: "ВЫКЛ", ja: "オフ", zh: "关", de: "AUS" },
  tutorial_opcion:{ es: "Tutorial", en: "Tutorial", ru: "Обучение", ja: "チュートリアル", zh: "教程", de: "Tutorial" },
  pantalla_completa: { es: "Pantalla Completa", en: "Fullscreen", ru: "Полный экран", ja: "全画面表示", zh: "全屏", de: "Vollbild" },

  // ── Palabras de juego comunes ─────────────────────────────────────
  jugar:          { es: "JUGAR", en: "PLAY", ru: "ИГРАТЬ", ja: "プレイ", zh: "开始游戏", de: "SPIELEN" },
  reiniciar:      { es: "REINICIAR", en: "RESTART", ru: "ПЕРЕЗАПУСК", ja: "リスタート", zh: "重新开始", de: "NEUSTART" },
  apostar:        { es: "APOSTAR", en: "BET", ru: "СТАВКА", ja: "ベット", zh: "下注", de: "WETTEN" },
  girar:          { es: "GIRAR", en: "SPIN", ru: "КРУТИТЬ", ja: "回す", zh: "旋转", de: "DREHEN" },
  lanzar:         { es: "LANZAR DADOS", en: "ROLL DICE", ru: "БРОСИТЬ КОСТИ", ja: "サイコロを振る", zh: "掷骰子", de: "WÜRFELN" },
  ganaste:        { es: "¡GANASTE!", en: "YOU WIN!", ru: "ВЫ ВЫИГРАЛИ!", ja: "勝利！", zh: "你赢了！", de: "DU GEWINNST!" },
  perdiste:       { es: "¡PERDISTE!", en: "YOU LOSE!", ru: "ВЫ ПРОИГРАЛИ!", ja: "敗北…", zh: "你输了！", de: "DU VERLIERST!" },
  monedas:        { es: "Monedas", en: "Coins", ru: "Монеты", ja: "コイン", zh: "金币", de: "Münzen" },
  apuesta:        { es: "Apuesta:", en: "Bet:", ru: "Ставка:", ja: "ベット額:", zh: "赌注：", de: "Einsatz:" },
  movimientos:    { es: "Movimientos:", en: "Moves:", ru: "Ходы:", ja: "手数:", zh: "步数：", de: "Züge:" },
  niveles:        { es: "NIVELES", en: "LEVELS", ru: "УРОВНИ", ja: "レベル", zh: "关卡", de: "STUFEN" },
  ruleta:         { es: "RULETA", en: "ROULETTE", ru: "РУЛЕТКА", ja: "ルーレット", zh: "轮盘", de: "ROULETTE" },
  tragamonedas:   { es: "TRAGAMONEDAS", en: "SLOTS", ru: "ИГРОВОЙ АВТОМАТ", ja: "スロット", zh: "老虎机", de: "SPIELAUTOMAT" },
  duelo:          { es: "DUELO DE DADOS", en: "DICE DUEL", ru: "ДУЭЛЬ НА КОСТЯХ", ja: "サイコロ対決", zh: "骰子对决", de: "WÜRFELDUELL" },
  multiplicadores:{ es: "MULTIPLICADORES", en: "MULTIPLIERS", ru: "МНОЖИТЕЛИ", ja: "倍率", zh: "倍数", de: "MULTIPLIKATOREN" },
  volver:         { es: "VOLVER", en: "BACK", ru: "НАЗАД", ja: "戻る", zh: "返回", de: "ZURÜCK" },
  continuar:      { es: "CONTINUAR", en: "CONTINUE", ru: "ПРОДОЛЖИТЬ", ja: "続ける", zh: "继续", de: "WEITER" },
  aceptar:        { es: "ACEPTAR", en: "ACCEPT", ru: "ПРИНЯТЬ", ja: "承認", zh: "确定", de: "AKZEPTIEREN" },
  cancelar:       { es: "CANCELAR", en: "CANCEL", ru: "ОТМЕНА", ja: "キャンセル", zh: "取消", de: "ABBRECHEN" },
  si:             { es: "SÍ", en: "YES", ru: "ДА", ja: "はい", zh: "是", de: "JA" },
  no:             { es: "NO", en: "NO", ru: "НЕТ", ja: "いいえ", zh: "否", de: "NEIN" },
  cerrar:         { es: "CERRAR", en: "CLOSE", ru: "ЗАКРЫТЬ", ja: "閉じる", zh: "关闭", de: "SCHLIESSEN" },
  comprar:        { es: "COMPRAR", en: "BUY", ru: "КУПИТЬ", ja: "購入", zh: "购买", de: "KAUFEN" },
  usar:           { es: "USAR", en: "USE", ru: "ИСПОЛЬЗОВАТЬ", ja: "使う", zh: "使用", de: "BENUTZEN" },

  // ── Sesión / autenticación ────────────────────────────────────────
  cerrar_sesion:  { es: "Cerrar Sesión", en: "Log Out", ru: "Выйти", ja: "ログアウト", zh: "退出登录", de: "Abmelden" },
  ingresar_texto: { es: "Ingresar", en: "Log In", ru: "Войти", ja: "ログイン", zh: "登录", de: "Anmelden" },
  ingresar_btn:   { es: "INGRESAR", en: "LOG IN", ru: "ВОЙТИ", ja: "ログイン", zh: "登录", de: "ANMELDEN" },
  salir:          { es: "SALIR", en: "EXIT", ru: "ВЫХОД", ja: "退出", zh: "退出", de: "VERLASSEN" },
  entrar:         { es: "ENTRAR", en: "LOG IN", ru: "ВОЙТИ", ja: "ログイン", zh: "登录", de: "ANMELDEN" },
  entrando:       { es: "ENTRANDO...", en: "LOGGING IN...", ru: "ВХОД...", ja: "ログイン中...", zh: "登录中…", de: "ANMELDEN..." },
  iniciar_sesion: { es: "INICIAR SESIÓN", en: "LOG IN", ru: "ВОЙТИ", ja: "ログイン", zh: "登录", de: "ANMELDEN" },
  registrarse:    { es: "REGISTRARSE", en: "SIGN UP", ru: "РЕГИСТРАЦИЯ", ja: "新規登録", zh: "注册", de: "REGISTRIEREN" },
  registrando:    { es: "REGISTRANDO...", en: "SIGNING UP...", ru: "РЕГИСТРАЦИЯ...", ja: "登録中...", zh: "注册中…", de: "REGISTRIEREN..." },
  enviar:         { es: "ENVIAR", en: "SEND", ru: "ОТПРАВИТЬ", ja: "送信", zh: "发送", de: "SENDEN" },
  enviando:       { es: "ENVIANDO...", en: "SENDING...", ru: "ОТПРАВКА...", ja: "送信中...", zh: "发送中…", de: "SENDEN..." },
  restablecer:    { es: "RESTABLECER", en: "RESET PASSWORD", ru: "СБРОСИТЬ ПАРОЛЬ", ja: "パスワードをリセット", zh: "重置密码", de: "PASSWORT ZURÜCKSETZEN" },
  restableciendo: { es: "RESTABLECIENDO...", en: "RESETTING...", ru: "СБРОС...", ja: "リセット中...", zh: "重置中…", de: "ZURÜCKSETZEN..." },
  forgot_desc:    { es: "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.", en: "Enter your email and we'll send you a link to reset your password.", ru: "Введите свою электронную почту, и мы отправим вам ссылку для сброса пароля.", ja: "メールアドレスを入力すると、パスワード再設定用のリンクをお送りします。", zh: "输入你的电子邮箱，我们会发送一个重置密码的链接给你。", de: "Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts." },
  reset_title:    { es: "RESTABLECER CONTRASEÑA", en: "RESET PASSWORD", ru: "СБРОС ПАРОЛЯ", ja: "パスワードの再設定", zh: "重置密码", de: "PASSWORT ZURÜCKSETZEN" },
  forgot_link:    { es: "¿Olvidaste tu contraseña?", en: "Forgot your password?", ru: "Забыли пароль?", ja: "パスワードをお忘れですか？", zh: "忘记密码了吗？", de: "Passwort vergessen?" },
  back_login:     { es: "← Volver a inicio de sesión", en: "← Back to login", ru: "← Назад ко входу", ja: "← ログインに戻る", zh: "← 返回登录", de: "← Zurück zum Login" },
  email_sent:     { es: "Se ha enviado un enlace de recuperación a tu correo electrónico.", en: "A recovery link has been sent to your email.", ru: "Ссылка для восстановления отправлена на вашу электронную почту.", ja: "回復用リンクをメールに送信しました。", zh: "找回密码的链接已发送到你的邮箱。", de: "Ein Wiederherstellungslink wurde an deine E-Mail-Adresse gesendet." },
  reset_success:  { es: "Contraseña restablecida correctamente. Ya puedes iniciar sesión.", en: "Password reset successfully. You can now log in.", ru: "Пароль успешно сброшен. Теперь вы можете войти.", ja: "パスワードが正常にリセットされました。ログインできます。", zh: "密码已成功重置，现在可以登录了。", de: "Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden." },
  campos_incompletos: { es: "Completa todos los campos", en: "Fill in all the fields", ru: "Заполните все поля", ja: "すべての項目を入力してください", zh: "请填写所有字段", de: "Bitte fülle alle Felder aus" },
  contrasenas_no_coinciden: { es: "Las contraseñas no coinciden", en: "Passwords don't match", ru: "Пароли не совпадают", ja: "パスワードが一致しません", zh: "两次密码不一致", de: "Die Passwörter stimmen nicht überein" },
  acepto_los: { es: "Acepto los", en: "I accept the", ru: "Я принимаю", ja: "同意します：", zh: "我接受", de: "Ich akzeptiere die" },
  terminos_condiciones: { es: "Términos y Condiciones", en: "Terms and Conditions", ru: "Условия использования", ja: "利用規約", zh: "条款和条件", de: "Nutzungsbedingungen" },
  de_lets_go_catbling: { es: "de Let's Go Catbling.", en: "of Let's Go Catbling.", ru: "Let's Go Catbling.", ja: "（Let's Go Catbling）に同意します。", zh: "（Let's Go Catbling）。", de: "von Let's Go Catbling." },
  error_debe_aceptar_terminos: { es: "Debes aceptar los Términos y Condiciones para crear tu cuenta.", en: "You must accept the Terms and Conditions to create your account.", ru: "Вы должны принять Условия использования, чтобы создать учётную запись.", ja: "アカウントを作成するには利用規約に同意する必要があります。", zh: "你必须接受条款和条件才能创建账户。", de: "Du musst die Nutzungsbedingungen akzeptieren, um dein Konto zu erstellen." },
  contrasena_min: { es: "La contraseña debe tener al menos 6 caracteres", en: "The password must be at least 6 characters long", ru: "Пароль должен содержать не менее 6 символов", ja: "パスワードは6文字以上で入力してください", zh: "密码至少需要6个字符", de: "Das Passwort muss mindestens 6 Zeichen lang sein" },
  contrasena_politica: { es: "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo (por ejemplo: Catbling2026!).", en: "The password must have at least 8 characters, an uppercase letter, a number and a symbol (for example: Catbling2026!).", ru: "Пароль должен содержать не менее 8 символов, заглавную букву, цифру и специальный символ (например: Catbling2026!).", ja: "パスワードは8文字以上で、大文字・数字・記号を1つ以上含めてください（例：Catbling2026!）。", zh: "密码至少需要8个字符，并包含一个大写字母、一个数字和一个符号（例如：Catbling2026!）。", de: "Das Passwort muss mindestens 8 Zeichen lang sein und einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten (z. B. Catbling2026!)." },
  error_misma_contrasena: { es: "La nueva contraseña debe ser distinta de la anterior.", en: "The new password must be different from the old one.", ru: "Новый пароль должен отличаться от прежнего.", ja: "新しいパスワードは以前のものと異なる必要があります。", zh: "新密码必须与旧密码不同。", de: "Das neue Passwort muss sich vom alten unterscheiden." },
  error_enlace_recuperacion_invalido: { es: "El enlace de recuperación ya se usó o expiró. Solicita uno nuevo.", en: "The recovery link has already been used or has expired. Request a new one.", ru: "Ссылка для восстановления уже использована или истекла. Запросите новую.", ja: "回復リンクは使用済みか、有効期限が切れています。新しいリンクをリクエストしてください。", zh: "恢复链接已被使用或已过期，请重新申请。", de: "Der Wiederherstellungslink wurde bereits verwendet oder ist abgelaufen. Fordere einen neuen an." },
  perfil_no_encontrado: { es: "No se encontró tu perfil de jugador. Cierra sesión y vuelve a entrar, o avisa al equipo.", en: "Your player profile was not found. Sign out and sign in again, or tell the team.", ru: "Профиль игрока не найден. Выйдите и войдите снова или сообщите команде.", ja: "プレイヤープロフィールが見つかりません。ログアウトして再度ログインするか、チームに連絡してください。", zh: "未找到你的玩家资料。请退出后重新登录，或联系团队。", de: "Dein Spielerprofil wurde nicht gefunden. Melde dich ab und wieder an oder informiere das Team." },
  correo_requerido: { es: "Ingresa un correo electrónico", en: "Enter an email address", ru: "Введите адрес электронной почты", ja: "メールアドレスを入力してください", zh: "请输入电子邮箱", de: "Gib eine E-Mail-Adresse ein" },
  token_invalido: { es: "Token de recuperación no válido", en: "Invalid recovery token", ru: "Недействительный токен восстановления", ja: "無効な回復トークンです", zh: "无效的恢复令牌", de: "Ungültiges Wiederherstellungstoken" },
  error_login:    { es: "Error al iniciar sesión", en: "Error logging in", ru: "Ошибка входа", ja: "ログインエラー", zh: "登录出错", de: "Fehler beim Anmelden" },
  error_registro: { es: "Error al registrar", en: "Error signing up", ru: "Ошибка регистрации", ja: "登録エラー", zh: "注册出错", de: "Fehler bei der Registrierung" },
  error_rate_limit_email: { es: "Se alcanzó temporalmente el límite de envío de correos de verificación. No realices más intentos por ahora. Espera un momento y vuelve a intentarlo.", en: "The verification email sending limit was temporarily reached. Please don't try again right now. Wait a moment and try again.", ru: "Временно достигнут лимит отправки писем с подтверждением. Пожалуйста, не пытайтесь снова прямо сейчас. Подождите немного и повторите попытку.", ja: "確認メールの送信上限に一時的に達しました。今はこれ以上お試しにならないでください。しばらく待ってから再度お試しください。", zh: "验证邮件发送已达到临时上限，请暂时不要再次尝试，稍等片刻后重试。", de: "Das Limit für den Versand von Bestätigungs-E-Mails wurde vorübergehend erreicht. Bitte versuche es jetzt nicht erneut. Warte einen Moment und versuche es dann wieder." },
  error_email_ya_registrado: { es: "Este correo ya está registrado. Inicia sesión en lugar de registrarte.", en: "This email is already registered. Log in instead of signing up.", ru: "Эта почта уже зарегистрирована. Войдите вместо регистрации.", ja: "このメールアドレスはすでに登録されています。新規登録の代わりにログインしてください。", zh: "该邮箱已被注册，请直接登录，无需重新注册。", de: "Diese E-Mail-Adresse ist bereits registriert. Melde dich stattdessen an." },
  error_email_invalido: { es: "El correo electrónico no es válido.", en: "The email address is not valid.", ru: "Электронная почта недействительна.", ja: "メールアドレスが無効です。", zh: "该电子邮箱无效。", de: "Die E-Mail-Adresse ist ungültig." },
  error_password_debil: { es: "La contraseña es demasiado débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.", en: "The password is too weak. Use at least 6 characters with uppercase, lowercase, and numbers.", ru: "Пароль слишком слабый. Используйте минимум 6 символов, включая заглавные, строчные буквы и цифры.", ja: "パスワードが弱すぎます。大文字、小文字、数字を含む6文字以上を使用してください。", zh: "密码强度太弱，请使用至少6位包含大小写字母和数字的密码。", de: "Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen mit Groß-, Kleinbuchstaben und Zahlen." },
  error_credenciales_invalidas: { es: "Credenciales inválidas.", en: "Invalid credentials.", ru: "Неверные учётные данные.", ja: "認証情報が無効です。", zh: "凭据无效。", de: "Ungültige Anmeldedaten." },
  error_desconocido_registro: { es: "Error desconocido al registrar", en: "Unknown error while signing up", ru: "Неизвестная ошибка при регистрации", ja: "登録中に不明なエラーが発生しました", zh: "注册时发生未知错误", de: "Unbekannter Fehler bei der Registrierung" },
  error_conexion_servidor: { es: "Error de conexión con el servidor. Intenta de nuevo.", en: "Connection error with the server. Please try again.", ru: "Ошибка соединения с сервером. Попробуйте еще раз.", ja: "サーバーとの接続エラーです。もう一度お試しください。", zh: "与服务器的连接出错，请重试。", de: "Verbindungsfehler mit dem Server. Bitte versuche es erneut." },
  preg_no_pudo_iniciar_ronda: { es: "No se pudo iniciar la ronda. Intenta de nuevo en unos segundos.", en: "The round could not be started. Try again in a few seconds.", ru: "Не удалось начать раунд. Повторите попытку через несколько секунд.", ja: "ラウンドを開始できませんでした。数秒後にもう一度お試しください。", zh: "无法开始本轮。请在几秒后重试。", de: "Die Runde konnte nicht gestartet werden. Versuche es in ein paar Sekunden erneut." },
  preg_dominas_nivel: { es: "💪 ¡Dominas este nivel! Prueba una dificultad o nivel mayor para ganar más monedas.", en: "💪 You've mastered this level! Try a higher difficulty or level to earn more coins.", ru: "💪 Вы освоили этот уровень! Попробуйте более высокую сложность или уровень, чтобы заработать больше монет.", ja: "💪 このレベルを習得しました！より高い難易度やレベルに挑戦して、もっとコインを稼ごう。", zh: "💪 你已经掌握了这个级别！试试更高的难度或级别，赢取更多金币。", de: "💪 Du beherrschst dieses Level! Versuche einen höheren Schwierigkeitsgrad oder ein höheres Level, um mehr Münzen zu verdienen." },
  preg_recompensa_por_acierto: { es: "+{valor} 🪙 por acierto", en: "+{valor} 🪙 per correct answer", ru: "+{valor} 🪙 за правильный ответ", ja: "正解ごとに +{valor} 🪙", zh: "每答对一题 +{valor} 🪙", de: "+{valor} 🪙 pro richtiger Antwort" },
  error_rate_limit_registro: { es: "Se alcanzó temporalmente el límite de envío de correos de verificación. No realices más intentos por ahora. Espera un momento y vuelve a intentarlo.", en: "The verification email sending limit was temporarily reached. Don't try again for now. Wait a moment and try again.", ru: "Временно достигнут лимит отправки писем для подтверждения. Пока не пытайтесь снова. Подождите немного и повторите попытку.", ja: "確認メールの送信上限に一時的に達しました。しばらくの間は再試行しないでください。少し待ってからもう一度お試しください。", zh: "已暂时达到验证邮件发送上限。请暂时不要再次尝试，稍等片刻后重试。", de: "Das Limit für das Versenden von Bestätigungs-E-Mails wurde vorübergehend erreicht. Versuche es vorerst nicht erneut. Warte einen Moment und versuche es dann noch einmal." },
  error_correo_ya_registrado: { es: "Este correo ya está registrado. Inicia sesión en lugar de registrarte.", en: "This email is already registered. Log in instead of signing up.", ru: "Этот адрес электронной почты уже зарегистрирован. Войдите в систему вместо регистрации.", ja: "このメールアドレスは既に登録されています。登録ではなくログインしてください。", zh: "该邮箱已被注册。请登录，而不是注册。", de: "Diese E-Mail-Adresse ist bereits registriert. Melde dich stattdessen an." },
  error_correo_invalido: { es: "El correo electrónico no es válido.", en: "The email address is not valid.", ru: "Адрес электронной почты недействителен.", ja: "メールアドレスが無効です。", zh: "邮箱地址无效。", de: "Die E-Mail-Adresse ist ungültig." },
  error_contrasena_debil: { es: "La contraseña es demasiado débil. Usa al menos 6 caracteres con mayúsculas, minúsculas y números.", en: "The password is too weak. Use at least 6 characters with uppercase, lowercase and numbers.", ru: "Пароль слишком слабый. Используйте не менее 6 символов с заглавными, строчными буквами и цифрами.", ja: "パスワードが弱すぎます。大文字・小文字・数字を含む6文字以上を使用してください。", zh: "密码强度太弱。请使用至少6位，包含大小写字母和数字的密码。", de: "Das Passwort ist zu schwach. Verwende mindestens 6 Zeichen mit Groß- und Kleinbuchstaben sowie Zahlen." },
  error_correo_no_confirmado: { es: "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada (y spam).", en: "You must confirm your email before logging in. Check your inbox (and spam folder).", ru: "Вы должны подтвердить свой адрес электронной почты, прежде чем войти в систему. Проверьте почтовый ящик (и папку «Спам»).", ja: "ログインする前にメールアドレスを確認してください。受信トレイ（および迷惑メールフォルダ）を確認してください。", zh: "登录前必须先确认你的邮箱。请查看你的收件箱（以及垃圾邮件文件夹）。", de: "Du musst deine E-Mail-Adresse bestätigen, bevor du dich anmeldest. Überprüfe dein Postfach (und den Spam-Ordner)." },
  error_correo_o_contrasena_incorrectos: { es: "Correo o contraseña incorrectos.", en: "Incorrect email or password.", ru: "Неверный адрес электронной почты или пароль.", ja: "メールアドレスまたはパスワードが正しくありません。", zh: "邮箱或密码错误。", de: "E-Mail-Adresse oder Passwort falsch." },
  error_demasiados_intentos: { es: "Demasiados intentos. Espera un momento y vuelve a intentarlo.", en: "Too many attempts. Wait a moment and try again.", ru: "Слишком много попыток. Подождите немного и повторите попытку.", ja: "試行回数が多すぎます。少し待ってからもう一度お試しください。", zh: "尝试次数过多。请稍等片刻后重试。", de: "Zu viele Versuche. Warte einen Moment und versuche es dann noch einmal." },

  // ── Casino Royale ──────────────────────────────────────────────────
  hagansusap: { es: "¡HAGAN SUS APUESTAS!", en: "PLACE YOUR BETS!", ru: "ДЕЛАЙТЕ СТАВКИ!", ja: "ベットしてください！", zh: "请下注！", de: "MACHEN SIE IHRE EINSÄTZE!" },
  pares_iguales: { es: "Pares iguales", en: "Matching pair", ru: "Пара одинаковых", ja: "ゾロ目", zh: "相同对子", de: "Gleiches Paar" },
  secuencia: { es: "Secuencia", en: "Sequence", ru: "Последовательность", ja: "連番", zh: "连续数字", de: "Folge" },
  ambos_pares: { es: "Ambos pares", en: "Both even", ru: "Оба чётные", ja: "両方偶数", zh: "均为偶数", de: "Beide gerade" },
  cr_dados_iguales: { es: "¡DADOS IGUALES! x4 ({r1}-{r2})", en: "MATCHING DICE! x4 ({r1}-{r2})", ru: "КОСТИ СОВПАЛИ! x4 ({r1}-{r2})", ja: "ゾロ目！x4（{r1}-{r2}）", zh: "骰子相同！x4（{r1}-{r2}）", de: "GLEICHE WÜRFEL! x4 ({r1}-{r2})" },
  cr_secuencia_msg: { es: "¡SECUENCIA! x3 ({r1}-{r2})", en: "SEQUENCE! x3 ({r1}-{r2})", ru: "ПОСЛЕДОВАТЕЛЬНОСТЬ! x3 ({r1}-{r2})", ja: "連番！x3（{r1}-{r2}）", zh: "连续数字！x3（{r1}-{r2}）", de: "FOLGE! x3 ({r1}-{r2})" },
  cr_ambos_pares_msg: { es: "¡AMBOS PARES! x2 ({r1}-{r2})", en: "BOTH EVEN! x2 ({r1}-{r2})", ru: "ОБА ЧЁТНЫЕ! x2 ({r1}-{r2})", ja: "両方偶数！x2（{r1}-{r2}）", zh: "均为偶数！x2（{r1}-{r2}）", de: "BEIDE GERADE! x2 ({r1}-{r2})" },
  cr_pierdes_msg: { es: "{r1} - {r2}. ¡PIERDES!", en: "{r1} - {r2}. YOU LOSE!", ru: "{r1} - {r2}. ВЫ ПРОИГРАЛИ!", ja: "{r1} - {r2}。敗北…", zh: "{r1} - {r2}。你输了！", de: "{r1} - {r2}. DU VERLIERST!" },
  cr_lanzando: { es: "🎲 LANZANDO...", en: "🎲 ROLLING...", ru: "🎲 БРОСАЕМ...", ja: "🎲 投げています...", zh: "🎲 掷骰子中…", de: "🎲 WÜRFELN..." },
  cr_apostar_monedas: { es: "APOSTAR {monedas} MONEDAS", en: "BET {monedas} COINS", ru: "СТАВКА {monedas} МОНЕТ", ja: "{monedas}コインをベット", zh: "下注 {monedas} 枚金币", de: "{monedas} MÜNZEN WETTEN" },

  // ── Ruleta ───────────────────────────────────────────────────────────
  ruleta_col1: { es: "Col 1", en: "Col 1", ru: "Кол. 1", ja: "列1", zh: "第1列", de: "Kol. 1" },
  ruleta_col2: { es: "Col 2", en: "Col 2", ru: "Кол. 2", ja: "列2", zh: "第2列", de: "Kol. 2" },
  ruleta_col3: { es: "Col 3", en: "Col 3", ru: "Кол. 3", ja: "列3", zh: "第3列", de: "Kol. 3" },
  color_rojo: { es: "ROJO", en: "RED", ru: "КРАСНЫЙ", ja: "赤", zh: "红色", de: "ROT" },
  color_negro: { es: "NEGRO", en: "BLACK", ru: "ЧЁРНЫЙ", ja: "黒", zh: "黑色", de: "SCHWARZ" },
  ruleta_elige_numeros: { es: "¡Elige tus números para jugar!", en: "Choose your numbers to play!", ru: "Выберите свои числа, чтобы играть!", ja: "プレイする数字を選んでください！", zh: "选择你的数字开始游戏！", de: "Wähle deine Zahlen, um zu spielen!" },
  ruleta_numeros_seleccionados: { es: "{n} números seleccionados", en: "{n} numbers selected", ru: "Выбрано чисел: {n}", ja: "選択した数字：{n}", zh: "已选择 {n} 个数字", de: "{n} Zahlen ausgewählt" },
  ruleta_selecciona_uno: { es: "¡Selecciona al menos un número!", en: "Choose at least one number!", ru: "Выберите хотя бы одно число!", ja: "少なくとも1つの数字を選んでください！", zh: "请至少选择一个数字！", de: "Wähle mindestens eine Zahl!" },
  ruleta_girando: { es: "¡Girando...!", en: "Spinning...!", ru: "Крутится...!", ja: "回転中...！", zh: "旋转中……！", de: "Dreht sich...!" },
  ruleta_ganaste_numero: { es: "¡GANASTE! Número: {n}", en: "YOU WIN! Number: {n}", ru: "ВЫ ВЫИГРАЛИ! Число: {n}", ja: "勝利！数字：{n}", zh: "你赢了！数字：{n}", de: "DU GEWINNST! Zahl: {n}" },
  ruleta_perdiste_numero: { es: "¡PERDISTE! Número: {n}", en: "YOU LOSE! Number: {n}", ru: "ВЫ ПРОИГРАЛИ! Число: {n}", ja: "敗北…数字：{n}", zh: "你输了！数字：{n}", de: "DU VERLIERST! Zahl: {n}" },

  // ── Dados (Duelo de Dados) ───────────────────────────────────────────
  rechazar: { es: "RECHAZAR", en: "REJECT", ru: "ОТКЛОНИТЬ", ja: "拒否", zh: "拒绝", de: "ABLEHNEN" },
  tu: { es: "TÚ", en: "YOU", ru: "ВЫ", ja: "あなた", zh: "你", de: "DU" },
  victorias: { es: "victorias", en: "wins", ru: "побед", ja: "勝利数", zh: "胜场", de: "Siege" },
  maquina_label: { es: "MÁQUINA", en: "MACHINE", ru: "МАШИНА", ja: "マシン", zh: "机器", de: "MASCHINE" },
  dados_sub: { es: "¡Lanza los dados y vence a la máquina!", en: "Roll the dice and beat the machine!", ru: "Бросайте кости и обыграйте машину!", ja: "サイコロを振ってマシンを倒そう！", zh: "掷骰子，击败机器！", de: "Würfle und besiege die Maschine!" },
  jefe: { es: "JEFE", en: "BOSS", ru: "БОСС", ja: "ボス", zh: "首领", de: "BOSS" },
  boss_1: { es: "NOVATO", en: "NOVICE", ru: "НОВИЧОК", ja: "ノービス", zh: "新手", de: "ANFÄNGER" },
  boss_2: { es: "SOLDADO", en: "SOLDIER", ru: "СОЛДАТ", ja: "ソルジャー", zh: "士兵", de: "SOLDAT" },
  boss_3: { es: "ÉLITE", en: "ELITE", ru: "ЭЛИТА", ja: "エリート", zh: "精英", de: "ELITE" },
  boss_4: { es: "CAMPEÓN", en: "CHAMPION", ru: "ЧЕМПИОН", ja: "チャンピオン", zh: "冠军", de: "CHAMPION" },
  boss_5: { es: "REY DADO", en: "DICE KING", ru: "КОРОЛЬ КОСТЕЙ", ja: "サイコロの王", zh: "骰子之王", de: "WÜRFELKÖNIG" },
  ronda_texto: { es: "Ronda:", en: "Round:", ru: "Раунд:", ja: "ラウンド:", zh: "回合：", de: "Runde:" },
  vs: { es: "VS", en: "VS", ru: "ПРОТИВ", ja: "VS", zh: "VS", de: "GEGEN" },
  presiona_lanzar: { es: "¡Presiona Lanzar para empezar!", en: "Press Roll to start!", ru: "Нажмите «Бросить», чтобы начать!", ja: "「振る」を押してスタート！", zh: "点击“掷骰子”开始！", de: "Drücke Würfeln, um zu starten!" },
  dados_tirando: { es: "🎲 ¡Tirando! 🎲", en: "🎲 Rolling! 🎲", ru: "🎲 Бросаем! 🎲", ja: "🎲 振っています！🎲", zh: "🎲 掷骰子中！🎲", de: "🎲 Würfeln! 🎲" },
  dados_ganaste_ronda: { es: "🎉 ¡Ganaste la ronda! ({j} vs {m})", en: "🎉 You won the round! ({j} vs {m})", ru: "🎉 Вы выиграли раунд! ({j} vs {m})", ja: "🎉 ラウンド勝利！（{j} vs {m}）", zh: "🎉 你赢得了这一回合！（{j} vs {m}）", de: "🎉 Du hast die Runde gewonnen! ({j} vs {m})" },
  dados_empate_maquina: { es: "😤 ¡Empate! La máquina gana el desempate. ({j} vs {m})", en: "😤 Tie! The machine wins the tiebreaker. ({j} vs {m})", ru: "😤 Ничья! Машина побеждает в переигровке. ({j} vs {m})", ja: "😤 引き分け！タイブレークはマシンの勝ち。（{j} vs {m}）", zh: "😤 平局！机器赢得了加时判定。（{j} vs {m}）", de: "😤 Unentschieden! Die Maschine gewinnt den Stichentscheid. ({j} vs {m})" },
  dados_maquina_gano_ronda: { es: "💻 La máquina ganó la ronda. ({j} vs {m})", en: "💻 The machine won the round. ({j} vs {m})", ru: "💻 Машина выиграла раунд. ({j} vs {m})", ja: "💻 マシンがラウンドに勝利。（{j} vs {m}）", zh: "💻 机器赢得了这一回合。（{j} vs {m}）", de: "💻 Die Maschine hat die Runde gewonnen. ({j} vs {m})" },
  dados_ganaste_duelo: { es: "🏆 ¡GANASTE EL DUELO! +{monedas} 🪙", en: "🏆 YOU WON THE DUEL! +{monedas} 🪙", ru: "🏆 ВЫ ВЫИГРАЛИ ДУЭЛЬ! +{monedas} 🪙", ja: "🏆 デュエル勝利！+{monedas} 🪙", zh: "🏆 你赢得了对决！+{monedas} 🪙", de: "🏆 DU HAST DAS DUELL GEWONNEN! +{monedas} 🪙" },
  dados_boss_derrotado: { es: "👹 ¡BOSS DERROTADO! Pasa al {boss} 🚀", en: "👹 BOSS DEFEATED! Moving on to {boss} 🚀", ru: "👹 БОСС ПОВЕРЖЕН! Переход к: {boss} 🚀", ja: "👹 ボス撃破！次は{boss}へ 🚀", zh: "👹 首领已击败！进入下一关：{boss} 🚀", de: "👹 BOSS BESIEGT! Weiter zu {boss} 🚀" },
  dados_felicidades_todos: { es: "👑 ¡FELICIDADES! Derrotaste a todos los jefes. Vuelves al principio. 🏆", en: "👑 CONGRATULATIONS! You defeated all the bosses. You're back at the start. 🏆", ru: "👑 ПОЗДРАВЛЯЕМ! Вы победили всех боссов. Вы возвращаетесь к началу. 🏆", ja: "👑 おめでとうございます！すべてのボスを倒しました。最初に戻ります。🏆", zh: "👑 恭喜！你击败了所有首领，现在回到最初。🏆", de: "👑 GLÜCKWUNSCH! Du hast alle Bosse besiegt. Du kehrst zum Anfang zurück. 🏆" },
  dados_maquina_gano_duelo: { es: "💻 La máquina ganó el duelo. ¡Inténtalo de nuevo!", en: "💻 The machine won the duel. Try again!", ru: "💻 Машина выиграла дуэль. Попробуйте снова!", ja: "💻 マシンがデュエルに勝利。もう一度挑戦しよう！", zh: "💻 机器赢得了对决，再试一次吧！", de: "💻 Die Maschine hat das Duell gewonnen. Versuch es noch einmal!" },

  // ── Memoria ──────────────────────────────────────────────────────────
  memoria_tit: { es: "¡MEMORIA Y PARES!", en: "MEMORY AND PAIRS!", ru: "ПАМЯТЬ И ПАРЫ!", ja: "メモリー＆ペア！", zh: "记忆配对！", de: "MEMORY UND PAARE!" },
  nivel_facil: { es: "FÁCIL", en: "EASY", ru: "ЛЕГКО", ja: "かんたん", zh: "简单", de: "LEICHT" },
  nivel_normal: { es: "NORMAL", en: "NORMAL", ru: "НОРМАЛЬНО", ja: "ふつう", zh: "普通", de: "NORMAL" },
  nivel_dificil: { es: "DIFÍCIL", en: "HARD", ru: "СЛОЖНО", ja: "むずかしい", zh: "困难", de: "SCHWER" },
  nivel_experto: { es: "EXPERTO", en: "EXPERT", ru: "ЭКСПЕРТ", ja: "エキスパート", zh: "专家", de: "EXPERTE" },
  nivel_leyenda: { es: "LEYENDA", en: "LEGEND", ru: "ЛЕГЕНДА", ja: "レジェンド", zh: "传奇", de: "LEGENDE" },
  memoria_pares_mov: { es: "{pares} pares / {mov} mov", en: "{pares} pairs / {mov} mvs", ru: "{pares} пар / {mov} ход.", ja: "{pares}ペア / {mov}手", zh: "{pares}对 / {mov}步", de: "{pares} Paare / {mov} Züge" },
  memoria_encuentra_pares: { es: "¡Encuentra {pares} pares en menos de {mov} movimientos!", en: "Find {pares} pairs in fewer than {mov} moves!", ru: "Найдите {pares} пар менее чем за {mov} ходов!", ja: "{mov}手未満で{pares}ペアを見つけよう！", zh: "在{mov}步以内找到{pares}对！", de: "Finde {pares} Paare in weniger als {mov} Zügen!" },
  memoria_encuentra_todos: { es: "¡Encuentra todos los pares!", en: "Find all the pairs!", ru: "Найдите все пары!", ja: "すべてのペアを見つけよう！", zh: "找到所有配对！", de: "Finde alle Paare!" },

  // ── Cartas Retro (póker) ─────────────────────────────────────────────
  repartir: { es: "REPARTIR", en: "DEAL", ru: "РАЗДАТЬ", ja: "配る", zh: "发牌", de: "AUSTEILEN" },
  escalera_real: { es: "Escalera Real", en: "Royal Flush", ru: "Роял-флеш", ja: "ロイヤルフラッシュ", zh: "皇家同花顺", de: "Royal Flush" },
  escalera_color: { es: "Escalera Color", en: "Straight Flush", ru: "Стрит-флеш", ja: "ストレートフラッシュ", zh: "同花顺", de: "Straight Flush" },
  poker: { es: "Póker", en: "Four of a Kind", ru: "Каре", ja: "フォーカード", zh: "四条", de: "Vierling" },
  full: { es: "Full House", en: "Full House", ru: "Фулл-хаус", ja: "フルハウス", zh: "葫芦", de: "Full House" },
  color: { es: "Color", en: "Flush", ru: "Флеш", ja: "フラッシュ", zh: "同花", de: "Flush" },
  escalera: { es: "Escalera", en: "Straight", ru: "Стрит", ja: "ストレート", zh: "顺子", de: "Straße" },
  trio: { es: "Trío", en: "Three of a Kind", ru: "Тройка", ja: "スリーカード", zh: "三条", de: "Drilling" },
  doble_par: { es: "Doble Par", en: "Two Pair", ru: "Две пары", ja: "ツーペア", zh: "两对", de: "Zwei Paare" },
  par: { es: "Par", en: "Pair", ru: "Пара", ja: "ワンペア", zh: "一对", de: "Paar" },
  carta_alta: { es: "CARTA ALTA", en: "HIGH CARD", ru: "СТАРШАЯ КАРТА", ja: "ハイカード", zh: "高牌", de: "HIGH CARD" },
  cartas_cambios_disponibles: { es: "Cambios disponibles:", en: "Changes available:", ru: "Доступно замен:", ja: "交換可能回数:", zh: "可换牌次数：", de: "Verfügbare Wechsel:" },
  cambiar: { es: "Cambiar", en: "Change", ru: "Заменить", ja: "交換", zh: "更换", de: "Wechseln" },
  cartas_no_mas_cambios: { es: "¡NO PUEDES HACER MÁS CAMBIOS!", en: "YOU CAN'T CHANGE ANY MORE CARDS!", ru: "БОЛЬШЕ ЗАМЕН НЕ ДОСТУПНО!", ja: "これ以上カードを交換できません！", zh: "无法再更换更多牌了！", de: "DU KANNST KEINE KARTEN MEHR WECHSELN!" },
  cartas_confirmar_repartir: { es: "Aún tienes {n} cambios disponibles, ¿desea continuar?", en: "You still have {n} changes available, do you want to continue?", ru: "У вас ещё есть {n} доступных замен(ы), хотите продолжить?", ja: "まだ{n}回の交換が可能です。続けますか？", zh: "你还有{n}次换牌机会，是否继续？", de: "Du hast noch {n} Wechsel übrig, möchtest du fortfahren?" },

  // ── Tragamonedas ─────────────────────────────────────────────────────
  trag_sub: { es: "¡Gira y gana grandes premios!", en: "Spin and win big prizes!", ru: "Крутите и выигрывайте крупные призы!", ja: "回して大きな賞品を獲得しよう！", zh: "旋转赢取大奖！", de: "Dreh und gewinne große Preise!" },

  // ── Preguntas (motor del juego: áreas, dificultad, nivel académico) ──
  topic_sociales: { es: "SOCIALES", en: "SOCIAL STUDIES", ru: "ОБЩЕСТВОЗНАНИЕ", ja: "社会", zh: "社会", de: "SOZIALKUNDE" },
  topic_literatura: { es: "LITERATURA", en: "LITERATURE", ru: "ЛИТЕРАТУРА", ja: "文学", zh: "文学", de: "LITERATUR" },
  topic_fisica: { es: "FÍSICA", en: "PHYSICS", ru: "ФИЗИКА", ja: "物理", zh: "物理", de: "PHYSIK" },
  topic_matematicas: { es: "MATEMÁTICAS", en: "MATH", ru: "МАТЕМАТИКА", ja: "数学", zh: "数学", de: "MATHE" },
  topic_logica: { es: "LÓGICA", en: "LOGIC", ru: "ЛОГИКА", ja: "論理", zh: "逻辑", de: "LOGIK" },
  topic_ingles: { es: "INGLÉS", en: "ENGLISH", ru: "АНГЛИЙСКИЙ", ja: "英語", zh: "英语", de: "ENGLISCH" },
  preg_area_prefijo: { es: "Área:", en: "Subject:", ru: "Тема:", ja: "分野:", zh: "领域：", de: "Bereich:" },
  preg_dificultad_prefijo: { es: "Dificultad:", en: "Difficulty:", ru: "Сложность:", ja: "難易度:", zh: "难度：", de: "Schwierigkeit:" },
  preg_seguro: { es: "¿SEGURO?", en: "ARE YOU SURE?", ru: "ВЫ УВЕРЕНЫ?", ja: "よろしいですか？", zh: "确定吗？", de: "BIST DU SICHER?" },
  preg_nivel_titulo: { es: "Selecciona tu nivel académico", en: "Choose your academic level", ru: "Выберите свой учебный уровень", ja: "学年レベルを選んでください", zh: "选择你的学习阶段", de: "Wähle deine Bildungsstufe" },
  nivel_primaria_basica: { es: "Primaria básica", en: "Elementary (early)", ru: "Начальная школа (младшие классы)", ja: "小学校低学年", zh: "小学低年级", de: "Grundschule (Unterstufe)" },
  nivel_primaria_avanzada: { es: "Primaria avanzada", en: "Elementary (advanced)", ru: "Начальная школа (старшие классы)", ja: "小学校高学年", zh: "小学高年级", de: "Grundschule (Oberstufe)" },
  nivel_bachillerato_basico: { es: "Bachillerato básico", en: "Middle school", ru: "Средняя школа", ja: "中学校", zh: "初中", de: "Mittelstufe" },
  nivel_bachillerato_avanzado: { es: "Bachillerato avanzado", en: "High school", ru: "Старшая школа", ja: "高等学校", zh: "高中", de: "Oberstufe" },
  nivel_universitario: { es: "Universitario", en: "University", ru: "Университет", ja: "大学", zh: "大学", de: "Universität" },
  preg_ver_explicacion: { es: "Ver explicación", en: "See explanation", ru: "Посмотреть объяснение", ja: "解説を見る", zh: "查看解析", de: "Erklärung ansehen" },
  explicacion_titulo: { es: "EXPLICACIÓN", en: "EXPLANATION", ru: "ОБЪЯСНЕНИЕ", ja: "解説", zh: "解析", de: "ERKLÄRUNG" },
  preg_siguiente_pregunta: { es: "Siguiente pregunta", en: "Next question", ru: "Следующий вопрос", ja: "次の質問", zh: "下一题", de: "Nächste Frage" },
  preg_sin_preguntas_nivel: { es: "No hay preguntas disponibles para este nivel académico.", en: "No questions are available for this academic level.", ru: "Для этого учебного уровня нет доступных вопросов.", ja: "この学年レベルに利用できる質問がありません。", zh: "该学习阶段暂无可用的问题。", de: "Für diese Bildungsstufe sind keine Fragen verfügbar." },
  preg_completado: { es: "¡COMPLETADO!", en: "COMPLETED!", ru: "ЗАВЕРШЕНО!", ja: "完了！", zh: "已完成！", de: "ABGESCHLOSSEN!" },
  preg_resultado_resumen: { es: "Correctas: {correctas} | Incorrectas: {incorrectas} | Monedas: {monedas}", en: "Correct: {correctas} | Incorrect: {incorrectas} | Coins: {monedas}", ru: "Верно: {correctas} | Неверно: {incorrectas} | Монеты: {monedas}", ja: "正解: {correctas} | 不正解: {incorrectas} | コイン: {monedas}", zh: "正确：{correctas} | 错误：{incorrectas} | 金币：{monedas}", de: "Richtig: {correctas} | Falsch: {incorrectas} | Münzen: {monedas}" },
  preg_pista_prefijo: { es: "💡 Pista: {palabra}", en: "💡 Hint: {palabra}", ru: "💡 Подсказка: {palabra}", ja: "💡 ヒント：{palabra}", zh: "💡 提示：{palabra}", de: "💡 Hinweis: {palabra}" },
  preg_popular: { es: "👥 POPULAR", en: "👥 POPULAR", ru: "👥 ПОПУЛЯРНЫЙ", ja: "👥 人気", zh: "👥 热门", de: "👥 BELIEBT" },
  preg_intenta_de_nuevo: { es: "♻️ ¡INTENTA DE NUEVO!", en: "♻️ TRY AGAIN!", ru: "♻️ ПОПРОБУЙТЕ СНОВА!", ja: "♻️ もう一度！", zh: "♻️ 再试一次！", de: "♻️ VERSUCH ES NOCHMAL!" },
  preg_tiempo_infinito: { es: "⌛ ¡TIEMPO INFINITO!", en: "⌛ INFINITE TIME!", ru: "⌛ БЕСКОНЕЧНОЕ ВРЕМЯ!", ja: "⌛ 無限時間！", zh: "⌛ 无限时间！", de: "⌛ UNENDLICH ZEIT!" },
  preg_ronda_no_registrada: { es: "⚠ Ronda no registrada en servidor. Se muestra saldo actual.", en: "⚠ Round not recorded on the server. Showing current balance.", ru: "⚠ Раунд не зарегистрирован на сервере. Отображается текущий баланс.", ja: "⚠ ラウンドがサーバーに記録されませんでした。現在の残高を表示しています。", zh: "⚠ 本回合未在服务器上记录，当前显示的是现有余额。", de: "⚠ Runde wurde nicht auf dem Server erfasst. Aktueller Kontostand wird angezeigt." },
  preg_respuesta_no_registrada: { es: "⚠ Esta respuesta no se pudo registrar. Se muestra tu saldo real.", en: "⚠ This answer could not be recorded. Showing your real balance.", ru: "⚠ Этот ответ не удалось зарегистрировать. Отображается ваш реальный баланс.", ja: "⚠ この回答は記録できませんでした。実際の残高を表示しています。", zh: "⚠ 此答案未能成功记录，当前显示的是您的真实余额。", de: "⚠ Diese Antwort konnte nicht erfasst werden. Dein tatsächlicher Kontostand wird angezeigt." },
  registro_email_confirmacion: { es: "Registro realizado correctamente. Hemos enviado un correo de verificación a {email}. Revisa tu bandeja de entrada y la carpeta de spam.", en: "Registration successful. We've sent a verification email to {email}. Check your inbox and spam folder.", ru: "Регистрация прошла успешно. Мы отправили письмо с подтверждением на {email}. Проверьте входящие и папку со спамом.", ja: "登録が完了しました。確認メールを{email}に送信しました。受信トレイと迷惑メールフォルダをご確認ください。", zh: "注册成功。我们已向 {email} 发送了一封验证邮件，请查看收件箱和垃圾邮件文件夹。", de: "Registrierung erfolgreich. Wir haben eine Bestätigungs-E-Mail an {email} gesendet. Bitte überprüfe deinen Posteingang und den Spam-Ordner." },

  // ── Inventario / bolsa ────────────────────────────────────────────
  inventario_lleno_titulo: { es: "¡Inventario lleno!", en: "Inventory full!", ru: "Инвентарь заполнен!", ja: "インベントリがいっぱいです！", zh: "背包已满！", de: "Inventar voll!" },
  inventario_lleno_desc: { es: "No tienes espacio para más objetos.", en: "You don't have room for more items.", ru: "У вас нет места для новых предметов.", ja: "これ以上アイテムを持てません。", zh: "没有空间容纳更多物品了。", de: "Du hast keinen Platz mehr für weitere Gegenstände." },
  inventario_lleno_desc2: { es: "Usa o elimina algunos objetos de tu bolsa antes de comprar más.", en: "Use or remove some items from your bag before buying more.", ru: "Используйте или удалите несколько предметов из сумки, прежде чем покупать новые.", ja: "新しく購入する前に、バッグの中のアイテムを使うか削除してください。", zh: "购买更多物品前，请先使用或删除背包中的一些物品。", de: "Benutze oder entferne einige Gegenstände aus deiner Tasche, bevor du weitere kaufst." },
  sin_items_comprados: { es: "No tienes items comprados", en: "You haven't bought any items", ru: "У вас нет купленных предметов", ja: "購入したアイテムはありません", zh: "你还没有购买任何物品", de: "Du hast keine Gegenstände gekauft" },
  restriccion_generica: { es: "Debes estar en la página correcta para usar este objeto.", en: "You must be on the correct page to use this item.", ru: "Вы должны находиться на нужной странице, чтобы использовать этот предмет.", ja: "このアイテムを使うには正しいページにいる必要があります。", zh: "你必须在正确的页面才能使用此物品。", de: "Du musst dich auf der richtigen Seite befinden, um diesen Gegenstand zu benutzen." },
  restriccion_pregunta: { es: "Debes estar en una ronda de preguntas para usar este objeto.", en: "You must be in a question round to use this item.", ru: "Вы должны находиться в раунде вопросов, чтобы использовать этот предмет.", ja: "このアイテムを使うには質問ラウンド中である必要があります。", zh: "你必须处于答题环节才能使用此物品。", de: "Du musst dich in einer Fragerunde befinden, um diesen Gegenstand zu benutzen." },
  restriccion_pregunta_activa: { es: "Debes estar en una ronda de preguntas activa para usar este objeto.", en: "You must be in an active question round to use this item.", ru: "Вы должны находиться в активном раунде вопросов, чтобы использовать этот предмет.", ja: "このアイテムを使うには進行中の質問ラウンドである必要があります。", zh: "你必须处于进行中的答题环节才能使用此物品。", de: "Du musst dich in einer laufenden Fragerunde befinden, um diesen Gegenstand zu benutzen." },
  restriccion_casino: { es: "Este objeto solo puede usarse desde la sección Casino.", en: "This item can only be used from the Casino section.", ru: "Этот предмет можно использовать только в разделе «Казино».", ja: "このアイテムはカジノセクションでのみ使用できます。", zh: "此物品只能在赌场版块中使用。", de: "Dieser Gegenstand kann nur im Casino-Bereich verwendet werden." },
  restriccion_ronda_terminada: { es: "La ronda de preguntas ha terminado. No puedes usar este objeto ahora.", en: "The question round has ended. You can't use this item now.", ru: "Раунд вопросов завершён. Сейчас вы не можете использовать этот предмет.", ja: "質問ラウンドは終了しました。今はこのアイテムを使用できません。", zh: "答题环节已结束，现在无法使用此物品。", de: "Die Fragerunde ist beendet. Du kannst diesen Gegenstand jetzt nicht benutzen." },

  // ── Mensajes compartidos "sin monedas" (dados, tragamonedas, carreras…) ──
  sin_monedas: { es: "¡Sin monedas!", en: "No coins!", ru: "Нет монет!", ja: "コインがありません！", zh: "金币不足！", de: "Keine Münzen!" },
  no_suf_mon: { es: "No tienes suficientes monedas para jugar.", en: "You don't have enough coins to play.", ru: "У вас недостаточно монет, чтобы играть.", ja: "プレイに必要なコインが足りません。", zh: "你的金币不足以进行游戏。", de: "Du hast nicht genug Münzen, um zu spielen." },
  no_suf_mon_apostar: { es: "No tienes suficientes monedas para apostar.", en: "You don't have enough coins to bet.", ru: "У вас недостаточно монет, чтобы делать ставку.", ja: "ベットに必要なコインが足りません。", zh: "你的金币不足以下注。", de: "Du hast nicht genug Münzen, um zu wetten." },
  monedas_neces: { es: "Monedas necesarias:", en: "Coins needed:", ru: "Нужно монет:", ja: "必要コイン数:", zh: "所需金币：", de: "Benötigte Münzen:" },
  recarga_prefijo: { es: "Se agregarán 10 Monedas en ", en: "10 Coins will be added in ", ru: "10 монет будет начислено через ", ja: "10コインが追加されるまで：", zh: "10 枚金币将在以下时间后到账：", de: "In diesem Zeitraum werden 10 Münzen hinzugefügt: " },
  recarga_completa: { es: "¡Se han agregado 10 Monedas!", en: "10 Coins have been added!", ru: "10 монет были начислены!", ja: "10コインが追加されました！", zh: "已获得10枚金币！", de: "10 Münzen wurden hinzugefügt!" },
  restriccion_cerrar: { es: "Haz clic en cualquier parte para cerrar este mensaje.", en: "Click anywhere to close this message.", ru: "Нажмите в любом месте, чтобы закрыть это сообщение.", ja: "どこかをクリックしてこのメッセージを閉じてください。", zh: "点击任意位置关闭此消息。", de: "Klicke irgendwo, um diese Nachricht zu schließen." },
  no_puedes_usar_objeto: { es: "¡No puedes usar este objeto aquí!", en: "You can't use this item here!", ru: "Вы не можете использовать этот предмет здесь!", ja: "ここではこのアイテムを使用できません！", zh: "你不能在这里使用这个物品！", de: "Du kannst diesen Gegenstand hier nicht benutzen!" },
  confirmar_uso_item: { es: "¿Seguro de utilizar este objeto?", en: "Are you sure you want to use this item?", ru: "Вы уверены, что хотите использовать этот предмет?", ja: "本当にこのアイテムを使用しますか？", zh: "确定要使用这个物品吗？", de: "Bist du sicher, dass du diesen Gegenstand benutzen möchtest?" },
  item_activado: { es: "activado!", en: "activated!", ru: "активировано!", ja: "が発動しました！", zh: "已激活！", de: "aktiviert!" },



  // ── Carreras: interfaz general ────────────────────────────────────
  carreras_subtitulo: { es: "Elige un hipódromo para ver sus 16 participantes", en: "Choose a racecourse to see its 16 participants", ru: "Выберите ипподром, чтобы увидеть его 16 участников", ja: "16頭の出走馬を見るには競馬場を選んでください", zh: "选择一个赛马场查看其16名参赛者", de: "Wähle eine Rennbahn, um ihre 16 Teilnehmer zu sehen" },
  carreras_volver_hipodromos: { es: "← Volver a hipódromos", en: "← Back to racecourses", ru: "← Назад к ипподромам", ja: "← 競馬場一覧に戻る", zh: "← 返回赛马场列表", de: "← Zurück zu den Rennbahnen" },
  carreras_volver_menu: { es: "VOLVER AL MENÚ PRINCIPAL", en: "BACK TO MAIN MENU", ru: "НАЗАД В ГЛАВНОЕ МЕНЮ", ja: "メインメニューに戻る", zh: "返回主菜单", de: "ZURÜCK ZUM HAUPTMENÜ" },
  carreras_go: { es: "¡GO!", en: "GO!", ru: "СТАРТ!", ja: "GO！", zh: "出发！", de: "LOS!" },
  carreras_acertaste: { es: "¡Acertaste! {caballo} ganó la carrera", en: "You got it! {caballo} won the race", ru: "Вы угадали! {caballo} выиграл(а) скачку", ja: "的中！{caballo}がレースに勝ちました", zh: "你猜对了！{caballo} 赢得了比赛", de: "Volltreffer! {caballo} hat das Rennen gewonnen" },
  carreras_no_gano: { es: "{caballo} no ganó esta vez", en: "{caballo} didn't win this time", ru: "{caballo} не победил(а) на этот раз", ja: "{caballo}は今回勝てませんでした", zh: "{caballo} 这次没有获胜", de: "{caballo} hat dieses Mal nicht gewonnen" },
  carreras_distancia: { es: "Distancia:", en: "Distance:", ru: "Дистанция:", ja: "距離:", zh: "距离：", de: "Distanz:" },
  carreras_terreno: { es: "Terreno:", en: "Terrain:", ru: "Покрытие:", ja: "馬場:", zh: "赛道类型：", de: "Untergrund:" },
  carreras_clima: { es: "Clima:", en: "Weather:", ru: "Погода:", ja: "天候:", zh: "天气：", de: "Wetter:" },
  carreras_condicion: { es: "Condición:", en: "Condition:", ru: "Состояние:", ja: "馬場状態:", zh: "场地状况：", de: "Zustand:" },
  carreras_cuota_estimada: { es: "Probabilidad estimada:", en: "Estimated win probability:", ru: "Расчётная вероятность победы:", ja: "推定勝率：", zh: "预计获胜概率：", de: "Geschätzte Gewinnwahrscheinlichkeit:" },
  carreras_personalidad: { es: "Personalidad", en: "Personality", ru: "Личность", ja: "性格", zh: "个性", de: "Persönlichkeit" },
  carreras_historial: { es: "Historial", en: "History", ru: "История", ja: "履歴", zh: "历史记录", de: "Verlauf" },
  // Ordinal de puesto ("1.º" / "1st" / "1着"…). Antes estaba escrito a mano
  // como `puesto + '.º'` en tres sitios distintos de Carreras (chips del
  // historial, botones de puestos y filas de la clasificación final), así
  // que el sufijo salía siempre en español en los 6 idiomas.
  carreras_ordinal: { es: "{puesto}.º", en: "#{puesto}", ru: "{puesto}-е", ja: "{puesto}着", zh: "第{puesto}名", de: "{puesto}." },
  // Unidad de distancia del hipódromo (antes ' m' fijo en ui-seleccion.js).
  carreras_metros: { es: "{distancia} m", en: "{distancia} m", ru: "{distancia} м", ja: "{distancia} m", zh: "{distancia} 米", de: "{distancia} m" },
  // Caso "no se pudo verificar el resultado en el servidor": antes se
  // mostraba como una derrota normal aunque no se hubiera cobrado nada.
  carreras_sin_verificar: { es: "No se pudo verificar el resultado de la carrera. La apuesta no se ha cobrado.", en: "The race result could not be verified. Your bet has not been charged.", ru: "Не удалось проверить результат скачки. Ставка не была списана.", ja: "レース結果を確認できませんでした。賭け金は引き落とされていません。", zh: "无法验证比赛结果，本次下注未扣款。", de: "Das Rennergebnis konnte nicht überprüft werden. Dein Einsatz wurde nicht abgebucht." },
  carreras_apostar: { es: "APOSTAR", en: "BET", ru: "СДЕЛАТЬ СТАВКУ", ja: "賭ける", zh: "下注", de: "WETTEN" },
  carreras_apuesta_simple: { es: "Apuesta simple", en: "Simple bet", ru: "Обычная ставка", ja: "シンプルベット", zh: "简单投注", de: "Einfache Wette" },
  carreras_apuesta_puesto: { es: "Apuesta por puesto", en: "Position bet", ru: "Ставка по месту", ja: "着順ベット", zh: "名次投注", de: "Platzwette" },
  carreras_ha_ganado: { es: "Ha ganado {caballo}", en: "{caballo} won", ru: "{caballo} выиграл(а)", ja: "{caballo}が勝ちました", zh: "{caballo}赢了", de: "{caballo} hat gewonnen" },
  carreras_carreras_registradas: { es: "carreras registradas", en: "races on record", ru: "скачек в истории", ja: "レース記録", zh: "场比赛记录", de: "erfasste Rennen" },
  carreras_de_victorias: { es: "de victorias", en: "wins", ru: "побед", ja: "勝率", zh: "胜率", de: "Siege" },
  carreras_entre_5_primeros: { es: "entre los 5 primeros", en: "in the top 5", ru: "в топ-5", ja: "トップ5入り", zh: "跻身前5名", de: "unter den Top 5" },
  carreras_puesto_promedio: { es: "puesto promedio", en: "average position", ru: "средняя позиция", ja: "平均順位", zh: "平均名次", de: "durchschnittlicher Platz" },
  carreras_apuesta_confirmada: { es: "APUESTA CONFIRMADA", en: "BET CONFIRMED", ru: "СТАВКА ПОДТВЕРЖДЕНА", ja: "ベット確定", zh: "已确认投注", de: "WETTE BESTÄTIGT" },
  // NUEVO (no existía en -i18n: el modo de apuesta "por puesto" es posterior).
  // Traducción completada a los 6 idiomas (antes sólo tenía "es").
  carreras_acertaste_puesto: { es: "¡Acertaste! {caballo} llegó en el puesto {puesto}", en: "You got it! {caballo} finished in position {puesto}", ru: "Вы угадали! {caballo} финишировал(а) на {puesto}-м месте", ja: "的中！{caballo}は{puesto}着でした", zh: "你猜对了！{caballo} 以第{puesto}名完赛", de: "Volltreffer! {caballo} kam auf Platz {puesto}" },
  carreras_fuera_puesto: { es: "{caballo} llegó en el puesto {puesto} (fuera de tu selección)", en: "{caballo} finished in position {puesto} (outside your selection)", ru: "{caballo} финишировал(а) на {puesto}-м месте (вне вашего выбора)", ja: "{caballo}は{puesto}着でした（選択した着順の対象外）", zh: "{caballo} 以第{puesto}名完赛（不在你的选择范围内）", de: "{caballo} kam auf Platz {puesto} (außerhalb deiner Auswahl)" },
  // PENDIENTE: bug heredado del propio proyecto -i18n (data-i18n="area"/"dificultad"
  // apuntaban a claves inexistentes). Se corrigió la referencia; solo se tradujo
  // al español por ahora, ya que ninguna fuente fiable (ni -i18n ni actual)
  // tenía estos dos textos traducidos a los otros 5 idiomas.
  preg_selecciona_area: { es: "Selecciona un área" },
  preg_dificultad_titulo: { es: "DIFICULTAD" },
  carreras_confirmar_apuesta: { es: "CONFIRMAR APUESTA", en: "CONFIRM BET", ru: "ПОДТВЕРДИТЬ СТАВКУ", ja: "ベットを確定", zh: "确认投注", de: "WETTE BESTÄTIGEN" },
  carreras_elige_puestos: { es: "Elige hasta 5 puestos en los que apostar a este caballo", en: "Choose up to 5 positions to bet on for this horse", ru: "Выберите до 5 мест, на которые можно поставить для этой лошади", ja: "この馬に賭ける着順を最大5つまで選んでください", zh: "为这匹马选择最多5个下注名次", de: "Wähle bis zu 5 Plätze, auf die du für dieses Pferd wetten möchtest" },
  carreras_costo: { es: "Costo:", en: "Cost:", ru: "Стоимость:", ja: "コスト：", zh: "花费：", de: "Kosten:" },
  carreras_multiplicador: { es: "Multiplicador:", en: "Multiplier:", ru: "Множитель:", ja: "倍率：", zh: "倍数：", de: "Multiplikator:" },
  carreras_confirmar_apuesta_puesto: { es: "CONFIRMAR APUESTA POR PUESTO", en: "CONFIRM POSITION BET", ru: "ПОДТВЕРДИТЬ СТАВКУ НА МЕСТО", ja: "着順ベットを確定", zh: "确认名次投注", de: "PLATZWETTE BESTÄTIGEN" },
  carreras_volver_caballos: { es: "← Volver a caballos", en: "← Back to horses", ru: "← Назад к лошадям", ja: "← 出走馬一覧に戻る", zh: "← 返回赛马列表", de: "← Zurück zu den Pferden" },
  // NUEVO: etiqueta "Tu caballo: X" en la parte inferior de la pantalla de
  // carrera (Fase de revisión: identificación consistente del caballo apostado).
  carreras_tu_caballo: { es: "Tu caballo:", en: "Your horse:", ru: "Ваша лошадь:", ja: "あなたの馬:", zh: "你的赛马：", de: "Dein Pferd:" },

  // ── Carreras: hipódromos ──────────────────────────────────────────
  hipodromo_sakura_nombre: { es: "Hipódromo Sakura", en: "Sakura Racecourse", ru: "Ипподром «Сакура»", ja: "サクラ競馬場", zh: "樱花赛马场", de: "Sakura-Rennbahn" },
  hipodromo_sakura_descripcion: { es: "Una pista clásica rodeada de cerezos, célebre por sus llegadas ajustadas.", en: "A classic track surrounded by cherry trees, famous for its close finishes.", ru: "Классический ипподром, окружённый вишнёвыми деревьями, знаменитый плотными финишами.", ja: "桜の木々に囲まれたクラシックなコースで、僅差のフィニッシュで有名です。", zh: "一条被樱花树环绕的经典赛道，以势均力敌的冲刺著称。", de: "Eine klassische Strecke, umgeben von Kirschbäumen, bekannt für ihre knappen Zieleinläufe." },
  hipodromo_sakura_clima: { es: "Soleado", en: "Sunny", ru: "Солнечно", ja: "晴れ", zh: "晴天", de: "Sonnig" },
  hipodromo_sakura_terreno: { es: "Césped", en: "Turf", ru: "Трава", ja: "芝", zh: "草地", de: "Rasen" },
  hipodromo_sakura_condicion: { es: "Buen estado", en: "Good condition", ru: "Хорошее состояние", ja: "良好", zh: "状态良好", de: "Guter Zustand" },
  hipodromo_altiplano_nombre: { es: "Hipódromo del Altiplano", en: "Altiplano Racecourse", ru: "Ипподром «Альтиплано»", ja: "アルティプラノ競馬場", zh: "高原赛马场", de: "Altiplano-Rennbahn" },
  hipodromo_altiplano_descripcion: { es: "Pista de altura donde el aire fino premia a los caballos más resistentes.", en: "A high-altitude track where the thin air rewards the most resilient horses.", ru: "Высокогорный ипподром, где разрежённый воздух благоволит самым выносливым лошадям.", ja: "標高の高いコースで、薄い空気が最も持久力のある馬に有利に働きます。", zh: "一条高海拔赛道，稀薄的空气对耐力最强的赛马更为有利。", de: "Eine Höhenstrecke, auf der die dünne Luft die widerstandsfähigsten Pferde belohnt." },
  hipodromo_altiplano_clima: { es: "Ventoso", en: "Windy", ru: "Ветрено", ja: "風が強い", zh: "多风", de: "Windig" },
  hipodromo_altiplano_terreno: { es: "Tierra", en: "Dirt", ru: "Грунт", ja: "ダート", zh: "泥地", de: "Sandbahn" },
  hipodromo_altiplano_condicion: { es: "Ligero", en: "Light", ru: "Лёгкое", ja: "軽い", zh: "轻软", de: "Leicht" },
  hipodromo_medianoche_nombre: { es: "Circuito Medianoche", en: "Midnight Circuit", ru: "Трасса «Полночь»", ja: "ミッドナイトサーキット", zh: "午夜赛道", de: "Mitternachts-Rennstrecke" },
  hipodromo_medianoche_descripcion: { es: "Carreras nocturnas bajo reflectores, famosas por sus finales explosivos.", en: "Night races under floodlights, famous for their explosive finishes.", ru: "Ночные скачки под прожекторами, знаменитые своими взрывными финишами.", ja: "投光照明の下で行われる夜のレースで、爆発的なフィニッシュで有名です。", zh: "在灯光下举行的夜间比赛，以爆炸性的冲刺闻名。", de: "Nachtrennen unter Flutlicht, berühmt für ihre explosiven Zielankünfte." },
  hipodromo_medianoche_clima: { es: "Despejado (noche)", en: "Clear (night)", ru: "Ясно (ночь)", ja: "快晴（夜）", zh: "晴朗（夜间）", de: "Klar (Nacht)" },
  hipodromo_medianoche_terreno: { es: "Sintético", en: "Synthetic", ru: "Синтетическое покрытие", ja: "人工馬場", zh: "合成跑道", de: "Kunststoffbahn" },
  hipodromo_medianoche_condicion: { es: "Rápido", en: "Fast", ru: "Быстрое", ja: "速い", zh: "快速", de: "Schnell" },
  "hipodromo_costa-brava_nombre": { es: "Hipódromo Costa Brava", en: "Costa Brava Racecourse", ru: "Ипподром «Коста-Брава»", ja: "コスタ・ブラバ競馬場", zh: "布拉瓦海岸赛马场", de: "Costa-Brava-Rennbahn" },
  "hipodromo_costa-brava_descripcion": { es: "Pista costera con brisa constante y un tramo final junto al mar.", en: "A coastal track with a steady breeze and a final stretch right by the sea.", ru: "Прибрежный ипподром с постоянным бризом и финишной прямой у самого моря.", ja: "絶え間ない潮風が吹く海沿いのコースで、海のすぐそばにフィニッシュ区間があります。", zh: "一条海边赛道，常年有微风，冲刺直道就在海边。", de: "Eine Küstenstrecke mit stetiger Brise und einer Zielgeraden direkt am Meer." },
  "hipodromo_costa-brava_clima": { es: "Nublado", en: "Cloudy", ru: "Облачно", ja: "曇り", zh: "多云", de: "Bewölkt" },
  "hipodromo_costa-brava_terreno": { es: "Césped", en: "Turf", ru: "Трава", ja: "芝", zh: "草地", de: "Rasen" },
  "hipodromo_costa-brava_condicion": { es: "Blando", en: "Soft", ru: "Мягкое", ja: "重馬場", zh: "松软", de: "Weich" },
  "hipodromo_valle-rojo_nombre": { es: "Valle Rojo", en: "Red Valley", ru: "Красная долина", ja: "レッドバレー", zh: "红谷", de: "Rotes Tal" },
  "hipodromo_valle-rojo_descripcion": { es: "Tierras áridas y una recta final larga que castiga a los caballos irregulares.", en: "Arid lands and a long home stretch that punishes inconsistent horses.", ru: "Засушливые земли и длинная финишная прямая, которая наказывает нестабильных лошадей.", ja: "乾燥した大地と長い直線コースが、ムラのある馬に厳しく試練を与えます。", zh: "干旱的土地和长长的终点直道，对状态不稳定的赛马格外残酷。", de: "Trockenes Land und eine lange Zielgerade, die unbeständige Pferde bestraft." },
  "hipodromo_valle-rojo_clima": { es: "Caluroso", en: "Hot", ru: "Жарко", ja: "暑い", zh: "炎热", de: "Heiß" },
  "hipodromo_valle-rojo_terreno": { es: "Tierra", en: "Dirt", ru: "Грунт", ja: "ダート", zh: "泥地", de: "Sandbahn" },
  "hipodromo_valle-rojo_condicion": { es: "Firme", en: "Firm", ru: "Плотное", ja: "良馬場", zh: "坚实", de: "Fest" },
  "hipodromo_bosque-plateado_nombre": { es: "Bosque Plateado", en: "Silver Forest", ru: "Серебряный лес", ja: "シルバーフォレスト", zh: "银色森林", de: "Silberwald" },
  "hipodromo_bosque-plateado_descripcion": { es: "Trazado sinuoso entre árboles centenarios, exige caballos muy estables.", en: "A winding course among centuries-old trees, demanding very steady horses.", ru: "Извилистая трасса среди вековых деревьев требует очень устойчивых лошадей.", ja: "樹齢を重ねた木々の間を縫うコースで、非常に安定した馬が求められます。", zh: "蜿蜒穿过百年古树的赛道，要求赛马极其稳定。", de: "Ein kurvenreicher Kurs zwischen jahrhundertealten Bäumen, der sehr ausgeglichene Pferde verlangt." },
  "hipodromo_bosque-plateado_clima": { es: "Neblina ligera", en: "Light mist", ru: "Лёгкий туман", ja: "薄い霧", zh: "薄雾", de: "Leichter Nebel" },
  "hipodromo_bosque-plateado_terreno": { es: "Césped", en: "Turf", ru: "Трава", ja: "芝", zh: "草地", de: "Rasen" },
  "hipodromo_bosque-plateado_condicion": { es: "Pesado", en: "Heavy", ru: "Тяжёлое", ja: "不良馬場", zh: "泥泞", de: "Schwer" },
  "hipodromo_gran-cascada_nombre": { es: "Gran Cascada", en: "Grand Cascade", ru: "Большой водопад", ja: "グランドカスケード", zh: "大瀑布", de: "Große Kaskade" },
  "hipodromo_gran-cascada_descripcion": { es: "Pista panorámica junto a una cascada, escenario de remontadas históricas.", en: "A scenic track beside a waterfall, the stage for historic comebacks.", ru: "Живописный ипподром рядом с водопадом, место исторических камбэков.", ja: "滝のそばにある景観の美しいコースで、歴史的な大逆転劇の舞台です。", zh: "靠近瀑布的风景赛道，见证过多次历史性的绝地反超。", de: "Eine malerische Strecke neben einem Wasserfall, Schauplatz historischer Aufholjagden." },
  "hipodromo_gran-cascada_clima": { es: "Lluvia ligera", en: "Light rain", ru: "Лёгкий дождь", ja: "小雨", zh: "小雨", de: "Leichter Regen" },
  "hipodromo_gran-cascada_terreno": { es: "Tierra", en: "Dirt", ru: "Грунт", ja: "ダート", zh: "泥地", de: "Sandbahn" },
  "hipodromo_gran-cascada_condicion": { es: "Fangoso", en: "Muddy", ru: "Грязевое", ja: "泥濘", zh: "泥泞", de: "Schlammig" },
  "hipodromo_estrella-dorada_nombre": { es: "Hipódromo Estrella Dorada", en: "Golden Star Racecourse", ru: "Ипподром «Золотая звезда»", ja: "ゴールデンスター競馬場", zh: "金星赛马场", de: "Goldstern-Rennbahn" },
  "hipodromo_estrella-dorada_descripcion": { es: "El hipódromo más prestigioso del circuito, cuna de los grandes favoritos.", en: "The most prestigious racecourse in the circuit, birthplace of the great favorites.", ru: "Самый престижный ипподром на трассе, родина великих фаворитов.", ja: "サーキットの中で最も名高い競馬場で、数々の名馬を輩出してきました。", zh: "巡回赛中最负盛名的赛马场，孕育了众多大热门赛马。", de: "Die renommierteste Rennbahn der Rennserie, Geburtsort der großen Favoriten." },
  "hipodromo_estrella-dorada_clima": { es: "Soleado", en: "Sunny", ru: "Солнечно", ja: "晴れ", zh: "晴天", de: "Sonnig" },
  "hipodromo_estrella-dorada_terreno": { es: "Césped", en: "Turf", ru: "Трава", ja: "芝", zh: "草地", de: "Rasen" },
  "hipodromo_estrella-dorada_condicion": { es: "Óptimo", en: "Optimal", ru: "Отличное", ja: "最良", zh: "最佳", de: "Optimal" },

  // ── Carreras: personalidad de caballos (el nombre NUNCA se traduce) ──
  caballo_horse_001_personalidad: { es: "Tiene una salida explosiva y rara vez baja el ritmo hasta cruzar la meta.", en: "Has an explosive start and rarely slows down until crossing the finish line.", ru: "Обладает взрывным стартом и редко сбавляет темп до самого финиша.", ja: "爆発的なスタートを切り、ゴールラインを越えるまでほとんどペースを落としません。", zh: "起跑爆发力十足，直到冲过终点线也很少放慢速度。", de: "Hat einen explosiven Start und verlangsamt sich selten, bis er die Ziellinie überquert." },
  caballo_horse_002_personalidad: { es: "Corredor metódico: marca su propio ritmo y pocas veces se ve superado.", en: "A methodical runner: sets his own pace and is rarely overtaken.", ru: "Методичный бегун: задаёт собственный темп и его редко обгоняют.", ja: "計算高いランナーで、自分のペースを保ち、追い抜かれることはほとんどありません。", zh: "跑法讲究章法，自己掌控节奏，很少被超越。", de: "Ein methodischer Läufer: gibt sein eigenes Tempo vor und wird selten überholt." },
  caballo_horse_003_personalidad: { es: "Favorito habitual del público, muy pocas veces decepciona.", en: "A perennial crowd favorite, he very rarely disappoints.", ru: "Постоянный любимец публики, очень редко разочаровывает.", ja: "観客に人気の常連で、期待を裏切ることはほとんどありません。", zh: "一贯是观众的心头好，很少让人失望。", de: "Ein Dauerfavorit des Publikums, der nur sehr selten enttäuscht." },
  caballo_horse_004_personalidad: { es: "Impone su presencia desde el arranque y administra la ventaja con calma.", en: "Asserts himself right from the start and manages his lead calmly.", ru: "Заявляет о себе с самого старта и спокойно удерживает преимущество.", ja: "スタートから存在感を示し、リードを冷静に管理します。", zh: "从起跑就展现气场，从容不迫地维持领先优势。", de: "Setzt sich von Beginn an durch und verwaltet seinen Vorsprung mit Ruhe." },
  caballo_horse_005_personalidad: { es: "Cuando encuentra su ritmo puede ganar cualquier carrera, pero no siempre lo logra.", en: "When he finds his rhythm he can win any race, but he doesn't always manage it.", ru: "Когда находит свой ритм, способен выиграть любую скачку, но получается не всегда.", ja: "調子が合えばどんなレースでも勝てますが、いつもそうなるとは限りません。", zh: "一旦找到节奏就能赢下任何一场比赛，但并非每次都能做到。", de: "Wenn er seinen Rhythmus findet, kann er jedes Rennen gewinnen, aber das gelingt nicht immer." },
  caballo_horse_006_personalidad: { es: "Explosivo en tramos cortos, aunque suele pagar caro sus arranques.", en: "Explosive over short stretches, though he often pays dearly for his bursts.", ru: "Взрывной на коротких дистанциях, но часто дорого расплачивается за свои рывки.", ja: "短い区間では爆発的ですが、その勢いのツケを払うことがよくあります。", zh: "短距离爆发力惊人，但常常为自己的猛冲付出代价。", de: "Explosiv auf kurzen Strecken, zahlt aber oft teuer für seine Ausbrüche." },
  caballo_horse_007_personalidad: { es: "Capaz de sorprender con un cierre feroz cuando menos se lo espera.", en: "Capable of surprising everyone with a fierce closing kick when least expected.", ru: "Способен удивить яростным финишным рывком, когда этого меньше всего ждут.", ja: "思いがけないタイミングで猛烈な追い込みを見せることがあります。", zh: "总能在意想不到的时候用凶猛的冲刺给人惊喜。", de: "Kann mit einem furiosen Schlussspurt überraschen, wenn man es am wenigsten erwartet." },
  caballo_horse_008_personalidad: { es: "Alterna carreras brillantes con actuaciones muy discretas.", en: "Alternates brilliant races with very modest performances.", ru: "Чередует блестящие скачки с очень скромными выступлениями.", ja: "見事なレースと地味な走りを交互に見せます。", zh: "精彩表现和平淡表现交替出现。", de: "Wechselt zwischen brillanten Rennen und sehr bescheidenen Leistungen." },
  caballo_horse_009_personalidad: { es: "Constante y rara vez termina fuera de los primeros puestos.", en: "Consistent, and he rarely finishes outside the top positions.", ru: "Стабилен и редко финиширует за пределами первых мест.", ja: "安定感があり、上位を外すことはめったにありません。", zh: "表现稳定，很少跌出前列名次。", de: "Beständig und landet selten außerhalb der vorderen Plätze." },
  caballo_horse_010_personalidad: { es: "Regular como un reloj: siempre pelea el pelotón de punta.", en: "Regular as clockwork: always fighting for a place at the front of the pack.", ru: "Точен, как часы: всегда борется в головной группе.", ja: "時計のように規則正しく、常に先頭集団で争います。", zh: "表现规律得像时钟一样，总能挤进领先集团争夺。", de: "Regelmäßig wie ein Uhrwerk: kämpft immer an der Spitze des Feldes." },
  caballo_horse_011_personalidad: { es: "No suele ganar, pero casi siempre está cerca de los líderes.", en: "Doesn't usually win, but is almost always close to the leaders.", ru: "Обычно не побеждает, но почти всегда рядом с лидерами.", ja: "勝つことは少ないですが、ほぼ常に先頭グループの近くにいます。", zh: "不常获胜，但几乎总能紧跟在领先者身后。", de: "Gewinnt selten, ist aber fast immer nah an der Spitze." },
  caballo_horse_012_personalidad: { es: "Corredor sólido, casi nunca se queda fuera de los puestos de avanzada.", en: "A solid runner, almost never left out of the leading positions.", ru: "Надёжный скакун, почти никогда не остаётся вне передовых позиций.", ja: "堅実な走りを見せ、上位の座を外すことはほとんどありません。", zh: "实力扎实，几乎从不缺席领先位置。", de: "Ein solider Läufer, der fast nie außerhalb der Spitzenplätze bleibt." },
  caballo_horse_013_personalidad: { es: "Suele quedarse en la mitad de la carrera, con destellos ocasionales.", en: "Tends to stay in the middle of the pack, with occasional flashes of brilliance.", ru: "Обычно держится в середине скачки, изредка показывая яркие моменты.", ja: "レースの中盤にとどまることが多いですが、時折光る走りを見せます。", zh: "通常处于比赛中游，偶尔也能闪光。", de: "Bleibt meist in der Mitte des Rennens, mit gelegentlichen Glanzmomenten." },
  caballo_horse_014_personalidad: { es: "Corre parejo pero le cuesta llegar entre los mejores.", en: "Runs evenly but struggles to reach the top positions.", ru: "Бежит ровно, но ему трудно попасть в число лучших.", ja: "安定して走りますが、上位に食い込むのは苦手です。", zh: "跑得中规中矩，但很难跻身佼佼者之列。", de: "Läuft gleichmäßig, hat aber Mühe, unter die Besten zu kommen." },
  caballo_horse_015_personalidad: { es: "Trabajador, aunque el pelotón de punta se le suele escapar.", en: "Hard-working, though the leading pack usually slips away from him.", ru: "Трудолюбив, но головная группа обычно ускользает от него.", ja: "努力家ですが、先頭集団にはなかなか追いつけません。", zh: "很努力，但领先集团常常与它擦肩而过。", de: "Fleißig, doch die Spitzengruppe entkommt ihm meist." },
  caballo_horse_016_personalidad: { es: "Necesita una carrera perfecta para asomarse a los primeros puestos.", en: "Needs a perfect race to get a glimpse of the top positions.", ru: "Ему нужна идеальная скачка, чтобы претендовать на первые места.", ja: "上位に食い込むには完璧なレースが必要です。", zh: "需要一场完美的比赛才能触及领先名次。", de: "Braucht ein perfektes Rennen, um die vorderen Plätze auch nur zu erahnen." },
  caballo_horse_017_personalidad: { es: "Un día parece imparable y al siguiente se queda muy atrás; nunca se sabe cuál saldrá.", en: "One day he seems unstoppable, the next he falls far behind; you never know which one will show up.", ru: "В один день кажется непобедимым, а в другой сильно отстаёт — никогда не знаешь, каким он выйдет на старт.", ja: "ある日は無敵に見えても、次の日には大きく遅れを取る。どちらが現れるかは誰にも分かりません。", zh: "有时看起来势不可挡，有时又远远落后，永远猜不到今天会是哪一种状态。", de: "An einem Tag scheint er unaufhaltsam, am nächsten fällt er weit zurück; man weiß nie, welche Version antritt." },
  caballo_horse_018_personalidad: { es: "Sus resultados van de un extremo a otro sin patrón claro.", en: "His results swing from one extreme to the other with no clear pattern.", ru: "Его результаты колеблются от одной крайности к другой без чёткой закономерности.", ja: "結果は極端から極端へと振れ、はっきりしたパターンがありません。", zh: "成绩忽好忽坏，没有明显规律。", de: "Seine Ergebnisse schwanken ohne erkennbares Muster von einem Extrem zum anderen." },
  caballo_horse_019_personalidad: { es: "Puede pelear la punta o desaparecer del mapa en la misma temporada.", en: "He can fight for the lead or vanish from the map within the same season.", ru: "Может бороться за лидерство или полностью пропасть из виду в течение одного сезона.", ja: "同じシーズン内で首位争いをすることもあれば、まったく姿を消すこともあります。", zh: "同一个赛季里，它可能争夺榜首，也可能彻底销声匿迹。", de: "Er kann um die Führung kämpfen oder in derselben Saison komplett von der Bildfläche verschwinden." },
  caballo_horse_020_personalidad: { es: "Temperamental: sus carreras son una caja de sorpresas.", en: "Temperamental: his races are a box full of surprises.", ru: "Темпераментен: его скачки — это ящик сюрпризов.", ja: "気まぐれで、レースはいつもサプライズ箱です。", zh: "性情多变，每场比赛都像一个惊喜盒子。", de: "Temperamentvoll: seine Rennen sind eine Wundertüte voller Überraschungen." },
  caballo_horse_021_personalidad: { es: "Corredor discreto que casi siempre termina en la mitad del pelotón.", en: "A modest runner who almost always finishes in the middle of the pack.", ru: "Скромный скакун, почти всегда финиширующий в середине пелотона.", ja: "控えめな走りで、ほとんどいつも集団の中盤でフィニッシュします。", zh: "表现低调，几乎总是在集团中段完赛。", de: "Ein unauffälliger Läufer, der fast immer in der Mitte des Feldes ins Ziel kommt." },
  caballo_horse_022_personalidad: { es: "Ni sobresale ni decepciona: un competidor parejo y predecible.", en: "Neither stands out nor disappoints: a steady, predictable competitor.", ru: "Не выделяется, но и не разочаровывает: ровный и предсказуемый соперник.", ja: "目立つこともがっかりさせることもない、安定して予測しやすい競走馬です。", zh: "既不出彩也不失望，是一个稳定且可预测的选手。", de: "Sticht weder hervor noch enttäuscht er: ein gleichmäßiger, berechenbarer Konkurrent." },
  caballo_horse_023_personalidad: { es: "Se mantiene siempre en un cómodo término medio.", en: "Always stays comfortably in the middle of the pack.", ru: "Всегда держится на удобной средней позиции.", ja: "常に無理のない中位を保ちます。", zh: "总是安稳地保持在中游位置。", de: "Bleibt stets bequem im Mittelfeld." },
  caballo_horse_024_personalidad: { es: "Corre sin sobresaltos, casi siempre lejos tanto de la punta como del fondo.", en: "Runs without surprises, almost always far from both the front and the back.", ru: "Бежит без неожиданностей, почти всегда далеко и от лидеров, и от аутсайдеров.", ja: "波乱もなく走り、先頭からも最後尾からもほぼ常に距離を保ちます。", zh: "跑得平稳无波澜，几乎总是远离领先者和垫底者。", de: "Läuft ohne Überraschungen, fast immer weit weg von Spitze und Schlussgruppe." },
  caballo_horse_025_personalidad: { es: "Ningún historial parece explicar del todo lo que va a hacer hoy.", en: "No past record seems to fully explain what he's about to do today.", ru: "Никакая статистика, кажется, не может до конца объяснить, что он сделает сегодня.", ja: "過去の記録では、今日の走りを完全に説明することはできません。", zh: "任何过往战绩似乎都无法完全解释它今天会做什么。", de: "Keine Vorgeschichte scheint wirklich zu erklären, was er heute vorhat." },
  caballo_horse_026_personalidad: { es: "Un completo enigma: cualquier resultado es posible.", en: "A complete enigma: any result is possible.", ru: "Полная загадка: возможен любой результат.", ja: "まったくの謎で、どんな結果もあり得ます。", zh: "完全是个谜，任何结果都有可能。", de: "Ein absolutes Rätsel: jedes Ergebnis ist möglich." },
  caballo_horse_027_personalidad: { es: "Su comportamiento cambia carrera a carrera sin razón aparente.", en: "His behavior changes from race to race for no apparent reason.", ru: "Его поведение меняется от скачки к скачке без видимой причины.", ja: "レースごとに理由もなく走り方が変わります。", zh: "它的表现在每场比赛中都毫无缘由地变化。", de: "Sein Verhalten ändert sich von Rennen zu Rennen ohne ersichtlichen Grund." },
  caballo_horse_028_personalidad: { es: "Los expertos ya no intentan predecir sus carreras.", en: "Experts have given up trying to predict his races.", ru: "Эксперты уже даже не пытаются предсказывать его скачки.", ja: "専門家ももはや彼のレースを予想しようとしません。", zh: "专家们已经放弃预测它的比赛了。", de: "Experten versuchen gar nicht mehr, seine Rennen vorherzusagen." },
  caballo_horse_029_personalidad: { es: "Casi siempre presente en la pelea final, aunque no siempre gana.", en: "Almost always present in the final fight, though he doesn't always win.", ru: "Почти всегда участвует в финальной борьбе, хотя не всегда побеждает.", ja: "最終局面にはほぼ常に顔を出しますが、必ずしも勝つとは限りません。", zh: "几乎总能杀入最后的争夺，但不总是获胜。", de: "Ist fast immer im Schlusskampf dabei, gewinnt aber nicht immer." },
  caballo_horse_030_personalidad: { es: "Frío y calculador: administra sus fuerzas como pocos.", en: "Cool and calculating: he manages his energy like few others.", ru: "Хладнокровен и расчётлив: мало кто так же хорошо распределяет силы.", ja: "冷静沈着で、体力配分の巧みさは群を抜いています。", zh: "冷静而精于算计，体力分配堪称一绝。", de: "Kühl und berechnend: er teilt sich seine Kräfte ein wie kaum ein anderer." },
  caballo_horse_031_personalidad: { es: "Explosivo pero irregular; cuando arranca bien es muy difícil de alcanzar.", en: "Explosive but inconsistent; when he starts well he's very hard to catch.", ru: "Взрывной, но нестабильный; если удачно стартует — догнать его очень трудно.", ja: "爆発力はあるがムラがあり、好スタートを切ると追いつくのが非常に困難です。", zh: "爆发力强但不稳定，一旦起跑顺利就极难被追上。", de: "Explosiv, aber unbeständig; wenn er gut startet, ist er sehr schwer einzuholen." },
  caballo_horse_032_personalidad: { es: "Le cuesta despegar, pero cuando lo hace ya casi nadie la frena.", en: "Struggles to get going, but once she does, almost nothing can stop her.", ru: "С трудом набирает ход, но когда разгоняется, остановить её уже почти невозможно.", ja: "スタートは苦手ですが、一度勢いに乗ると止められる馬はほとんどいません。", zh: "起步比较吃力，但一旦发力，几乎无人能挡。", de: "Kommt schwer in Fahrt, aber wenn sie es einmal ist, kann sie fast niemand mehr bremsen." },

  // ── Portal de juegos (carrusel de juegosprincipalpage.html) ────────
  juego_tragamonedas_titulo: { es: "TRAGAMONEDAS", en: "SLOTS", ru: "ИГРОВОЙ АВТОМАТ", ja: "スロット", zh: "老虎机", de: "SPIELAUTOMAT" },
  juego_tragamonedas_subtitulo: { es: "¡Prueba tu suerte con el gran tragamonedas!", en: "Try your luck with the big slot machine!", ru: "Испытайте удачу на большом игровом автомате!", ja: "巨大スロットマシンで運試し！", zh: "来试试大老虎机，看看你的运气吧！", de: "Versuch dein Glück am großen Spielautomaten!" },
  juego_memoria_titulo: { es: "MEMORIA", en: "MEMORY", ru: "ПАМЯТЬ", ja: "メモリー", zh: "记忆翻牌", de: "MEMORY" },
  juego_memoria_subtitulo: { es: "¡Encuentra los pares en la menor cantidad de movimientos!", en: "Find all the pairs in as few moves as possible!", ru: "Найдите все пары за наименьшее количество ходов!", ja: "できるだけ少ない手数でペアを見つけよう！", zh: "用最少的步数找到所有配对吧！", de: "Finde alle Paare mit möglichst wenigen Zügen!" },
  juego_dados_titulo: { es: "DUELO DE DADOS", en: "DICE DUEL", ru: "ДУЭЛЬ НА КОСТЯХ", ja: "サイコロ対決", zh: "骰子对决", de: "WÜRFELDUELL" },
  juego_dados_subtitulo: { es: "¡Lanza los dados y compite contra los locales!", en: "Roll the dice and compete against the locals!", ru: "Бросайте кости и соревнуйтесь с местными игроками!", ja: "サイコロを振って地元の相手と勝負しよう！", zh: "掷骰子，和当地玩家一较高下！", de: "Würfle und tritt gegen die Einheimischen an!" },
  juego_ruleta_titulo: { es: "RULETA", en: "ROULETTE", ru: "РУЛЕТКА", ja: "ルーレット", zh: "轮盘", de: "ROULETTE" },
  juego_ruleta_subtitulo: { es: "¿Serás capaz de acertar el próximo número de la ruleta?", en: "Can you guess the next number on the roulette wheel?", ru: "Сможете угадать следующее число на рулетке?", ja: "ルーレットの次の数字を当てられるか？", zh: "你能猜中轮盘的下一个数字吗？", de: "Kannst du die nächste Zahl auf dem Roulette-Rad erraten?" },
  juego_cartas_titulo: { es: "CARTAS RETRO", en: "RETRO CARDS", ru: "РЕТРО КАРТЫ", ja: "レトロカード", zh: "复古纸牌", de: "RETRO-KARTEN" },
  juego_cartas_subtitulo: { es: "¡Consigue la mejor mano de póker y gana premios!", en: "Get the best poker hand and win prizes!", ru: "Соберите лучшую покерную комбинацию и выиграйте призы!", ja: "最高のポーカーハンドを揃えて賞品を獲得しよう！", zh: "凑出最好的扑克牌型，赢取奖励！", de: "Hol dir das beste Pokerblatt und gewinne Preise!" },
  juego_casinoroyale_titulo: { es: "CASINO ROYALE", en: "CASINO ROYALE", ru: "КАЗИНО РОЯЛЬ", ja: "カジノロワイヤル", zh: "皇家赌场", de: "CASINO ROYALE" },
  juego_casinoroyale_subtitulo: { es: "¡Lanza los dados y consigue grandes multiplicadores!", en: "Roll the dice and land huge multipliers!", ru: "Бросайте кости и получайте огромные множители!", ja: "サイコロを振って大きな倍率を狙おう！", zh: "掷骰子，赢取超高倍数奖励！", de: "Würfle und hol dir riesige Multiplikatoren!" },
  juego_carreras_titulo: { es: "CARRERAS DE CABALLOS", en: "HORSE RACING", ru: "СКАЧКИ", ja: "競馬", zh: "赛马", de: "PFERDERENNEN" },
  juego_carreras_subtitulo: { es: "¡Elige tu hipódromo, estudia a los caballos y apuesta por el ganador!", en: "Choose your racecourse, study the horses, and bet on the winner!", ru: "Выберите ипподром, изучите лошадей и сделайте ставку на победителя!", ja: "競馬場を選び、馬を研究して勝者に賭けよう！", zh: "选择赛马场，研究赛马，押注获胜者！", de: "Wähle deine Rennbahn, studiere die Pferde und wette auf den Sieger!" },


  // ── Tutorial (aparece en todas las páginas) ─────────────────────────
  terminar: { es: "TERMINAR", en: "FINISH", ru: "ЗАВЕРШИТЬ", ja: "終了", zh: "完成", de: "FERTIG" },
  tut_no_volver_mostrar: { es: "No volver a mostrar", en: "Don't show again", ru: "Больше не показывать", ja: "次回から表示しない", zh: "不再显示", de: "Nicht mehr anzeigen" },
  tut_no_volver_tooltip: { es: "Esta configuración puede modificarse posteriormente desde el menú de opciones.", en: "This setting can be changed later from the options menu.", ru: "Эту настройку можно изменить позже в меню настроек.", ja: "この設定はあとからオプションメニューで変更できます。", zh: "此设置以后可以在选项菜单中更改。", de: "Diese Einstellung kann später im Optionsmenü geändert werden." },

  // ── Contenido del tutorial por página ───────────────────────────────
  tutorial_dados_0: { es: "Enfrenta a la máquina en un duelo de dados al mejor de 3 rondas.", en: "Face the machine in a best-of-3 dice duel.", ru: "Сразитесь с автоматом в дуэли на костях до 2 побед из 3 раундов.", ja: "サイコロで3本勝負のデュエルにマシンと挑もう。", zh: "与机器进行三局两胜的骰子对决。", de: "Fordere die Maschine zu einem Würfelduell im Best-of-3 heraus." },
  tutorial_dados_1: { es: "En cada ronda gana quien saque el número más alto. Gana el duelo quien consiga 2 rondas.", en: "Each round, the highest roll wins. First to win 2 rounds wins the duel.", ru: "В каждом раунде побеждает тот, кто выбросит большее число. Дуэль выигрывает тот, кто первым победит в 2 раундах.", ja: "各ラウンドでは出目が高い方が勝ち。先に2ラウンド勝った方がデュエルの勝者です。", zh: "每一局，掷出更大点数的一方获胜。率先赢得2局的一方获得对决胜利。", de: "In jeder Runde gewinnt der höhere Wurf. Wer zuerst 2 Runden gewinnt, gewinnt das Duell." },
  tutorial_dados_2: { es: "Cada jefe es más difícil y da mejores recompensas.", en: "Each boss is harder and gives better rewards.", ru: "Каждый следующий босс сложнее и даёт более щедрые награды.", ja: "ボスは進むごとに強くなり、報酬も豪華になります。", zh: "每个首领都更难对付，但奖励也更丰厚。", de: "Jeder Boss ist schwieriger und bringt bessere Belohnungen." },
  tutorial_dados_3: { es: "Elige tu apuesta. Cuanto más arriesgues, mayor será la recompensa.", en: "Choose your bet. Higher risk means bigger rewards.", ru: "Выберите ставку. Чем больше риск, тем больше награда.", ja: "ベット額を選ぼう。リスクが高いほど報酬も大きくなります。", zh: "选择你的赌注，风险越高，回报越大。", de: "Wähle deinen Einsatz. Höheres Risiko bedeutet größere Belohnung." },
  tutorial_dados_4: { es: "Si te quedas sin monedas, recibirás más después de 30 segundos.", en: "If you run out of coins, you will receive more after 30 seconds.", ru: "Если у вас закончатся монеты, вы получите ещё через 30 секунд.", ja: "コインがなくなっても、30秒後に補充されます。", zh: "如果金币用完了，30秒后会自动补充。", de: "Wenn dir die Münzen ausgehen, bekommst du nach 30 Sekunden neue." },
  tutorial_balatro_0: { es: "Forma la mejor mano de póker usando 6 palos.", en: "Build the best poker hand using 6 suits.", ru: "Соберите лучшую покерную комбинацию, используя 6 мастей.", ja: "6つのスートを使って最高のポーカーハンドを作ろう。", zh: "用6种花色组成最强的扑克牌型。", de: "Bilde das beste Pokerblatt mit 6 Farben." },
  tutorial_balatro_1: { es: "Las manos más fuertes dan mejores premios.", en: "Stronger hands give bigger rewards.", ru: "Более сильные комбинации приносят более крупные призы.", ja: "強いハンドほど報酬も大きくなります。", zh: "牌型越强，奖励越丰厚。", de: "Stärkere Blätter bringen größere Preise." },
  tutorial_balatro_2: { es: "Los comodines pueden completar cualquier combinación.", en: "Jokers can complete any combination.", ru: "Джокеры могут дополнить любую комбинацию.", ja: "ジョーカーはどんな役でも完成させられます。", zh: "百搭牌可以凑成任意组合。", de: "Joker können jede Kombination vervollständigen." },
  tutorial_casinoroyale_0: { es: "Lanza 2 dados e intenta obtener una combinación ganadora.", en: "Roll 2 dice and try to get a winning combination.", ru: "Бросьте 2 кубика и попробуйте собрать выигрышную комбинацию.", ja: "2つのサイコロを振って勝利の組み合わせを狙おう。", zh: "掷出2颗骰子，尝试组成获胜组合。", de: "Würfle mit 2 Würfeln und versuche, eine Gewinnkombination zu erzielen." },
  tutorial_casinoroyale_1: { es: "Elige tu apuesta y presiona LANZAR.", en: "Choose your bet and press ROLL.", ru: "Выберите ставку и нажмите «БРОСИТЬ».", ja: "ベット額を選んで「振る」を押そう。", zh: "选择赌注，然后点击“掷骰子”。", de: "Wähle deinen Einsatz und drücke „WÜRFELN“." },
  tutorial_casinoroyale_2: { es: "Si aciertas, ganas según el multiplicador.", en: "If you win, your reward is multiplied.", ru: "Если угадаете, выигрыш будет умножен на множитель.", ja: "的中すれば倍率に応じた報酬がもらえます。", zh: "猜中的话，奖励会按倍数计算。", de: "Wenn du gewinnst, wird dein Gewinn mit dem Multiplikator verrechnet." },
  tutorial_tragamonedas_0: { es: "Haz girar los 3 rodillos.", en: "Spin the 3 reels.", ru: "Раскрутите 3 барабана.", ja: "3つのリールを回そう。", zh: "转动这3个转轮。", de: "Dreh die 3 Walzen." },
  tutorial_tragamonedas_1: { es: "Si los 3 símbolos son iguales, ganas x50 tu apuesta.", en: "If all 3 symbols match, you win x50 your bet.", ru: "Если все 3 символа совпадут, вы выиграете x50 от вашей ставки.", ja: "3つの絵柄が揃うと、ベット額の50倍を獲得できます。", zh: "如果3个图案相同，可获得赌注的50倍奖励。", de: "Wenn alle 3 Symbole übereinstimmen, gewinnst du das 50-fache deines Einsatzes." },
  tutorial_tragamonedas_2: { es: "Elige tu apuesta y presiona GIRAR.", en: "Choose your bet and press SPIN.", ru: "Выберите ставку и нажмите «КРУТИТЬ».", ja: "ベット額を選んで「回す」を押そう。", zh: "选择赌注，然后点击“旋转”。", de: "Wähle deinen Einsatz und drücke „DREHEN“." },
  tutorial_memoria_0: { es: "Encuentra todos los pares de cartas iguales.", en: "Find all matching card pairs.", ru: "Найдите все одинаковые пары карт.", ja: "同じ絵柄のカードのペアをすべて見つけよう。", zh: "找出所有相同的配对卡牌。", de: "Finde alle passenden Kartenpaare." },
  tutorial_memoria_1: { es: "Recuerda dónde está cada carta para hacer parejas.", en: "Remember where each card is to make pairs.", ru: "Запоминайте расположение карт, чтобы составлять пары.", ja: "カードの位置を覚えてペアを揃えよう。", zh: "记住每张卡牌的位置，才能凑成配对。", de: "Merke dir die Position jeder Karte, um Paare zu bilden." },
  tutorial_memoria_2: { es: "Completa los niveles para ganar monedas.", en: "Complete levels to earn coins.", ru: "Проходите уровни, чтобы получать монеты.", ja: "レベルをクリアしてコインを獲得しよう。", zh: "完成关卡即可获得金币。", de: "Schließe die Level ab, um Münzen zu verdienen." },
  tutorial_ruleta_0: { es: "Elige uno o varios números entre 0 y 36.", en: "Choose one or more numbers from 0 to 36.", ru: "Выберите одно или несколько чисел от 0 до 36.", ja: "0から36の中から1つ以上の数字を選ぼう。", zh: "选择一个或多个0到36之间的数字。", de: "Wähle eine oder mehrere Zahlen von 0 bis 36." },
  tutorial_ruleta_1: { es: "También puedes apostar por colores o columnas.", en: "You can also bet on colors or columns.", ru: "Также можно делать ставки на цвета или колонки.", ja: "色や列に賭けることもできます。", zh: "你也可以押注颜色或列。", de: "Du kannst auch auf Farben oder Kolonnen setzen." },
  tutorial_ruleta_2: { es: "Cada número cuesta 2 monedas.", en: "Each number costs 2 coins.", ru: "Каждое число стоит 2 монеты.", ja: "数字1つにつき2コイン必要です。", zh: "每个数字需要花费2枚金币。", de: "Jede Zahl kostet 2 Münzen." },
  tutorial_ruleta_3: { es: "Cuando estés listo, presiona GIRAR.", en: "When you are ready, press SPIN.", ru: "Когда будете готовы, нажмите «КРУТИТЬ».", ja: "準備ができたら「回す」を押そう。", zh: "准备好后，点击“旋转”。", de: "Wenn du bereit bist, drücke „DREHEN“." },
  tutorial_preguntas_0: { es: "Responde preguntas de distintas materias para ganar monedas.", en: "Answer questions from different subjects to earn coins.", ru: "Отвечайте на вопросы по разным предметам, чтобы получать монеты.", ja: "さまざまな科目の質問に答えてコインを稼ごう。", zh: "回答不同科目的问题来赚取金币。", de: "Beantworte Fragen aus verschiedenen Fächern, um Münzen zu verdienen." },
  tutorial_preguntas_1: { es: "Las dificultades más altas dan más monedas.", en: "Higher difficulties give more coins.", ru: "Более высокая сложность приносит больше монет.", ja: "難易度が高いほど多くのコインがもらえます。", zh: "难度越高，获得的金币越多。", de: "Höhere Schwierigkeitsgrade geben mehr Münzen." },
  tutorial_preguntas_2: { es: "Usa potenciadores para ayudarte cuando los necesites.", en: "Use power-ups whenever you need them.", ru: "Используйте усиления, когда они вам нужны.", ja: "必要なときはパワーアップアイテムを使おう。", zh: "需要的时候可以使用道具来帮助你。", de: "Nutze Power-ups, wann immer du sie brauchst." },
  tutorial_preguntas_3: { es: "Elige tu nivel académico para adaptar las preguntas a tus conocimientos.", en: "Choose your academic level to tailor the questions to your knowledge.", ru: "Выберите свой учебный уровень, чтобы вопросы соответствовали вашим знаниям.", ja: "学年レベルを選んで、自分の知識に合った質問にしよう。", zh: "选择你的学习阶段，让问题匹配你的知识水平。", de: "Wähle deine Bildungsstufe, damit die Fragen zu deinem Wissen passen." },
  tutorial_tienda_0: { es: "Compra mejoras y potenciadores con tus monedas.", en: "Buy upgrades and power-ups with your coins.", ru: "Покупайте улучшения и усиления за монеты.", ja: "コインでアップグレードやパワーアップを購入しよう。", zh: "用金币购买升级道具和强化道具。", de: "Kaufe Upgrades und Power-ups mit deinen Münzen." },
  tutorial_tienda_1: { es: "Hay objetos para ayudarte en Preguntas.", en: "There are items that help you in Questions.", ru: "Есть предметы, которые помогут вам в разделе «Вопросы».", ja: "クイズで役立つアイテムもあります。", zh: "有些物品可以在答题环节帮助你。", de: "Es gibt Gegenstände, die dir bei den Fragen helfen." },
  tutorial_tienda_2: { es: "También hay mejoras para los juegos del Casino.", en: "There are also upgrades for Casino games.", ru: "Также есть улучшения для игр казино.", ja: "カジノゲーム用のアップグレードもあります。", zh: "也有专为赌场游戏准备的升级道具。", de: "Es gibt auch Upgrades für die Casino-Spiele." },
  tutorial_tienda_3: { es: "Todo lo que compres se guarda en tu inventario.", en: "Everything you buy is saved in your inventory.", ru: "Всё, что вы покупаете, сохраняется в вашем инвентаре.", ja: "購入したものはすべてインベントリに保存されます。", zh: "你购买的所有物品都会保存在背包里。", de: "Alles, was du kaufst, wird in deinem Inventar gespeichert." },
  tutorial_cartas_0: { es: "Forma la mejor mano de 5 cartas usando 6 palos y comodines.", en: "Build the best 5-card hand using 6 suits and jokers.", ru: "Соберите лучшую комбинацию из 5 карт, используя 6 мастей и джокеры.", ja: "6つのスートとジョーカーを使って最高の5枚役を作ろう。", zh: "用6种花色和百搭牌组成最强的5张牌型。", de: "Bilde das beste 5-Karten-Blatt mit 6 Farben und Jokern." },
  tutorial_cartas_1: { es: "Las manos más fuertes dan mayores premios.", en: "Stronger hands give bigger rewards.", ru: "Более сильные комбинации приносят более крупные призы.", ja: "強いハンドほど報酬も大きくなります。", zh: "牌型越强，奖励越丰厚。", de: "Stärkere Blätter bringen größere Preise." },
  tutorial_cartas_2: { es: "Elige tu apuesta y presiona REPARTIR para empezar.", en: "Choose your bet and press DEAL to start.", ru: "Выберите ставку и нажмите «РАЗДАТЬ», чтобы начать.", ja: "ベット額を選んで「配る」を押してスタート。", zh: "选择赌注，然后点击“发牌”开始游戏。", de: "Wähle deinen Einsatz und drücke „AUSTEILEN“, um zu starten." },
  tutorial_cartas_3: { es: "Si ganas, recibes tu apuesta multiplicada.", en: "If you win, your bet is multiplied.", ru: "Если вы выиграете, ваша ставка будет умножена.", ja: "勝てばベット額が倍増して戻ってきます。", zh: "获胜后，你的赌注会按倍数返还。", de: "Wenn du gewinnst, wird dein Einsatz vervielfacht." },
  tutorial_juegos_0: { es: "Elige uno de los juegos del Casino.", en: "Choose one of the Casino games.", ru: "Выберите одну из игр казино.", ja: "カジノゲームの中から1つ選ぼう。", zh: "选择一款赌场游戏。", de: "Wähle eines der Casino-Spiele." },
  tutorial_juegos_1: { es: "Cada juego tiene reglas y premios diferentes.", en: "Each game has different rules and rewards.", ru: "У каждой игры свои правила и награды.", ja: "ゲームごとにルールや報酬が異なります。", zh: "每款游戏都有不同的规则和奖励。", de: "Jedes Spiel hat unterschiedliche Regeln und Belohnungen." },
  tutorial_juegos_2: { es: "Prueba todos y encuentra tu favorito.", en: "Try them all and find your favorite.", ru: "Попробуйте все и найдите свою любимую игру.", ja: "すべて試してお気に入りを見つけよう。", zh: "全部试一试，找到你最喜欢的游戏。", de: "Probiere sie alle aus und finde deinen Favoriten." },
  tutorial_principal_0: { es: "Bienvenido a Lets Go Catbling.", en: "Welcome to Lets Go Catbling.", ru: "Добро пожаловать в Lets Go Catbling.", ja: "Lets Go Catblingへようこそ。", zh: "欢迎来到 Lets Go Catbling。", de: "Willkommen bei Lets Go Catbling." },
  tutorial_principal_1: { es: "Responde preguntas para ganar monedas.", en: "Answer questions to earn coins.", ru: "Отвечайте на вопросы, чтобы получать монеты.", ja: "質問に答えてコインを獲得しよう。", zh: "回答问题来赚取金币。", de: "Beantworte Fragen, um Münzen zu verdienen." },
  tutorial_principal_2: { es: "Compra mejoras en la Tienda.", en: "Buy upgrades in the Store.", ru: "Покупайте улучшения в магазине.", ja: "ショップでアップグレードを購入しよう。", zh: "在商店购买升级道具。", de: "Kaufe Upgrades im Shop." },
  tutorial_principal_3: { es: "Juega en el Casino para conseguir aún más monedas.", en: "Play Casino games to earn even more coins.", ru: "Играйте в казино, чтобы получить ещё больше монет.", ja: "カジノで遊んでさらにコインを稼ごう。", zh: "在赌场游戏中赚取更多金币。", de: "Spiele im Casino, um noch mehr Münzen zu verdienen." },

  // ── Tienda ─────────────────────────────────────────────────────────
  categoria_preguntas: { es: "preguntas", en: "questions", ru: "вопросы", ja: "クイズ", zh: "问答", de: "Fragen" },
  categoria_casino: { es: "Casino", en: "Casino", ru: "Казино", ja: "カジノ", zh: "赌场", de: "Casino" },
  tienda_trabajando: { es: "¡estamos trabajando en eso...!", en: "We're working on it...!", ru: "Мы уже работаем над этим...!", ja: "現在準備中です...！", zh: "我们正在开发中……！", de: "Wir arbeiten daran...!" },
  monedas_necesarias: { es: "Monedas necesarias:", en: "Coins needed:", ru: "Нужно монет:", ja: "必要コイン数:", zh: "所需金币：", de: "Benötigte Münzen:" },
  tienda_sin_monedas_titulo: { es: "¡Sin monedas!", en: "No coins!", ru: "Нет монет!", ja: "コインがありません！", zh: "金币不足！", de: "Keine Münzen!" },
  tienda_sin_monedas_desc: { es: "No tienes suficientes monedas para comprarlo.", en: "You don't have enough coins to buy it.", ru: "У вас недостаточно монет, чтобы это купить.", ja: "購入するのに十分なコインがありません。", zh: "你的金币不足以购买它。", de: "Du hast nicht genug Münzen, um es zu kaufen." },
  tienda_error_titulo: { es: "No se pudo comprar", en: "Purchase failed", ru: "Не удалось купить", ja: "購入できませんでした", zh: "购买失败", de: "Kauf fehlgeschlagen" },
  tienda_error_desc: { es: "Ocurrió un problema al procesar la compra. Revisa tu saldo e inténtalo de nuevo.", en: "There was a problem processing the purchase. Check your balance and try again.", ru: "При обработке покупки возникла проблема. Проверьте баланс и попробуйте снова.", ja: "購入の処理中に問題が発生しました。残高を確認して、もう一度お試しください。", zh: "处理购买时出现问题。请检查余额后重试。", de: "Beim Verarbeiten des Kaufs ist ein Problem aufgetreten. Prüfe dein Guthaben und versuche es erneut." },
  tienda_guardado_inventario: { es: "¡Guardado en tu inventario!", en: "Saved to your inventory!", ru: "Сохранено в вашем инвентаре!", ja: "インベントリに保存されました！", zh: "已保存到你的背包！", de: "In deinem Inventar gespeichert!" },
  item_alt: { es: "Objeto", en: "Item", ru: "Предмет", ja: "アイテム", zh: "物品", de: "Gegenstand" },

  item_1_nombre: { es: "Pista", en: "Hint", ru: "Подсказка", ja: "ヒント", zh: "提示", de: "Hinweis" },
  item_1_descripcion: { es: "Obtén una palabra clave que te acerque a la respuesta correcta.", en: "Get a key word that brings you closer to the correct answer.", ru: "Получите ключевое слово, которое приблизит вас к правильному ответу.", ja: "正解に近づくキーワードを1つ手に入れます。", zh: "获得一个能帮你更接近正确答案的关键词。", de: "Erhalte ein Schlüsselwort, das dich der richtigen Antwort näherbringt." },
  item_1_mejora: { es: "Ayuda rápida", en: "Quick help", ru: "Быстрая помощь", ja: "クイックヘルプ", zh: "快速帮助", de: "Schnelle Hilfe" },
  item_2_nombre: { es: "Eliminar", en: "Remove", ru: "Удалить", ja: "除去", zh: "排除", de: "Entfernen" },
  item_2_descripcion: { es: "Elimina 1 opción incorrecta.", en: "Removes 1 incorrect option.", ru: "Убирает 1 неправильный вариант.", ja: "不正解の選択肢を1つ取り除きます。", zh: "移除一个错误选项。", de: "Entfernt 1 falsche Antwortmöglichkeit." },
  item_2_mejora: { es: "Reduce dificultad", en: "Reduces difficulty", ru: "Снижает сложность", ja: "難易度を下げる", zh: "降低难度", de: "Verringert Schwierigkeit" },
  item_3_nombre: { es: "Congelar", en: "Freeze", ru: "Заморозка", ja: "フリーズ", zh: "冻结", de: "Einfrieren" },
  item_3_descripcion: { es: "Detiene el contador durante 3 segundos.", en: "Stops the timer for 3 seconds.", ru: "Останавливает таймер на 3 секунды.", ja: "タイマーを3秒間止めます。", zh: "使计时器停止3秒。", de: "Stoppt den Timer für 3 Sekunden." },
  item_3_mejora: { es: "Control del tiempo", en: "Time control", ru: "Контроль времени", ja: "時間コントロール", zh: "时间控制", de: "Zeitkontrolle" },
  item_4_nombre: { es: "Cambiar", en: "Swap", ru: "Замена", ja: "チェンジ", zh: "更换", de: "Wechseln" },
  item_4_descripcion: { es: "Cambia la pregunta actual por una nueva.", en: "Swaps the current question for a new one.", ru: "Заменяет текущий вопрос на новый.", ja: "現在の質問を新しい質問に変更します。", zh: "将当前问题替换为一道新问题。", de: "Tauscht die aktuelle Frage gegen eine neue aus." },
  item_4_mejora: { es: "Evita preguntas difíciles", en: "Avoids hard questions", ru: "Позволяет избежать сложных вопросов", ja: "難しい質問を回避", zh: "避开难题", de: "Vermeidet schwierige Fragen" },
  item_5_nombre: { es: "Popular", en: "Popular Pick", ru: "Народный выбор", ja: "人気の選択", zh: "人气选项", de: "Beliebte Wahl" },
  item_5_descripcion: { es: "Muestra la opción más elegida (puede fallar).", en: "Shows the most chosen option (it can be wrong).", ru: "Показывает наиболее выбираемый вариант (может ошибаться).", ja: "最も多く選ばれた選択肢を表示します（外れる場合もあります）。", zh: "显示被选择最多的选项（可能不准）。", de: "Zeigt die am häufigsten gewählte Antwort (kann falsch sein)." },
  item_5_mejora: { es: "Ayuda incierta", en: "Uncertain help", ru: "Ненадёжная помощь", ja: "不確かな助け", zh: "不确定的帮助", de: "Unsichere Hilfe" },
  item_6_nombre: { es: "Reintentar", en: "Retry", ru: "Повтор", ja: "リトライ", zh: "重试", de: "Wiederholen" },
  item_6_descripcion: { es: "Permite intentar responder otra vez.", en: "Lets you try to answer again.", ru: "Позволяет попробовать ответить снова.", ja: "もう一度回答を試みることができます。", zh: "允许你再回答一次。", de: "Ermöglicht dir, erneut zu antworten." },
  item_6_mejora: { es: "Segunda oportunidad", en: "Second chance", ru: "Второй шанс", ja: "セカンドチャンス", zh: "第二次机会", de: "Zweite Chance" },
  item_7_nombre: { es: "Infinito", en: "Infinite", ru: "Бесконечность", ja: "インフィニティ", zh: "无限", de: "Unendlich" },
  item_7_descripcion: { es: "Elimina el límite de tiempo.", en: "Removes the time limit.", ru: "Убирает ограничение по времени.", ja: "制限時間をなくします。", zh: "取消时间限制。", de: "Entfernt das Zeitlimit." },
  item_7_mejora: { es: "Sin presión", en: "No pressure", ru: "Без спешки", ja: "プレッシャーなし", zh: "毫无压力", de: "Kein Zeitdruck" },
  item_10_nombre: { es: "Seguro", en: "Insurance", ru: "Страховка", ja: "保険", zh: "保险", de: "Versicherung" },
  item_10_descripcion: { es: "Reduce la pérdida si fallas.", en: "Reduces your loss if you fail.", ru: "Уменьшает потери в случае неудачи.", ja: "失敗した場合の損失を減らします。", zh: "失败时减少损失。", de: "Verringert deinen Verlust bei einem Fehlschlag." },
  item_10_mejora: { es: "Mitiga riesgo", en: "Mitigates risk", ru: "Снижает риск", ja: "リスク軽減", zh: "降低风险", de: "Risikominderung" },
  item_11_nombre: { es: "Escudo", en: "Shield", ru: "Щит", ja: "シールド", zh: "护盾", de: "Schild" },
  item_11_descripcion: { es: "No pierdes tu apuesta si fallas.", en: "You don't lose your bet if you fail.", ru: "Вы не теряете ставку в случае неудачи.", ja: "失敗してもベットを失いません。", zh: "失败时不会损失赌注。", de: "Du verlierst deinen Einsatz nicht, wenn du verlierst." },
  item_11_mejora: { es: "Protección total", en: "Total protection", ru: "Полная защита", ja: "完全保護", zh: "全面保护", de: "Vollständiger Schutz" },
  item_12_nombre: { es: "Duplicar", en: "Duplicate", ru: "Дубликат", ja: "デュプリケート", zh: "复制", de: "Duplizieren" },
  item_12_descripcion: { es: "Duplica el efecto del último comodín.", en: "Duplicates the effect of the last power-up used.", ru: "Дублирует эффект последнего использованного бонуса.", ja: "最後に使ったアイテムの効果を2倍にします。", zh: "复制上一个道具的效果。", de: "Verdoppelt die Wirkung des zuletzt genutzten Power-ups." },
  item_12_mejora: { es: "Combo", en: "Combo", ru: "Комбо", ja: "コンボ", zh: "连击", de: "Kombo" },
  item_13_nombre: { es: "Ajuste", en: "Tuning", ru: "Настройка", ja: "チューニング", zh: "调优", de: "Anpassung" },
  item_13_descripcion: { es: "Mejora ligeramente las probabilidades en minijuegos.", en: "Slightly improves your odds in minigames.", ru: "Немного повышает шансы в мини-играх.", ja: "ミニゲームの確率をわずかに向上させます。", zh: "略微提升迷你游戏的胜率。", de: "Verbessert leicht deine Gewinnchancen in Minispielen." },
  item_13_mejora: { es: "Ventaja oculta", en: "Hidden edge", ru: "Скрытое преимущество", ja: "隠れた優位性", zh: "隐藏优势", de: "Versteckter Vorteil" },
  item_14_nombre: { es: "X4", en: "X4", ru: "X4", ja: "X4", zh: "X4", de: "X4" },
  item_14_descripcion: { es: "Multiplica ganancias x4.", en: "Multiplies your winnings by 4.", ru: "Умножает выигрыш в 4 раза.", ja: "獲得額を4倍にします。", zh: "将奖励乘以4倍。", de: "Vervierfacht deinen Gewinn." },
  item_14_mejora: { es: "Alto riesgo", en: "High risk", ru: "Высокий риск", ja: "ハイリスク", zh: "高风险", de: "Hohes Risiko" },
  item_15_nombre: { es: "Crédito", en: "Credit", ru: "Кредит", ja: "クレジット", zh: "信用", de: "Kredit" },
  item_15_descripcion: { es: "Permite jugar sin saldo actual.", en: "Lets you play without a current balance.", ru: "Позволяет играть без текущего баланса.", ja: "残高がなくてもプレイできます。", zh: "即使没有余额也能继续游戏。", de: "Ermöglicht dir zu spielen, auch ohne aktuelles Guthaben." },
  item_15_mejora: { es: "Deuda estratégica", en: "Strategic debt", ru: "Стратегический долг", ja: "戦略的な借金", zh: "策略性负债", de: "Strategische Schulden" },
  item_16_nombre: { es: "Jackpot", en: "Jackpot", ru: "Джекпот", ja: "ジャックポット", zh: "累积大奖", de: "Jackpot" },
  item_16_descripcion: { es: "Multiplicador x8 si aciertas.", en: "8x multiplier if you win.", ru: "Множитель x8 в случае удачи.", ja: "成功すると8倍になります。", zh: "猜中即可获得8倍奖励。", de: "8-facher Multiplikator bei einem Treffer." },
  item_16_mejora: { es: "Recompensa máxima", en: "Maximum reward", ru: "Максимальная награда", ja: "最大報酬", zh: "最高奖励", de: "Maximale Belohnung" },
  item_19_nombre: { es: "Bolsa", en: "Bag", ru: "Сумка", ja: "バッグ", zh: "背包", de: "Tasche" },
  item_19_descripcion: { es: "Permite llevar más comodines.", en: "Lets you carry more power-ups.", ru: "Позволяет носить больше бонусов.", ja: "持てるアイテム数が増えます。", zh: "可携带更多道具。", de: "Ermöglicht dir, mehr Power-ups mitzuführen." },
  item_19_mejora: { es: "+3 espacio", en: "+3 space", ru: "+3 места", ja: "+3スペース", zh: "+3 空间", de: "+3 Platz" },
  item_20_nombre: { es: "Guantes", en: "Gloves", ru: "Перчатки", ja: "グローブ", zh: "手套", de: "Handschuhe" },
  item_20_descripcion: { es: "Reduce ligeramente el tiempo de respuesta requerido.", en: "Slightly reduces the response time required.", ru: "Немного сокращает необходимое время ответа.", ja: "必要な回答時間をわずかに短縮します。", zh: "略微缩短所需的答题时间。", de: "Verkürzt leicht die benötigte Antwortzeit." },
  item_20_mejora: { es: "+5% velocidad", en: "+5% speed", ru: "+5% скорость", ja: "+5%速度", zh: "+5% 速度", de: "+5% Geschwindigkeit" },
  item_21_nombre: { es: "Gafas", en: "Glasses", ru: "Очки", ja: "メガネ", zh: "眼镜", de: "Brille" },
  item_21_descripcion: { es: "Aumenta la claridad de las pistas.", en: "Increases the clarity of hints.", ru: "Повышает чёткость подсказок.", ja: "ヒントの分かりやすさを高めます。", zh: "让提示更加清晰易懂。", de: "Erhöht die Klarheit der Hinweise." },
  item_21_mejora: { es: "Pistas más útiles", en: "More useful hints", ru: "Более полезные подсказки", ja: "より役立つヒント", zh: "更实用的提示", de: "Nützlichere Hinweise" },
  item_22_nombre: { es: "Amuleto", en: "Amulet", ru: "Амулет", ja: "アミュレット", zh: "护身符", de: "Amulett" },
  item_22_descripcion: { es: "Aumenta ligeramente la probabilidad en minijuegos.", en: "Slightly increases your odds in minigames.", ru: "Немного повышает шансы в мини-играх.", ja: "ミニゲームでの確率をわずかに上げます。", zh: "略微提升迷你游戏的中奖概率。", de: "Erhöht leicht deine Chancen in Minispielen." },
  item_22_mejora: { es: "+5% suerte", en: "+5% luck", ru: "+5% удача", ja: "+5%運", zh: "+5% 幸运", de: "+5% Glück" },
  item_23_nombre: { es: "Aura", en: "Aura", ru: "Аура", ja: "オーラ", zh: "灵气", de: "Aura" },
  item_23_descripcion: { es: "Aumenta ligeramente todas las ganancias.", en: "Slightly increases all your winnings.", ru: "Немного увеличивает все выигрыши.", ja: "すべての獲得額をわずかに増加させます。", zh: "略微提升所有奖励。", de: "Erhöht leicht alle deine Gewinne." },
  item_23_mejora: { es: "+10% monedas", en: "+10% coins", ru: "+10% монет", ja: "+10%コイン", zh: "+10% 金币", de: "+10% Münzen" },
  item_24_nombre: { es: "Dorado", en: "Golden", ru: "Золотой", ja: "ゴールデン", zh: "黄金", de: "Golden" },
  item_24_descripcion: { es: "Respuesta correcta automática.", en: "Automatic correct answer.", ru: "Автоматически правильный ответ.", ja: "自動的に正解になります。", zh: "自动获得正确答案。", de: "Automatisch richtige Antwort." },
  item_24_mejora: { es: "Victoria garantizada", en: "Guaranteed win", ru: "Гарантированная победа", ja: "勝利確定", zh: "必胜保证", de: "Garantierter Sieg" },

  // ── Google / partida no registrada / uso de objetos (auditoría 2) ──
  continuar_google: { es: "Continuar con Google", en: "Continue with Google", ru: "Продолжить через Google", ja: "Googleで続行", zh: "使用 Google 继续", de: "Weiter mit Google" },
  o_divisor: { es: "o", en: "or", ru: "или", ja: "または", zh: "或", de: "oder" },
  error_google: { es: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.", en: "Could not sign in with Google. Please try again.", ru: "Не удалось войти через Google. Попробуйте ещё раз.", ja: "Googleでログインできませんでした。もう一度お試しください。", zh: "无法使用 Google 登录，请重试。", de: "Anmeldung mit Google fehlgeschlagen. Bitte versuche es erneut." },
  partida_no_registrada_titulo: { es: "¡Partida no registrada!", en: "Game not recorded!", ru: "Игра не записана!", ja: "ゲームが記録されませんでした！", zh: "本局未被记录！", de: "Spiel nicht erfasst!" },
  partida_no_registrada_desc: { es: "El servidor no registró este resultado y tu saldo no cambió. Inténtalo de nuevo.", en: "The server did not record this result and your balance did not change. Please try again.", ru: "Сервер не записал этот результат, ваш баланс не изменился. Попробуйте ещё раз.", ja: "サーバーがこの結果を記録せず、残高は変わっていません。もう一度お試しください。", zh: "服务器未记录此结果，你的余额没有变化。请重试。", de: "Der Server hat dieses Ergebnis nicht erfasst und dein Guthaben hat sich nicht geändert. Bitte versuche es erneut." },
  item_no_disponible: { es: "No se pudo usar el objeto: no lo tienes en tu inventario.", en: "The item could not be used: it is not in your inventory.", ru: "Не удалось использовать предмет: его нет в вашем инвентаре.", ja: "アイテムを使用できませんでした：インベントリにありません。", zh: "无法使用该物品：它不在你的背包中。", de: "Gegenstand konnte nicht benutzt werden: Er ist nicht in deinem Inventar." },

  // ── Confirmación de cierre de sesión ──────────────────────────────
  confirmar_cerrar_titulo: { es: "¿CERRAR SESIÓN?", en: "LOG OUT?", ru: "ВЫЙТИ ИЗ АККАУНТА?", ja: "ログアウトしますか？", zh: "要退出登录吗？", de: "ABMELDEN?" },
  ingresa_nueva_contrasena: { es: "Ingresa tu nueva contraseña.", en: "Enter your new password.", ru: "Введите новый пароль.", ja: "新しいパスワードを入力してください。", zh: "请输入你的新密码。", de: "Gib dein neues Passwort ein." },
  saltar: { es: "SALTAR", en: "SKIP", ru: "ПРОПУСТИТЬ", ja: "スキップ", zh: "跳过", de: "ÜBERSPRINGEN" },
  siguiente: { es: "SIGUIENTE", en: "NEXT", ru: "ДАЛЕЕ", ja: "次へ", zh: "下一步", de: "WEITER" },
  personaje_alt: { es: "Personaje", en: "Character", ru: "Персонаж", ja: "キャラクター", zh: "角色", de: "Charakter" },
  anterior_alt: { es: "Anterior", en: "Previous", ru: "Назад", ja: "前へ", zh: "上一个", de: "Vorherige" },
  siguiente_alt: { es: "Siguiente", en: "Next", ru: "Далее", ja: "次へ", zh: "下一个", de: "Nächste" },
  imagen_principal_alt: { es: "Imagen principal", en: "Main image", ru: "Главное изображение", ja: "メイン画像", zh: "主图", de: "Hauptbild" },
  nav_preguntas: { es: "Preguntas", en: "Questions", ru: "Вопросы", ja: "クイズ", zh: "问答", de: "Fragen" },
  nav_casino: { es: "Casino", en: "Casino", ru: "Казино", ja: "カジノ", zh: "赌场", de: "Casino" },
  nav_tienda: { es: "Tienda", en: "Shop", ru: "Магазин", ja: "ショップ", zh: "商店", de: "Shop" },
  placeholder_correo: { es: "Correo electrónico", en: "Email", ru: "Электронная почта", ja: "メールアドレス", zh: "电子邮箱", de: "E-Mail" },
  placeholder_contrasena: { es: "Contraseña", en: "Password", ru: "Пароль", ja: "パスワード", zh: "密码", de: "Passwort" },
  placeholder_usuario: { es: "Nombre de usuario", en: "Username", ru: "Имя пользователя", ja: "ユーザー名", zh: "用户名", de: "Benutzername" },
  placeholder_confirmar_contrasena: { es: "Confirmar contraseña", en: "Confirm password", ru: "Подтвердите пароль", ja: "パスワードの確認", zh: "确认密码", de: "Passwort bestätigen" },
  placeholder_nueva_contrasena: { es: "Nueva contraseña", en: "New password", ru: "Новый пароль", ja: "新しいパスワード", zh: "新密码", de: "Neues Passwort" },
  placeholder_confirmar_nueva_contrasena: { es: "Confirmar nueva contraseña", en: "Confirm new password", ru: "Подтвердите новый пароль", ja: "新しいパスワードの確認", zh: "确认新密码", de: "Neues Passwort bestätigen" },
  confirmar_cerrar_texto: { es: "Toda su información será eliminada, ¿desea continuar?", en: "All your information will be deleted, do you want to continue?", ru: "Вся ваша информация будет удалена. Продолжить?", ja: "すべての情報が削除されます。続けますか？", zh: "你的所有信息都将被删除，是否继续？", de: "Alle deine Informationen werden gelöscht. Möchtest du fortfahren?" },
};

// Los mensajes antiguos de contraseña débil decían "al menos 6 caracteres". La política
// vigente (api.js → apiValidarPassword) es 8 caracteres + mayúscula + número + símbolo:
// se reutiliza el texto único de la política para no tener dos versiones.
['contrasena_min', 'error_password_debil', 'error_contrasena_debil'].forEach(function (k) {
  TRADUCCIONES[k] = TRADUCCIONES.contrasena_politica;
});

// Reemplazo simple de {placeholders} dentro de una traducción, por ejemplo:
// __f("registro_email_confirmacion", { email: "a@b.com" })
function __f(key, params, defaultText) {
  let texto = __(key, defaultText);
  if (params) {
    Object.keys(params).forEach(function (k) {
      texto = texto.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
    });
  }
  return texto;
}

function __(key, defaultText) {
  const lang = config.idioma || "es";
  if (TRADUCCIONES[key] && (TRADUCCIONES[key][lang] || TRADUCCIONES[key].es)) {
    return TRADUCCIONES[key][lang] || TRADUCCIONES[key].es;
  }
  return defaultText || key;
}

// ── Traducción de ítems de la tienda (nombre / descripción / mejora) ──────
// Los ítems se identifican por su `dbId` (estable, viene de la base de
// datos). Si existe traducción para ese dbId+campo se usa; si no, se
// muestra el texto original tal como viene del objeto (fallback seguro
// para ítems nuevos que aún no tengan traducción cargada).
window.obtenerNombreItemTraducido = function (item) {
  if (!item) return "";
  if (item.dbId) {
    const key = "item_" + item.dbId + "_nombre";
    if (TRADUCCIONES[key]) return __(key);
  }
  return item.nombre || "";
};
window.obtenerDescripcionItemTraducida = function (item) {
  if (!item) return "";
  if (item.dbId) {
    const key = "item_" + item.dbId + "_descripcion";
    if (TRADUCCIONES[key]) return __(key);
  }
  return item.descripcion || "";
};
window.obtenerMejoraItemTraducida = function (item) {
  if (!item) return "";
  if (item.dbId) {
    const key = "item_" + item.dbId + "_mejora";
    if (TRADUCCIONES[key]) return __(key);
  }
  return item.mejora || "";
};

// ── Traducción de hipódromos (Carreras) ────────────────────────────────
window.obtenerHipodromoCampoTraducido = function (hipodromo, campo) {
  if (!hipodromo) return "";
  if (hipodromo.id) {
    const key = "hipodromo_" + hipodromo.id + "_" + campo;
    if (TRADUCCIONES[key]) return __(key);
  }
  return hipodromo[campo] || "";
};

// ── Traducción de caballos (Carreras) ───────────────────────────────────
// El NOMBRE del caballo NUNCA se traduce (excepción explícita del
// proyecto): solo se traduce su "personalidad" u otro texto descriptivo.
window.obtenerCaballoPersonalidadTraducida = function (caballo) {
  if (!caballo) return "";
  if (caballo.id) {
    const key = "caballo_" + caballo.id + "_personalidad";
    if (TRADUCCIONES[key]) return __(key);
  }
  return caballo.personalidad || "";
};

function aplicarIdioma() {
  const lang = config.idioma || "es";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (TRADUCCIONES[key] && (TRADUCCIONES[key][lang] || TRADUCCIONES[key].es)) {
      el.textContent = TRADUCCIONES[key][lang] || TRADUCCIONES[key].es;
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (TRADUCCIONES[key] && (TRADUCCIONES[key][lang] || TRADUCCIONES[key].es)) {
      el.setAttribute("placeholder", TRADUCCIONES[key][lang] || TRADUCCIONES[key].es);
    }
  });
  document.querySelectorAll("[data-i18n-alt]").forEach(el => {
    const key = el.getAttribute("data-i18n-alt");
    if (TRADUCCIONES[key] && (TRADUCCIONES[key][lang] || TRADUCCIONES[key].es)) {
      el.setAttribute("alt", TRADUCCIONES[key][lang] || TRADUCCIONES[key].es);
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (TRADUCCIONES[key] && (TRADUCCIONES[key][lang] || TRADUCCIONES[key].es)) {
      el.setAttribute("title", TRADUCCIONES[key][lang] || TRADUCCIONES[key].es);
    }
  });
  if (typeof actualizarBotonIdioma === "function") actualizarBotonIdioma();
  // Notifica a los módulos de cada juego (preguntas, tienda, carreras, etc.)
  // para que puedan refrescar su propio contenido dinámico ya visible.
  window.dispatchEvent(new CustomEvent("idiomaAplicado", { detail: lang }));
}

// ════════════════════════════════════════════════════════════════════════════
// 🌐 SELECTOR DE IDIOMA (DROPDOWN) — reemplaza los antiguos botones ES/EN
// ════════════════════════════════════════════════════════════════════════════

function obtenerInfoIdioma(code) {
  return IDIOMAS_DISPONIBLES.find(function (i) { return i.code === code; }) || IDIOMAS_DISPONIBLES[0];
}

function cerrarListaIdiomas() {
  const lista = document.getElementById("idioma-selector-lista");
  const btn = document.getElementById("idioma-selector-btn");
  if (lista) lista.classList.remove("activo");
  if (btn) btn.setAttribute("aria-expanded", "false");
  document.removeEventListener("scroll", cerrarListaIdiomas, true);
  window.removeEventListener("resize", cerrarListaIdiomas);
}

function posicionarListaIdiomas() {
  const btn = document.getElementById("idioma-selector-btn");
  const lista = document.getElementById("idioma-selector-lista");
  if (!btn || !lista) return;
  const r = btn.getBoundingClientRect();
  const anchoVentana = window.innerWidth;
  const alturaVentana = window.innerHeight;
  let left = r.left;
  const anchoLista = Math.max(r.width, lista.offsetWidth || r.width);
  if (left + anchoLista > anchoVentana - 8) {
    left = Math.max(8, anchoVentana - anchoLista - 8);
  }
  lista.style.left = left + "px";
  lista.style.width = r.width + "px";
  lista.style.minWidth = r.width + "px";
  const espacioAbajo = alturaVentana - r.bottom - 12;
  const espacioArriba = r.top - 12;
  if (espacioAbajo < 140 && espacioArriba > espacioAbajo) {
    // No cabe debajo: se abre hacia arriba
    lista.style.top = "";
    lista.style.bottom = (alturaVentana - r.top + 4) + "px";
    lista.style.maxHeight = Math.max(120, Math.min(280, espacioArriba)) + "px";
  } else {
    lista.style.bottom = "";
    lista.style.top = (r.bottom + 4) + "px";
    lista.style.maxHeight = Math.max(120, Math.min(280, espacioAbajo)) + "px";
  }
}

function renderizarListaIdiomas() {
  const lista = document.getElementById("idioma-selector-lista");
  if (!lista) return;
  const actual = config.idioma || "es";
  lista.innerHTML = "";
  IDIOMAS_DISPONIBLES.forEach(function (idi) {
    const li = document.createElement("li");
    li.className = "idioma-opcion" + (idi.code === actual ? " seleccionado" : "");
    li.setAttribute("role", "option");
    li.setAttribute("data-code", idi.code);
    li.setAttribute("aria-selected", idi.code === actual ? "true" : "false");
    const bandera = document.createElement("span");
    bandera.className = "idioma-bandera";
    bandera.textContent = idi.flag;
    const nombre = document.createElement("span");
    nombre.className = "idioma-nombre";
    nombre.textContent = idi.name;
    li.appendChild(bandera);
    li.appendChild(nombre);
    if (idi.code === actual) {
      const check = document.createElement("span");
      check.className = "idioma-check";
      check.textContent = "✓";
      li.appendChild(check);
    }
    li.addEventListener("click", function (e) {
      e.stopPropagation();
      seleccionarIdioma(idi.code);
    });
    lista.appendChild(li);
  });
}

function seleccionarIdioma(code) {
  if (code === config.idioma) {
    cerrarListaIdiomas();
    return;
  }
  setIdioma(code);
  cerrarListaIdiomas();
}

function actualizarBotonIdioma() {
  const info = obtenerInfoIdioma(config.idioma || "es");
  const bandera = document.getElementById("idioma-selector-flag");
  const nombre = document.getElementById("idioma-selector-nombre");
  if (bandera) bandera.textContent = info.flag;
  if (nombre) nombre.textContent = info.name;
  const btn = document.getElementById("idioma-selector-btn");
  if (btn) btn.setAttribute("aria-label", (TRADUCCIONES.idioma[config.idioma] || TRADUCCIONES.idioma.es) + ": " + info.name);
}

function toggleListaIdiomas(ev) {
  if (ev) ev.stopPropagation();
  const lista = document.getElementById("idioma-selector-lista");
  const btn = document.getElementById("idioma-selector-btn");
  if (!lista || !btn) return;
  const abierta = lista.classList.contains("activo");
  if (abierta) {
    cerrarListaIdiomas();
    return;
  }
  renderizarListaIdiomas();
  posicionarListaIdiomas();
  lista.classList.add("activo");
  btn.setAttribute("aria-expanded", "true");
  document.addEventListener("scroll", cerrarListaIdiomas, true);
  window.addEventListener("resize", cerrarListaIdiomas);
}

function inicializarSelectorIdioma() {
  const lista = document.getElementById("idioma-selector-lista");
  // La lista se mueve a <body> para escapar de cualquier overflow/z-index
  // de contenedores padres (por ejemplo el scroll interno del menú de
  // opciones) y así nunca queda oculta ni recortada.
  if (lista && lista.parentElement !== document.body) {
    document.body.appendChild(lista);
  }
  actualizarBotonIdioma();
}

document.addEventListener("DOMContentLoaded", inicializarSelectorIdioma);

document.addEventListener("click", function (e) {
  const lista = document.getElementById("idioma-selector-lista");
  const selector = document.getElementById("idioma-selector");
  if (!lista || !lista.classList.contains("activo")) return;
  if (selector && selector.contains(e.target)) return;
  if (lista.contains(e.target)) return;
  cerrarListaIdiomas();
});

function resetear() {
  config = { ...DEFAULT_CONFIG };
  guardarConfig(config);
  aplicarConfig();
}

// 🎨 APLICAR CONFIG (CLAVE GLOBAL)
function aplicarConfig() {
  aplicarIdioma();

  document.body.classList.toggle("sin-animaciones", !config.animaciones);

  const musica = document.getElementById("bgMusic");
  if (musica) {
    musica.volume = config.musica / 10;
    if (config.musica > 0) {
      musica.play().catch(() => {});
    } else {
      musica.pause();
    }
  }

  const volMusica = document.getElementById("vol-musica");
  if (volMusica) volMusica.textContent = config.musica;

  const volEfectos = document.getElementById("vol-efectos");
  if (volEfectos) volEfectos.textContent = config.efectos;

  const animBtn = document.getElementById("animaciones-btn");
  if (animBtn) animBtn.textContent = config.animaciones ? __("on") : __("off");

  const tutBtn = document.getElementById("tutorial-btn");
  if (tutBtn) tutBtn.textContent = config.mostrarTutorial ? __("on") : __("off");

  const subtitulo = document.getElementById("subtitulo");
  if (subtitulo) {
    subtitulo.textContent = (typeof __ === "function") ? __("jugar") : (config.idioma === "es" ? "Jugar" : "Play");
  }

  const icono = document.getElementById("icono-monedas");
  const texto = document.getElementById("cantidad-monedas");
  const monedasActuales = typeof getMonedas === 'function' ? getMonedas() : (config.monedas || 0);

  if (texto) texto.textContent = monedasActuales;

  if (icono) {
    if (icono.dataset.srcVacio) {
      icono.src = monedasActuales === 0 ? icono.dataset.srcVacio : icono.dataset.srcLleno;
    } else {
      icono.src = monedasActuales === 0 ? "./resources/assets/yukonocoins.png" : "./resources/assets/yukocoins.png";
    }
  }
}

// 🎒 INVENTARIO UI (BOLSA)
const MAX_ITEMS_INVENTARIO = 4;

window.esPaginaPreguntas = function() {
  return window.location.pathname.includes('/preguntas/');
};

window.esPaginaJuegos = function() {
  const path = window.location.pathname;
  return path.includes('/juegos/') && !path.includes('juegosprincipalpage');
};

window.getInventarioSession = function() {
  const data = sessionStorage.getItem("inventarioSession");
  return data ? JSON.parse(data) : [];
};

window.setInventarioSession = function(inventario) {
  sessionStorage.setItem("inventarioSession", JSON.stringify(inventario));
};

window.agregarItemInventario = async function(item) {
  try {
    const inventario = window.getInventarioSession();
    if (inventario.length >= MAX_ITEMS_INVENTARIO) {
      window.mostrarInventarioLleno();
      return { success: false, message: "no_espacio" };
    }
    inventario.push({
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      mejora: item.mejora || "",
      imagen: item.imagen,
      tipo: item.tipo,
      precio: item.precio || 0,
      fecha: new Date().toISOString()
    });
    window.setInventarioSession(inventario);
    window.actualizarInventarioUI();
    return { success: true };
  } catch (e) {
    return { success: false };
  }
};

window.tieneEspacioInventario = function() {
  const inventario = window.getInventarioSession();
  return inventario.length < MAX_ITEMS_INVENTARIO;
};

// Todas las rutas de imagen del inventario/UI se guardan RELATIVAS A LA RAÍZ
// del sitio (p. ej. './tienda/resources/assets/pista.png' o
// 'resources/assets/bag.png'). CAUSA RAÍZ del "la imagen sólo se ve en la
// página principal y en la tienda": la versión anterior calculaba el prefijo
// con la profundidad de window.location.pathname asumiendo que el sitio vivía
// dentro de una carpeta (http://localhost/Catbling/...). En Vercel/localhost:3000
// el sitio está en la raíz, así que en /juegos/<juego>/<pagina>.html el prefijo
// quedaba un nivel corto y la imagen apuntaba a /juegos/tienda/... (404).
// CATBLING_CONFIG_ROOT (derivado de la URL real de config.js) resuelve la raíz
// correcta en cualquier página y en cualquier hosting.
window.normalizarPathImagen = function(path) {
  if (!path) return new URL('resources/assets/yukocoins.png', CATBLING_CONFIG_ROOT).href;
  if (/^(https?:|data:|blob:)/i.test(path) || path.startsWith('/')) return path;
  return new URL(String(path).replace(/^\.\//, ''), CATBLING_CONFIG_ROOT).href;
};

// Catálogo compartido de objetos (id de tienda_items -> datos de UI). Es la MISMA información
// que tienda/resources/script.js; vive aquí para que cualquier página pueda dibujar la bolsa
// a partir del inventario real del servidor. Las rutas de imagen son relativas a la raíz del
// sitio (se resuelven con normalizarPathImagen).
window.CATBLING_ITEMS = {
 "1": {
  "dbId": 1,
  "nombre": "Pista",
  "descripcion": "Obtén una palabra clave que te acerque a la respuesta correcta.",
  "mejora": "Ayuda rápida",
  "imagen": "./tienda/resources/assets/pista.png",
  "tipo": "pregunta",
  "precio": 25
 },
 "2": {
  "dbId": 2,
  "nombre": "Eliminar",
  "descripcion": "Elimina 1 opción incorrecta.",
  "mejora": "Reduce dificultad",
  "imagen": "./tienda/resources/assets/eliminar.png",
  "tipo": "pregunta",
  "precio": 30
 },
 "3": {
  "dbId": 3,
  "nombre": "Congelar",
  "descripcion": "Detiene el contador durante 3 segundos.",
  "mejora": "Control del tiempo",
  "imagen": "./tienda/resources/assets/congelar.png",
  "tipo": "pregunta",
  "precio": 25
 },
 "4": {
  "dbId": 4,
  "nombre": "Cambiar",
  "descripcion": "Cambia la pregunta actual por una nueva.",
  "mejora": "Evita preguntas difíciles",
  "imagen": "./tienda/resources/assets/cambiar.png",
  "tipo": "pregunta",
  "precio": 35
 },
 "5": {
  "dbId": 5,
  "nombre": "Popular",
  "descripcion": "Muestra la opción más elegida (puede fallar).",
  "mejora": "Ayuda incierta",
  "imagen": "./tienda/resources/assets/popular.png",
  "tipo": "pregunta",
  "precio": 40
 },
 "6": {
  "dbId": 6,
  "nombre": "Reintentar",
  "descripcion": "Permite intentar responder otra vez.",
  "mejora": "Segunda oportunidad",
  "imagen": "./tienda/resources/assets/retry.png",
  "tipo": "pregunta",
  "precio": 60
 },
 "7": {
  "dbId": 7,
  "nombre": "Infinito",
  "descripcion": "Elimina el límite de tiempo.",
  "mejora": "Sin presión",
  "imagen": "./tienda/resources/assets/infinito.png",
  "tipo": "pregunta",
  "precio": 70
 },
 "10": {
  "dbId": 10,
  "nombre": "Seguro",
  "descripcion": "Reduce la pérdida si fallas.",
  "mejora": "Mitiga riesgo",
  "imagen": "./tienda/resources/assets/parcial.png",
  "tipo": "juego",
  "precio": 80
 },
 "11": {
  "dbId": 11,
  "nombre": "Escudo",
  "descripcion": "No pierdes tu apuesta si fallas.",
  "mejora": "Protección total",
  "imagen": "./tienda/resources/assets/escudo.png",
  "tipo": "juego",
  "precio": 100
 },
 "12": {
  "dbId": 12,
  "nombre": "Duplicar",
  "descripcion": "Duplica el efecto del último comodín.",
  "mejora": "Combo",
  "imagen": "./tienda/resources/assets/x2.png",
  "tipo": "juego",
  "precio": 80
 },
 "13": {
  "dbId": 13,
  "nombre": "Ajuste",
  "descripcion": "Mejora ligeramente las probabilidades en minijuegos.",
  "mejora": "Ventaja oculta",
  "imagen": "./tienda/resources/assets/ajuste.png",
  "tipo": "juego",
  "precio": 30
 },
 "14": {
  "dbId": 14,
  "nombre": "X4",
  "descripcion": "Multiplica ganancias x4.",
  "mejora": "Alto riesgo",
  "imagen": "./tienda/resources/assets/x4.png",
  "tipo": "juego",
  "precio": 140
 },
 "15": {
  "dbId": 15,
  "nombre": "Credito",
  "descripcion": "Permite jugar sin saldo actual.",
  "mejora": "Deuda estratégica",
  "imagen": "./tienda/resources/assets/credito.png",
  "tipo": "juego",
  "precio": 150
 },
 "16": {
  "dbId": 16,
  "nombre": "Jackpot",
  "descripcion": "Multiplicador x8 si aciertas.",
  "mejora": "Recompensa máxima",
  "imagen": "./tienda/resources/assets/jackpot.png",
  "tipo": "juego",
  "precio": 280
 },
 "24": {
  "dbId": 24,
  "nombre": "Dorado",
  "descripcion": "Respuesta correcta automática.",
  "mejora": "Victoria garantizada",
  "imagen": "./tienda/resources/assets/dorado.png",
  "tipo": "pregunta",
  "precio": 200
 }
};

// El inventario REAL vive en Supabase (inventario_items: la compra lo escribe, usar_item lo
// consume). sessionStorage['inventarioSession'] es sólo su copia de trabajo para dibujar la
// bolsa: se rehace desde el servidor al iniciar sesión, en cada carga de página, tras
// comprar y tras usar un objeto. Antes el inventario sólo existía en sessionStorage y se
// perdía al cerrar la pestaña aunque las monedas ya estuvieran cobradas.
window.hidratarInventarioDesdeServidor = function() {
  if (window._hidratandoInventario) return window._hidratandoInventario;
  window._hidratandoInventario = (async function() {
    try {
      if (!(await apiIsAuthenticated()) || typeof apiGetInventario !== 'function') return false;
      const r = await apiGetInventario();
      if (!r.success) return false;
      const lista = [];
      ((r.data && r.data.items) || []).forEach(function(fila) {
        const def = window.CATBLING_ITEMS[fila.item_id];
        if (!def) return; // objeto sin definición de UI (p. ej. desactivado)
        for (let i = 0; i < fila.cantidad; i++) lista.push(Object.assign({}, def));
      });
      window.setInventarioSession(lista);
      const bag = document.getElementById('bag-overlay');
      if (bag && bag.classList.contains('active') && typeof window.mostrarBolsa === 'function') window.mostrarBolsa();
      return true;
    } catch (e) {
      console.warn('[config] hidratarInventarioDesdeServidor error:', e);
      return false;
    } finally {
      window._hidratandoInventario = null;
    }
  })();
  return window._hidratandoInventario;
};

window.actualizarInventarioUI = function() {
};

window.mostrarInventarioLleno = function() {
  let overlay = document.getElementById('inventory-full-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'inventory-full-overlay';
    overlay.innerHTML = `
      <div class="inventory-full-content">
        <h2>${__("inventario_lleno_titulo")}</h2>
        <p>${__("inventario_lleno_desc")}</p>
        <p>${__("inventario_lleno_desc2")}</p>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
      }
      overlay.classList.add('active');
};

// ═════════════════════════════════════════════════════════════════════════════
// 🎯 BOLSA – ABRIR / CERRAR
// ════════════════════════════════════════════════════════════════════════════

window.mostrarBolsa = function() {
  if (typeof window.tutorialClose === 'function') window.tutorialClose();
  const overlay = document.getElementById('bag-overlay');
  if (!overlay) return;
  if (typeof window.pausarTimerPregunta === 'function') window.pausarTimerPregunta();
  const inventario = window.getInventarioSession();
  const container = document.getElementById('bag-items-container');
  if (!container) return;
  container.innerHTML = '';
  if (inventario.length === 0) {
    container.innerHTML = '<p style="color: #ff3333; font-family: Pixelify Sans; font-size: 43px; text-shadow: 2px 2px 4px #ff0000; text-align: center;">' + __("sin_items_comprados") + '</p>';
  } else {
    inventario.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'bag-item';
      const nombreTraducido = window.obtenerNombreItemTraducido(item);
      const descripcionTraducida = window.obtenerDescripcionItemTraducida(item) || window.obtenerMejoraItemTraducida(item) || '';
      itemEl.innerHTML = `
        <div class="bag-item-info">
          <span class="bag-item-nombre">${nombreTraducido}</span>
          <span class="bag-item-descripcion">${descripcionTraducida}</span>
        </div>
        <div class="bag-item-img-wrap">
          <img src="${window.normalizarPathImagen(item.imagen)}" alt="${nombreTraducido}">
        </div>
      `;
      itemEl.onclick = () => window.mostrarConfirmacionUso(item, index);
      container.appendChild(itemEl);
    });
  }
  overlay.classList.add('active');
};

window.cerrarBolsa = function() {
  const overlay = document.getElementById('bag-overlay');
  if (overlay) overlay.classList.remove('active');
  if (typeof window.reanudarTimerPregunta === 'function') window.reanudarTimerPregunta();
};

window.mostrarPartidaNoRegistrada = function() {
  let overlay = document.getElementById('partida-no-registrada-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'partida-no-registrada-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;justify-content:center;align-items:center;z-index:100000;cursor:pointer;text-align:center;padding:20px;';
    overlay.innerHTML = '<div><h2 data-i18n="partida_no_registrada_titulo" style="font-family:\'Press Start 2P\',cursive;font-size:24px;color:#ff4444;margin:0 0 15px;text-shadow:0 0 20px rgba(255,68,68,1);"></h2>' +
      '<p data-i18n="partida_no_registrada_desc" style="font-family:\'Pixelify Sans\',sans-serif;font-size:22px;color:#fff;margin:8px 0;"></p>' +
      '<p data-i18n="restriccion_cerrar" style="font-family:\'Pixelify Sans\',sans-serif;font-size:16px;color:#ffd700;"></p></div>';
    overlay.addEventListener('click', function() { overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
  }
  overlay.querySelectorAll('[data-i18n]').forEach(function(el) { el.textContent = __(el.getAttribute('data-i18n')); });
  overlay.style.display = 'flex';
  setTimeout(function() { overlay.style.display = 'none'; }, 6000);
};

window.mostrarRestriccionUso = function(mensajePersonalizado) {
  let overlay = document.getElementById('restriction-overlay');
  const mensaje = mensajePersonalizado || __("restriccion_generica");
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'restriction-overlay';
    overlay.innerHTML = `
      <div class="restriction-content">
        <h2 data-i18n-restriccion-titulo>${__("no_puedes_usar_objeto")}</h2>
        <p id="restriction-msg">${mensaje}</p>
        <p>${__("restriccion_cerrar")}</p>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function() {
      this.classList.remove('active');
    });
  } else {
    const msgEl = document.getElementById('restriction-msg');
    if (msgEl) msgEl.textContent = mensaje;
  }
  overlay.classList.add('active');
  setTimeout(function() {
    overlay.classList.remove('active');
  }, 5000);
};

window.mostrarAnimacionUsoItem = function(item) {
  let animEl = document.getElementById('item-use-animation');
  if (!animEl) {
    animEl = document.createElement('div');
    animEl.id = 'item-use-animation';
    animEl.innerHTML = '<img id="item-use-animation-img" src="" alt="">';
    document.body.appendChild(animEl);
  }
  const img = document.getElementById('item-use-animation-img');
  img.src = window.normalizarPathImagen(item.imagen);
  animEl.classList.add('active');
  setTimeout(() => {
    animEl.classList.remove('active');
  }, 5500);
};

window.mostrarConfirmacionUso = function(item, index) {
  const overlay = document.getElementById('item-use-overlay');
  if (!overlay) return;

  if (item.tipo === "pregunta") {
    if (!window.esPaginaPreguntas()) {
      window.cerrarBolsa();
      setTimeout(() => window.mostrarRestriccionUso(__("restriccion_pregunta")), 300);
      return;
    }
    const zonaPreguntas = document.getElementById('zona-preguntas');
    if (!zonaPreguntas || !zonaPreguntas.classList.contains('activa')) {
      window.cerrarBolsa();
      setTimeout(() => window.mostrarRestriccionUso(__("restriccion_pregunta_activa")), 300);
      return;
    }
  }

  if (item.tipo === "juego" && !window.esPaginaJuegos()) {
    window.cerrarBolsa();
    setTimeout(() => window.mostrarRestriccionUso(__("restriccion_casino")), 300);
    return;
  }

  window.itemSeleccionado = item;
  window.itemSeleccionadoIndex = index;
  const content = document.getElementById('item-use-content');
  if (content) {
    content.innerHTML = `
      <h2>${__("confirmar_uso_item")}</h2>
      <p style="font-family: 'Pixelify Sans', sans-serif; font-size: 30px; color: white; margin-bottom: 30px;">${window.obtenerNombreItemTraducido ? window.obtenerNombreItemTraducido(item) : item.nombre}</p>
      <div class="item-use-buttons">
        <button id="btn-aceptar-item" class="item-use-btn" onclick="window.usarItem()">${__("si")}</button>
        <button id="btn-rechazar-item" class="item-use-btn" onclick="window.cerrarConfirmacion()">${__("no")}</button>
      </div>
    `;
  }
  overlay.classList.add('active');
};

window.cerrarConfirmacion = function() {
  const overlay = document.getElementById('item-use-overlay');
  if (overlay) overlay.classList.remove('active');
};

// 💾 Almacén de items activos para juegos
if (!window.itemsActivosJuego) {
  window.itemsActivosJuego = {};
}

window.tieneEscudoActivo = function() {
  return window.itemsActivosJuego && window.itemsActivosJuego['Escudo'] === true;
};

window.consumirEscudo = function() {
  if (window.tieneEscudoActivo()) {
    delete window.itemsActivosJuego['Escudo'];
    if (window.itemsActivosJuego['_activo'] === 'Escudo') {
      delete window.itemsActivosJuego['_activo'];
    }
    return true;
  }
  return false;
};

// 🎯 SISTEMA UNIFICADO DE EFECTOS DE ITEMS TIPO JUEGO

window.itemStates = {};

window.calcularDeduccionApuesta = function(apuesta) {
  if (window.tieneEscudoActivo()) {
    window.consumirEscudo();
    return 0;
  }
  if (window.itemsActivosJuego && window.itemsActivosJuego['Seguro']) {
    delete window.itemsActivosJuego['Seguro'];
    if (window.itemStates.duplicarComodinPendiente) {
      window.itemStates.duplicarComodinPendiente = false;
      return 0;
    }
    return Math.floor(apuesta / 2);
  }
  return apuesta;
};

window.calcularGananciaConItems = function(ganancia, apuesta) {
  let mult = 1;

  if (window.itemsActivosJuego && window.itemsActivosJuego['Jackpot']) {
    delete window.itemsActivosJuego['Jackpot'];
    mult = 8;
  } else if (window.itemsActivosJuego && window.itemsActivosJuego['X4']) {
    delete window.itemsActivosJuego['X4'];
    mult = 4;
  }

  if (window.itemStates && window.itemStates.duplicarComodinPendiente) {
    window.itemStates.duplicarComodinPendiente = false;
    mult *= 2;
  }

  const resultado = ganancia * mult;

  const deuda = parseInt(localStorage.getItem('creditoTemporalDeuda')) || 0;
  if (deuda > 0) {
    const pago = Math.min(deuda, resultado);
    localStorage.setItem('creditoTemporalDeuda', deuda - pago);
    return resultado - pago;
  }

  return resultado;
};

window.procesarPerdida = function() {
  localStorage.removeItem('creditoTemporalDeuda');
};

window.tieneAjusteFinoActivo = function() {
  return window.itemsActivosJuego && window.itemsActivosJuego['Ajuste'] === true;
};

window.consumirAjusteFino = function() {
  if (window.tieneAjusteFinoActivo()) {
    delete window.itemsActivosJuego['Ajuste'];
    return true;
  }
  return false;
};

window.tieneCreditoTemporalActivo = function() {
  return window.itemsActivosJuego && window.itemsActivosJuego['Credito'] === true;
};

window.verificarCreditoTemporal = function(apuesta) {
  if (!window.tieneCreditoTemporalActivo()) return false;
  const monedas = typeof getMonedas === 'function' ? getMonedas() : (parseInt(localStorage.getItem("monedas")) || 0);
  if (monedas < apuesta) {
    const deuda = apuesta - monedas;
    localStorage.setItem('creditoTemporalDeuda', deuda);
    delete window.itemsActivosJuego['Credito'];
    return true;
  }
  return false;
};

window.aplicarEfectoItem = function(item, index) {
  if (!item) return;
  const nombre = item.nombre;

  if (item.tipo === "juego" && !window.esPaginaJuegos()) {
    window.mostrarRestriccionUso(__("restriccion_casino"));
    return;
  }

  if (window.esPaginaPreguntas()) {
    if (typeof window.aplicarItemPregunta === 'function') {
      window.aplicarItemPregunta(nombre, item);
    }
  } else if (window.esPaginaJuegos()) {
    if (nombre === 'Duplicar') {
      window.itemStates.duplicarComodinPendiente = true;
    } else {
      window.itemsActivosJuego[nombre] = true;
      window.itemsActivosJuego['_activo'] = nombre;
    }
    const msg = document.createElement("div");
    msg.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-family: 'Press Start 2P', cursive; font-size: 20px;
      color: #ffd700; z-index: 99999; pointer-events: none;
      text-shadow: 0 0 30px rgba(255,215,0,0.9);
      animation: item-msg-flotar 3s ease forwards;
    `;
    msg.textContent = "\u2728 " + window.obtenerNombreItemTraducido(item) + " " + __("item_activado");
    document.body.appendChild(msg);
    setTimeout(() => { if (msg.parentNode) msg.remove(); }, 3000);
  }
};

window.usarItem = async function() {
  if (!window.itemSeleccionado || window.itemSeleccionadoIndex === undefined) return;
  const item = window.itemSeleccionado;
  const index = window.itemSeleccionadoIndex;

  if (item.tipo === "pregunta") {
    const zonaPreguntas = document.getElementById('zona-preguntas');
    if (!zonaPreguntas || !zonaPreguntas.classList.contains('activa')) {
      window.cerrarConfirmacion();
      window.mostrarRestriccionUso(__("restriccion_ronda_terminada"));
      window.itemSeleccionado = null;
      window.itemSeleccionadoIndex = undefined;
      return;
    }
  }

  if (window._usandoItem) return; // evita doble clic = doble consumo
  window._usandoItem = true;

  // Usuarios autenticados: el objeto se consume PRIMERO en el servidor (RPC usar_item).
  // Si el servidor no lo tiene en el inventario, no se activa ningún efecto.
  let consumidoEnServidor = false;
  try {
    if (await apiIsAuthenticated()) {
      const dbId = item.dbId;
      const r = (dbId && window.apiRpc && window.apiRpc.usarItem) ? await window.apiRpc.usarItem(dbId) : { success: false };
      if (!(r.success && r.data && r.data.ok)) {
        window.cerrarConfirmacion();
        window.cerrarBolsa();
        window.itemSeleccionado = null;
        window.itemSeleccionadoIndex = undefined;
        window._usandoItem = false;
        window.mostrarRestriccionUso(__("item_no_disponible"));
        window.hidratarInventarioDesdeServidor();
        return;
      }
      consumidoEnServidor = true;
      const inv = window.getInventarioSession();
      const pos = (inv[index] && inv[index].dbId === dbId) ? index : inv.findIndex(function(x) { return x.dbId === dbId; });
      if (pos >= 0) { inv.splice(pos, 1); window.setInventarioSession(inv); }
    }
  } catch (e) {
    console.warn('[config] usarItem error:', e);
    window.cerrarConfirmacion();
    window._usandoItem = false;
    return;
  }

  window.mostrarAnimacionUsoItem(item);

  setTimeout(() => {
    if (!consumidoEnServidor) {
      const inventario = window.getInventarioSession();
      if (index >= inventario.length) { window._usandoItem = false; return; }
      inventario.splice(index, 1);
      window.setInventarioSession(inventario);
    }
    window.cerrarConfirmacion();
    window.cerrarBolsa();
    window._usandoItem = false;
    window.aplicarEfectoItem(item, index);
    if (consumidoEnServidor) window.hidratarInventarioDesdeServidor();
  }, 2500);
};

// CAUSA RAÍZ del botón de cerrar ausente: el markup de la bolsa está copiado en
// el HTML de cada página, y en carreras, cartas retro, dados, memoria y ruleta
// se copió SIN <img id="bag-close-btn">. La lógica ya es central (cerrarBolsa);
// aquí se garantiza el botón en cualquier página que tenga #bag-overlay, en vez
// de duplicar el elemento a mano en cada HTML.
// CAUSA RAÍZ ampliada: en ruleta.html y memoria.html el markup del inventario
// no tiene NI #btn-bag (botón para abrirlo) ni #bag-close-btn (para cerrarlo);
// en carreras, dados y cartas retro falta sólo el de cerrar. Es una copia
// manual inconsistente del mismo bloque HTML en cada página, no un problema
// del sistema central (que sí es uno solo: mostrarBolsa/cerrarBolsa en este
// archivo). Se repara sin duplicar el sistema: si #bag-overlay existe en la
// página pero falta alguno de los dos botones, config.js los crea con el
// mismo aspecto y comportamiento que en las páginas donde sí están.
window.asegurarBotonAbrirBolsa = function() {
  if (document.getElementById('btn-bag')) return document.getElementById('btn-bag');
  const btn = document.createElement('img');
  btn.id = 'btn-bag';
  btn.src = new URL('resources/assets/bag.png', CATBLING_CONFIG_ROOT).href;
  btn.alt = 'Inventario';
  document.body.appendChild(btn); // #btn-bag es position:fixed; la posición en el DOM no afecta su ubicación en pantalla.
  return btn;
};

window.asegurarBotonCerrarBolsa = function(overlay) {
  if (!overlay || document.getElementById('bag-close-btn')) return;
  const contenedor = document.getElementById('bag-content') || overlay;
  const btn = document.createElement('img');
  btn.id = 'bag-close-btn';
  btn.src = new URL('resources/assets/exit.png', CATBLING_CONFIG_ROOT).href;
  btn.alt = 'Cerrar';
  btn.addEventListener('click', window.cerrarBolsa);
  contenedor.appendChild(btn);
};

window.inicializarBolsa = function() {
  const overlay = document.getElementById('bag-overlay');
  const itemOverlay = document.getElementById('item-use-overlay');
  const btnBag = overlay ? window.asegurarBotonAbrirBolsa() : document.getElementById('btn-bag');
  // Si el botón ya abre la bolsa por onclick (inline o asignado), no añadir un
  // segundo manejador: mostrarBolsa() se ejecutaba dos veces por clic.
  if (btnBag && !btnBag.onclick && !btnBag.getAttribute('onclick')) btnBag.addEventListener('click', window.mostrarBolsa);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) window.cerrarBolsa(); });
  window.asegurarBotonCerrarBolsa(overlay);
  if (itemOverlay) itemOverlay.addEventListener('click', (e) => { if (e.target === itemOverlay) window.cerrarConfirmacion(); });
};

// 🖥️ PANTALLA COMPLETA GLOBAL
window.toggleFullscreen = function() {
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  if (isFull) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    config.pantallaCompleta = false;
  } else {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    config.pantallaCompleta = true;
  }
  guardarConfig(config);
  const btns = document.querySelectorAll('#fullscreen-btn, #fullscreen-btn-global');
  btns.forEach(b => { b.textContent = config.pantallaCompleta ? __("off") : __("on"); });
};

window.actualizarBotonFullscreen = function() {
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  const btns = document.querySelectorAll('#fullscreen-btn, #fullscreen-btn-global');
  btns.forEach(b => { b.textContent = isFull ? __("off") : __("on"); });
};;

document.addEventListener('fullscreenchange', window.actualizarBotonFullscreen);
document.addEventListener('webkitfullscreenchange', window.actualizarBotonFullscreen);

// 🔄 SINCRONIZACIÓN ENTRE PÁGINAS
window.addEventListener("storage", () => {
  config = cargarConfig();
  aplicarConfig();
  if (typeof actualizarUI === 'function') actualizarUI();
});

// 🔐 SINCRONIZACIÓN DE SESIÓN CON SUPABASE AUTH (onAuthStateChange)

// Comprueba directamente el hash de la URL en busca de un enlace de
// recuperación de contraseña (flujo "implicit", el que usa por defecto
// supabase-js en navegador: #access_token=...&type=recovery&...).
// No basta con escuchar el evento 'PASSWORD_RECOVERY': hay un problema
// documentado en supabase-js (supabase/auth issue #1948) donde, según la
// versión, SÓLO se dispara 'SIGNED_IN' y 'PASSWORD_RECOVERY' nunca llega
// a emitirse. Como el CDN carga "@supabase/supabase-js@2" sin fijar
// versión exacta, no se puede asumir cuál de los dos comportamientos
// tendrá el navegador del usuario. Comprobar el hash directamente es una
// red de seguridad independiente del evento que finalmente dispare la
// librería.
// Se captura UNA sola vez, al parsear este script (antes de cualquier
// operación async de inicialización), en vez de leer window.location.hash
// "en vivo" cada vez: mostrarFormularioResetPassword() limpia el hash con
// history.replaceState() en cuanto lo detecta, y si en su lugar se
// releyera el hash más tarde (p. ej. desde el init de DOMContentLoaded,
// que corre después de un `await`), una comprobación tardía podría ya
// no encontrar el hash — dependiendo de qué código gane la carrera con
// el evento onAuthStateChange — y tratar por error la recuperación como
// un login normal.
const _URL_ERA_RECOVERY_AL_CARGAR = (window.CATBLING_URL_HASH_INICIAL || window.location.hash).includes('type=recovery');
function _esRecoveryEnURL() {
  // Una vez restablecida la contraseña (o descartado el formulario) el enlace deja de
  // contar: un login posterior en la misma carga de página es un login normal.
  return _URL_ERA_RECOVERY_AL_CARGAR && !window._recuperacionResuelta;
}

// Enlace de recuperación ya usado/expirado: Supabase redirige a
// #error=access_denied&error_code=otp_expired&error_description=... y antes la
// app lo ignoraba en silencio (la página cargaba como una visita normal).
// Se captura al parsear (igual que el hash de recuperación, porque supabase-js
// puede limpiar la URL) y se muestra el formulario "olvidé mi contraseña" con
// el aviso, reutilizando el overlay de autenticación existente.
const _ERROR_ENLACE_OTP_AL_CARGAR = (function() {
  try {
    const p = new URLSearchParams((window.CATBLING_URL_HASH_INICIAL || window.location.hash || '').replace(/^#/, ''));
    return p.get('error_code') === 'otp_expired';
  } catch (e) { return false; }
})();

// Retorno de OAuth con error: Supabase añade error / error_code / error_description al
// hash (flujo implícito) o a la query (PKCE). Se excluye el caso del enlace de
// recuperación caducado (otp_expired), que ya tiene su propio manejo.
const _ERROR_OAUTH_AL_CARGAR = (function() {
  try {
    const h = new URLSearchParams((window.CATBLING_URL_HASH_INICIAL || window.location.hash || '').replace(/^#/, ''));
    const q = new URLSearchParams(window.CATBLING_URL_SEARCH_INICIAL || window.location.search || '');
    const err = h.get('error') || q.get('error');
    const code = h.get('error_code') || q.get('error_code');
    return !!err && code !== 'otp_expired';
  } catch (e) { return false; }
})();

function mostrarErrorEnlaceRecuperacion() {
  if (typeof reiniciarFormulariosAuth === 'function') reiniciarFormulariosAuth();
  toggleAuthOverlay(true);
  if (document.getElementById('forgot-password-form')) {
    mostrarForgotPassword();
    const errEl = document.getElementById('forgot-error');
    if (errEl) errEl.textContent = __('error_enlace_recuperacion_invalido');
  }
}

function mostrarFormularioResetPassword() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  // Mientras este formulario esté abierto, ningún otro evento de sesión (INITIAL_SESSION,
  // SIGNED_IN, TOKEN_REFRESHED) puede volver a ocultar el overlay. Antes, INITIAL_SESSION
  // llegaba primero, esperaba (await) la carga de monedas/config y DESPUÉS ejecutaba
  // toggleAuthOverlay(false), tapando el formulario que PASSWORD_RECOVERY acababa de abrir.
  window._modoRecuperacion = true;
  // Limpiar el hash (#access_token=...&type=recovery&...) de la barra de
  // direcciones una vez detectado: los tokens ya fueron consumidos por
  // supabase-js (detectSessionInUrl) y quedan en la sesión persistida;
  // dejarlos en la URL sólo arriesga que una recarga vuelva a interpretar
  // el enlace como recuperación innecesariamente, o que queden expuestos
  // en el historial del navegador.
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  overlay.classList.remove('hidden');
  // El tutorial de bienvenida (primera visita) se dibuja ENCIMA del modal y captura los
  // clics: quien llega desde el correo de recuperación en un navegador nuevo no podía
  // pulsar "RESTABLECER". Se retira mientras dure la recuperación.
  (function quitarTutorial() {
    const tut = document.getElementById('tutorial-overlay');
    if (tut) tut.classList.remove('active');
    window._tutorialSuprimido = true;
  })();
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-password-form');
  const resetForm = document.getElementById('reset-password-form');
  const googleSection = document.querySelector('.auth-google');
  const authTitle = document.querySelector('.auth-title');
  const authTabs = document.querySelector('.auth-tabs');
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';
  if (googleSection) googleSection.style.display = 'none';
  if (authTitle) authTitle.style.display = 'none';
  if (authTabs) authTabs.style.display = 'none';
  if (resetForm) {
    resetForm.style.display = 'flex';
    const errEl = document.getElementById('reset-error');
    const okEl = document.getElementById('reset-success');
    if (errEl) errEl.textContent = '';
    if (okEl) okEl.style.display = 'none';
  }
}

function inicializarAuthStateListener() {
  if (!window.supabase || typeof window.supabase.auth.onAuthStateChange !== 'function') {
    console.warn('[config] Supabase Auth no disponible para onAuthStateChange');
    return;
  }
  // Evitar listeners duplicados
  if (window._authStateListenerInited) return;
  window._authStateListenerInited = true;

  window.supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[config] Auth state change:', event, session ? 'session exists' : 'no session');
    if (event === 'PASSWORD_RECOVERY') {
      // CAUSA RAÍZ (punto 6, recuperación de contraseña): cuando el
      // usuario abre el enlace de "¿Olvidaste tu contraseña?" que envía
      // Supabase, el propio cliente (detectSessionInUrl:true) detecta el
      // token en la URL, establece una sesión de recuperación y dispara
      // este evento 'PASSWORD_RECOVERY'. Antes NADA escuchaba este
      // evento: el bloque de abajo (SIGNED_IN/INITIAL_SESSION) trataba
      // esa sesión como un login normal y simplemente ocultaba el
      // overlay, así que el usuario nunca veía el formulario para
      // escribir su nueva contraseña — de ahí que "el enlace... parece
      // no cargar correctamente". No era un problema de URL de
      // localhost/XAMPP (resetPasswordForEmail ya usa
      // window.location.origin de forma dinámica en api.js): era que
      // el formulario de "nueva contraseña" nunca llegaba a abrirse.
      mostrarFormularioResetPassword();
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (window._modoRecuperacion || (event !== 'TOKEN_REFRESHED' && _esRecoveryEnURL())) {
        // Red de seguridad: si por la versión de supabase-js llega 'SIGNED_IN' o
        // 'INITIAL_SESSION' (con o sin 'PASSWORD_RECOVERY') pero la URL es
        // claramente un enlace de recuperación, se trata como recuperación en vez
        // de como login normal.
        if (!window._modoRecuperacion) mostrarFormularioResetPassword();
        return;
      }
      // Sesión iniciada o restaurada
      if (session) {
        // Login por Google (o por correo): se cierra el modo invitado y se carga el
        // estado REAL del usuario (saldo, preferencias, inventario). El perfil lo crea el
        // trigger handle_new_user (o ensure_profile si faltara).
        if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
        await window.cargarMonedasDeUsuario();
        await window.cargarConfigDeUsuario();
        if (window._modoRecuperacion) return; // se abrió el formulario de nueva contraseña mientras esperábamos
        toggleAuthOverlay(false);
        actualizarCerrarSesionUI();
        if (event !== 'TOKEN_REFRESHED') window.hidratarInventarioDesdeServidor();
      }
    } else if (event === 'SIGNED_OUT') {
      // Sesión cerrada
      window.setInventarioSession([]);
      toggleAuthOverlay(true);
      actualizarCerrarSesionUI();
      // Limpiar monedas localStorage para invitado
      localStorage.setItem("monedas", 0);
      if (typeof actualizarUI === 'function') actualizarUI();
    }
  });
}

// 🚀 AUTO-INICIO EN TODAS LAS PÁGINAS
document.addEventListener("DOMContentLoaded", async () => {
  config = cargarConfig();
  aplicarConfig();

  // CAUSA RAÍZ (overlay de login/registro no aparece al alcanzar el
  // límite de invitado): requerirAutenticacion() (guest.js) y
  // cerrarSesion() (aquí mismo) guardan sessionStorage["showAuth"]="true"
  // y navegan a principalpage.html esperando que, al cargar, se muestre
  // el overlay de autenticación. Pero NINGÚN archivo del proyecto leía
  // nunca ese valor de sessionStorage: se escribía en dos sitios y no se
  // leía en ninguno. Como además el invitado normalmente SÍ tiene
  // guestMode=true en localStorage (iniciarModoInvitado() ya corre en
  // toda página), el bloque de más abajo tomaba la rama "es invitado" y
  // ocultaba el overlay (toggleAuthOverlay(false)) igual que en una
  // visita normal — de ahí la "redirección silenciosa a la página
  // principal" en vez del overlay. La corrección mínima es leer aquí ese
  // flag (y limpiarlo de inmediato) para forzar el overlay reutilizando
  // el mecanismo central ya existente (toggleAuthOverlay/auth-overlay),
  // sin crear un segundo sistema.
  const forzarAuthOverlayPorLimite = sessionStorage.getItem("showAuth") === "true";
  if (forzarAuthOverlayPorLimite) sessionStorage.removeItem("showAuth");

  // Inicializar listener de auth state ANTES de verificar sesión
  inicializarAuthStateListener();
  
  // initAuth() eliminado - inicialización directa de Supabase Auth
  if (typeof apiIsAuthenticated === 'function') {
    let autenticado = await apiIsAuthenticated();
    // getSession() sólo lee el almacenamiento local: se valida contra Auth para
    // no tratar como "con sesión" a una cuenta eliminada/invalidada. No se hace
    // durante un enlace de recuperación (la sesión se está estableciendo).
    if (autenticado && !_esRecoveryEnURL() && typeof apiVerificarSesionServidor === 'function') {
      autenticado = await apiVerificarSesionServidor();
    }
    if ((_ERROR_ENLACE_OTP_AL_CARGAR || _ERROR_OAUTH_AL_CARGAR) && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (typeof _esRecoveryEnURL === 'function' && _esRecoveryEnURL()) {
      // CAUSA RAÍZ de la intermitencia: este chequeo antes exigía
      // `autenticado` (getSession()) además del hash de recuperación.
      // Pero supabase-js procesa el hash de forma asíncrona
      // (detectSessionInUrl); en la primera carga de la página, en el
      // momento en que se llega aquí, la sesión de recuperación puede
      // no estar establecida TODAVÍA aunque el enlace sea válido — el
      // hash sí lo dice con certeza, sin depender de esa carrera. Se
      // prioriza siempre el formulario de nueva contraseña usando SÓLO
      // el hash, sin importar si la sesión (o el evento
      // PASSWORD_RECOVERY/INITIAL_SESSION correspondiente) ya llegó o
      // no; el botón "Restablecer" espera a que la sesión exista antes
      // de llamar a apiResetPassword().
      if (typeof iniciarModoInvitado === 'function') iniciarModoInvitado();
      if (typeof mostrarFormularioResetPassword === 'function') mostrarFormularioResetPassword();
    } else if (autenticado) {
      await window.cargarMonedasDeUsuario();
      await window.cargarConfigDeUsuario();
      toggleAuthOverlay(false);
      window.hidratarInventarioDesdeServidor();
    } else {
      // CAUSA RAÍZ (sistema de invitado): iniciarModoInvitado() (guest.js)
      // nunca se llamaba desde ningún archivo del proyecto. Sin esta
      // llamada, la clave "guestMode" jamás se escribía en localStorage,
      // así que esModoInvitado() devolvía SIEMPRE false para cualquier
      // visitante sin sesión, y este bloque caía directo al "else" de
      // abajo mostrando el overlay de login/registro en la primera
      // visita, antes de poder usar ninguna función como invitado. En un
      // navegador/dispositivo sin datos previos (p. ej. entrando por la
      // URL de Network en vez de localhost) esto era 100% reproducible.
      // iniciarModoInvitado() ya es segura de llamar en cada carga: su
      // propio guard interno ("if (_isAuthenticatedSync() ||
      // _esModoInvitadoSync()) return;") evita reiniciar los límites ya
      // consumidos de un invitado que vuelve a entrar.
      if (typeof iniciarModoInvitado === 'function') iniciarModoInvitado();

      if (_ERROR_ENLACE_OTP_AL_CARGAR) {
        mostrarErrorEnlaceRecuperacion();
      } else if (_ERROR_OAUTH_AL_CARGAR) {
        // Volvimos de Google con un error (cuenta no autorizada, usuario canceló, etc.).
        if (typeof reiniciarFormulariosAuth === 'function') reiniciarFormulariosAuth();
        toggleAuthOverlay(true);
        const errG = document.getElementById('google-error');
        if (errG) errG.textContent = __('error_google');
      } else if (forzarAuthOverlayPorLimite) {
        // Límite de invitado alcanzado: mostrar SIEMPRE el overlay de
        // autenticación, aunque el invitado siga técnicamente en
        // "guestMode" (por eso no basta con la rama de esModoInvitado()
        // de abajo, que lo ocultaría).
        if (typeof reiniciarFormulariosAuth === 'function') reiniciarFormulariosAuth();
        toggleAuthOverlay(true);
      } else if (typeof esModoInvitado === 'function' && await esModoInvitado()) {
        toggleAuthOverlay(false);
      } else {
        toggleAuthOverlay(true);
      }
    }
  }
  actualizarCerrarSesionUI();

  const monedas = typeof getMonedas === 'function' ? getMonedas() : (parseInt(localStorage.getItem("monedas")) || 0);
  window.actualizarMonedasUI(monedas);

  window.cargarMonedasDeUsuario();
  window.cargarConfigDeUsuario();
  window.sincronizarConfigConUsuario();

  var btnOpc = document.getElementById('btn-opciones');
  var menuOpc = document.getElementById('menu-opciones');
  var overlayOpc = document.getElementById('overlay-menu');
  var cerrarOpc = document.getElementById('cerrar-menu');
  if (btnOpc && menuOpc && overlayOpc) {
    if (!btnOpc._menuInited) {
      btnOpc._menuInited = true;
      btnOpc.onclick = function() { menuOpc.classList.add('active'); overlayOpc.classList.add('active'); };
      if (cerrarOpc) {
        cerrarOpc.onclick = function() { menuOpc.classList.remove('active'); overlayOpc.classList.remove('active'); };
      }
      overlayOpc.onclick = function() { menuOpc.classList.remove('active'); overlayOpc.classList.remove('active'); };
    }
  }

  var cerrarSesionItem = document.getElementById('opcion-cerrar-sesion');
  if (cerrarSesionItem && !document.getElementById('opcion-mostrar-tutorial')) {
    var tutOption = document.createElement('div');
    tutOption.className = 'opcion-item';
    tutOption.id = 'opcion-mostrar-tutorial';
    tutOption.innerHTML =
      '<span data-i18n="mostrar_tutorial">' + ((typeof __ === 'function') ? __('mostrar_tutorial') : 'Mostrar tutorial') + '</span>' +
      '<div class="grupo-botones">' +
        '<button onclick="toggleTutorial()" id="tutorial-btn">' + ((typeof __ === 'function') ? (config.mostrarTutorial ? __('on') : __('off')) : (config.mostrarTutorial ? 'ON' : 'OFF')) + '</button>' +
      '</div>';
    cerrarSesionItem.parentNode.insertBefore(tutOption, cerrarSesionItem);
  }

  document.querySelectorAll('.monedas-ui').forEach(contenedor => {
    if (!document.getElementById('btn-bag')) {
      const bagBtn = document.createElement('img');
      bagBtn.src = window.normalizarPathImagen('resources/assets/bag.png');
      bagBtn.id = 'btn-bag';
      bagBtn.onclick = window.mostrarBolsa;
      contenedor.appendChild(bagBtn);
    }
  });

  setTimeout(window.actualizarInventarioUI, 50);
  setTimeout(window.inicializarBolsa, 100);

  // Sonido de clic global DESACTIVADO temporalmente: el archivo referenciado
  // ("./juegos/memoria/resources/assets/soundtrack/sounds effect/Botón-efecto de sonido (HD).mp3")
  // no existe en ningún lugar del proyecto (confirmado físicamente en la auditoría),
  // lo que generaba un 404 en cada página del sitio. Se deja el código listo para
  // reactivarse en cuanto se proporcione el archivo real: solo hay que descomentar
  // la línea de abajo con la ruta correcta.
  const sonidoClick = null; // new Audio("./juegos/memoria/resources/assets/soundtrack/sounds effect/Botón-efecto de sonido (HD).mp3");
  if (sonidoClick) sonidoClick.volume = 0.8;

  window.reproducirEfecto = function(rutaSonido) {
    if (config.efectos > 0) {
      const efecto = new Audio(rutaSonido);
      efecto.volume = config.efectos / 10;
      efecto.currentTime = 0;
      efecto.play().catch(() => {});
    }
  };

  function reproducirSonidoClick() {
    if (config.efectos > 0 && sonidoClick) {
      sonidoClick.volume = config.efectos > 0 ? 0.8 : 0;
      sonidoClick.currentTime = 0;
      sonidoClick.play().catch(() => {});
    }
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    const isClickable =
      target.tagName === "BUTTON" ||
      (target.tagName === "IMG" && target.onclick) ||
      target.getAttribute("onclick") ||
      target.classList.contains("menu-button") ||
      target.closest("a");
    if (isClickable) reproducirSonidoClick();
  }, true);
});

// Continuar con Google (Supabase Auth OAuth). El mismo botón sirve en las pestañas de
// inicio de sesión y de registro: Supabase decide si entra a una cuenta existente (mismo
// usuario, mismo perfil) o crea la cuenta nueva sin pedir contraseña. La sesión se
// establece al volver de Google; onAuthStateChange carga saldo, preferencias e inventario.
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('google-login-btn');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    const errEl = document.getElementById('google-error');
    if (errEl) errEl.textContent = '';
    if (typeof apiLoginWithGoogle !== 'function') {
      if (errEl) errEl.textContent = __('error_google');
      return;
    }
    btn.disabled = true;
    const r = await apiLoginWithGoogle();
    if (!r.success) {
      btn.disabled = false;
      console.warn('[config] Google OAuth error:', r.error);
      if (errEl) errEl.textContent = __('error_google');
    }
    // Si success, el navegador ya está siendo redirigido a Google.
  });
  // Volver con "atrás" desde Google restaura la página (bfcache) con el botón bloqueado.
  window.addEventListener('pageshow', function() { btn.disabled = false; });
});

// ═════════════════════════════════════════════════════════════════════════════
// 🛒 COMPRA TIENDA (delegado a RPC comprar_item)
// ═════════════════════════════════════════════════════════════════════════════

window.comprarItemTienda = async function(itemId, itemData) {
  // Devuelve siempre { success, codigo, error, saldo? }. `codigo` permite a la
  // tienda distinguir "saldo insuficiente" (confirmado por el servidor) de
  // cualquier otro fallo, en lugar de tratar todo como falta de monedas.
  if (!window.apiRpc || !window.apiRpc.comprarItem) {
    console.warn('[config] comprarItemTienda: apiRpc no disponible');
    return { success: false, codigo: 'error', error: 'RPC no disponible' };
  }
  if (!(await apiIsAuthenticated())) {
    if (typeof requerirAutenticacion === 'function') requerirAutenticacion();
    return { success: false, codigo: 'no_autenticado', error: 'No autenticado' };
  }

  // Verificar espacio en inventario ANTES de comprar
  if (typeof window.tieneEspacioInventario === 'function' && !window.tieneEspacioInventario()) {
    if (typeof window.mostrarInventarioLleno === 'function') {
      window.mostrarInventarioLleno();
    }
    return { success: false, codigo: 'inventario_lleno', error: 'Inventario lleno' };
  }

  try {
    const r = await window.apiRpc.comprarItem(itemId, 1);
    if (r.success && r.data?.ok) {
      // La RPC ya actualizó BD (saldo + inventario) y devolvió nuevo_saldo.
      // Se refresca el saldo vía coinsAPI.fetch() (coins.js).
      if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
        await window.coinsAPI.fetch();
      }
      // El inventario real ya quedó guardado por la RPC: se recarga desde el servidor.
      // Sólo si esa recarga falla se añade localmente (ruta relativa a la raíz del sitio).
      const hidratado = await window.hidratarInventarioDesdeServidor();
      if (!hidratado) {
        const itemToStore = Object.assign({}, itemData);
        itemToStore.imagen = './tienda/' + itemData.imagen.replace('./', '');
        window.agregarItemInventario(itemToStore);
      }
      return { success: true, codigo: 'ok', nuevo_saldo: r.data.nuevo_saldo };
    }
    const d = r.data || {};
    return {
      success: false,
      codigo: r.success ? (d.codigo || 'error') : 'error',
      saldo: (r.success && d.codigo === 'saldo_insuficiente' && d.nuevo_saldo !== undefined && d.nuevo_saldo !== null)
        ? Number(d.nuevo_saldo) : undefined,
      error: d.mensaje || r.error || 'Error en compra'
    };
  } catch (e) {
    console.error('[config] comprarItemTienda error:', e);
    return { success: false, codigo: 'error', error: e.message };
  }
};

// ── Refresco en tiempo real de contenido dinámico visible al cambiar idioma ──
// Cuando el usuario cambia de idioma, cualquier overlay de ítems que esté
// abierto en ese momento (bolsa, confirmación de uso) debe re-renderizarse
// para no quedar con textos mezclados en dos idiomas distintos.
window.addEventListener("idiomaAplicado", function () {
  const bagOverlay = document.getElementById("bag-overlay");
  if (bagOverlay && bagOverlay.classList.contains("active") && typeof window.mostrarBolsa === "function") {
    window.mostrarBolsa();
  }
  const itemUseOverlay = document.getElementById("item-use-overlay");
  if (itemUseOverlay && itemUseOverlay.classList.contains("active") && window.itemSeleccionado && typeof window.mostrarConfirmacionUso === "function") {
    window.mostrarConfirmacionUso(window.itemSeleccionado, window.itemSeleccionadoIndex);
  }
});