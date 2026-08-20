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

// ════════════════════════════════════════════════════════════════════════════
// 💰 SISTEMA DE MONEDAS POR USUARIO
// ════════════════════════════════════════════════════════════════════════════

window.sincronizarMonedasConUsuario = function() {
  if (typeof apiSetCoins !== 'function' || !apiGetToken()) return;
  const monedas = parseInt(localStorage.getItem("monedas")) || 0;
  apiSetCoins(monedas).catch(() => {});
};

window.cargarMonedasDeUsuario = function() {
  if (typeof apiGetCoins === 'function' && apiGetToken()) {
    apiGetCoins().then(res => {
      if (res.success) {
        localStorage.setItem("monedas", res.monedas);
        window.actualizarMonedasUI(res.monedas);
      }
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURACIÓN DE USUARIO (idioma, volumen, animaciones)
// ════════════════════════════════════════════════════════════════════════════

window.sincronizarConfigConUsuario = function() {
  if (typeof apiSetConfig !== 'function' || !apiGetToken()) return;
  apiSetConfig({
    idioma: config.idioma || 'es',
    volumenMusica: config.musica || 5,
    volumenEfectos: config.efectos || 5,
    animaciones: config.animaciones !== undefined ? config.animaciones : true,
  }).catch(() => {});
};

window.cargarConfigDeUsuario = function() {
  if (typeof apiGetConfig === 'function' && apiGetToken()) {
    apiGetConfig().then(res => {
      if (res.success) {
        const local = cargarConfig();
        // Siempre prioriza los valores locales guardados por el usuario.
        // Solo usa el valor del servidor si no hay nada guardado localmente.
        if (local.idioma === undefined || local.idioma === null) config.idioma = res.idioma || 'es';
        if (local.musica === undefined || local.musica === null) config.musica = res.volumenMusica ?? 5;
        if (local.efectos === undefined || local.efectos === null) config.efectos = res.volumenEfectos ?? 5;
        if (local.animaciones === undefined || local.animaciones === null) config.animaciones = res.animaciones ?? true;
        guardarConfig(config);
        aplicarConfig();
      }
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 🔐 AUTENTICACIÓN CON PHP + MYSQL
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

window.cerrarSesion = function() {
  document.getElementById("confirmacion-cerrar-sesion").classList.remove("active");
  window.sincronizarMonedasConUsuario();
  window.sincronizarConfigConUsuario();
  if (typeof apiLogout === 'function') apiLogout();
  if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
  window.setInventarioSession([]);
  localStorage.setItem("monedas", 0);
  sessionStorage.setItem("showAuth", "true");
  window.location.href = "/catbling/principalpage.html";
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
  const token = typeof apiGetToken === 'function' && apiGetToken();
  const guest = typeof esModoInvitado === 'function' && esModoInvitado();
  const span = cerrarSesionOpcion.querySelector("span");
  const btn = cerrarSesionOpcion.querySelector("button");
  if (token) {
    cerrarSesionOpcion.style.display = "flex";
    if (span) span.textContent = "Cerrar Sesión";
    if (btn) { btn.textContent = "SALIR"; btn.onclick = window.mostrarConfirmacionCerrarSesion; }
  } else if (guest) {
    cerrarSesionOpcion.style.display = "flex";
    if (span) span.textContent = "Ingresar";
    if (btn) { btn.textContent = "INGRESAR"; btn.onclick = window.mostrarAuthIngresar; }
  } else {
    cerrarSesionOpcion.style.display = "none";
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
  if (errL) errL.textContent = "";
  if (errR) errR.textContent = "";
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

function initAuth() {
  const overlay = document.getElementById("auth-overlay");
  if (!overlay) return;

  const urlParams = new URLSearchParams(window.location.search);
  const hasResetToken = urlParams.has("reset_token");

  if (!(typeof tieneSesionValida === 'function' && tieneSesionValida()) && !(typeof esModoInvitado === 'function' && esModoInvitado())) {
    if (typeof iniciarModoInvitado === 'function') iniciarModoInvitado();
  }

  if (sessionStorage.getItem("showAuth") === "true" || hasResetToken) {
    sessionStorage.removeItem("showAuth");
    toggleAuthOverlay(true);
  } else if (apiGetToken()) {
    toggleAuthOverlay(false);
  } else {
    toggleAuthOverlay(false);
  }

  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  tabs.forEach(t => t.classList.remove("active"));
  document.querySelector('.auth-tab[data-tab="login"]').classList.add("active");
  loginForm.style.display = "flex";
  registerForm.style.display = "none";

  loginForm.reset();
  registerForm.reset();
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";

  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.onclick = function() {
      document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      if (this.dataset.tab === "login") {
        document.getElementById("login-form").style.display = "flex";
        document.getElementById("register-form").style.display = "none";
      } else {
        document.getElementById("login-form").style.display = "none";
        document.getElementById("register-form").style.display = "flex";
      }
    };
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");

    const result = await window.iniciarSesionPHP(email, password);
    if (result.success) {
      if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
      toggleAuthOverlay(false);
      actualizarCerrarSesionUI();
      window.cargarMonedasDeUsuario();
      window.cargarConfigDeUsuario();
    } else {
      errorEl.textContent = result.error;
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("register-confirm").value;
    const errorEl = document.getElementById("register-error");

    if (password !== confirm) {
      errorEl.textContent = "Las contraseñas no coinciden";
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = "La contraseña debe tener al menos 6 caracteres";
      return;
    }

    const result = await window.registrarUsuarioPHP(username, email, password);
    if (result.success) {
      if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
      toggleAuthOverlay(false);
      actualizarCerrarSesionUI();
      window.cargarMonedasDeUsuario();
      window.cargarConfigDeUsuario();
    } else {
      errorEl.textContent = result.error;
    }
  });

  // ─── Auto-mostrar reset si hay token en URL ────────────────────
  const params = new URLSearchParams(window.location.search);
  if (params.has("reset_token")) {
    mostrarForgotPassword();
    document.getElementById("forgot-password-form").style.display = "none";
    document.getElementById("reset-password-form").style.display = "flex";
  }
}

function agregarBotonInvitado() {
  const container = document.querySelector('.auth-container');
  if (!container) return;
  if (container.querySelector('.guest-btn')) return;
  const guestBtn = document.createElement('button');
  guestBtn.className = 'guest-btn';
  guestBtn.textContent = 'CONTINUAR COMO INVITADO';
  guestBtn.onclick = function() {
    if (typeof iniciarModoInvitado === 'function') iniciarModoInvitado();
  };
  const googleSection = container.querySelector('.auth-google');
  if (googleSection) {
    googleSection.parentNode.insertBefore(guestBtn, googleSection.nextSibling);
  } else {
    container.appendChild(guestBtn);
  }
}

// ════════════════════════════════════════════════════════════════════════════
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
    toggle.textContent = "👁";
  }
});

// ════════════════════════════════════════════════════════════════════════════
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
        errorEl.textContent = "Ingresa un correo electrónico";
        return;
      }

      forgotSubmitBtn.disabled = true;
      forgotSubmitBtn.textContent = "ENVIANDO...";

      const result = await apiForgotPassword(email);
      forgotSubmitBtn.disabled = false;
      forgotSubmitBtn.textContent = "ENVIAR";

      if (result.success) {
        successEl.style.display = "block";
        successEl.textContent = __("email_sent", "Se ha enviado un enlace de recuperación a tu correo.");
        if (result._debug_token) {
          console.log("🔑 Token de recuperación (debug):", result._debug_token);
          console.log("🔗 Link directo: http://localhost/catbling/principalpage.html?reset_token=" + result._debug_token);
          const debugMsg = document.createElement("p");
          debugMsg.style.cssText = "color:#ffd700;font-size:14px;margin:5px 0 0 0;word-break:break-all;";
          debugMsg.textContent = "🔑 Debug: usa /principalpage.html?reset_token=" + result._debug_token;
          successEl.appendChild(debugMsg);
        }
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

      if (password.length < 6) {
        errorEl.textContent = "La contraseña debe tener al menos 6 caracteres";
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = "Las contraseñas no coinciden";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const token = params.get("reset_token");

      if (!token) {
        errorEl.textContent = "Token de recuperación no válido";
        return;
      }

      resetSubmitBtn.disabled = true;
      resetSubmitBtn.textContent = "RESTABLECIENDO...";

      const result = await apiResetPassword(token, password);
      resetSubmitBtn.disabled = false;
      resetSubmitBtn.textContent = "RESTABLECER";

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

const TRADUCCIONES = {
  opciones:       { es: "OPCIONES",       en: "OPTIONS" },
  musica:         { es: "Música",         en: "Music" },
  efectos:        { es: "Efectos",        en: "Effects" },
  animaciones:    { es: "Animaciones",    en: "Animations" },
  idioma:         { es: "Idioma",         en: "Language" },
  config:         { es: "Configuración",  en: "Settings" },
  reset:          { es: "RESET",          en: "RESET" },
  on:             { es: "ON",             en: "ON" },
  off:            { es: "OFF",            en: "OFF" },
  jugar:          { es: "JUGAR",          en: "PLAY" },
  reiniciar:      { es: "REINICIAR",      en: "RESTART" },
  apostar:        { es: "APOSTAR",        en: "BET" },
  girar:          { es: "GIRAR",          en: "SPIN" },
  lanzar:         { es: "LANZAR DADOS",   en: "ROLL DICE" },
  ganaste:        { es: "¡GANASTE!",      en: "YOU WIN!" },
  perdiste:       { es: "¡PERDISTE!",     en: "YOU LOSE!" },
  monedas:        { es: "Monedas",        en: "Coins" },
  apuesta:        { es: "Apuesta:",       en: "Bet:" },
  movimientos:    { es: "Movimientos:",   en: "Moves:" },
  niveles:        { es: "NIVELES",        en: "LEVELS" },
  ruleta:         { es: "RULETA",         en: "ROULETTE" },
  tragamonedas:   { es: "TRAGAMONEDAS",   en: "SLOTS" },
  duelo:          { es: "DUELO DE DADOS", en: "DICE DUEL" },
  cerrar_sesion:  { es: "Cerrar Sesión",  en: "Log Out" },
  salir:          { es: "SALIR",          en: "EXIT" },
  entrar:         { es: "ENTRAR",         en: "LOG IN" },
  iniciar_sesion: { es: "INICIAR SESIÓN", en: "LOG IN" },
  registrarse:    { es: "REGISTRARSE",    en: "SIGN UP" },
  pantalla_completa: { es: "Pantalla Completa", en: "Fullscreen" },
  enviar:         { es: "ENVIAR",          en: "SEND" },
  restablecer:    { es: "RESTABLECER",     en: "RESET PASSWORD" },
  forgot_desc:    { es: "Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.", en: "Enter your email and we'll send you a link to reset your password." },
  reset_title:    { es: "RESTABLECER CONTRASEÑA", en: "RESET PASSWORD" },
  forgot_link:    { es: "¿Olvidaste tu contraseña?", en: "Forgot your password?" },
  back_login:     { es: "← Volver a inicio de sesión", en: "← Back to login" },
  email_sent:     { es: "Se ha enviado un enlace de recuperación a tu correo electrónico.", en: "A recovery link has been sent to your email." },
  reset_success:  { es: "Contraseña restablecida correctamente. Ya puedes iniciar sesión.", en: "Password reset successfully. You can now log in." },
};

function __(key, defaultText) {
  const lang = config.idioma || "es";
  if (TRADUCCIONES[key] && TRADUCCIONES[key][lang]) {
    return TRADUCCIONES[key][lang];
  }
  return defaultText || key;
}

function aplicarIdioma() {
  const lang = config.idioma || "es";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (TRADUCCIONES[key] && TRADUCCIONES[key][lang]) {
      el.textContent = TRADUCCIONES[key][lang];
    }
  });
}

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
  if (animBtn) animBtn.textContent = config.animaciones ? "ON" : "OFF";

  const tutBtn = document.getElementById("tutorial-btn");
  if (tutBtn) tutBtn.textContent = config.mostrarTutorial ? "ON" : "OFF";

  const subtitulo = document.getElementById("subtitulo");
  if (subtitulo) {
    subtitulo.textContent = config.idioma === "es" ? "Jugar" : "Play";
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

window.agregarItemInventario = function(item) {
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

window.normalizarPathImagen = function(path) {
  if (!path) return './resources/assets/yukocoins.png';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const cleanPath = path.replace(/^\.\//, '');
  const segments = window.location.pathname.replace(/\\/g, '/').split('/').filter(function(s) { return s.length > 0; });
  var last = segments[segments.length - 1] || '';
  var isFile = /\.[a-z]+$/i.test(last);
  var folderDepth = isFile ? segments.length - 1 : segments.length;
  var prefixLevels = Math.max(0, folderDepth - 1);
  var prefix = prefixLevels === 0 ? './' : '../'.repeat(prefixLevels);
  return prefix + cleanPath;
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
        <h2>¡Inventario lleno!</h2>
        <p>No tienes espacio para más objetos.</p>
        <p>Usa o elimina algunos objetos de tu bolsa antes de comprar más.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
      }
      overlay.classList.add('active');
};

// ════════════════════════════════════════════════════════════════════════════
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
    container.innerHTML = '<p style="color: #ff3333; font-family: Pixelify Sans; font-size: 43px; text-shadow: 2px 2px 4px #ff0000;">No tienes items comprados</p>';
  } else {
    inventario.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'bag-item';
      itemEl.innerHTML = `
        <div class="bag-item-info">
          <span class="bag-item-nombre">${item.nombre}</span>
          <span class="bag-item-descripcion">${item.descripcion || item.mejora || ''}</span>
        </div>
        <div class="bag-item-img-wrap">
          <img src="${window.normalizarPathImagen(item.imagen)}" alt="${item.nombre}">
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

window.mostrarRestriccionUso = function(mensajePersonalizado) {
  let overlay = document.getElementById('restriction-overlay');
  const mensaje = mensajePersonalizado || 'Debes estar en la página correcta para usar este objeto.';
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'restriction-overlay';
    overlay.innerHTML = `
      <div class="restriction-content">
        <h2>¡No puedes usar este objeto aquí!</h2>
        <p id="restriction-msg">${mensaje}</p>
        <p>Haz clic en cualquier parte para cerrar este mensaje.</p>
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
      setTimeout(() => window.mostrarRestriccionUso('Debes estar en una ronda de preguntas para usar este objeto.'), 300);
      return;
    }
    const zonaPreguntas = document.getElementById('zona-preguntas');
    if (!zonaPreguntas || !zonaPreguntas.classList.contains('activa')) {
      window.cerrarBolsa();
      setTimeout(() => window.mostrarRestriccionUso('Debes estar en una ronda de preguntas activa para usar este objeto.'), 300);
      return;
    }
  }

  if (item.tipo === "juego" && !window.esPaginaJuegos()) {
    window.cerrarBolsa();
    setTimeout(() => window.mostrarRestriccionUso('Este objeto solo puede usarse desde la sección Casino.'), 300);
    return;
  }

  window.itemSeleccionado = item;
  window.itemSeleccionadoIndex = index;
  const content = document.getElementById('item-use-content');
  if (content) {
    content.innerHTML = `
      <h2>¿Seguro de utilizar este objeto?</h2>
      <p style="font-family: 'Pixelify Sans', sans-serif; font-size: 30px; color: white; margin-bottom: 30px;">${item.nombre}</p>
      <div class="item-use-buttons">
        <button id="btn-aceptar-item" class="item-use-btn" onclick="window.usarItem()">SÍ</button>
        <button id="btn-rechazar-item" class="item-use-btn" onclick="window.cerrarConfirmacion()">NO</button>
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
  if (window.itemsActivosJuego && window.itemsActivosJuego['Seguro Parcial']) {
    delete window.itemsActivosJuego['Seguro Parcial'];
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

  if (window.itemsActivosJuego && window.itemsActivosJuego['\u00a1Jackpot!']) {
    delete window.itemsActivosJuego['\u00a1Jackpot!'];
    mult = 8;
  } else if (window.itemsActivosJuego && window.itemsActivosJuego['Multiplicador X4']) {
    delete window.itemsActivosJuego['Multiplicador X4'];
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
  return window.itemsActivosJuego && window.itemsActivosJuego['Ajuste Fino'] === true;
};

window.consumirAjusteFino = function() {
  if (window.tieneAjusteFinoActivo()) {
    delete window.itemsActivosJuego['Ajuste Fino'];
    return true;
  }
  return false;
};

window.tieneCreditoTemporalActivo = function() {
  return window.itemsActivosJuego && window.itemsActivosJuego['Credito Temporal'] === true;
};

window.verificarCreditoTemporal = function(apuesta) {
  if (!window.tieneCreditoTemporalActivo()) return false;
  const monedas = getMonedas();
  if (monedas < apuesta) {
    const deuda = apuesta - monedas;
    localStorage.setItem('creditoTemporalDeuda', deuda);
    delete window.itemsActivosJuego['Credito Temporal'];
    return true;
  }
  return false;
};

window.aplicarEfectoItem = function(item, index) {
  if (!item) return;
  const nombre = item.nombre;

  if (item.tipo === "juego" && !window.esPaginaJuegos()) {
    window.mostrarRestriccionUso('Este objeto solo puede usarse desde la secci\u00f3n Casino.');
    return;
  }

  if (window.esPaginaPreguntas()) {
    if (typeof window.aplicarItemPregunta === 'function') {
      window.aplicarItemPregunta(nombre, item);
    }
  } else if (window.esPaginaJuegos()) {
    if (nombre === 'Duplicar Comodin') {
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
    msg.textContent = "\u2728 " + nombre + " activado!";
    document.body.appendChild(msg);
    setTimeout(() => { if (msg.parentNode) msg.remove(); }, 3000);
  }
};

window.usarItem = function() {
  if (!window.itemSeleccionado || window.itemSeleccionadoIndex === undefined) return;
  const item = window.itemSeleccionado;
  const index = window.itemSeleccionadoIndex;

  if (item.tipo === "pregunta") {
    const zonaPreguntas = document.getElementById('zona-preguntas');
    if (!zonaPreguntas || !zonaPreguntas.classList.contains('activa')) {
      window.cerrarConfirmacion();
      window.mostrarRestriccionUso('La ronda de preguntas ha terminado. No puedes usar este objeto ahora.');
      window.itemSeleccionado = null;
      window.itemSeleccionadoIndex = undefined;
      return;
    }
  }

  window.mostrarAnimacionUsoItem(item);

  setTimeout(() => {
    const inventario = window.getInventarioSession();
    if (index >= inventario.length) return;
    inventario.splice(index, 1);
    window.setInventarioSession(inventario);
    window.cerrarConfirmacion();
    window.cerrarBolsa();
    window.aplicarEfectoItem(item, index);
  }, 2500);
};

window.inicializarBolsa = function() {
  const btnBag = document.getElementById('btn-bag');
  const overlay = document.getElementById('bag-overlay');
  const itemOverlay = document.getElementById('item-use-overlay');
  if (btnBag) btnBag.addEventListener('click', window.mostrarBolsa);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) window.cerrarBolsa(); });
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
  btns.forEach(b => { b.textContent = config.pantallaCompleta ? 'OFF' : 'ON'; });
};

window.actualizarBotonFullscreen = function() {
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  const btns = document.querySelectorAll('#fullscreen-btn, #fullscreen-btn-global');
  btns.forEach(b => { b.textContent = isFull ? 'OFF' : 'ON'; });
};

document.addEventListener('fullscreenchange', window.actualizarBotonFullscreen);
document.addEventListener('webkitfullscreenchange', window.actualizarBotonFullscreen);

// 🔄 SINCRONIZACIÓN ENTRE PÁGINAS
window.addEventListener("storage", () => {
  config = cargarConfig();
  aplicarConfig();
  if (typeof actualizarUI === 'function') actualizarUI();
});

// 🚀 AUTO-INICIO EN TODAS LAS PÁGINAS
document.addEventListener("DOMContentLoaded", () => {
  config = cargarConfig();
  aplicarConfig();
  initAuth();
  actualizarCerrarSesionUI();

  const monedas = typeof getMonedas === 'function' ? getMonedas() : (parseInt(localStorage.getItem("monedas")) || 0);
  window.actualizarMonedasUI(monedas);

  window.cargarMonedasDeUsuario();
  let _ultimasMonedas = parseInt(localStorage.getItem("monedas")) || 0;
  setInterval(() => {
    const actual = parseInt(localStorage.getItem("monedas")) || 0;
    if (actual !== _ultimasMonedas) {
      _ultimasMonedas = actual;
      window.sincronizarMonedasConUsuario();
    }
  }, 1000);
  window.addEventListener('storage', (e) => {
    if (e.key === 'monedas') {
      _ultimasMonedas = parseInt(e.newValue) || 0;
      window.sincronizarMonedasConUsuario();
    }
  });

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
      '<span>Mostrar tutorial</span>' +
      '<div class="grupo-botones">' +
        '<button onclick="toggleTutorial()" id="tutorial-btn">' + (config.mostrarTutorial ? 'ON' : 'OFF') + '</button>' +
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

  const sonidoClick = new Audio("./juegos/memoria/resources/assets/soundtrack/sounds effect/Botón-efecto de sonido (HD).mp3");
  sonidoClick.volume = 0.8;

  window.reproducirEfecto = function(rutaSonido) {
    if (config.efectos > 0) {
      const efecto = new Audio(rutaSonido);
      efecto.volume = config.efectos / 10;
      efecto.currentTime = 0;
      efecto.play().catch(() => {});
    }
  };

  function reproducirSonidoClick() {
    if (config.efectos > 0) {
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

// Google Login callback
window.handleGoogleCredentialResponse = function(response) {
  if (typeof apiRequest !== 'function') return;
  apiRequest('google_login.php', { credential: response.credential }).then(res => {
    if (res.success) {
      localStorage.setItem('api_token', res.token);
      localStorage.setItem('api_user', JSON.stringify(res.user));
      if (res.user.monedas !== undefined) {
        localStorage.setItem('monedas', res.user.monedas);
        window.actualizarMonedasUI(res.user.monedas);
      }
      if (typeof finalizarModoInvitado === 'function') finalizarModoInvitado();
      toggleAuthOverlay(false);
      actualizarCerrarSesionUI();
      window.cargarMonedasDeUsuario();
      window.cargarConfigDeUsuario();
    } else {
      const errorEl = document.getElementById('login-error');
      if (errorEl) errorEl.textContent = res.error || 'Error al iniciar sesión con Google';
    }
  }).catch(() => {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.textContent = 'Error de conexión';
  });
};
