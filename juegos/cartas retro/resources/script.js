var deck = [];
var hand = [];
var isPlaying = false;
var apuesta = 10;
var maxLabel = null;
var selecciones = [];
var cambiosDisponibles = 2;

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

function seleccionarCarta(indice) {
    if (cambiosDisponibles <= 0) {
        crearOverlayNoMasCambios();
        return;
    }
    
    var yaSeleccionada = selecciones.indexOf(indice) !== -1;
    
    if (yaSeleccionada) {
        selecciones = selecciones.filter(function(i) { return i !== indice; });
    } else if (selecciones.length >= 3) {
        return; 
    } else {
        selecciones.push(indice);
    }
    mostrarCartas();
}

function aplicarCambios() {
    if (selecciones.length === 0) return;
    
    var nuevasCartas = [];
    var deckRestante = [];
    
    // Copiar las cartas que no van a cambiar
    for (var i = 0; i < 5; i++) {
        if (selecciones.indexOf(i) === -1) {
            nuevasCartas.push(hand[i]);
        }
    }
    
    // Replear del deck para remplazar las cartas seleccionadas
    var cartasParaReemplazar = selecciones.length;
    while (cartasParaReemplazar > 0 && deck.length > 0) {
        var carta = deck.pop();
        if (carta.suit !== 'JOKER') {
            nuevasCartas.push(carta);
            cartasParaReemplazar--;
        } else {
            deckRestante.push(carta);
        }
    }
    
    // Si nos quedamos sin cartas no JOKER, reutilizar el deck actual
    if (cartasParaReemplazar > 0) {
        deck = deck.concat(deckRestante);
        shuffle(deck);
        while (cartasParaReemplazar > 0 && deck.length > 0) {
            var carta = deck.pop();
            if (carta.suit !== 'JOKER') {
                nuevasCartas.push(carta);
                cartasParaReemplazar--;
            }
        }
    }
    
    // Asegurar que tengamos exactamente 5 cartas
    while (nuevasCartas.length < 5) {
        if (deck.length > 0) {
            nuevasCartas.push(deck.pop());
        } else {
            crearDeck();
            shuffle(deck);
            if (deck.length > 0) {
                nuevasCartas.push(deck.pop());
            }
        }
    }
    
    hand = nuevasCartas;
    cambiosDisponibles--;
    actualizarUICambios();
    selecciones = [];
    mostrarCartas();
}

function crearOverlayNoMasCambios() {
    var overlay = document.createElement('div');
    overlay.id = 'overlay-no-mas-cambios';
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="overlay-content"><p>¡NO PUEDES HACER MÁS CAMBIOS!</p></div>';
    document.body.appendChild(overlay);
    
    var timeoutId = setTimeout(function() {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 5000);

    // El clic para cerrar debe darse SOBRE el overlay (que ahora cubre
    // toda la pantalla vía CSS), nunca sobre document.body: enganchar el
    // cierre a document.body.onclick hacía que el mismísimo clic que
    // creaba el overlay (p.ej. el clic en "Cambiar", que burbujea hasta
    // body) lo eliminara en el mismo tick, antes de que el usuario
    // pudiera siquiera verlo. stopPropagation() asegura que el clic de
    // cierre no active nada de lo que está debajo.
    overlay.onclick = function(e) {
        e.stopPropagation();
        clearTimeout(timeoutId);
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };
}

function crearOverlayConfirmarRepartir(mensaje) {
    var overlay = document.createElement('div');
    overlay.id = 'overlay-confirmar-repartir';
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="overlay-content">' + mensaje + '<div class="confirmacion-botones"><button id="btn-si-sobreescribe">Sí</button><button id="btn-no-sobreescribe">No</button></div></div>';
    document.body.appendChild(overlay);
    
    document.getElementById('btn-si-sobreescribe').onclick = function() {
        document.body.removeChild(overlay);
        iniciarNuevaMano();
    };
    
    document.getElementById('btn-no-sobreescribe').onclick = function() {
        document.body.removeChild(overlay);
    };
    
    overlay.onclick = function(e) {
        e.stopPropagation();
    };
}

function iniciarNuevaMano() {
    // Descuento real de la apuesta: ocurre aquí, justo donde se reparte
    // la mano de verdad, en vez de en repartir() (donde podía cobrarse
    // sin llegar a repartir si el usuario cancelaba la confirmación).
    var deduccion = typeof window.calcularDeduccionApuesta === 'function' ? window.calcularDeduccionApuesta(apuesta) : apuesta;
    if (deduccion > 0 && !_isAuthenticatedSync()) {
        descontarMonedas(deduccion);
    }

    // Limpiar overlays previos
    document.querySelectorAll('.overlay').forEach(function(o) { if (o.parentNode) o.parentNode.removeChild(o); });
    
    // Reiniciar estado
    selecciones = [];
    cambiosDisponibles = 2;
    actualizarUICambios();
    
    // Generar nueva mano
    crearDeck();
    shuffle(deck);
    hand = deck.slice(0, 5);
    isPlaying = true;
    mostrarCartas();
    
    var btn = document.getElementById('deal-btn');
    // El botón debe decir "JUGAR" tras repartir (igual que en el reparto
    // directo de repartir()): con una mano recién servida, el siguiente
    // clic debe evaluarla, no volver a repartir. Antes decía "REPARTIR",
    // lo cual era inconsistente y confuso justo después de servir cartas.
    if (btn) btn.textContent = typeof __ === 'function' ? __('jugar') : 'JUGAR';
    var label = document.getElementById('hand-label');
    if (label) { label.textContent = '--'; label.style.color = 'white'; }
    document.querySelectorAll('.payout-row').forEach(function(r) { r.classList.remove('active'); });
}

function actualizarUICambios() {
    var cambiosEl = document.getElementById('cambios-disponibles');
    if (cambiosEl) {
        cambiosEl.textContent = cambiosDisponibles;
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
        if (selecciones.indexOf(i) !== -1) {
            el.classList.add('seleccionada');
        }
        el.style.animationDelay = (i * 0.08) + 's';
        el.onclick = (function(idx) { return function() { seleccionarCarta(idx); }; })(i);
        table.appendChild(el);
    }
}

function repartir() {
    // Dispatch event to sync input value at start of repartir
    var _bi = document.getElementById('bet-input'); if (_bi) _bi.dispatchEvent(new Event('change'));
    
    if (getMonedas() < apuesta) {
        if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuesta)) {
            // Crédito Temporal cubre la diferencia
        } else {
            var label = document.getElementById('hand-label');
            if (label) { label.textContent = typeof __ === 'function' ? __('sin_monedas') : 'SIN MONEDAS'; label.style.color = '#ff4444'; }
            return;
        }
    }
    // El descuento de la apuesta se hace en iniciarNuevaMano(), que es el
    // único punto donde realmente se reparte una mano nueva (tanto en el
    // camino directo de abajo como al confirmar "Sí" en el overlay de
    // sobreescritura). Antes se descontaba aquí, ANTES de comprobar si
    // hacía falta confirmación: si el usuario respondía "No", la apuesta
    // ya se había perdido sin repartir mano ni reembolsarla.
    actualizarUI();
    
    // Verificar si ya hay una mano repartida (no es la primera partida).
    // OJO: NO usar children.length de #card-table, porque ese contenedor
    // arranca con un <div class="card-placeholder"> (el texto "REPARTIR")
    // que YA cuenta como hijo. Eso hacía que yaHayCartas fuera SIEMPRE true,
    // incluso en la primerísima partida, disparando el overlay de
    // confirmación en vez de repartir. Usamos el array `hand`, que solo
    // contiene cartas reales una vez que se ha repartido de verdad.
    var yaHayCartas = hand.length > 0;
    
    // Si ya hay una mano y hay cambios disponibles, pedir confirmación
    // Pero NO en la primera mano (cuando la tabla está vacía)
    if (yaHayCartas && cambiosDisponibles > 0) {
        var mensaje = 'Aún tienes ' + cambiosDisponibles + ' cambios disponibles, ¿desea continuar?';
        crearOverlayConfirmarRepartir(mensaje);
        return;
    }

    // Reparto directo (primera mano, o mano nueva con 0 cambios pendientes).
    // Reutiliza iniciarNuevaMano() en vez de duplicar la lógica: antes este
    // bloque repetía casi todo lo que hace iniciarNuevaMano() pero SIN
    // restablecer cambiosDisponibles a 2, así que tras jugar una mano sin
    // usar los cambios y volver a repartir, el contador de cambios quedaba
    // "pegado" en su valor anterior en vez de reiniciarse.
    iniciarNuevaMano();
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

    var gano = !!result;
    var gananciaNeta = 0;
    var resultadoMonedas = 0;

    if (result) {
        gananciaNeta = apuesta * result.mult;
        if (typeof window.calcularGananciaConItems === 'function') gananciaNeta = window.calcularGananciaConItems(gananciaNeta, apuesta);
        resultadoMonedas = apuesta + gananciaNeta; // premio bruto = apuesta + ganancia neta
        
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
        if (winOverlay && winAmount) { winAmount.textContent = '+' + gananciaNeta; winOverlay.classList.add('active'); }
        if (loseOverlay) loseOverlay.classList.remove('active');
    } else {
        if (label) { label.textContent = typeof __ === 'function' ? __('carta_alta') : 'CARTA ALTA'; label.style.color = '#ff4444'; }
        if (winOverlay) winOverlay.classList.remove('active');
        if (loseOverlay) loseOverlay.classList.add('active');
    }

    isPlaying = false;
    // La mano ya fue evaluada y puntuada por completo: se limpia aquí para
    // que el próximo clic en REPARTIR no la detecte como "mano sin usar"
    // (yaHayCartas) y dispare de más la confirmación de sobreescritura.
    hand = [];
    var btn = document.getElementById('deal-btn');
    if (btn) btn.textContent = typeof __ === 'function' ? __('repartir') : 'REPARTIR';

    // Registrar en Supabase via RPC (solo autenticados; window.apiRpc siempre existe,
    // sin este chequeo los invitados nunca llegaban al fallback local)
    if (_isAuthenticatedSync() && window.apiRpc && window.apiRpc.registrarSesionCasino) {
        window.apiRpc.registrarSesionCasino('cartas', apuesta, resultadoMonedas, gano).then(function(r) {
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
        }).catch(function(e) { console.warn('[cartas] Error registrando partida:', e); });
    } else {
        // Fallback local (modo invitado / sin Supabase)
        if (gano) {
            agregarMonedas(gananciaNeta);
        } else {
            if (typeof window.procesarPerdida === 'function') window.procesarPerdida();
        }
        actualizarUI();
    }

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

function initApuestaInput() {
    var input = document.getElementById('bet-input');
    var maxLabel = document.querySelector('.apuesta-max');
    if (!input) return;
    var minVal = 10;
    function getMaxVal() {
        return Math.max(minVal, Math.min(500, getMonedas()));
    }
    function sync(finalize) {
        var maxVal = getMaxVal();
        var apuestaActualEl = document.getElementById('apuesta-actual');
        if (maxLabel) maxLabel.textContent = maxVal;
        input.max = maxVal; input.min = minVal;
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

window.onload = function() {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
        requerirAutenticacion();
        return;
    }
    actualizarUI();
    initApuestaInput();
    if (typeof tutorialInit === 'function') tutorialInit();

    var btn = document.getElementById('deal-btn');
    if (btn) btn.onclick = jugar;

    var cambiarBtn = document.getElementById('cambiar-btn');
    if (cambiarBtn) cambiarBtn.onclick = function() {
        if (cambiosDisponibles > 0) {
            aplicarCambios();
        } else {
            crearOverlayNoMasCambios();
        }
    };

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
            timeout1 = setTimeout(function() { menuImg.src = "../assets/salida3.png"; }, 100);
            timeout2 = setTimeout(function() { menuImg.src = "../assets/salida1.png"; }, 300);
        };
        menuBtn.onclick = function(e) {
            // No hacer nada especial al click en menú
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