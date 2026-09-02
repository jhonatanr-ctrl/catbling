// monedas.js (GLOBAL) — UI + Timer + RPCs
// Mutaciones de monedas via window.apiRpc (Supabase RPCs)
// Timer 2h/10c y UI se mantienen en localStorage (solo visual)

const MONEDAS_KEY = "monedas";           // cache local (solo lectura rápida)
const TIMER_KEY = "coinsTimer";          // timer 2h/10c (solo visual, server valida)
const TIMER_DURATION = 2 * 60 * 60 * 1000;
let timerInterval = null;
let monedasCache = null;

// ─── Helpers de autenticación ────────────────────────────────────
function _isAuthenticatedSync() {
  const session = localStorage.getItem('catbling-auth');
  if (!session) return false;
  try {
    const parsed = JSON.parse(session);
    return !!parsed?.access_token;
  } catch {
    return false;
  }
}

async function _isAuthenticated() {
  try {
    return await apiIsAuthenticated();
  } catch {
    return false;
  }
}

// ─── Cache local (solo para UI rápida) ──────────────────────────
function _getCache() {
  if (monedasCache !== null) return monedasCache;
  const v = localStorage.getItem(MONEDAS_KEY);
  if (v === null) return null; // null = no inicializado, 0 = saldo real 0
  return parseInt(v) || 0;
}

function _setCache(valor) {
  monedasCache = Math.max(0, parseInt(valor) || 0);
  localStorage.setItem(MONEDAS_KEY, monedasCache);
}

function _clearCache() {
  monedasCache = null;
}

// ─── API pública (compatibilidad con config.js y juegos) ────────
function getMonedas() {
  return _getCache();
}

// Devuelve Promise — consultar saldo real desde Supabase
async function fetchMonedas() {
  if (!await _isAuthenticated()) {
    return Promise.resolve(_getCache());
  }
  if (typeof apiGetCoins !== 'function') {
    console.warn('[coins.js] apiGetCoins no disponible');
    return Promise.resolve(_getCache());
  }
  try {
    const r = await apiGetCoins();
    if (r.success && r.data?.monedas !== undefined) {
      _setCache(r.data.monedas);
      actualizarUI();
      return r.data.monedas;
    }
    return _getCache();
  } catch (e) {
    console.warn('[coins.js] fetchMonedas error:', e);
    return _getCache();
  }
}

// ─── Mutaciones via RPCs ───────────────────────────────────────
async function _aplicarDelta(cantidad, positivo) {
  if (!await _isAuthenticated()) {
    // Fallback localStorage (modo invitado / sin Supabase)
    _setCache(Math.max(0, _getCache() + cantidad));
    actualizarUI();
    if (typeof mostrarAnimacionMonedas === 'function') {
      mostrarAnimacionMonedas(cantidad, positivo);
    }
    return { ok: true, nuevo_saldo: _getCache() };
  }

  if (typeof window.apiRpc === 'undefined') {
    console.error('[coins.js] apiRpc no disponible para usuario autenticado');
    return { ok: false, error: 'apiRpc no disponible' };
  }

  // Para usuarios autenticados, NO modificar localStorage directamente.
  // Las mutaciones reales deben hacerse via RPCs específicos desde los juegos/tienda.
  // Esta función queda para compatibilidad pero NO modifica el saldo real.
  if (cantidad > 0) {
    console.warn('[coins.js] agregarMonedas: usa apiRpc.reclamarRecargaGratis() o RPCs de juegos');
  } else {
    console.warn('[coins.js] descontarMonedas/cambiarMonedas: usa RPCs de juegos/tienda');
  }
  return { ok: false, error: 'Operación no permitida directamente. Usa RPCs correspondientes.' };
}

function agregarMonedas(cantidad) {
  return _aplicarDelta(cantidad, true);
}

function descontarMonedas(cantidad) {
  return _aplicarDelta(-Math.abs(cantidad), false);
}

function cambiarMonedas(cantidad) {
  return _aplicarDelta(cantidad, cantidad > 0);
}

// ─── Timer 2h / 10 monedas (visual + llama RPC al expirar) ─────
function getTimerEnd() {
  return parseInt(localStorage.getItem(TIMER_KEY)) || 0;
}

function setTimerEnd(time) {
  localStorage.setItem(TIMER_KEY, time);
}

function iniciarTimerCoins() {
  if (timerInterval) clearInterval(timerInterval);
  const endTime = Date.now() + TIMER_DURATION;
  localStorage.setItem(TIMER_KEY, endTime);
  timerInterval = setInterval(actualizarTimerUI, 1000);
  actualizarTimerUI();
}

async function verificarTimerCoins() {
  const monedas = _getCache();
  const timerEnd = getTimerEnd();

  if (monedas === 0 && timerEnd === 0) {
    const endTime = Date.now() + TIMER_DURATION;
    localStorage.setItem(TIMER_KEY, endTime);
    if (!timerInterval) {
      timerInterval = setInterval(actualizarTimerUI, 1000);
    }
    actualizarTimerUI();
  } else if (monedas === 0 && timerEnd > 0) {
    const restante = timerEnd - Date.now();
    if (restante <= 0) {
      // Timer expirado: llamar RPC reclamarRecargaGratis (server valida 2h)
      if (await _isAuthenticated() && window.apiRpc) {
        try {
          const r = await window.apiRpc.reclamarRecargaGratis();
          if (r.success && r.data?.nuevo_saldo !== undefined) {
            _setCache(r.data.nuevo_saldo);
            actualizarUI();
          }
        } catch (e) {
          console.warn('[coins.js] reclamarRecargaGratis falló:', e);
        }
      } else {
        // Fallback localStorage (modo invitado)
        _setCache(10);
        actualizarUI();
      }
      localStorage.setItem(TIMER_KEY, 0);
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    } else if (!timerInterval) {
      timerInterval = setInterval(actualizarTimerUI, 1000);
    }
  }
}

// ─── Timer UI (sin cambios) ────────────────────────────────────
function actualizarTimerUI() {
  const timerEnd = getTimerEnd();
  const monedas = _getCache();
  const timerEl = document.getElementById('timer-coins');
  const ahora = Date.now();
  const restante = timerEnd - ahora;

  if (monedas >= 5) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerEl) {
      timerEl.style.display = 'none';
      timerEl.textContent = '';
    }
    return;
  }

  if (restante <= 4) {
    // Se maneja en verificarTimerCoins (async)
    if (timerEl) {
      timerEl.style.display = 'none';
      timerEl.textContent = '';
    }
    return;
  }

  if (timerEl) {
    timerEl.style.display = 'block';
    const horas = Math.floor(restante / (1000 * 60 * 60));
    const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((restante % (1000 * 60)) / 1000);
    timerEl.textContent = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  actualizarNoMonedasOverlay(restante);
}

function ocultarTimerUI() {
  const timerEl = document.getElementById('timer-coins');
  if (timerEl) timerEl.style.display = 'none';
}

// ─── Overlays / Animaciones (sin cambios) ──────────────────────
let overlayRestanteCallback = null;
function actualizarNoMonedasOverlay(restante) {
  const overlayTimer = document.getElementById('overlay-timer-text');
  if (!overlayTimer) return;

  if (_getCache() >= 5) {
    overlayTimer.style.display = 'none';
    return;
  }

  overlayTimer.style.display = 'block';

  if (restante > 0) {
    const horas = Math.floor(restante / (1000 * 60 * 60));
    const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((restante % (1000 * 60)) / 1000);
    const lang = (typeof config !== 'undefined' && config.idioma) || 'es';
    const prefix = lang === 'en' ? '10 Coins will be added in ' : 'Se agregarán 10 Monedas en ';
    overlayTimer.textContent = prefix + `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  } else {
    const lang = (typeof config !== 'undefined' && config.idioma) || 'es';
    overlayTimer.textContent = lang === 'en' ? '10 Coins have been added!' : '¡Se han agregado 10 Monedas!';
  }
}

function crearElementosUI() {
  if (document.getElementById('timer-coins')) return;

  const monedasUI = document.querySelector('.monedas-ui');
  if (!monedasUI) return;

  const timerEl = document.createElement('p');
  timerEl.id = 'timer-coins';
  timerEl.style.cssText = 'font-family: "Press Start 2P", cursive; font-size: 10px; color: #00ff00; margin: 5px 0 0 0; text-align: center; text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);';
  monedasUI.appendChild(timerEl);
}

function crearOverlayGlobal() {
  if (document.getElementById('global-no-monedas-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'global-no-monedas-overlay';
  overlay.className = 'global-no-monedass-overlay';
  overlay.innerHTML = `
    <div class="global-no-monedass-content">
      <h2 id="no-coins-title">¡Sin monedas!</h2>
      <p id="no-coins-desc">No tienes suficientes monedas para apostar.</p>
      <p class="monedas-necesarias" id="no-coins-needed">Monedas necesarias: <span id="overlay-monedas-necesarias">0</span></p>
      <p id="overlay-timer-text" style="display: none; margin-top: 15px;"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.textContent = `
    .global-no-monedass-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 900;
    }
    .global-no-monedass-overlay.visible {
      display: flex;
    }
    .global-no-monedass-content {
      text-align: center;
      padding: 20px;
    }
    .global-no-monedass-content h2 {
      font-family: 'Press Start 2P', cursive;
      font-size: 28px;
      color: #ff4444;
      margin: 0 0 15px 0;
      text-shadow: 0 0 20px rgba(255, 68, 68, 1), 0 0 40px rgba(255, 68, 68, 0.6);
    }
    .global-no-monedass-content p {
      font-family: 'Pixelify Sans', sans-serif;
      font-size: 20px;
      color: white;
      margin: 8px 0;
      text-shadow: 0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.4);
    }
    .global-no-monedass-content .monedas-necesarias {
      color: #ffd700 !important;
      margin-top: 15px !important;
      text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.6);
    }
    .global-no-monedass-content .monedas-necesarias span {
      font-family: 'Press Start 2P', cursive;
      font-size: 18px;
      text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.6);
    }
    #overlay-timer-text {
      font-family: 'Press Start 2P', cursive;
      font-size: 12px;
      color: #00ff00;
      text-shadow: 0 0 20px rgba(0, 255, 0, 1), 0 0 40px rgba(0, 255, 0, 0.6);
    }
  `;
  document.head.appendChild(style);
}

function mostrarOverlayGlobal(cantidadNecesaria) {
  crearOverlayGlobal();
  const overlay = document.getElementById('global-no-monedas-overlay');
  const necesidadesEl = document.getElementById('overlay-monedas-necesarias');
  const timerEnd = getTimerEnd();
  const monedas = _getCache();

  if (monedas >= cantidadNecesaria) return;

  if (overlay && necesidadesEl) {
    necesidadesEl.textContent = cantidadNecesaria;
    overlay.classList.add('visible');

    if (typeof __ === 'function') {
      const lang = (typeof config !== 'undefined' && config.idioma) || 'es';
      const titulo = document.getElementById('no-coins-title');
      const desc = document.getElementById('no-coins-desc');
      const needed = document.getElementById('no-coins-needed');
      if (titulo) titulo.textContent = lang === 'en' ? 'No coins!' : '¡Sin monedas!';
      if (desc) desc.textContent = lang === 'en' ? "You don't have enough coins to bet." : 'No tienes suficientes monedas para apostar.';
      if (needed) needed.textContent = (lang === 'en' ? 'Coins needed: ' : 'Monedas necesarias: ') + cantidadNecesaria;
    }

    if (timerEnd > 0) {
      const restante = timerEnd - Date.now();
      if (restante > 0) {
        actualizarNoMonedasOverlay(restante);
      } else {
        overlay.classList.remove('visible');
      }
    } else {
      const overlayTimer = document.getElementById('overlay-timer-text');
      if (overlayTimer) overlayTimer.style.display = 'none';
    }

    setTimeout(() => {
      overlay.classList.remove('visible');
    }, 3000);
  }
}

function verificarMonedas(cantidad) {
  return _getCache() >= cantidad;
}

function mostrarAnimacionMonedas(valor, positivo) {
  const fb = document.createElement("div");
  fb.className = "feedback-monedas " + (positivo ? "positivo" : "negativo");
  fb.textContent = (positivo ? "+" : "-") + Math.abs(valor);

  const icono = document.querySelector('.monedas-ui img');
  if (icono) {
    const rect = icono.getBoundingClientRect();
    fb.style.left = (rect.left + 10) + 'px';
    fb.style.top = (rect.bottom + 3) + 'px';
  } else {
    fb.style.right = '180px';
    fb.style.top = '40px';
  }

  document.body.appendChild(fb);
  fb.addEventListener('animationend', function() {
    fb.remove();
  });
}

function actualizarUI() {
  const monedas = _getCache();
  const ids = ["cantidad-monedas", "cantidad-monedasm", "cantidad-monedAS", "cantidad-monedass", "coins-balance"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = monedas;
  });

  const icono = document.querySelector('.monedas-ui img');
  if (icono) {
    if (monedas === 0) {
      icono.src = icono.dataset.srcVacio || "../../resources/assets/yukonocoins.png";
    } else {
      icono.src = icono.dataset.srcLleno || "../../resources/assets/yukocoins.png";
    }
  }

  crearElementosUI();
}

// ─── API expuesta para config.js / juegos ──────────────────────
window.coinsAPI = {
  get: getMonedas,
  fetch: fetchMonedas,
  reclaimFree: () => window.apiRpc?.reclamarRecargaGratis(),
  timer: {
    start: iniciarTimerCoins,
    check: verificarTimerCoins,
    getEnd: getTimerEnd,
    setEnd: setTimerEnd
  },
  ui: {
    update: actualizarUI,
    showOverlay: mostrarOverlayGlobal,
    hideTimer: ocultarTimerUI
  }
};

// ─── Init (inicialización correcta para auth vs guest) ──────────
document.addEventListener("DOMContentLoaded", async () => {
  crearElementosUI();
  crearOverlayGlobal();

  const timerEnd = getTimerEnd();
  const monedas = _getCache();

  if (monedas === 0 && timerEnd > 0) {
    const restante = timerEnd - Date.now();
    if (restante <= 0) {
      await verificarTimerCoins(); // async, llama RPC si hay apiRpc
    } else {
      if (!timerInterval) {
        timerInterval = setInterval(actualizarTimerUI, 1000);
      }
      actualizarTimerUI();
    }
  } else if (monedas === 0 && timerEnd === 0) {
    // No asumir 200. Para autenticado, se cargará via fetchMonedas().
    // Para invitado, se mantiene comportamiento legacy (200 inicial).
    if (!await _isAuthenticated()) {
      _setCache(200);
    }
    const endTime = Date.now() + TIMER_DURATION;
    localStorage.setItem(TIMER_KEY, endTime);
    if (!timerInterval) {
      timerInterval = setInterval(actualizarTimerUI, 1000);
    }
    actualizarTimerUI();
  } else if (monedas > 0) {
    localStorage.setItem(TIMER_KEY, 0);
  }

  // Autenticado: SIEMPRE forzar fetch real del saldo, sin importar si la
  // caché local ya tenía un valor (>0) de una sesión/pestaña/dispositivo
  // anterior — de lo contrario se muestra un saldo desactualizado hasta
  // la próxima operación económica. Invitado: se mantiene la UI con caché
  // local (no hay saldo real en Supabase que consultar).
  if (await _isAuthenticated()) {
    await fetchMonedas();
  } else {
    actualizarUI();
  }
});

// ─── Helpers legacy (compatibilidad) ───────────────────────────
function setMonedas(valor) { _setCache(valor); actualizarUI(); }