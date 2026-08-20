// monedas.js (GLOBAL)

const MONEDAS_KEY = "monedas";
const TIMER_KEY = "coinsTimer";
const TIMER_DURATION = 2 * 60 * 60 * 1000;
let timerInterval = null;

function getMonedas() {
  var v = localStorage.getItem(MONEDAS_KEY);
  if (v === null) {
    localStorage.setItem(MONEDAS_KEY, 200);
    return 200;
  }
  return parseInt(v) || 0;
}

function setMonedas(valor) {
  localStorage.setItem(MONEDAS_KEY, valor);
  actualizarUI();
  if (typeof sincronizarMonedasConUsuario === 'function') {
    sincronizarMonedasConUsuario();
  }
}

function cambiarMonedas(cantidad) {
  let actual = getMonedas();
  actual += cantidad;
  if (actual < 0) actual = 0;
  setMonedas(actual);
  
  // Mostrar animación si es un cambio negativo (pérdida)
  if (cantidad < 0) {
    if (typeof mostrarAnimacionMonedas === 'function') {
      mostrarAnimacionMonedas(cantidad, false);
    }
  } else if (cantidad > 0) {
    if (typeof mostrarAnimacionMonedas === 'function') {
      mostrarAnimacionMonedas(cantidad, true);
    }
  }
  
  if (actual === 0) {
    const timerEnd = getTimerEnd();
    if (timerEnd === 0) {
      verificarTimerCoins();
    }
  }
}

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

function verificarTimerCoins() {
  const monedas = getMonedas();
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
      localStorage.setItem(MONEDAS_KEY, 10);
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

function agregarMonedas(cantidad) {
  cambiarMonedas(cantidad);
}

function descontarMonedas(cantidad) {
  cambiarMonedas(-cantidad);
}

function actualizarTimerUI() {
  const timerEnd = getTimerEnd();
  const monedas = getMonedas();
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
    localStorage.setItem(MONEDAS_KEY, 10);
    localStorage.setItem(TIMER_KEY, 0);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerEl) {
      timerEl.style.display = 'none';
      timerEl.textContent = '';
    }
    actualizarUI();
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

let overlayRestanteCallback = null;
function actualizarNoMonedasOverlay(restante) {
  const overlayTimer = document.getElementById('overlay-timer-text');
  if (!overlayTimer) return;
  
  if (getMonedas() >= 5) {
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
  const monedas = getMonedas();

  if (monedas >= cantidadNecesaria) {
    return;
  }

  if (overlay && necesidadesEl) {
    necesidadesEl.textContent = cantidadNecesaria;
    overlay.classList.add('visible');

    // Actualizar textos según idioma
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
  return getMonedas() >= cantidad;
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
  const monedas = getMonedas();
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

document.addEventListener("DOMContentLoaded", () => {
  crearElementosUI();
  crearOverlayGlobal();
  
  const timerEnd = getTimerEnd();
  const monedas = getMonedas();
  
  if (monedas === 0 && timerEnd > 0) {
    const restante = timerEnd - Date.now();
    if (restante <= 0) {
      localStorage.setItem(MONEDAS_KEY, 10);
      localStorage.setItem(TIMER_KEY, 0);
      actualizarUI();
    } else {
      if (!timerInterval) {
        timerInterval = setInterval(actualizarTimerUI, 1000);
      }
      actualizarTimerUI();
    }
  } else if (monedas === 0 && timerEnd === 0) {
    const endTime = Date.now() + TIMER_DURATION;
    localStorage.setItem(TIMER_KEY, endTime);
    if (!timerInterval) {
      timerInterval = setInterval(actualizarTimerUI, 1000);
    }
    actualizarTimerUI();
  } else if (monedas > 0) {
    localStorage.setItem(TIMER_KEY, 0);
  }
  
  actualizarUI();
});