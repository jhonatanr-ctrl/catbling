const SIMBOLOS = [
    './assets/cereza-removebg-preview.png',
    './assets/coin.png',
    './assets/corona.png',
    './assets/moneybag.png',
    './assets/moscadorada.png',
    './assets/moscanormal.png',
    './assets/numero7.png'
];

const APUESTA_MINIMA = 10;
const PREMIOS = { 3: 50, 2: 10 };
const ICON_H = 70;
const NUM_ICONS = 50; // cantidad de iconos por cinta

let apuestaActual = 10;
let girando = false;
let finalSymbols = [];
let volumenEfectosActual = 5;

// Actualizar volumen de efectos a tiempo real
window.actualizarVolumenEfectos = function(nuevoVolumen) {
    volumenEfectosActual = nuevoVolumen;
};

// Escuchar cambios de volumen de efectos
window.addEventListener("cambioEfectos", (e) => {
    volumenEfectosActual = e.detail;
});

function getSimboloAleatorio() {
    return Math.floor(Math.random() * SIMBOLOS.length);
}

function mostrarNoMonedas() {
    if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(apuestaActual);
}

// direccion: 'down' = la tira baja (el contenedor se mueve hacia abajo),
//            'up'   = la tira sube (el contenedor se mueve hacia arriba)
function spinReel(reel, direccion, delay, finalSymbolIndex, onDone) {
    const iconsContainer = reel.querySelector(".icons");
    if (!iconsContainer) return;

    // Limpiar y poblar
    iconsContainer.innerHTML = "";
    for (let i = 0; i < NUM_ICONS; i++) {
        const img = document.createElement("img");
        img.src = SIMBOLOS[getSimboloAleatorio()];
        iconsContainer.appendChild(img);
    }

    const imgs = iconsContainer.querySelectorAll("img");

    // El índice del icono ganador: lo ponemos en la mitad de la tira
    // y reemplazamos ese slot con el símbolo final correcto
    const landingIndex = Math.floor(NUM_ICONS / 2);
    imgs[landingIndex].src = SIMBOLOS[finalSymbolIndex];
    finalSymbols[reel.dataset.index] = SIMBOLOS[finalSymbolIndex];

    // Posición inicial y final según dirección
    // 'down': empezamos arriba (translateY negativo grande) y caemos al landingIndex
    // 'up':   empezamos abajo (translateY positivo grande) y subimos al landingIndex
    const totalH = NUM_ICONS * ICON_H;
    const finalY = -(landingIndex * ICON_H); // siempre negativo = mover el contenedor arriba para mostrar landingIndex

    if (direccion === 'down') {
        // Empezar con el contenedor muy arriba (iconos fuera de pantalla arriba)
        // y caer hacia abajo hasta landingIndex
        iconsContainer.style.transition = "none";
        iconsContainer.style.transform = `translateY(${-totalH}px)`; // todo arriba
        
        setTimeout(() => {
            iconsContainer.style.transition = `transform ${1.2 + delay * 0.1}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            iconsContainer.style.transform = `translateY(${finalY}px)`;
            setTimeout(() => onDone && onDone(), (1.2 + delay * 0.1) * 1000 + 100);
        }, 50);

    } else { // 'up'
        // Empezar con el contenedor muy abajo (iconos fuera de pantalla abajo)
        // y subir hasta landingIndex
        iconsContainer.style.transition = "none";
        iconsContainer.style.transform = `translateY(0px)`; // todo abajo (inicio visible)

        setTimeout(() => {
            iconsContainer.style.transition = `transform ${1.2 + delay * 0.1}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            iconsContainer.style.transform = `translateY(${finalY}px)`;
            setTimeout(() => onDone && onDone(), (1.2 + delay * 0.1) * 1000 + 100);
        }, 50);
    }
}

function spin() {
    if (girando) return;
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }

    // Dispatch event to sync input value
    var _bi = document.getElementById('bet-input'); if (_bi) _bi.dispatchEvent(new Event('change'));

    const monedas = getMonedas();
    if (monedas < APUESTA_MINIMA || monedas < apuestaActual) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuestaActual)) {
            // Crédito Temporal cubre la diferencia
        } else {
            mostrarNoMonedas();
            return;
        }
    }

    girando = true;
    finalSymbols = [];
    var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuestaActual) : apuestaActual;
    if (deduccion > 0 && !_isAuthenticatedSync()) {
        // Solo descontar localmente para invitados
        if (deduccion > 0) cambiarMonedas(-deduccion);
    }

    const botonWrapper = document.querySelector('.spin-button-wrapper');
    if (botonWrapper) botonWrapper.style.pointerEvents = 'none';

    const reels = [
        document.getElementById("reel1"),
        document.getElementById("reel2"),
        document.getElementById("reel3")
    ];

    // Asignar índice a cada reel para rastrear finalSymbols
    reels.forEach((r, i) => r && (r.dataset.index = i));

    // Decidir los símbolos finales de cada reel
    // Ajuste Fino aumenta la probabilidad de victoria forzada
    var probVictoria = 0.15;
    if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
        probVictoria = 0.25;
        window.consumirAjusteFino();
    }
    let sym0, sym1, sym2;
    if (Math.random() < probVictoria) {
        // Forzar victoria (los 3 iguales)
        sym0 = getSimboloAleatorio();
        sym1 = sym0;
        sym2 = sym0;
    } else {
        sym0 = getSimboloAleatorio();
        sym1 = getSimboloAleatorio();
        sym2 = getSimboloAleatorio();
    }
    const finalIdxs = [sym0, sym1, sym2];

    // Guardar los src finales para checkWin
    finalSymbols = [SIMBOLOS[sym0], SIMBOLOS[sym1], SIMBOLOS[sym2]];

    let done = 0;
    const onReelDone = () => {
        done++;
        if (done === 3) checkWin();
    };

    // Reel 1 → baja, Reel 2 → sube, Reel 3 → baja
    const dirs = ['down', 'up', 'down'];
    const delays = [0, 300, 600]; // ms de delay antes de empezar

    reels.forEach((reel, i) => {
        if (!reel) return;
        setTimeout(() => {
            spinReel(reel, dirs[i], i, finalIdxs[i], onReelDone);
        }, delays[i]);
    });
}

function checkWin() {
    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();
    const allMatch = finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2];

    var gano = allMatch;
    var gananciaNeta = 0;
    var resultadoMonedas = 0;

    if (gano) {
        gananciaNeta = apuestaActual * PREMIOS[3];
        if (typeof window.calcularGananciaConItems === 'function') gananciaNeta = window.calcularGananciaConItems(gananciaNeta, apuestaActual);
        resultadoMonedas = apuestaActual + gananciaNeta; // premio bruto
        
        mostrarVictoria(gananciaNeta);
    } else {
        if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
        mostrarDerrota();
    }

    girando = false;
    const botonWrapper = document.querySelector('.spin-button-wrapper');
    if (botonWrapper) botonWrapper.style.pointerEvents = 'auto';

    limpiarCarretes();

    // Registrar en Supabase via RPC
    if (window.apiRpc && window.apiRpc.registrarSesionCasino) {
        window.apiRpc.registrarSesionCasino('tragamonedas', apuestaActual, resultadoMonedas, gano).then(function(r) {
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
        }).catch(function(e) { console.warn('[tragamonedasm] Error registrando partida:', e); });
    } else {
        // Fallback local (ya manejado arriba con cambiarMonedas/procesarPerdida)
        actualizarUI();
    }
}

function limpiarCarretes() {
    [1,2,3].forEach(i => {
        const reel = document.getElementById("reel" + i);
        if (reel) {
            const icons = reel.querySelector(".icons");
            if (icons) {
                icons.innerHTML = "";
                icons.style.transition = "none";
                icons.style.transform = "translateY(0)";
                const img = document.createElement("img");
                img.src = finalSymbols[i - 1] || SIMBOLOS[getSimboloAleatorio()];
                icons.appendChild(img);
            }
        }
    });
}

function mostrarVictoria(ganancia) {
    const overlay = document.getElementById('win-overlay');
    const winAmount = document.getElementById('win-amount');
    if (winAmount) winAmount.textContent = `+${ganancia}`;
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 6000);
    }
    // Sonido de jackpot (sin fade-out)
    const sonidoWin = new Audio('./assets/CASINO JACKPOT - MEGAWIN - BIG WIN Sound Effect ( HD ) No Copyright (1).mp3');
    if (volumenEfectosActual > 0) {
        sonidoWin.volume = volumenEfectosActual / 10;
        sonidoWin.play().catch(() => {});
    }
}

function mostrarDerrota() {
    const overlay = document.getElementById('lose-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 5000);
    }
    // Sonido de pérdida (sin fade-out)
    const sonidoLose = new Audio('./assets/lose.mp3');
    if (volumenEfectosActual > 0) {
        sonidoLose.volume = volumenEfectosActual / 10;
        sonidoLose.play().catch(() => {});
    }
}

function initApuestaInput() {
    const input = document.getElementById('bet-input');
    const apuestaText = document.getElementById('apuesta-actual');
    if (!input) return;
    const min = 10;
    const max = 500;
    function getMaxVal() {
        return max; // fijo en 500, no depende de getMonedas()
    }
    function sync(finalize) {
        var maxVal = getMaxVal();
        input.max = maxVal; input.min = min;
        var n = parseInt(input.value, 10);
        if (isNaN(n)) n = finalize ? min : apuestaActual;
        if (finalize) { n = Math.max(min, Math.min(maxVal, n)); input.value = n; }
        apuestaActual = n;
        if (apuestaText) apuestaText.textContent = apuestaActual;
    }
    input.addEventListener('input', function () { sync(false); });
    input.addEventListener('change', function () { sync(true); });
    input.addEventListener('blur', function () { sync(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { sync(true); input.blur(); } });
    sync(true);
}

function initMenu() {
    const btn = document.getElementById('btn-opciones');
    const overlay = document.getElementById('overlay-menu');
    const menu = document.getElementById('menu-opciones');
    const cerrar = document.getElementById('cerrar-menu');
    if (btn) btn.onclick = () => { overlay.classList.add('active'); menu.classList.add('active'); };
    if (cerrar) cerrar.onclick = () => { overlay.classList.remove('active'); menu.classList.remove('active'); };
    if (overlay) overlay.onclick = () => { overlay.classList.remove('active'); menu.classList.remove('active'); };
}

function initSimbolos() {
    [1,2,3].forEach(i => {
        const reel = document.getElementById("reel" + i);
        if (reel) {
            const icons = reel.querySelector(".icons");
            if (icons) {
                const img = document.createElement("img");
                img.src = SIMBOLOS[getSimboloAleatorio()];
                icons.appendChild(img);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    const boton = document.querySelector('.spin-button-wrapper');
    if (boton) boton.addEventListener('click', spin);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spin(); }
    });


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


    initApuestaInput();
    initMenu();
    initSimbolos();
    actualizarUI();
    setInterval(actualizarUI, 1000);
    if (typeof tutorialInit === 'function') tutorialInit();
});