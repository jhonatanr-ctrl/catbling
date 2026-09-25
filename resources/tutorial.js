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
        tienda: '6.png',
        carreras: '4.png'
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
            { es: 'Enfrenta a la máquina en un duelo de dados al mejor de 3 rondas.', en: 'Face the machine in a best-of-3 dice duel.', ru: 'Сразись с машиной в дуэли на костях до 2 побед из 3 раундов.', ja: 'マシンと最大3ラウンドのサイコロ対決をしよう。', zh: '与机器进行三局两胜的骰子对决。', de: 'Tritt in einem Würfelduell im Best-of-3-Modus gegen die Maschine an.' },
            { es: 'En cada ronda gana quien saque el número más alto. Gana el duelo quien consiga 2 rondas.', en: 'Each round, the highest roll wins. First to win 2 rounds wins the duel.', ru: 'В каждом раунде побеждает тот, кто выбросит наибольшее число. Дуэль выигрывает тот, кто победит в 2 раундах.', ja: '各ラウンドでは高い出目を出した方が勝ちます。先に2ラウンド勝った方が対決に勝利します。', zh: '每轮点数更高者获胜。先赢得两轮者获得整场对决的胜利。', de: 'In jeder Runde gewinnt, wer die höhere Zahl würfelt. Wer 2 Runden gewinnt, gewinnt das Duell.' },
            { es: 'Cada jefe es más difícil y da mejores recompensas.', en: 'Each boss is harder and gives better rewards.', ru: 'Каждый босс сложнее предыдущего и даёт лучшие награды.', ja: '各ボスは難易度が上がり、より良い報酬が得られます。', zh: '每个首领都更难对付，但奖励也更丰厚。', de: 'Jeder Boss ist schwieriger und bietet bessere Belohnungen.' },
            { es: 'Elige tu apuesta. Cuanto más arriesgues, mayor será la recompensa.', en: 'Choose your bet. Higher risk means bigger rewards.', ru: 'Выбери свою ставку. Чем больше риск, тем больше награда.', ja: '賭け金を選ぼう。リスクが大きいほど報酬も大きくなります。', zh: '选择你的赌注。风险越高，奖励越大。', de: 'Wähle deinen Einsatz. Je höher das Risiko, desto größer die Belohnung.' },
            { es: 'Si te quedas sin monedas, recibirás más después de 30 segundos.', en: 'If you run out of coins, you will receive more after 30 seconds.', ru: 'Если у тебя закончатся монеты, ты получишь ещё через 30 секунд.', ja: 'コインがなくなっても、30秒後にまた受け取れます。', zh: '如果你的金币用完了，30秒后会获得更多金币。', de: 'Wenn dir die Münzen ausgehen, erhältst du nach 30 Sekunden mehr.' }
        ],

        balatro: [
            { es: 'Forma la mejor mano de póker usando 6 palos.', en: 'Build the best poker hand using 6 suits.', ru: 'Составь лучшую покерную комбинацию, используя 6 мастей.', ja: '6種類のスートを使って最強のポーカーハンドを作ろう。', zh: '使用6种花色组成最强的扑克牌型。', de: 'Bilde die beste Pokerhand mit 6 Farben.' },
            { es: 'Las manos más fuertes dan mejores premios.', en: 'Stronger hands give bigger rewards.', ru: 'Более сильные комбинации дают лучшие призы.', ja: '強いハンドほど報酬が大きくなります。', zh: '牌型越强，奖励越丰厚。', de: 'Stärkere Hände geben bessere Preise.' },
            { es: 'Los comodines pueden completar cualquier combinación.', en: 'Jokers can complete any combination.', ru: 'Джокеры могут дополнить любую комбинацию.', ja: 'ジョーカーはどんな役も完成させることができます。', zh: '万能牌可以凑成任意组合。', de: 'Joker können jede Kombination vervollständigen.' }
        ],

        casinoroyale: [
            { es: 'Lanza 2 dados e intenta obtener una combinación ganadora.', en: 'Roll 2 dice and try to get a winning combination.', ru: 'Брось 2 кости и попробуй получить выигрышную комбинацию.', ja: 'サイコロを2つ振って、勝利の組み合わせを狙おう。', zh: '掷两个骰子，尝试凑出获胜组合。', de: 'Wirf 2 Würfel und versuche, eine Gewinnkombination zu erzielen.' },
            { es: 'Elige tu apuesta y presiona LANZAR.', en: 'Choose your bet and press ROLL.', ru: 'Выбери ставку и нажми «БРОСИТЬ».', ja: '賭け金を選んで「投げる」を押そう。', zh: '选择赌注并按“掷骰”。', de: 'Wähle deinen Einsatz und drücke WÜRFELN.' },
            { es: 'Si aciertas, ganas según el multiplicador.', en: 'If you win, your reward is multiplied.', ru: 'Если угадаешь, выигрыш умножается на множитель.', ja: '成功すると倍率に応じて報酬が得られます。', zh: '猜中后，将根据倍数获得奖励。', de: 'Wenn du gewinnst, wird deine Belohnung mit dem Multiplikator vervielfacht.' }
        ],

        tragamonedas: [
            { es: 'Haz girar los 3 rodillos.', en: 'Spin the 3 reels.', ru: 'Крути 3 барабана.', ja: '3つのリールを回そう。', zh: '转动这3个转轮。', de: 'Dreh die 3 Walzen.' },
            { es: 'Si los 3 símbolos son iguales, ganas x50 tu apuesta.', en: 'If all 3 symbols match, you win x50 your bet.', ru: 'Если все 3 символа совпадут, ты выиграешь x50 своей ставки.', ja: '3つのシンボルが揃うと、賭け金の50倍を獲得できます。', zh: '如果3个图案相同，你将赢得赌注的50倍。', de: 'Wenn alle 3 Symbole übereinstimmen, gewinnst du das 50-fache deines Einsatzes.' },
            { es: 'Elige tu apuesta y presiona GIRAR.', en: 'Choose your bet and press SPIN.', ru: 'Выбери ставку и нажми «КРУТИТЬ».', ja: '賭け金を選んで「回す」を押そう。', zh: '选择赌注并按“旋转”。', de: 'Wähle deinen Einsatz und drücke DREHEN.' }
        ],

        memoria: [
            { es: 'Encuentra todos los pares de cartas iguales.', en: 'Find all matching card pairs.', ru: 'Найди все пары одинаковых карт.', ja: 'すべての同じカードのペアを見つけよう。', zh: '找出所有相同的卡牌配对。', de: 'Finde alle passenden Kartenpaare.' },
            { es: 'Recuerda dónde está cada carta para hacer parejas.', en: 'Remember where each card is to make pairs.', ru: 'Запоминай, где находится каждая карта, чтобы составить пары.', ja: 'ペアを作るために、それぞれのカードの位置を覚えておこう。', zh: '记住每张卡牌的位置以便配对。', de: 'Merke dir, wo sich jede Karte befindet, um Paare zu bilden.' },
            { es: 'Completa los niveles para ganar monedas.', en: 'Complete levels to earn coins.', ru: 'Проходи уровни, чтобы зарабатывать монеты.', ja: 'レベルをクリアしてコインを稼ごう。', zh: '完成关卡以赢取金币。', de: 'Schließe die Level ab, um Münzen zu verdienen.' }
        ],

        ruleta: [
            { es: 'Elige uno o varios números entre 0 y 36.', en: 'Choose one or more numbers from 0 to 36.', ru: 'Выбери одно или несколько чисел от 0 до 36.', ja: '0から36までの数字を1つ以上選ぼう。', zh: '选择0到36之间的一个或多个数字。', de: 'Wähle eine oder mehrere Zahlen zwischen 0 und 36.' },
            { es: 'También puedes apostar por colores o columnas.', en: 'You can also bet on colors or columns.', ru: 'Также можно ставить на цвета или колонки.', ja: '色や列に賭けることもできます。', zh: '你也可以对颜色或列进行投注。', de: 'Du kannst auch auf Farben oder Kolonnen setzen.' },
            { es: 'Cada número cuesta 2 monedas.', en: 'Each number costs 2 coins.', ru: 'Каждое число стоит 2 монеты.', ja: '数字1つにつき2コインかかります。', zh: '每个数字花费2枚金币。', de: 'Jede Zahl kostet 2 Münzen.' },
            { es: 'Cuando estés listo, presiona GIRAR.', en: 'When you are ready, press SPIN.', ru: 'Когда будешь готов, нажми «КРУТИТЬ».', ja: '準備ができたら「回す」を押そう。', zh: '准备好后，按“旋转”。', de: 'Wenn du bereit bist, drücke DREHEN.' }
        ],

        preguntas: [
            { es: 'Responde preguntas de distintas materias para ganar monedas.', en: 'Answer questions from different subjects to earn coins.', ru: 'Отвечай на вопросы из разных предметов, чтобы зарабатывать монеты.', ja: 'さまざまな科目の問題に答えてコインを稼ごう。', zh: '回答不同学科的问题以赢取金币。', de: 'Beantworte Fragen aus verschiedenen Fächern, um Münzen zu verdienen.' },
            { es: 'Las dificultades más altas dan más monedas.', en: 'Higher difficulties give more coins.', ru: 'Более высокая сложность даёт больше монет.', ja: '難易度が高いほど多くのコインが得られます。', zh: '难度越高，获得的金币越多。', de: 'Höhere Schwierigkeitsgrade geben mehr Münzen.' },
            { es: 'Usa potenciadores para ayudarte cuando los necesites.', en: 'Use power-ups whenever you need them.', ru: 'Используй усиления, когда они тебе нужны.', ja: '必要なときはパワーアップを使おう。', zh: '需要时使用道具来帮助自己。', de: 'Nutze Power-Ups, wann immer du sie brauchst.' },
            { es: 'Elige tu nivel académico para adaptar las preguntas a tus conocimientos.', en: 'Choose your academic level to tailor the questions to your knowledge.', ru: 'Выбери свой academic уровень, чтобы вопросы соответствовали твоим знаниям.', ja: '自分の学年レベルを選んで、知識に合った問題にしよう。', zh: '选择你的学业等级以使问题与你的知识水平相匹配。', de: 'Wähle dein Bildungsniveau, um die Fragen an dein Wissen anzupassen.' }
        ],

        tienda: [
            { es: 'Compra mejoras y potenciadores con tus monedas.', en: 'Buy upgrades and power-ups with your coins.', ru: 'Покупай улучшения и усиления за свои монеты.', ja: 'コインでアップグレードやパワーアップを購入しよう。', zh: '用你的金币购买升级道具和增强道具。', de: 'Kaufe Upgrades und Power-Ups mit deinen Münzen.' },
            { es: 'Hay objetos para ayudarte en Preguntas.', en: 'There are items that help you in Questions.', ru: 'Есть предметы, которые помогут тебе в разделе «Вопросы».', ja: 'クイズで役立つアイテムもあります。', zh: '有一些道具可以帮助你在问答中取得好成绩。', de: 'Es gibt Gegenstände, die dir bei Fragen helfen.' },
            { es: 'También hay mejoras para los juegos del Casino.', en: 'There are also upgrades for Casino games.', ru: 'Также есть улучшения для игр казино.', ja: 'カジノゲーム用のアップグレードもあります。', zh: '也有针对赌场游戏的升级道具。', de: 'Es gibt auch Upgrades für die Casinospiele.' },
            { es: 'Todo lo que compres se guarda en tu inventario.', en: 'Everything you buy is saved in your inventory.', ru: 'Всё, что ты покупаешь, сохраняется в твоём инвентаре.', ja: '購入したものはすべてインベントリに保存されます。', zh: '你购买的所有物品都会保存在你的背包中。', de: 'Alles, was du kaufst, wird in deinem Inventar gespeichert.' }
        ],

        cartas: [
            { es: 'Forma la mejor mano de 5 cartas usando 6 palos y comodines.', en: 'Build the best 5-card hand using 6 suits and jokers.', ru: 'Составь лучшую комбинацию из 5 карт, используя 6 мастей и джокеров.', ja: '6種類のスートとジョーカーを使い、5枚の最強のハンドを作ろう。', zh: '使用6种花色和万能牌组成最强的5张牌牌型。', de: 'Bilde die beste 5-Karten-Hand mit 6 Farben und Jokern.' },
            { es: 'Las manos más fuertes dan mayores premios.', en: 'Stronger hands give bigger rewards.', ru: 'Более сильные комбинации дают большие призы.', ja: '強いハンドほど報酬が大きくなります。', zh: '牌型越强，奖励越丰厚。', de: 'Stärkere Hände geben größere Preise.' },
            { es: 'Elige tu apuesta y presiona REPARTIR para empezar.', en: 'Choose your bet and press DEAL to start.', ru: 'Выбери ставку и нажми «РАЗДАТЬ», чтобы начать.', ja: '賭け金を選んで「配る」を押して開始しよう。', zh: '选择赌注并按“发牌”开始。', de: 'Wähle deinen Einsatz und drücke AUSTEILEN, um zu starten.' },
            { es: 'Si ganas, recibes tu apuesta multiplicada.', en: 'If you win, your bet is multiplied.', ru: 'Если выиграешь, твоя ставка будет умножена.', ja: '勝つと、賭け金が倍増して戻ってきます。', zh: '获胜后，你的赌注将被翻倍返还。', de: 'Wenn du gewinnst, wird dein Einsatz vervielfacht.' }
        ],

        juegos: [
            { es: 'Elige uno de los juegos del Casino.', en: 'Choose one of the Casino games.', ru: 'Выбери одну из игр казино.', ja: 'カジノゲームの中から1つ選ぼう。', zh: '选择一款赌场游戏。', de: 'Wähle eines der Casinospiele.' },
            { es: 'Cada juego tiene reglas y premios diferentes.', en: 'Each game has different rules and rewards.', ru: 'У каждой игры свои правила и призы.', ja: 'ゲームごとにルールと報酬が異なります。', zh: '每款游戏都有不同的规则和奖励。', de: 'Jedes Spiel hat unterschiedliche Regeln und Preise.' },
            { es: 'Prueba todos y encuentra tu favorito.', en: 'Try them all and find your favorite.', ru: 'Попробуй все и найди свою любимую игру.', ja: 'すべて試して、お気に入りを見つけよう。', zh: '全部试试看，找到你最喜欢的一款。', de: 'Probiere alle aus und finde deinen Favoriten.' }
        ],

        principal: [
            { es: 'Bienvenido a Lets Go Catbling.', en: 'Welcome to Lets Go Catbling.', ru: 'Добро пожаловать в Lets Go Catbling.', ja: 'Lets Go Catblingへようこそ。', zh: '欢迎来到Lets Go Catbling。', de: 'Willkommen bei Lets Go Catbling.' },
            { es: 'Responde preguntas para ganar monedas.', en: 'Answer questions to earn coins.', ru: 'Отвечай на вопросы, чтобы зарабатывать монеты.', ja: '問題に答えてコインを稼ごう。', zh: '回答问题以赢取金币。', de: 'Beantworte Fragen, um Münzen zu verdienen.' },
            { es: 'Compra mejoras en la Tienda.', en: 'Buy upgrades in the Store.', ru: 'Покупай улучшения в магазине.', ja: 'ショップでアップグレードを購入しよう。', zh: '在商店中购买升级道具。', de: 'Kaufe Upgrades im Shop.' },
            { es: 'Juega en el Casino para conseguir aún más monedas.', en: 'Play Casino games to earn even more coins.', ru: 'Играй в казино, чтобы заработать ещё больше монет.', ja: 'カジノで遊んで、さらに多くのコインを手に入れよう。', zh: '在赌场游戏中赢取更多金币。', de: 'Spiele im Casino, um noch mehr Münzen zu verdienen.' }
        ],

        carreras: [
            { es: 'Elige un caballo y prepara tu apuesta.', en: 'Choose a horse and place your bet.', ru: 'Выбери лошадь и сделай ставку.', ja: '馬を選んで賭けよう。', zh: '选择一匹马并下注。', de: 'Wähle ein Pferd und platziere deinen Einsatz.' },
            { es: 'Apuesta por la posición en la que crees que terminará.', en: 'Bet on the position you think it will finish in.', ru: 'Ставь на место, на котором, по-твоему, она финиширует.', ja: 'ゴールする順位を予想して賭けよう。', zh: '预测它会获得的名次并下注。', de: 'Setze auf die Platzierung, auf der es deiner Meinung nach landet.' },
            { es: 'Confirma tu apuesta y mira la carrera.', en: 'Confirm your bet and watch the race.', ru: 'Подтверди ставку и смотри гонку.', ja: '賭けを確定してレースを見よう。', zh: '确认下注并观看比赛。', de: 'Bestätige deine Wette und sieh dir das Rennen an.' },
            { es: 'Si aciertas, ganas monedas según el multiplicador.', en: 'If you guess correctly, you win coins based on the multiplier.', ru: 'Если угадаешь, получишь монеты согласно множителю.', ja: '予想が当たると倍率に応じてコインを獲得します。', zh: '猜对后，你会根据倍率获得金币。', de: 'Wenn du richtig liegst, gewinnst du Münzen entsprechend dem Multiplikator.' }
        ]
    };

    var tutSteps = CONTENT[TUTORIAL_PAGE] || null;

    function initTutorial() {
        var overlay = document.getElementById('tutorial-overlay');
        if (!overlay || !tutSteps) return;

        // No tapar el formulario de nueva contraseña cuando se llega desde el correo de recuperación.
        if (window._tutorialSuprimido || /type=recovery/.test(window.location.hash || '')) return;
        if (!window.tutorialDeberiaMostrarse()) return;

        if (document.getElementById('tut-no-mostrar')) document.getElementById('tut-no-mostrar').remove();

        var noMostrar = document.createElement('div');
        noMostrar.id = 'tut-no-mostrar';
        noMostrar.className = 'tut-no-mostrar';
        var textoNoMostrar = (typeof __ === "function") ? __("tut_no_volver_mostrar") : "No volver a mostrar";
        var textoTooltip = (typeof __ === "function") ? __("tut_no_volver_tooltip") : "Esta configuración puede modificarse posteriormente desde el menú de opciones.";
        noMostrar.innerHTML =
            '<label class="tut-no-mostrar-label">' +
                '<input type="checkbox" id="tut-no-mostrar-check"> ' +
                '<span class="tut-no-mostrar-texto">' + textoNoMostrar + '</span>' +
                '<div class="tut-no-mostrar-tooltip">' + textoTooltip + '</div>' +
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
        var skipBtn = document.getElementById('tutorial-skip');
        var charEl = document.getElementById('tutorial-character');
        var bubble = document.querySelector('.speech-bubble');
        if (!textEl || !stepEl || !nextBtn || !tutSteps) return;

        var lang = (typeof config !== 'undefined' && config !== null && config.idioma) ? config.idioma : 'es';
        if (index < 0 || index >= tutSteps.length) return;

        textEl.textContent = tutSteps[index][lang] || tutSteps[index].es;
        stepEl.textContent = (index + 1) + '/' + tutSteps.length;

        if (skipBtn) {
            skipBtn.textContent = (typeof __ === 'function') ? __('saltar') : (lang === 'en' ? 'SKIP' : 'SALTAR');
        }

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
            nextBtn.textContent = (typeof __ === "function") ? __("terminar") : (lang === 'en' ? 'FINISH' : 'TERMINAR');
            nextBtn.className = 'speech-btn speech-btn-finish';
        } else {
            nextBtn.textContent = (typeof __ === "function") ? __("siguiente") : (lang === 'en' ? 'NEXT' : 'SIGUIENTE');
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

    // Si el usuario cambia de idioma con el tutorial abierto, refresca el
    // texto del paso actual y el botón siguiente/terminar sin cerrarlo.
    window.addEventListener('idiomaAplicado', function() {
        if (_tutOpen && tutSteps) showTutStep(_tutStep);
    });
})();