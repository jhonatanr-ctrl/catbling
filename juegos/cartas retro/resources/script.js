var deck = [];
var hand = [];
var isPlaying = false;
var apuesta = 10;
var maxLabel = null;

var SUITS = ['♠', '♥', '♣', '♦', '⚜', '☘'];
var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

var HAND_RANKS = [
    { name: 'royal_flush',    mult: 70,  check: function(v,s,j) { return isRoyalFlush(v,s,j); } },
    { name: 'straight_flush', mult: 40,  check: function(v,s,j) { return isStraightFlush(v,s,j); } },
    { name: 'four_kind',      mult: 18,  check: function(v,s,j) { return hasNKind(v, 4, j); } },
    { name: 'full_house',     mult: 7,   check: function(v,s,j) { return isFullHouse(v, j); } },
    { name: 'flush',          mult: 5,   check: function(v,s,j) { return isFlush(v,s,j); } },
    { name: 'straight',       mult: 3,   check: function(v,s,j) { return isStraight(v,j); } },
    { name: 'three_kind',     mult: 2,   check: function(v,s,j) { return hasNKind(v, 3, j); } },
    { name: 'two_pair',       mult: 1,   check: function(v,s,j) { return isTwoPair(v,j); } }
];

function rankValue(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
}

function crearDeck() {
    deck = [];
    for (var si = 0; si < SUITS.length; si++) {
        for (var ri = 0; ri < RANKS.length; ri++) {
            deck.push({ rank: RANKS[ri], suit: SUITS[si], value: rankValue(RANKS[ri]) });
        }
    }
    deck.push({ rank: '🃏', suit: 'JOKER', value: 0 });
    deck.push({ rank: '🃏', suit: 'JOKER', value: 0 });
}

function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
}

function mostrarCartas() {
    var table = document.getElementById('card-table');
    table.innerHTML = '';
    for (var i = 0; i < hand.length; i++) {
        var card = hand[i];
        var el = document.createElement('div');
        el.className = 'card';
        if (card.suit === 'JOKER') {
            el.classList.add('joker');
            el.innerHTML = '<span class="card-corner top">🃏</span><span class="card-center-joker">🃏</span><span class="card-corner bottom">🃏</span>';
        } else {
            var suitColor = (card.suit === '♥' || card.suit === '♦') ? 'red' : (card.suit === '⚜' || card.suit === '☘') ? 'green' : 'black';
            el.classList.add(suitColor);
            el.innerHTML = '<span class="card-corner top">' + card.rank + '</span><span class="card-suit-big">' + card.suit + '</span><span class="card-corner bottom">' + card.rank + '</span>';
        }
        el.style.animationDelay = (i * 0.08) + 's';
        table.appendChild(el);
    }
}

function repartir() {
    if (getMonedas() < apuesta) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuesta)) {
            // Crédito Temporal cubre la diferencia
        } else {
            var label = document.getElementById('hand-label');
            if (label) { label.textContent = typeof __ === 'function' ? __('sin_monedas') : 'SIN MONEDAS'; label.style.color = '#ff4444'; }
            return;
        }
    }
    var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuesta) : apuesta;
    if (deduccion > 0) descontarMonedas(deduccion);
    actualizarUI();
    crearDeck();
    shuffle(deck);
    hand = deck.slice(0, 5);
    isPlaying = true;
    mostrarCartas();
    var btn = document.getElementById('deal-btn');
    if (btn) btn.textContent = typeof __ === 'function' ? __('jugar') : 'JUGAR';
    var label = document.getElementById('hand-label');
    if (label) { label.textContent = '--'; label.style.color = 'white'; }
    document.querySelectorAll('.payout-row').forEach(function(r) { r.classList.remove('active'); });
}

function evaluarMano() {
    var jokers = 0;
    var values = [];
    var suits = [];
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].suit === 'JOKER') { jokers++; }
        else { values.push(hand[i].value); suits.push(hand[i].suit); }
    }
    values.sort(function(a,b) { return a-b; });
    for (var hi = 0; hi < HAND_RANKS.length; hi++) {
        if (HAND_RANKS[hi].check(values, suits, jokers)) return HAND_RANKS[hi];
    }
    return null;
}

function hasNKind(vals, n, jokers) {
    var counts = {};
    for (var i = 0; i < vals.length; i++) counts[vals[i]] = (counts[vals[i]] || 0) + 1;
    var maxCount = 0;
    for (var k in counts) { if (counts[k] > maxCount) maxCount = counts[k]; }
    return maxCount + jokers >= n;
}

function isTwoPair(vals, jokers) {
    var counts = {};
    for (var i = 0; i < vals.length; i++) counts[vals[i]] = (counts[vals[i]] || 0) + 1;
    var pairs = 0;
    var singles = 0;
    for (var k in counts) {
        if (counts[k] >= 2) pairs++;
        else singles++;
    }
    pairs += Math.min(jokers, singles);
    jokers -= Math.min(jokers, singles);
    pairs += Math.floor(jokers / 2);
    return pairs >= 2;
}

function isFullHouse(vals, jokers) {
    var counts = {};
    for (var i = 0; i < vals.length; i++) counts[vals[i]] = (counts[vals[i]] || 0) + 1;
    var groups = [];
    for (var k in counts) groups.push({ rank: parseInt(k), count: counts[k] });
    groups.sort(function(a,b) { return b.count - a.count; });
    for (var gi = 0; gi < groups.length; gi++) {
        var needed = Math.max(0, 3 - groups[gi].count);
        if (needed > jokers) continue;
        var remainJokers = jokers - needed;
        for (var gj = 0; gj < groups.length; gj++) {
            if (gj === gi) continue;
            if (groups[gj].count + remainJokers >= 2) return true;
        }
        if (remainJokers >= 2) return true;
    }
    return false;
}

function isFlush(vals, suits, jokers) {
    if (suits.length + jokers < 5) return false;
    var suitCounts = {};
    for (var i = 0; i < suits.length; i++) suitCounts[suits[i]] = (suitCounts[suits[i]] || 0) + 1;
    var maxSame = 0;
    for (var k in suitCounts) { if (suitCounts[k] > maxSame) maxSame = suitCounts[k]; }
    return maxSame + jokers >= 5;
}

function isStraight(vals, jokers) {
    var unique = [];
    for (var i = 0; i < vals.length; i++) { if (unique.indexOf(vals[i]) === -1) unique.push(vals[i]); }
    var s = {};
    for (var i = 0; i < unique.length; i++) s[unique[i]] = true;
    var aceLow = 0;
    if (s[14]) aceLow++;
    if (s[2]) aceLow++;
    if (s[3]) aceLow++;
    if (s[4]) aceLow++;
    if (s[5]) aceLow++;
    if (aceLow + jokers >= 5) return true;
    for (var start = 2; start <= 10; start++) {
        var present = 0;
        for (var v = start; v < start + 5; v++) { if (s[v]) present++; }
        if (present + jokers >= 5) return true;
    }
    return false;
}

function isStraightFlush(vals, suits, jokers) {
    var suitCards = {};
    for (var i = 0; i < suits.length; i++) {
        if (!suitCards[suits[i]]) suitCards[suits[i]] = [];
        suitCards[suits[i]].push(vals[i]);
    }
    for (var s in suitCards) {
        var svals = suitCards[s];
        if (svals.length + jokers >= 5 && isStraight(svals, jokers)) return true;
    }
    return false;
}

function isRoyalFlush(vals, suits, jokers) {
    var suitCards = {};
    for (var i = 0; i < suits.length; i++) {
        if (!suitCards[suits[i]]) suitCards[suits[i]] = [];
        suitCards[suits[i]].push(vals[i]);
    }
    for (var s in suitCards) {
        var svals = suitCards[s];
        if (svals.length + jokers < 5) continue;
        var needRoyal = {10: true, 11: true, 12: true, 13: true, 14: true};
        for (var vi = 0; vi < svals.length; vi++) delete needRoyal[svals[vi]];
        var remaining = 0;
        for (var k in needRoyal) remaining++;
        if (remaining <= jokers) return true;
    }
    return false;
}

function jugar() {
    if (!isPlaying) { 
        if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
            requerirAutenticacion();
            return;
        }
        repartir(); return; 
    }

    // Ajuste Fino: añade una carta extra (elige las mejores 5)
    if (typeof window.tieneAjusteFinoActivo === 'function' && window.tieneAjusteFinoActivo()) {
        var cartaExtra = deck[hand.length];
        if (cartaExtra) {
            hand.push(cartaExtra);
            // Re-evaluar: quedarse con las mejores 5 cartas (simplificado: mostrar 6)
            mostrarCartas();
        }
        window.consumirAjusteFino();
    }

    var result = evaluarMano();
    var label = document.getElementById('hand-label');
    var winOverlay = document.getElementById('win-overlay');
    var loseOverlay = document.getElementById('lose-overlay');
    var winAmount = document.getElementById('win-amount');

    document.querySelectorAll('.payout-row').forEach(function(r) { r.classList.remove('active'); });

    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();

    if (result) {
        var ganancia = apuesta * result.mult;
        if (typeof window.calcularGananciaConItems === 'function') ganancia = window.calcularGananciaConItems(ganancia, apuesta);
        agregarMonedas(ganancia);
        actualizarUI();

        var rows = document.querySelectorAll('.payout-row');
        for (var pi = 0; pi < rows.length; pi++) {
            if (rows[pi].classList.contains(result.name)) { rows[pi].classList.add('active'); break; }
        }

        var handI18n = {
            royal_flush: 'escalera_real',
            straight_flush: 'escalera_color',
            four_kind: 'poker',
            full_house: 'full',
            flush: 'color',
            straight: 'escalera',
            three_kind: 'trio',
            two_pair: 'doble_par',
            pair: 'par'
        };
        var handName = handI18n[result.name] ? (typeof __ === 'function' ? __(handI18n[result.name]) : result.name.replace(/_/g,' ').toUpperCase()) : result.name.replace(/_/g,' ').toUpperCase();
        if (label) { label.textContent = handName + ' x' + result.mult; label.style.color = '#00ff00'; }
        if (winOverlay && winAmount) { winAmount.textContent = '+' + ganancia; winOverlay.classList.add('active'); }
        if (loseOverlay) loseOverlay.classList.remove('active');
    } else {
        if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
        if (label) { label.textContent = typeof __ === 'function' ? __('carta_alta') : 'CARTA ALTA'; label.style.color = '#ff4444'; }
        if (winOverlay) winOverlay.classList.remove('active');
        if (loseOverlay) loseOverlay.classList.add('active');
    }

    isPlaying = false;
    var btn = document.getElementById('deal-btn');
    if (btn) btn.textContent = typeof __ === 'function' ? __('repartir') : 'REPARTIR';

    setTimeout(function() {
        if (winOverlay) winOverlay.classList.remove('active');
        if (loseOverlay) loseOverlay.classList.remove('active');
    }, 2500);
}

function cambiarApuesta(valor) {
    apuesta = parseInt(valor);
    var apuestaActualEl = document.getElementById('apuesta-actual');
    if (apuestaActualEl) apuestaActualEl.textContent = apuesta;
}

function initSlider() {
    var slider = document.getElementById('custom-slider');
    var thumb = document.getElementById('slider-thumb');
    var progress = document.getElementById('slider-progress');
    maxLabel = document.querySelector('.apuesta-max');
    if (!slider || !thumb || !progress) return;

    var minVal = 10;

    function getMaxVal() {
        return Math.max(minVal, Math.min(500, getMonedas()));
    }

    function updateSlider(value) {
        var maxVal = getMaxVal();
        if (maxLabel) maxLabel.textContent = maxVal;
        var currentVal = Math.max(minVal, Math.min(maxVal, value));
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

    var isDragging = false;
    thumb.onmousedown = function(e) { isDragging = true; e.preventDefault(); };
    document.onmouseup = function() { isDragging = false; };
    document.onmousemove = function(e) { if (isDragging) handleMove(e.clientX); };
    slider.onclick = function(e) { handleMove(e.clientX); };

    updateSlider(minVal);
}

window.onload = function() {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    actualizarUI();
    initSlider();
    if (typeof tutorialInit === 'function') tutorialInit();

    var btn = document.getElementById('deal-btn');
    if (btn) btn.onclick = jugar;

    var menuImg = document.getElementById("menu-img");
    var menuBtn = document.querySelector(".menu-button");
    var timeout1, timeout2;
    if (menuBtn && menuImg) {
        menuBtn.onmouseenter = function() {
            clearTimeout(timeout1); clearTimeout(timeout2);
            timeout1 = setTimeout(function() { menuImg.src = "../assets/salida2.png"; }, 100);
            timeout2 = setTimeout(function() { menuImg.src = "../assets/salida3.png"; }, 300);
        };
        menuBtn.onmouseleave = function() {
            clearTimeout(timeout1); clearTimeout(timeout2);
            menuImg.src = "../assets/salida3.png";
            timeout1 = setTimeout(function() { menuImg.src = "../assets/salida2.png"; }, 100);
            timeout2 = setTimeout(function() { menuImg.src = "../assets/salida1.png"; }, 300);
        };
        menuBtn.onclick = function(e) {
            var monedas = getMonedas();
            if (typeof setMonedas === 'function') setMonedas(monedas);
            else localStorage.setItem('monedas', monedas);
        };
    }

    var btnOpciones = document.getElementById('btn-opciones');
    var menu = document.getElementById('menu-opciones');
    var overlay = document.getElementById('overlay-menu');
    var cerrar = document.getElementById('cerrar-menu');
    if (btnOpciones) btnOpciones.onclick = function() { menu.classList.add('active'); overlay.classList.add('active'); };
    if (cerrar) cerrar.onclick = function() { menu.classList.remove('active'); overlay.classList.remove('active'); };
    if (overlay) overlay.onclick = function() { menu.classList.remove('active'); overlay.classList.remove('active'); };
};
