const ROULETTE_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];

const RED_NUMBERS = [1, 3, 5, 7, 9, 11, 14, 16, 18, 20, 22, 24, 25, 27, 29, 31, 33, 35];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 12, 13, 15, 17, 19, 21, 23, 26, 28, 30, 32, 34, 36];

const RED_NUMBERSROULETTE = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
const BLACK_NUMBERSROULETTE = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36];

const APUESTA_LIMITES = {
    none: 6,
    column: 18,
    color: 25
};

let selectedNumbers = new Set();
let selectedColumn = null;
let selectedColor = null;
let tipoSeleccion = 'none';
let isSpinning = false;
let apuesta = 6;
let currentRotation = 0;

let canvas, ctx;

function initRouletteTable() {
    const grid = document.getElementById('numbers-grid-rotated');
    if (!grid) return;

    grid.innerHTML = '';

    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 3; col++) {
            const num = col * 12 + row + 1;
            if (num <= 36) {
                const cell = document.createElement('div');
                cell.className = `number-cell ${RED_NUMBERS.includes(num) ? 'red' : 'black'}`;
                cell.textContent = num;
                cell.dataset.number = num;
                cell.dataset.row = row;
                cell.dataset.col = col;

                cell.addEventListener('click', () => toggleNumber(num));
                cell.addEventListener('mouseenter', () => highlightNumber(num, true));
                cell.addEventListener('mouseleave', () => highlightNumber(num, false));

                grid.appendChild(cell);
            }
        }
    }

    const zeroCell = document.querySelector('.zero-cell');
    if (zeroCell) {
        zeroCell.addEventListener('click', () => toggleNumber(0));
        zeroCell.addEventListener('mouseenter', () => {
            zeroCell.style.textShadow = '0 0 15px rgba(255, 255, 255, 0.9)';
        });
        zeroCell.addEventListener('mouseleave', () => {
            if (!selectedNumbers.has(0)) {
                zeroCell.style.textShadow = 'none';
            }
        });
    }
}

function toggleNumber(num) {
    if (selectedNumbers.has(num)) {
        selectedNumbers.delete(num);
    } else {
        selectedNumbers.add(num);
    }
    updateVisualSelection();
    actualizarLimiteApuesta();
    actualizarContadorSeleccion();
}

function highlightNumber(num, highlight) {
    const cell = document.querySelector(`.number-cell[data-number="${num}"]`);
    if (cell) {
        cell.classList.toggle('hover-highlight', highlight);
    }
}

function actualizarContadorSeleccion() {
    const el = document.getElementById('selected-count');
    if (el) el.textContent = selectedNumbers.size + ' números seleccionados';
}

function clearAllSelections() {
    selectedColumn = null;
    selectedColor = null;
    selectedNumbers.clear();

    document.querySelectorAll('.column-btn, .color-btn').forEach(btn => btn.classList.remove('selected'));

    document.querySelectorAll('.number-cell').forEach(cell => {
        cell.classList.remove('selected', 'hover-highlight');
        cell.style.textShadow = '';
        cell.style.border = '';
        cell.style.boxShadow = '';
    });

    const zeroCell = document.querySelector('.zero-cell');
    if (zeroCell) {
        zeroCell.classList.remove('selected', 'hover-highlight');
        zeroCell.style.textShadow = 'none';
        zeroCell.style.border = '';
        zeroCell.style.boxShadow = '';
    }
    actualizarContadorSeleccion();
}

function initColumns() {
    const columnBtns = document.querySelectorAll('.column-btn');
    columnBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const column = btn.dataset.column;
            if (selectedColumn === column) {
                clearAllSelections();
                tipoSeleccion = 'none';
            } else {
                clearAllSelections();
                selectedColumn = column;
                btn.classList.add('selected');
                tipoSeleccion = 'column';
            }
            actualizarLimiteApuesta();
            updateSelectedNumbersFromGroups();
        });

        btn.addEventListener('mouseenter', () => {
            if (selectedColumn !== btn.dataset.column) highlightColumn(btn.dataset.column, true);
            mostrarLimiteTemp('column');
        });
        btn.addEventListener('mouseleave', () => {
            if (selectedColumn !== btn.dataset.column) highlightColumn(btn.dataset.column, false);
            ocultarLimiteTemp();
        });
    });
}

function highlightColumn(column, highlight) {
    const colIndex = parseInt(column) - 1;
    for (let row = 0; row < 12; row++) {
        const num = colIndex * 12 + row + 1;
        if (num <= 36) {
            const cell = document.querySelector(`.number-cell[data-number="${num}"]`);
            if (cell) cell.classList.toggle('hover-highlight', highlight);
        }
    }
}

function getColumnNumbers(column) {
    const colIndex = parseInt(column) - 1;
    const nums = [];
    for (let row = 0; row < 12; row++) {
        const num = colIndex * 12 + row + 1;
        if (num <= 36) nums.push(num);
    }
    return nums;
}

function initColorButtons() {
    const btnRojo = document.getElementById('btn-rojo');
    const btnNegro = document.getElementById('btn-negro');

    if (btnRojo) {
        btnRojo.addEventListener('click', () => toggleColor('red'));
        btnRojo.addEventListener('mouseenter', () => {
            if (selectedColor !== 'red') highlightColor('red', true);
            mostrarLimiteTemp('color');
        });
        btnRojo.addEventListener('mouseleave', () => {
            if (selectedColor !== 'red') highlightColor('red', false);
            ocultarLimiteTemp();
        });
    }

    if (btnNegro) {
        btnNegro.addEventListener('click', () => toggleColor('black'));
        btnNegro.addEventListener('mouseenter', () => {
            if (selectedColor !== 'black') highlightColor('black', true);
            mostrarLimiteTemp('color');
        });
        btnNegro.addEventListener('mouseleave', () => {
            if (selectedColor !== 'black') highlightColor('black', false);
            ocultarLimiteTemp();
        });
    }
}

function toggleColor(color) {
    if (selectedColor === color) {
        clearAllSelections();
        tipoSeleccion = 'none';
    } else {
        clearAllSelections();
        selectedColor = color;
        const btnRojo = document.getElementById('btn-rojo');
        const btnNegro = document.getElementById('btn-negro');
        if (btnRojo) btnRojo.classList.toggle('selected', color === 'red');
        if (btnNegro) btnNegro.classList.toggle('selected', color === 'black');
        tipoSeleccion = 'color';
    }
    actualizarLimiteApuesta();
    updateSelectedNumbersFromGroups();
}

function highlightColor(color, highlight) {
    const numbers = color === 'red' ? RED_NUMBERS : BLACK_NUMBERS;
    numbers.forEach(num => {
        const cell = document.querySelector(`.number-cell[data-number="${num}"]`);
        if (cell) cell.classList.toggle('hover-highlight', highlight);
    });
}

function actualizarLimiteApuesta() {
    const base = APUESTA_LIMITES[tipoSeleccion] || 6;
    const minimo = Math.max(base, Math.ceil(selectedNumbers.size * 2));

    const minEl = document.querySelector('.apuesta-min');
    if (minEl) minEl.textContent = minimo;

    const input = document.getElementById('bet-input');
    if (input) input.min = minimo;

    if (apuesta < minimo) {
        apuesta = minimo;
        const apuestaActualEl = document.getElementById('apuesta-actual');
        if (apuestaActualEl) apuestaActualEl.textContent = apuesta;
    }
}

function mostrarLimiteTemp(tipo) {
    if (tipoSeleccion !== tipo) {
        const minEl = document.querySelector('.apuesta-min');
        if (minEl) minEl.textContent = APUESTA_LIMITES[tipo];
    }
}

function ocultarLimiteTemp() {
    const minEl = document.querySelector('.apuesta-min');
    if (minEl) minEl.textContent = APUESTA_LIMITES[tipoSeleccion];
}

function updateSelectedNumbersFromGroups() {
    selectedNumbers.clear();

    document.querySelectorAll('.number-cell').forEach(cell => cell.classList.remove('selected'));

    const zeroCell = document.querySelector('.zero-cell');
    if (zeroCell) {
        zeroCell.classList.remove('selected');
        zeroCell.style.textShadow = 'none';
    }

    if (selectedColumn) {
        const nums = getColumnNumbers(selectedColumn);
        nums.forEach(num => {
            selectedNumbers.add(num);
            const cell = document.querySelector(`.number-cell[data-number="${num}"]`);
            if (cell) cell.classList.add('selected');
        });
    }

    if (selectedColor) {
        const colorNums = selectedColor === 'red' ? [...RED_NUMBERS] : [...BLACK_NUMBERS];
        colorNums.forEach(num => {
            selectedNumbers.add(num);
            const cell = document.querySelector(`.number-cell[data-number="${num}"]`);
            if (cell) cell.classList.add('selected');
        });
    }
    actualizarContadorSeleccion();
}

function updateVisualSelection() {
    document.querySelectorAll('.number-cell').forEach(cell => {
        const num = parseInt(cell.dataset.number);
        cell.classList.toggle('selected', selectedNumbers.has(num));
    });

    const zeroCell = document.querySelector('.zero-cell');
    if (zeroCell) {
        zeroCell.classList.toggle('selected', selectedNumbers.has(0));
        zeroCell.style.textShadow = selectedNumbers.has(0) ? '0 0 15px rgba(255, 255, 255, 0.9)' : 'none';
    }
}

function initPixelRoulette() {
    canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    canvas.width = 494;
    canvas.height = 494;

    drawPixelRoulette(0);
}

function drawPixelRoulette(rotation) {
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 25;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const segmentAngle = (Math.PI * 2) / 37;

    for (let i = 0; i < 37; i++) {
        const angle = i * segmentAngle - Math.PI / 2 - segmentAngle / 2;
        const num = ROULETTE_NUMBERS[i];

        let fillColor;
        if (num === 0) {
            fillColor = '#009933';
        } else if (RED_NUMBERSROULETTE.includes(num)) {
            fillColor = '#cc0000';
        } else {
            fillColor = '#1a1a1a';
        }

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, angle - segmentAngle / 2, angle + segmentAngle / 2);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(angle);
        ctx.translate(radius - 28, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), 0, 0);
        ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 6);
    ctx.lineTo(cx - 15, cy - radius - 25);
    ctx.lineTo(cx + 15, cy - radius - 25);
    ctx.closePath();
    ctx.fill();
}

function spinRoulette() {
    if (isSpinning) return;
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }

    // Dispatch event to sync input value
    var _bi = document.getElementById('bet-input'); if (_bi) _bi.dispatchEvent(new Event('change'));

    const currentCoins = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas') || '0');
    if (currentCoins < apuesta) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuesta)) {
            // Crédito Temporal cubre la diferencia
        } else {
            mostrarNoMonedasOverlay(apuesta);
            return;
        }
    }

    if (selectedNumbers.size === 0) {
        const resultText = document.getElementById('result-text');
        if (resultText) {
            resultText.textContent = '¡Selecciona al menos un número!';
            resultText.className = '';
        }
        return;
    }

    // Ajuste Fino: añade un número oculto extra para mejorar probabilidad
    var ajusteFinoBonus = false;
    if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
        var bonusNum = Math.floor(Math.random() * 37);
        selectedNumbers.add(bonusNum);
        ajusteFinoBonus = true;
        window.consumirAjusteFino();
    }

    isSpinning = true;
    const spinBtn = document.getElementById('spin-button');
    if (spinBtn) spinBtn.disabled = true;

    const resultText = document.getElementById('result-text');
    if (resultText) {
        resultText.textContent = '¡Girando...!';
        resultText.className = '';
    }

    if (_isAuthenticatedSync()) {
        // Para autenticados, NO descontar aquí - la RPC lo hará atómicamente
    } else {
        if (typeof descontarMonedas === 'function') {
            var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuesta) : apuesta;
            if (deduccion > 0) descontarMonedas(deduccion);
        }
    }
    if (typeof actualizarUI === 'function') actualizarUI();

    const targetRotation = currentRotation + Math.random() * 360 + 720;
    const duration = 3000;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        currentRotation = (targetRotation * easeOut) * (Math.PI / 180);
        drawPixelRoulette(currentRotation);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin();
        }
    }

    animate();
}

function finishSpin() {
    isSpinning = false;
    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();
    const spinBtn = document.getElementById('spin-button');
    if (spinBtn) spinBtn.disabled = false;

    const normalizedRotation = (Math.PI * 2 - (currentRotation % (Math.PI * 2))) % (Math.PI * 2);
    const segmentAngle = (Math.PI * 2) / 37;
    let winningIndex = Math.round((normalizedRotation + segmentAngle / 2) / segmentAngle);
    winningIndex = winningIndex % 37;
    const winningNumber = ROULETTE_NUMBERS[winningIndex];

    let gano = false;
    let winType = '';

    if (selectedColumn) {
        const colIndex = parseInt(selectedColumn) - 1;
        const columnNumbers = [];
        for (let row = 0; row < 12; row++) {
            const num = colIndex * 12 + row + 1;
            if (num <= 36) columnNumbers.push(num);
        }
        if (columnNumbers.includes(winningNumber)) {
            gano = true;
            winType = 'column';
        }
    } else if (selectedColor) {
        if (selectedColor === 'red' && RED_NUMBERS.includes(winningNumber)) {
            gano = true;
            winType = 'color';
        } else if (selectedColor === 'black' && BLACK_NUMBERS.includes(winningNumber)) {
            gano = true;
            winType = 'color';
        }
    } else if (selectedNumbers.has(winningNumber)) {
        gano = true;
        winType = 'number';
    }

    const resultText = document.getElementById('result-text');
    if (resultText) {
        if (gano) {
            var payout = calculatePayout(winningNumber, winType);
            if (typeof window.calcularGananciaConItems === 'function') payout = window.calcularGananciaConItems(payout, apuesta);
            resultText.textContent = `¡GANASTE! Número: ${winningNumber}`;
            resultText.className = 'ganaste';
            setTimeout(() => showWinOverlay(payout), 500);
        } else {
            resultText.textContent = `¡PERDISTE! Número: ${winningNumber}`;
            resultText.className = 'perdiste';
            setTimeout(() => showLoseOverlay(), 500);
        }
    }

    if (typeof actualizarUI === 'function') actualizarUI();

    var gananciaNeta = gano ? payout - apuesta : 0;
    var resultadoMonedas = gano ? payout : 0; // payout ya es el premio bruto (apuesta + ganancia neta)

    // Registrar en Supabase via RPC (solo autenticados; window.apiRpc siempre existe,
    // sin este chequeo los invitados nunca llegaban al fallback local)
    if (_isAuthenticatedSync() && window.apiRpc && window.apiRpc.registrarSesionCasino) {
        window.apiRpc.registrarSesionCasino('ruleta', apuesta, resultadoMonedas, gano).then(function(r) {
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
        }).catch(function(e) { console.warn('[ruleta] Error registrando partida:', e); });
    } else {
        // Fallback local
        if (gano) {
            if (typeof agregarMonedas === 'function') agregarMonedas(payout - apuesta);
        } else {
            if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
        }
        actualizarUI();
    }
}

function calculatePayout(winningNumber, winType) {
    let multiplier = 0;

    if (winType === 'number') {
        multiplier = selectedNumbers.size === 1 ? 35 : 35 / selectedNumbers.size;
    } else if (winType === 'column') {
        multiplier = 2;
    } else if (winType === 'color') {
        multiplier = 1;
    }

    return Math.floor(apuesta * (multiplier + 1));
}

function showWinOverlay(amount) {
    const overlay = document.getElementById('win-overlay');
    const amountEl = document.getElementById('win-amount');
    if (overlay && amountEl) {
        amountEl.textContent = `+${amount}`;
        overlay.classList.add('visible');
        setTimeout(() => overlay.classList.remove('visible'), 3000);
    }
}

function showLoseOverlay() {
    const overlay = document.getElementById('lose-overlay');
    if (overlay) {
        overlay.classList.add('visible');
        setTimeout(() => overlay.classList.remove('visible'), 3000);
    }
}

function mostrarNoMonedasOverlay(cantidadNecesaria) {
    if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(cantidadNecesaria);
}

function initApuestaInput() {
    const input = document.getElementById('bet-input');
    if (!input) return;
    const maxVal = 500;
    const apuestaActualEl = document.getElementById('apuesta-actual');

    function getMinVal() {
        return parseInt(input.min) || APUESTA_LIMITES['none'];
    }

    function sync(finalize) {
        const minVal = getMinVal();
        input.min = minVal;
        input.max = maxVal;
        var n = parseInt(input.value, 10);
        if (isNaN(n)) n = finalize ? minVal : apuesta;
        if (finalize) { n = Math.max(minVal, Math.min(maxVal, n)); input.value = n; }
        apuesta = n;
        if (apuestaActualEl) apuestaActualEl.textContent = apuesta;
    }
    input.addEventListener('input', function () { sync(false); });
    input.addEventListener('change', function () { sync(true); });
    input.addEventListener('blur', function () { sync(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { sync(true); input.blur(); } });
    sync(true);
}

function cambiarApuesta(valor) {
    apuesta = parseInt(valor);
    const apuestaActualEl = document.getElementById('apuesta-actual');
    if (apuestaActualEl) apuestaActualEl.textContent = apuesta;
}

function initDragTable() {
    const table = document.getElementById('roulette-table');
    if (!table) return;

    let isDragging = false;
    let startX, startY;

    table.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('number-cell') || e.target.classList.contains('zero-cell')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        table.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        table.style.position = 'relative';
        table.style.marginLeft = dx + 'px';
        table.style.marginTop = dy + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        if (table) table.style.cursor = 'move';
    });
}

const menuImg = document.getElementById("menu-img");
const menuBtn = document.querySelector(".menu-button");
let timeout1, timeout2;

if (menuBtn && menuImg) {
    menuBtn.addEventListener("mouseenter", () => {
        clearTimeout(timeout1); clearTimeout(timeout2);
        timeout1 = setTimeout(() => { menuImg.src = "../assets/salida2.png"; }, 100);
        timeout2 = setTimeout(() => { menuImg.src = "../assets/salida3.png"; }, 300);
    });

    menuBtn.addEventListener("mouseleave", () => {
        clearTimeout(timeout1); clearTimeout(timeout2);
        menuImg.src = "../assets/salida3.png";
        timeout1 = setTimeout(() => { menuImg.src = "../assets/salida2.png"; }, 100);
        timeout2 = setTimeout(() => { menuImg.src = "../assets/salida1.png"; }, 300);
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

let _rouletteInited = false;

function initRouletteGame() {
    if (_rouletteInited) return;
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    _rouletteInited = true;
    initRouletteTable();
    initColumns();
    initColorButtons();
    initPixelRoulette();
    initApuestaInput();
    initDragTable();

    if (typeof actualizarUI === 'function') actualizarUI();
    actualizarContadorSeleccion();
    if (typeof tutorialInit === 'function') tutorialInit();

    const spinBtn = document.getElementById('spin-button');
    if (spinBtn) spinBtn.addEventListener('click', spinRoulette);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isSpinning && !window._tutorialOpen) spinRoulette();
    });
}

window.addEventListener('load', initRouletteGame);
setTimeout(initRouletteGame, 1000);
