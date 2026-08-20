let rondaActual = 1;
const RONDAS_TOTALES = 3;
let puntosJugador = 0;
let puntosMaquina = 0;
let apuesta = 6;
let tirando = false;
let volumenEfectosActual = 5;
let bossActual = 1;
let apuestaDeducida = false;
const BOSS_DATA = [
    { name: 'Novato', nombre: 'Novato', emoji: '🟢', bono: 0, empateJugador: true },
    { name: 'Soldado', nombre: 'Soldado', emoji: '🔵', bono: 0, empateJugador: false },
    { name: 'Élite', nombre: 'Élite', emoji: '🟠', bono: 1, empateJugador: false },
    { name: 'Campeón', nombre: 'Campeón', emoji: '🔴', bono: 2, empateJugador: false },
    { name: 'Rey Dado', nombre: 'Rey Dado', emoji: '👑', bono: 3, empateJugador: false },
];

window.actualizarVolumenEfectos = function(nuevoVolumen) {
    volumenEfectosActual = nuevoVolumen;
};

window.addEventListener("cambioEfectos", (e) => {
    volumenEfectosActual = e.detail;
});

function mostrarNoMonedas() {
    if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(apuesta);
}

function tirarDadoJugador() {
    var resultado = Math.floor(Math.random() * 6) + 1;
    if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
        resultado = Math.min(6, resultado + 1);
        window.consumirAjusteFino();
    }
    return resultado;
}

function tirarDadoMaquina() {
    const boss = BOSS_DATA[bossActual - 1];
    return Math.floor(Math.random() * (6 - boss.bono)) + 1 + boss.bono;
}



function crearSparkles() {
    const container = document.createElement('div');
    container.className = 'sparkle-overlay';
    document.body.appendChild(container);
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 2 + 's';
        sparkle.style.animationDuration = (2 + Math.random() * 3) + 's';
        sparkle.style.width = sparkle.style.height = (3 + Math.random() * 5) + 'px';
        container.appendChild(sparkle);
    }
    setTimeout(() => container.remove(), 5000);
}

function crearBurst(x, y) {
    const container = document.createElement('div');
    container.className = 'sparkle-burst';
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    document.body.appendChild(container);
    const colors = ['#ffd700', '#ff6b35', '#44ff88', '#ff4444', '#bb88ff', '#ff0088'];
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'burst-particle';
        const angle = (Math.PI * 2 / 15) * i;
        const dist = 100 + Math.random() * 200;
        p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.boxShadow = '0 0 10px ' + p.style.background;
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.animationDelay = Math.random() * 0.2 + 's';
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), 1500);
}

function actualizarPuntosVisual() {
    const pj = document.getElementById('puntos-jugador');
    const pm = document.getElementById('puntos-maquina');
    if (pj) { pj.textContent = puntosJugador; pj.classList.remove('pulse-score'); void pj.offsetWidth; pj.classList.add('pulse-score'); }
    if (pm) { pm.textContent = puntosMaquina; pm.classList.remove('pulse-score'); void pm.offsetWidth; pm.classList.add('pulse-score'); }

    const dots = document.querySelectorAll('.round-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('filled');
        if (i < rondaActual) {
            dot.classList.add('filled');
        }
    });
}

function marcarResultadoRonda(ganaste) {
    const dot = document.querySelectorAll('.round-dot')[rondaActual - 1];
    if (dot) {
        dot.classList.add(ganaste ? 'win' : 'lose');
    }
}

function actualizarBossUI() {
    const boss = BOSS_DATA[bossActual - 1];
    const emojiEl = document.getElementById('boss-emoji');
    const nameEl = document.getElementById('boss-name');
    const barEl = document.getElementById('boss-bar-text');
    if (emojiEl) emojiEl.textContent = boss.emoji;
    if (nameEl) nameEl.textContent = __(bossActual === 5 ? 'boss_5' : 'boss_' + bossActual);
    if (barEl) barEl.textContent = bossActual + '/5';
    const barFill = document.getElementById('boss-bar-fill');
    if (barFill) barFill.style.width = (bossActual / 5) * 100 + '%';
}

function lanzarDados() {
    if (tirando) return;
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }

    if (puntosJugador >= 2 || puntosMaquina >= 2 || rondaActual > RONDAS_TOTALES) {
        reiniciarPartida();
    }

    const monedas = getMonedas();
    if (monedas < apuesta) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuesta)) {
            // Crédito Temporal cubre la diferencia
        } else {
            mostrarNoMonedas();
            return;
        }
    }

    if (!apuestaDeducida) {
        var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuesta) : apuesta;
        if (deduccion > 0) cambiarMonedas(-deduccion);
        apuestaDeducida = true;
    }

    tirando = true;
    const rollBtn = document.getElementById('roll-btn');
    rollBtn.disabled = true;
    rollBtn.textContent = '🎲 TIRANDO...';

    // Safety: desbloquear después de 3 segundos por si algo falla
    setTimeout(() => {
        if (tirando) {
            tirando = false;
            const btn = document.getElementById('roll-btn');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🎲 LANZAR DADOS';
            }
        }
    }, 3000);

    const dadoJugador = document.getElementById('dice-jugador');
    const dadoMaquina = document.getElementById('dice-maquina');
    const textoResultado = document.getElementById('result-text');
    const valorJugador = document.getElementById('valor-jugador');
    const valorMaquina = document.getElementById('valor-maquina');

    document.querySelector('.player-char').classList.add('animando');
    document.querySelector('.machine-char').classList.add('animando');
    valorJugador.textContent = '?';
    valorMaquina.textContent = '?';
    textoResultado.textContent = '🎲 ¡Tirando! 🎲';
    textoResultado.style.color = '#ddbbff';

    crearSparkles();

    const vJugador = tirarDadoJugador();
    const vMaquina = tirarDadoMaquina();

    rollDice('dice-jugador', vJugador);
    rollDice('dice-maquina', vMaquina);

    setTimeout(() => {
        try {
            valorJugador.textContent = vJugador;
            valorMaquina.textContent = vMaquina;
            document.querySelector('.player-char').classList.remove('animando');
            document.querySelector('.machine-char').classList.remove('animando');

            const boss = BOSS_DATA[bossActual - 1];
            const ganasteRonda = boss.empateJugador ? vJugador >= vMaquina : vJugador > vMaquina;

            dadoJugador.classList.remove('winner-glow', 'loser-glow');
            dadoMaquina.classList.remove('winner-glow', 'loser-glow');
            document.querySelector('.player-char').classList.remove('winner-char', 'loser-char');
            document.querySelector('.machine-char').classList.remove('winner-char', 'loser-char');

            if (ganasteRonda) {
                puntosJugador++;
                dadoJugador.classList.add('winner-glow');
                dadoMaquina.classList.add('loser-glow');
                document.querySelector('.player-char').classList.add('winner-char');
                document.querySelector('.machine-char').classList.add('loser-char');
                textoResultado.textContent = '🎉 ¡Ganaste la ronda! (' + vJugador + ' vs ' + vMaquina + ')';
                textoResultado.style.color = '#44ff88';
                crearBurst(window.innerWidth * 0.3, window.innerHeight * 0.4);
            } else if (vJugador === vMaquina) {
                puntosMaquina++;
                document.querySelector('.machine-char').classList.add('winner-char');
                document.querySelector('.player-char').classList.add('loser-char');
                textoResultado.textContent = '😤 ¡Empate! La máquina gana el desempate. (' + vJugador + ' vs ' + vMaquina + ')';
                textoResultado.style.color = '#ffaa00';
            } else {
                puntosMaquina++;
                dadoMaquina.classList.add('winner-glow');
                dadoJugador.classList.add('loser-glow');
                document.querySelector('.machine-char').classList.add('winner-char');
                document.querySelector('.player-char').classList.add('loser-char');
                textoResultado.textContent = '💻 La máquina ganó la ronda. (' + vJugador + ' vs ' + vMaquina + ')';
                textoResultado.style.color = '#ff4444';
            }

            actualizarPuntosVisual();
            marcarResultadoRonda(ganasteRonda);

            if (puntosJugador >= 2 || puntosMaquina >= 2 || rondaActual >= RONDAS_TOTALES) {
                rollBtn.textContent = '🎲 LANZAR DADOS';
                setTimeout(finalizarPartida, 1200);
            } else {
                rondaActual++;
                document.getElementById('ronda-actual').textContent = rondaActual;
                rollBtn.textContent = '🎲 LANZAR DADOS';
            }
        } catch (e) {
            console.error('Error en lanzarDados:', e);
        }
        tirando = false;
        rollBtn.disabled = false;
    }, 1500);
}

function finalizarPartida() {
    if (tirando) return;
    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();
    const textoResultado = document.getElementById('result-text');
    const ganancia = apuesta * bossActual;
    const rollBtn = document.getElementById('roll-btn');

    tirando = false;
    rollBtn.disabled = false;

    if (puntosJugador > puntosMaquina) {
        if (typeof window.calcularGananciaConItems === 'function') ganancia = window.calcularGananciaConItems(ganancia, apuesta);
        cambiarMonedas(ganancia);
        textoResultado.textContent = '🏆 ¡GANASTE EL DUELO! +' + ganancia + ' 🪙';
        textoResultado.style.color = 'gold';
        mostrarVictoria(ganancia);
        for (let i = 0; i < 3; i++) {
            setTimeout(() => crearBurst(
                window.innerWidth * (0.2 + Math.random() * 0.6),
                window.innerHeight * (0.2 + Math.random() * 0.6)
            ), i * 400);
        }
        if (bossActual < 5) {
            bossActual++;
            actualizarBossUI();
            textoResultado.textContent = '👹 ¡BOSS DERROTADO! Pasa al ' + __(bossActual === 1 ? 'boss_1' : 'boss_' + bossActual) + ' 🚀';
        } else {
            textoResultado.textContent = '👑 ¡FELICIDADES! Derrotaste a todos los jefes. Vuelves al principio. 🏆';
            bossActual = 1;
            actualizarBossUI();
        }
    } else {
        textoResultado.textContent = '💻 La máquina ganó el duelo. ¡Inténtalo de nuevo!';
        textoResultado.style.color = '#ff4444';
        mostrarDerrota();
        if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
    }

    rollBtn.textContent = '🎲 LANZAR DADOS';
    apuestaDeducida = false;
}

function reiniciarPartida() {
    rondaActual = 1;
    puntosJugador = 0;
    puntosMaquina = 0;
    tirando = false;
    apuestaDeducida = false;

    document.getElementById('ronda-actual').textContent = '1';
    document.getElementById('puntos-jugador').textContent = '0';
    document.getElementById('puntos-maquina').textContent = '0';
    document.getElementById('valor-jugador').textContent = '-';
    document.getElementById('valor-maquina').textContent = '-';
    const textoResultado = document.getElementById('result-text');
    textoResultado.textContent = '¡Presiona Lanzar para empezar!';
    textoResultado.style.color = '#ddbbff';
    document.getElementById('roll-btn').disabled = false;

    const dj = document.getElementById('dice-jugador');
    const dm = document.getElementById('dice-maquina');
    dj.style.transition = 'none';
    dj.style.transform = 'rotateX(0deg) rotateY(0deg)';
    void dj.offsetWidth;
    dm.style.transition = 'none';
    dm.style.transform = 'rotateX(0deg) rotateY(0deg)';
    void dm.offsetWidth;
    dj.classList.remove('winner-glow', 'loser-glow');
    dm.classList.remove('winner-glow', 'loser-glow');
    document.querySelector('.player-char').classList.remove('winner-char', 'loser-char', 'animando');
    document.querySelector('.machine-char').classList.remove('winner-char', 'loser-char', 'animando');

    const dots = document.querySelectorAll('.round-dot');
    dots.forEach(d => d.classList.remove('filled', 'win', 'lose'));
}

function mostrarVictoria(ganancia) {
    const overlay = document.getElementById('win-overlay');
    const winAmount = document.getElementById('win-amount');
    if (winAmount) winAmount.textContent = '+' + ganancia;
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 4500);
    }
    const sonidoWin = new Audio('../tragamonedasm/resources/assets/CASINO JACKPOT - MEGAWIN - BIG WIN Sound Effect ( HD ) No Copyright (1).mp3');
    if (volumenEfectosActual > 0) {
        sonidoWin.volume = volumenEfectosActual / 10;
        sonidoWin.play().catch(() => {});
    }
}

function mostrarDerrota() {
    const overlay = document.getElementById('lose-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 4000);
    }
    const sonidoLose = new Audio('../tragamonedasm/resources/assets/lose.mp3');
    if (volumenEfectosActual > 0) {
        sonidoLose.volume = volumenEfectosActual / 10;
        sonidoLose.play().catch(() => {});
    }
}

function initSlider() {
    const slider = document.getElementById('custom-slider');
    const progress = document.getElementById('slider-progress');
    const thumb = document.getElementById('slider-thumb');
    const apuestaText = document.getElementById('apuesta-actual');
    if (!slider || !thumb) return;

    const min = 6, max = 500;
    const width = slider.offsetWidth - thumb.offsetWidth;

    function updateSlider(value) {
        value = Math.max(min, Math.min(max, value));
        const pct = (value - min) / (max - min);
        thumb.style.left = (pct * width) + 'px';
        if (progress) progress.style.width = (thumb.offsetLeft + thumb.offsetWidth / 2) + 'px';
        if (apuestaText) apuestaText.textContent = value;
        apuesta = value;
    }

    let isDragging = false;
    thumb.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    slider.addEventListener('click', (e) => {
        const rect = slider.getBoundingClientRect();
        updateSlider(min + Math.round(((e.clientX - rect.left) / width) * (max - min)));
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = slider.getBoundingClientRect();
            updateSlider(min + Math.round(((e.clientX - rect.left) / width) * (max - min)));
        }
    });
    updateSlider(10);
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

document.addEventListener('DOMContentLoaded', () => {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    document.getElementById('roll-btn').addEventListener('click', lanzarDados);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lanzarDados(); }
    });

    const menuImg = document.getElementById('menu-img');
    const menuBtn = document.querySelector('.menu-button');
    let timeout1, timeout2;

    if (menuBtn && menuImg) {
        menuBtn.addEventListener('mouseenter', () => {
            clearTimeout(timeout1); clearTimeout(timeout2);
            timeout1 = setTimeout(() => { menuImg.src = '../assets/salida2.png'; }, 100);
            timeout2 = setTimeout(() => { menuImg.src = '../assets/salida3.png'; }, 300);
        });

        menuBtn.addEventListener('mouseleave', () => {
            clearTimeout(timeout1); clearTimeout(timeout2);
            menuImg.src = '../assets/salida3.png';
            timeout1 = setTimeout(() => { menuImg.src = '../assets/salida2.png'; }, 100);
            timeout2 = setTimeout(() => { menuImg.src = '../assets/salida1.png'; }, 300);
        });
    }

    initSlider();
    initMenu();
    actualizarUI();
    actualizarBossUI();
    actualizarBotonFullscreen();
    setInterval(actualizarUI, 1000);
    if (typeof tutorialInit === 'function') tutorialInit();
});
