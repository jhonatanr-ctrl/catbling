const bgMusic = document.getElementById("bgMusic");

document.addEventListener("click", () => {
  if (bgMusic && bgMusic.paused) {
    bgMusic.muted = false;
    bgMusic.play().catch(err => console.log("No se pudo reproducir música:", err));
  }
}, { once: true });

const ICONS = [
  "./resources/assets/cereza-removebg-preview.png",
  "./resources/assets/coin.png",
  "./resources/assets/corona.png",
  "./resources/assets/moscadorada.png",
  "./resources/assets/moscanormal.png",
  "./resources/assets/musa-removebg-preview.png",
  "./resources/assets/numero7.png",
  "./resources/assets/tanque-removebg-preview.png",
  "./resources/assets/moneybag.png",
  "./resources/assets/diceicon.png",
  "./resources/assets/bag.png",
  "./resources/assets/playcoinicon.png"
];

const NIVELES = [
  { pares: 4,  mult: 2,  label: "FÁCIL",   rows: 2, cols: 4 },
  { pares: 6,  mult: 3,  label: "NORMAL",  rows: 2, cols: 6 },
  { pares: 8,  mult: 4,  label: "DIFÍCIL", rows: 4, cols: 4 },
  { pares: 10, mult: 6,  label: "EXPERTO", rows: 2, cols: 10 },
  { pares: 12, mult: 8,  label: "LEYENDA", rows: 3, cols: 8 }
];

// helper
const getMovMax = p => p * 2 - 1;
let nivelActual = 0;
var nivelMaxDesbloqueado = parseInt(localStorage.getItem('memoria_nivel_max')) || 0;

function guardarNivelDesbloqueado(nivel) {
  if (nivel > nivelMaxDesbloqueado) {
    nivelMaxDesbloqueado = nivel;
    localStorage.setItem('memoria_nivel_max', nivel);
  }
}
let apuestaActual = 20;
const MIN_APUESTA = 7;
const MAX_APUESTA = 500;
let moves = 0;
let juegoIniciado = false;
let flippedCards = [];
let lockBoard = false;
let pairsFound = 0;
let totalPairs;

const movesSpan = document.getElementById("moves");
const restartBtn = document.getElementById("restart-button");
const restartText = restartBtn ? restartBtn.querySelector(".restart-text") : null;

function initApuestaInput() {
    const input = document.getElementById('bet-input');
    const display = document.getElementById('apuesta-actual');
    if (!input) return;
    const min = 7;
    const max = 500;
    function sync(finalize) {
        input.max = max; input.min = min;
        var n = parseInt(input.value, 10);
        if (isNaN(n)) n = finalize ? min : apuestaActual;
        if (finalize) { n = Math.max(min, Math.min(max, n)); input.value = n; }
        apuestaActual = n;
        if (display) display.textContent = apuestaActual;
    }
    input.addEventListener('input', function () { sync(false); });
    input.addEventListener('change', function () { sync(true); });
    input.addEventListener('blur', function () { sync(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { sync(true); input.blur(); } });
    sync(true);
}

function updateMovesColor() {
  if (!movesSpan) return;
  if (moves <= 5) {
    movesSpan.style.color = "#00ff00";
    movesSpan.style.textShadow = "0 0 10px rgba(0, 255, 0, 0.8)";
  } else if (moves <= 10) {
    const ratio = (moves - 5) / 5;
    const r = Math.round(255 * ratio);
    movesSpan.style.color = `rgb(${r}, 255, 0)`;
    movesSpan.style.textShadow = `0 0 10px rgba(${r}, 255, 0, 0.8)`;
  } else if (moves <= 14) {
    const ratio = (moves - 10) / 4;
    const g = Math.round(255 * (1 - ratio));
    movesSpan.style.color = `rgb(255, ${g}, 0)`;
    movesSpan.style.textShadow = `0 0 10px rgba(255, ${g}, 0, 0.8)`;
  } else {
    movesSpan.style.color = "#ff0000";
    movesSpan.style.textShadow = "0 0 10px rgba(255, 0, 0, 0.8)";
  }
}

function addMove() {
  moves++;
  if (movesSpan) { movesSpan.textContent = moves; updateMovesColor(); }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updateBoardLayout() {
  const board = document.getElementById("game-board");
  if (!board) return;
  const cards = board.querySelectorAll(".card");
  if (cards.length === 0) return;
  const nivel = NIVELES[nivelActual];

  if (nivelActual === 2) {
    board.style.gridTemplateColumns = 'repeat(8, 80px)';
    board.style.gridTemplateRows = 'repeat(2, 120px)';
    board.style.gap = '8px';
    cards.forEach(c => {
      c.style.width = '80px';
      c.style.height = '120px';
    });
    return;
  }

  const cols = nivel.cols;
  const rows = nivel.rows;
  const nivelesW = 220;
  const coinUIW = 180;
  const betBarH = 120;
  const headerH = 260;
  const pad = 20;
  const availW = window.innerWidth - nivelesW - coinUIW - pad * 2;
  const availH = window.innerHeight - headerH - betBarH - pad * 2;
  if (availW <= 0 || availH <= 0) return;
  const ASPECT = 2 / 3;
  const gap = 8;
  const maxWByWidth = (availW - (cols - 1) * gap) / cols;
  const maxHByHeight = (availH - (rows - 1) * gap) / rows;
  const maxWByHeight = maxHByHeight * ASPECT;
  let cardW = Math.min(maxWByWidth, maxWByHeight);
  const limits = [
    { min: 85,  max: 160 },
    { min: 75,  max: 140 },
    { min: 50,  max: 120 },
    { min: 80,  max: 100 },
    { min: 55,  max: 130 }
  ];
  const lim = limits[nivelActual] || { min: 45, max: 130 };
  cardW = Math.max(lim.min, Math.min(lim.max, cardW));
  const cardH = cardW / ASPECT;
  board.style.gridTemplateColumns = `repeat(${cols}, ${cardW}px)`;
  board.style.gridTemplateRows = `repeat(${rows}, ${cardH}px)`;
  board.style.gap = gap + "px";
  cards.forEach(c => {
    c.style.width = cardW + "px";
    c.style.height = cardH + "px";
  });
}

function generarCartas() {
  const board = document.getElementById("game-board");
  if (!board) return;
  board.innerHTML = "";
  const nivel = NIVELES[nivelActual];
  const numPares = nivel.pares;
  const elegidos = ICONS.slice(0, numPares);
  let pares = [];
  elegidos.forEach(src => { pares.push(src, src); });
  shuffleArray(pares);
  pares.forEach(src => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">
          <img src="${src}" class="card-icon">
        </div>
      </div>`;
    board.appendChild(card);
  });
  updateBoardLayout();
}

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (!juegoIniciado) updateBoardLayout();
  }, 150);
});

function initNiveles() {
  const lista = document.getElementById("niveles-lista");
  if (!lista) return;
  lista.innerHTML = "";
  NIVELES.forEach((n, i) => {
    const bloqueado = i > nivelMaxDesbloqueado;
    const div = document.createElement("div");
    div.className = "nivel-item" + (i === nivelActual ? " active" : "") + (bloqueado ? " locked" : "");
    div.innerHTML = bloqueado
      ? '<span class="nivel-num">' + (i + 1) + '. ' + n.label + ' 🔒</span>'
      : '<span class="nivel-num">' + (i + 1) + '. ' + n.label + '</span>' +
        '<span class="nivel-info">' + n.pares + ' pares / ' + getMovMax(n.pares) + ' mov</span>' +
        '<span class="nivel-premio">x' + n.mult + '</span>';
    div.onclick = function() {
      if (juegoIniciado || bloqueado) return;
      nivelActual = i;
      document.querySelectorAll(".nivel-item").forEach(function(el) { el.classList.remove("active"); });
      div.classList.add("active");
      generarCartas();
      moves = 0;
      pairsFound = 0;
      if (movesSpan) { movesSpan.textContent = "0"; updateMovesColor(); }
      var inst = document.getElementById("instruccion-text");
      if (inst) inst.textContent = '¡Encuentra ' + n.pares + ' pares en menos de ' + getMovMax(n.pares) + ' movimientos!';
    };
    lista.appendChild(div);
  });
}

function iniciarJuego() {
  const cards = document.querySelectorAll(".card");
  if (cards.length === 0) return;
  flippedCards = [];
  lockBoard = false;
  moves = 0;
  pairsFound = 0;
  if (movesSpan) { movesSpan.textContent = moves; updateMovesColor(); }
  totalPairs = cards.length / 2;
  const icons = Array.from(cards).map(c => c.querySelector(".card-icon").src);
  shuffleArray(icons);
  cards.forEach((card, i) => {
    card.classList.remove("flipped");
    const iconImg = card.querySelector(".card-icon");
    if (iconImg) iconImg.src = icons[i];
    card.onclick = () => flipCard(card);
  });
}

function flipCard(card) {
  if (lockBoard) return;
  if (card.classList.contains("flipped")) return;
  if (!juegoIniciado) return;
  card.classList.add("flipped");
  flippedCards.push(card);
  if (flippedCards.length === 2) { addMove(); checkMatch(); }
}

function checkMatch() {
  const [card1, card2] = flippedCards;
  const icon1 = card1.querySelector(".card-icon").src;
  const icon2 = card2.querySelector(".card-icon").src;
  if (icon1 === icon2) {
    pairsFound++;
    flippedCards = [];
    if (pairsFound === totalPairs) setTimeout(endGame, 800);
  } else {
    lockBoard = true;
    setTimeout(() => {
      card1.classList.remove("flipped");
      card2.classList.remove("flipped");
      flippedCards = [];
      lockBoard = false;
    }, 1000);
  }
}

function endGame() {
  if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();
  const nivel = NIVELES[nivelActual];
  const winOverlay = document.getElementById("win-overlay");
  const loseOverlay = document.getElementById("lose-overlay");
  const winAmount = document.getElementById("win-amount");
  const gameBoard = document.getElementById("game-board");
  const topBar = document.querySelector(".top-bar");
  const apuestaContainer = document.querySelector(".apuesta-container");
  var maxMovPermitido = getMovMax(nivel.pares);
  if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
    maxMovPermitido += 2;
    window.consumirAjusteFino();
  }
  const gano = moves <= maxMovPermitido;
  var gananciaNeta = 0;
  var resultadoMonedas = 0;

  if (gano) {
    gananciaNeta = apuestaActual * nivel.mult;
    if (typeof window.calcularGananciaConItems === 'function') gananciaNeta = window.calcularGananciaConItems(gananciaNeta, apuestaActual);
    const resultadoMonedas = apuestaActual + gananciaNeta; // premio bruto
    
    if (winOverlay) {
      winOverlay.classList.add("active");
      if (winAmount) winAmount.textContent = "+" + gananciaNeta;
    }
    guardarNivelDesbloqueado(nivelActual + 1);
    setTimeout(initNiveles, 3200);
  } else {
    if (loseOverlay) loseOverlay.classList.add("active");
  }
  if (gameBoard) gameBoard.classList.add("hidden");
  if (topBar) topBar.classList.add("hidden");
  if (apuestaContainer) apuestaContainer.classList.add("hidden");
  setTimeout(() => {
    if (winOverlay) winOverlay.classList.remove("active");
    if (loseOverlay) loseOverlay.classList.remove("active");
    if (gameBoard) gameBoard.classList.remove("hidden");
    if (topBar) topBar.classList.remove("hidden");
    if (apuestaContainer) apuestaContainer.classList.remove("hidden");
    juegoIniciado = false;
    if (restartText) restartText.textContent = "JUGAR";
    const cards = document.querySelectorAll(".card");
    cards.forEach(card => card.classList.remove("flipped"));
    actualizarUI();
  }, 3000);

  // Registrar en Supabase via RPC
  if (window.apiRpc && window.apiRpc.registrarSesionCasino) {
    window.apiRpc.registrarSesionCasino('emparejar_pares', apuestaActual, gano ? apuestaActual + gananciaNeta : 0, gano).then(function(r) {
      if (r.success) {
        // registrar_sesion_casino no devuelve nuevo_saldo (TABLE(ok,id) unicamente).
        // Se consulta el saldo real via coinsAPI.fetch() en vez de leer un campo
        // que la RPC nunca retorna.
        if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
          window.coinsAPI.fetch();
        } else if (typeof fetchMonedas === 'function') {
          fetchMonedas();
        }
      }
    }).catch(function(e) { console.warn('[memoria] Error registrando partida:', e); });
  } else {
    // Fallback local
    if (gano) {
      if (typeof agregarMonedas === 'function') agregarMonedas(gananciaNeta);
    } else {
      if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
    }
    actualizarUI();
  }
}

function mostrarOverlayNoMonedas() {
  if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(apuestaActual);
}

function handleRestartClick() {
  if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
    requerirAutenticacion();
    return;
  }

  // Dispatch event to sync input value
  var _bi = document.getElementById('bet-input'); if (_bi) _bi.dispatchEvent(new Event('change'));

  if (!juegoIniciado) {
    if (typeof getMonedas === 'function') {
      const monedas = getMonedas();
      if (monedas < MIN_APUESTA) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuestaActual)) {
          // Crédito Temporal cubre la diferencia
        } else {
          mostrarOverlayNoMonedas();
          return;
        }
      }
      var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuestaActual) : apuestaActual;
      if (deduccion > 0 && typeof descontarMonedas === 'function') descontarMonedas(deduccion);
    }
    juegoIniciado = true;
    if (restartText) restartText.textContent = "REINICIAR";
    iniciarJuego();
  } else {
    const cards = document.querySelectorAll(".card");
    cards.forEach(card => card.classList.remove("flipped"));
    moves = 0; pairsFound = 0;
    if (movesSpan) { movesSpan.textContent = moves; updateMovesColor(); }
    setTimeout(() => {
      const board = document.getElementById("game-board");
      if (board) {
        const shuffled = Array.from(cards).sort(() => Math.random() - 0.5);
        board.innerHTML = "";
        shuffled.forEach(card => board.appendChild(card));
        iniciarJuego();
      }
    }, 300);
  }
}

if (restartBtn) restartBtn.addEventListener("click", handleRestartClick);

document.addEventListener("DOMContentLoaded", () => {
  if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
    requerirAutenticacion();
    return;
  }
  initApuestaInput();
  initNiveles();
  generarCartas();
  if (typeof getMonedas === 'function') actualizarUI();
    if (typeof tutorialInit === 'function') tutorialInit();
  juegoIniciado = false;
  if (movesSpan) { movesSpan.textContent = "0"; updateMovesColor(); }
  const inst = document.getElementById("instruccion-text");
  if (inst) inst.textContent = `¡Encuentra ${NIVELES[nivelActual].pares} pares en menos de ${getMovMax(NIVELES[nivelActual].pares)} movimientos!`;
  const menuImg = document.getElementById("menu-img");
  const menuBtn = document.querySelector(".menu-button");
  if (menuBtn && menuImg) {
    let timeout1, timeout2;
    menuBtn.addEventListener("mouseenter", () => {
      clearTimeout(timeout1); clearTimeout(timeout2);
      timeout1 = setTimeout(() => { menuImg.src = "../../juegos/assets/salida2.png"; }, 100);
      timeout2 = setTimeout(() => { menuImg.src = "../../juegos/assets/salida3.png"; }, 300);
    });
    menuBtn.addEventListener("mouseleave", () => {
      clearTimeout(timeout1); clearTimeout(timeout2);
      menuImg.src = "../../juegos/assets/salida3.png";
      timeout1 = setTimeout(() => { menuImg.src = "../../juegos/assets/salida2.png"; }, 100);
      timeout2 = setTimeout(() => { menuImg.src = "../../juegos/assets/salida1.png"; }, 300);
    });
  }
  const btn = document.getElementById("btn-opciones");
  const menu = document.getElementById("menu-opciones");
  const overlay = document.getElementById("overlay-menu");
  const cerrar = document.getElementById("cerrar-menu");
  if (btn && menu && overlay && cerrar) {
    btn.onclick = () => { menu.classList.add("active"); overlay.classList.add("active"); };
    cerrar.onclick = () => { menu.classList.remove("active"); overlay.classList.remove("active"); };
  }
});

window.addEventListener("storage", () => { actualizarUI(); });