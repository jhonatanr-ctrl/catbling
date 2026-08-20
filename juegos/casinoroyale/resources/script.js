// Casino Royale - Jackpot de Dados

let isRolling = false;
let apuesta = 10;
let currentRes1 = 1;
let currentRes2 = 2;

function cambiarApuesta(valor) {
    apuesta = parseInt(valor);
    var apuestaActualEl = document.getElementById('apuesta-actual');
    if (apuestaActualEl) apuestaActualEl.textContent = apuesta;
    var btn = document.getElementById('roll-btn');
    if (btn) btn.textContent = 'APOSTAR ' + apuesta + ' MONEDAS';
}

function initSlider() {
    var slider = document.getElementById('custom-slider');
    var thumb = document.getElementById('slider-thumb');
    var progress = document.getElementById('slider-progress');
    var maxLabel = document.querySelector('.apuesta-max');
    
    if (!slider || !thumb || !progress) return;
    
    var minVal = 10;
    var currentVal = minVal;
    var isDragging = false;
    
    function getMaxVal() {
        return Math.max(minVal, Math.min(500, getMonedas()));
    }
    
    function updateSlider(value) {
        var maxVal = getMaxVal();
        if (maxLabel) maxLabel.textContent = maxVal;
        
        currentVal = Math.max(minVal, Math.min(maxVal, value));
        apuesta = currentVal;
        
        var percent = (maxVal > minVal) ? (currentVal - minVal) / (maxVal - minVal) : 0;
        var sliderWidth = slider.offsetWidth || 350;
        var thumbWidth = thumb.offsetWidth || 40;
        var leftPos = percent * (sliderWidth - thumbWidth);
        
        thumb.style.left = leftPos + 'px';
        progress.style.width = leftPos + 'px';
        
        cambiarApuesta(currentVal);
    }
    
    function handleMove(clientX) {
        var rect = slider.getBoundingClientRect();
        var maxVal = getMaxVal();
        if (maxLabel) maxLabel.textContent = maxVal;
        var percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var value = Math.round((minVal + percent * (maxVal - minVal)) / 10) * 10;
        updateSlider(value);
    }
    
    thumb.onmousedown = function(e) {
        isDragging = true;
        e.preventDefault();
    };
    
    slider.onclick = function(e) {
        handleMove(e.clientX);
    };
    
    document.onmousemove = function(e) {
        if (isDragging) handleMove(e.clientX);
    };
    
    document.onmouseup = function() {
        isDragging = false;
    };
    
    updateSlider(minVal);
}

// Generador sesgado para reducir probabilidad de ganar
function getBiasedRoll(dieIndex) {
    // Dado 1: favorece fuertemente números bajos (1,3)
    // Dado 2: favorece fuertemente números altos (5,6)
    // Así casi nunca salen iguales, secuencia, o ambos pares
    var weights;
    if (dieIndex === 1) {
        weights = [1, 1, 1, 1, 7, 7]; // Dado 2: casi siempre 5 o 6
    } else {
        weights = [7, 1, 7, 1, 1, 1]; // Dado 1: casi siempre 1 o 3
    }
    // Ajuste Fino: mejora ligeramente las probabilidades
    if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
        if (dieIndex === 1) {
            weights = [3, 2, 3, 2, 4, 4];
        } else {
            weights = [4, 2, 4, 2, 3, 3];
        }
        window.consumirAjusteFino();
    }
    var totalWeight = weights.reduce(function(a, b) { return a + b; }, 0);
    var random = Math.random() * totalWeight;
    for (var i = 0; i < weights.length; i++) {
        if (random < weights[i]) return i + 1;
        random -= weights[i];
    }
    return 1;
}

function rollBothDice() {
    currentRes1 = getBiasedRoll(0);
    currentRes2 = getBiasedRoll(1);
    rollDice('dice-1', currentRes1);
    rollDice('dice-2', currentRes2);
}

function evaluateResult() {
    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();
    var res1 = currentRes1;
    var res2 = currentRes2;
    var statusMsg = document.getElementById('status-msg');
    var winOverlay = document.getElementById('win-overlay');
    var loseOverlay = document.getElementById('lose-overlay');
    var winAmount = document.getElementById('win-amount');
    
    var isBothEven = (res1 % 2 === 0) && (res2 % 2 === 0);
    var isEqual = res1 === res2;
    var isSequence = Math.abs(res1 - res2) === 1;
    
    var multiplicador = 1;
    var won = false;
    
    if (isEqual) {
        multiplicador = 4;
        won = true;
        statusMsg.innerText = '¡DADOS IGUALES! x4 (' + res1 + '-' + res2 + ')';
        statusMsg.style.color = '#00ff00';
    } else if (isSequence) {
        multiplicador = 3;
        won = true;
        statusMsg.innerText = '¡SECUENCIA! x3 (' + res1 + '-' + res2 + ')';
        statusMsg.style.color = '#00ff00';
    } else if (isBothEven) {
        multiplicador = 2;
        won = true;
        statusMsg.innerText = '¡AMBOS PARES! x2 (' + res1 + '-' + res2 + ')';
        statusMsg.style.color = '#00ff00';
    } else {
        statusMsg.innerText = res1 + ' - ' + res2 + '. ¡PIERDES!';
        statusMsg.style.color = '#ff4444';
    }
    
    if (won) {
        var ganancia = apuesta * multiplicador;
        if (typeof window.calcularGananciaConItems === 'function') ganancia = window.calcularGananciaConItems(ganancia, apuesta);
        agregarMonedas(ganancia);
        if (winOverlay && winAmount) {
            winAmount.textContent = '+' + ganancia;
            winOverlay.classList.add('active');
        }
        if (loseOverlay) loseOverlay.classList.remove('active');
    } else {
        if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
        if (winOverlay) winOverlay.classList.remove('active');
        if (loseOverlay) loseOverlay.classList.add('active');
    }
    
    isRolling = false;
    
    var btn = document.getElementById('roll-btn');
    if (btn) btn.disabled = false;
    
    setTimeout(function() {
        if (winOverlay) winOverlay.classList.remove('active');
        if (loseOverlay) loseOverlay.classList.remove('active');
    }, 3000);
    
    setTimeout(function() {
        var maxLabel = document.querySelector('.apuesta-max');
        if (maxLabel) maxLabel.textContent = Math.max(10, Math.min(500, getMonedas()));
    }, 500);
}

// Función para mostrar notificación de item usado
var itemNotificationTimeout = null;

window.mostrarNotificacionItem = function(mensaje) {
    var notificationEl = document.getElementById('item-notification');
    var textEl = document.getElementById('item-notification-text');
    
    if (!notificationEl || !textEl) return;
    
    textEl.textContent = mensaje;
    notificationEl.style.display = 'block';
    notificationEl.style.animation = 'item-blink 0.5s infinite';
    
    if (itemNotificationTimeout) {
        clearTimeout(itemNotificationTimeout);
    }
    
    itemNotificationTimeout = setTimeout(function() {
        notificationEl.style.display = 'none';
    }, 15000);
};

// Inicializar cuando cargue el DOM
window.onload = function() {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    actualizarUI();
    initSlider();
    if (typeof tutorialInit === 'function') tutorialInit();
    
    // Botón de jugar
    var btn = document.getElementById('roll-btn');
    if (btn) {
        function actualizarBtnApuesta() {
            btn.textContent = 'APOSTAR ' + apuesta + ' MONEDAS';
        }
        actualizarBtnApuesta();
        btn.onclick = function() {
            if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
                requerirAutenticacion();
                return;
            }
            if (getMonedas() < apuesta) {
                if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuesta)) {
                    // Crédito Temporal cubre la diferencia
                } else {
                    var statusMsg = document.getElementById('status-msg');
                    if (statusMsg) {
                        statusMsg.innerText = '¡SIN MONEDAS SUFICIENTES!';
                        statusMsg.style.color = '#ff4444';
                    }
                    return;
                }
            }
            if (isRolling) return;
            isRolling = true;
            btn.disabled = true;

            var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuesta) : apuesta;
            if (deduccion > 0) descontarMonedas(deduccion);
            actualizarUI();
            
            var statusMsg = document.getElementById('status-msg');
            if (statusMsg) {
                statusMsg.innerText = '🎲 LANZANDO...';
                statusMsg.style.color = 'white';
            }

            rollBothDice();

            setTimeout(function() {
                evaluateResult();
            }, 1500);
        };
    }
    
    setInterval(actualizarUI, 1000);
    
    // Botón de opciones
    var btnOpciones = document.getElementById('btn-opciones');
    var menu = document.getElementById('menu-opciones');
    var overlay = document.getElementById('overlay-menu');
    var cerrar = document.getElementById('cerrar-menu');
    
    if (btnOpciones) {
        btnOpciones.onclick = function() {
            if (menu) menu.classList.add('active');
            if (overlay) overlay.classList.add('active');
        };
    }
    
    if (cerrar) {
        cerrar.onclick = function() {
            if (menu) menu.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };
    }
    
    if (overlay) {
        overlay.onclick = function() {
            if (menu) menu.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };
    }
    
    // Animación del botón de salida
    var menuImg = document.getElementById("menu-img");
    var menuBtn = document.querySelector(".menu-button");
    var timeout1, timeout2;

    if (menuBtn && menuImg) {
        menuBtn.onmouseenter = function() {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            timeout1 = setTimeout(function() {
                menuImg.src = "../assets/salida2.png";
            }, 100);
            timeout2 = setTimeout(function() {
                menuImg.src = "../assets/salida3.png";
            }, 300);
        };

        menuBtn.onmouseleave = function() {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            menuImg.src = "../assets/salida3.png";
            timeout1 = setTimeout(function() {
                menuImg.src = "../assets/salida2.png";
            }, 100);
            timeout2 = setTimeout(function() {
                menuImg.src = "../assets/salida1.png";
            }, 300);
        };
    }
};