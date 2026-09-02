var TUTORIAL_PAGE = null;
var _tutStep = 0;
var _tutOpen = false;
var TUTORIAL_ICON_SRC = null;

(function() {
    var path = window.location.pathname.replace(/\\/g, '/').toLowerCase();

    var pageIcon = typeof window._TUTORIAL_ICON !== 'undefined' ? window._TUTORIAL_ICON : null;

    var ICONS = {
        principal: '4.png',
        juegos: '3.png',
        dados: '3.png',
        ruleta: '1.png',
        cartas: '2.png',
        balatro: '1.png',
        tragamonedas: '1.png',
        casinoroyale: '1.png',
        memoria: '3.png',
        preguntas: '2.png',
        tienda: '6.png'
    };

    if (path.indexOf('dados') !== -1) TUTORIAL_PAGE = 'dados';
    else if (path.indexOf('balatro') !== -1) TUTORIAL_PAGE = 'balatro';
    else if (path.indexOf('cartas') !== -1) TUTORIAL_PAGE = 'cartas';
    else if (path.indexOf('casinoroyale') !== -1) TUTORIAL_PAGE = 'casinoroyale';
    else if (path.indexOf('tragamonedas') !== -1 || path.indexOf('tragamonedasm') !== -1) TUTORIAL_PAGE = 'tragamonedas';
    else if (path.indexOf('memoria') !== -1) TUTORIAL_PAGE = 'memoria';
    else if (path.indexOf('ruleta') !== -1) TUTORIAL_PAGE = 'ruleta';
    else if (path.indexOf('preguntas') !== -1) TUTORIAL_PAGE = 'preguntas';
    else if (path.indexOf('tienda') !== -1) TUTORIAL_PAGE = 'tienda';
    else if (path.indexOf('juegosprincipal') !== -1 || (path.indexOf('juegos') !== -1 && path.indexOf('.html') !== -1)) TUTORIAL_PAGE = 'juegos';
    else if (path.indexOf('principalpage') !== -1 || path.indexOf('index') !== -1 || path === '' || path === '/' || path.indexOf('let\'s go') !== -1) TUTORIAL_PAGE = 'principal';

    if (pageIcon) {
        TUTORIAL_ICON_SRC = pageIcon;
    } else {
        var iconName = ICONS[TUTORIAL_PAGE] || 'image (1).png';
        var segments = path.replace(/\/+/g, '/').split('/');
        var depth = Math.max(0, segments.length - 2); // páginas en subcarpetas necesitan un nivel más de "../" (bug: usaba -3, ver auditoría)
        var prefix = '';
        for (var i = 0; i < depth; i++) prefix += '../';
        TUTORIAL_ICON_SRC = prefix + 'resources/assets/' + iconName;
    }

    var CONTENT = {
        dados: [
            { es: 'Enfrenta a la máquina en un duelo de dados al mejor de 3 rondas.', en: 'Face the machine in a best-of-3 dice duel.' },
            { es: 'En cada ronda gana quien saque el número más alto. Gana el duelo quien consiga 2 rondas.', en: 'Each round, the highest roll wins. First to win 2 rounds wins the duel.' },
            { es: 'Cada jefe es más difícil y da mejores recompensas.', en: 'Each boss is harder and gives better rewards.' },
            { es: 'Elige tu apuesta. Cuanto más arriesgues, mayor será la recompensa.', en: 'Choose your bet. Higher risk means bigger rewards.' },
            { es: 'Si te quedas sin monedas, recibirás más después de 30 segundos.', en: 'If you run out of coins, you will receive more after 30 seconds.' }
        ],

        balatro: [
            { es: 'Forma la mejor mano de póker usando 6 palos.', en: 'Build the best poker hand using 6 suits.' },
            { es: 'Las manos más fuertes dan mejores premios.', en: 'Stronger hands give bigger rewards.' },
            { es: 'Los comodines pueden completar cualquier combinación.', en: 'Jokers can complete any combination.' }
        ],

        casinoroyale: [
            { es: 'Lanza 2 dados e intenta obtener una combinación ganadora.', en: 'Roll 2 dice and try to get a winning combination.' },
            { es: 'Elige tu apuesta y presiona LANZAR.', en: 'Choose your bet and press ROLL.' },
            { es: 'Si aciertas, ganas según el multiplicador.', en: 'If you win, your reward is multiplied.' }
        ],

        tragamonedas: [
            { es: 'Haz girar los 3 rodillos.', en: 'Spin the 3 reels.' },
            { es: 'Si los 3 símbolos son iguales, ganas x50 tu apuesta.', en: 'If all 3 symbols match, you win x50 your bet.' },
            { es: 'Elige tu apuesta y presiona GIRAR.', en: 'Choose your bet and press SPIN.' }
        ],

        memoria: [
            { es: 'Encuentra todos los pares de cartas iguales.', en: 'Find all matching card pairs.' },
            { es: 'Recuerda dónde está cada carta para hacer parejas.', en: 'Remember where each card is to make pairs.' },
            { es: 'Completa los niveles para ganar monedas.', en: 'Complete levels to earn coins.' }
        ],

        ruleta: [
            { es: 'Elige uno o varios números entre 0 y 36.', en: 'Choose one or more numbers from 0 to 36.' },
            { es: 'También puedes apostar por colores o columnas.', en: 'You can also bet on colors or columns.' },
            { es: 'Cada número cuesta 2 monedas.', en: 'Each number costs 2 coins.' },
            { es: 'Cuando estés listo, presiona GIRAR.', en: 'When you are ready, press SPIN.' }
        ],

        preguntas: [
            { es: 'Responde preguntas de distintas materias para ganar monedas.', en: 'Answer questions from different subjects to earn coins.' },
            { es: 'Las dificultades más altas dan más monedas.', en: 'Higher difficulties give more coins.' },
            { es: 'Usa potenciadores para ayudarte cuando los necesites.', en: 'Use power-ups whenever you need them.' },
            { es: 'Elige tu nivel académico para adaptar las preguntas a tus conocimientos.', en: 'Choose your academic level to tailor the questions to your knowledge.' }
        ],

        tienda: [
            { es: 'Compra mejoras y potenciadores con tus monedas.', en: 'Buy upgrades and power-ups with your coins.' },
            { es: 'Hay objetos para ayudarte en Preguntas.', en: 'There are items that help you in Questions.' },
            { es: 'También hay mejoras para los juegos del Casino.', en: 'There are also upgrades for Casino games.' },
            { es: 'Todo lo que compres se guarda en tu inventario.', en: 'Everything you buy is saved in your inventory.' }
        ],

        cartas: [
            { es: 'Forma la mejor mano de 5 cartas usando 6 palos y comodines.', en: 'Build the best 5-card hand using 6 suits and jokers.' },
            { es: 'Las manos más fuertes dan mayores premios.', en: 'Stronger hands give bigger rewards.' },
            { es: 'Elige tu apuesta y presiona REPARTIR para empezar.', en: 'Choose your bet and press DEAL to start.' },
            { es: 'Si ganas, recibes tu apuesta multiplicada.', en: 'If you win, your bet is multiplied.' }
        ],

        juegos: [
            { es: 'Elige uno de los juegos del Casino.', en: 'Choose one of the Casino games.' },
            { es: 'Cada juego tiene reglas y premios diferentes.', en: 'Each game has different rules and rewards.' },
            { es: 'Prueba todos y encuentra tu favorito.', en: 'Try them all and find your favorite.' }
        ],

        principal: [
            { es: 'Bienvenido a Lets Go Catbling.', en: 'Welcome to Lets Go Catbling.' },
            { es: 'Responde preguntas para ganar monedas.', en: 'Answer questions to earn coins.' },
            { es: 'Compra mejoras en la Tienda.', en: 'Buy upgrades in the Store.' },
            { es: 'Juega en el Casino para conseguir aún más monedas.', en: 'Play Casino games to earn even more coins.' }
        ]
    };

    var tutSteps = CONTENT[TUTORIAL_PAGE] || null;

    function initTutorial() {
        var overlay = document.getElementById('tutorial-overlay');
        if (!overlay || !tutSteps) return;

        if (!window.tutorialDeberiaMostrarse()) return;

        if (document.getElementById('tut-no-mostrar')) document.getElementById('tut-no-mostrar').remove();

        var noMostrar = document.createElement('div');
        noMostrar.id = 'tut-no-mostrar';
        noMostrar.className = 'tut-no-mostrar';
        noMostrar.innerHTML =
            '<label class="tut-no-mostrar-label">' +
                '<input type="checkbox" id="tut-no-mostrar-check"> ' +
                '<span class="tut-no-mostrar-texto">No volver a mostrar</span>' +
                '<div class="tut-no-mostrar-tooltip">Esta configuración puede modificarse posteriormente desde el menú de opciones.</div>' +
            '</label>';
        overlay.appendChild(noMostrar);

        document.getElementById('tut-no-mostrar-check').onchange = function(e) {
            if (e.target.checked) {
                config.mostrarTutorial = false;
                guardarConfig(config);
                aplicarConfig();
            }
        };

        _tutStep = 0;
        _tutOpen = true;
        overlay.classList.add('active');
        showTutStep(0);

        var nextBtn = document.getElementById('tutorial-next');
        var skipBtn = document.getElementById('tutorial-skip');
        if (nextBtn) { nextBtn.onclick = nextTutStep; }
        if (skipBtn) { skipBtn.onclick = closeTut; }
        if (overlay) {
            overlay.onclick = function(e) {
                if (e.target === overlay) closeTut();
            };
        }
    }

    function showTutStep(index) {
        var textEl = document.getElementById('tutorial-text');
        var stepEl = document.getElementById('tutorial-step');
        var nextBtn = document.getElementById('tutorial-next');
        var charEl = document.getElementById('tutorial-character');
        var bubble = document.querySelector('.speech-bubble');
        if (!textEl || !stepEl || !nextBtn || !tutSteps) return;

        var lang = 'es';
        if (typeof config !== 'undefined' && config !== null && config.idioma === 'en') lang = 'en';
        if (index < 0 || index >= tutSteps.length) return;

        textEl.textContent = tutSteps[index][lang];
        stepEl.textContent = (index + 1) + '/' + tutSteps.length;

        if (bubble) {
            bubble.classList.remove('pop');
            void bubble.offsetWidth;
            bubble.classList.add('pop');
        }

        if (charEl) {
            charEl.className = 'tutorial-character';
            var animClasses = ['step-happy', 'step-point', 'step-wiggle', 'step-celebrate', 'step-happy', 'step-point', 'step-happy'];
            if (animClasses[index]) charEl.classList.add(animClasses[index]);
        }

        var imgEl = document.getElementById('tutorial-img');
        if (imgEl && TUTORIAL_ICON_SRC) imgEl.src = TUTORIAL_ICON_SRC;

        if (index === tutSteps.length - 1) {
            nextBtn.textContent = lang === 'en' ? 'FINISH' : 'TERMINAR';
            nextBtn.className = 'speech-btn speech-btn-finish';
        } else {
            nextBtn.textContent = lang === 'en' ? 'NEXT' : 'SIGUIENTE';
            nextBtn.className = 'speech-btn speech-btn-next';
        }
    }

    function nextTutStep() {
        if (!tutSteps) return;
        if (_tutStep < tutSteps.length - 1) {
            _tutStep++;
            showTutStep(_tutStep);
        } else {
            closeTut();
        }
    }

    function closeTut() {
        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('active');
        _tutOpen = false;
    }

    window.tutorialInit = initTutorial;
    window.tutorialClose = closeTut;
    window.tutorialDeberiaMostrarse = function() {
        if (typeof config !== 'undefined' && config.mostrarTutorial === false) return false;
        return true;
    };
    window.tutorialResetPagina = function() {
        if (typeof config !== 'undefined' && config.mostrarTutorial === false) {
            config.mostrarTutorial = true;
            guardarConfig(config);
            aplicarConfig();
        }
    };
    window._tutorialOpen = false;

    Object.defineProperty(window, '_tutorialOpen', {
        get: function() { return _tutOpen; },
        set: function(v) { _tutOpen = v; }
    });
})();
