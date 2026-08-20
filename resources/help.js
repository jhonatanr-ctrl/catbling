const HELP_DATA = {
  "principalpage": {
    titulo: { es: "¡Bienvenido a Let's Go Catbling!", en: "Welcome to Let's Go Catbling!" },
    secciones: [
      { titulo: { es: "Pantalla Principal", en: "Main Screen" }, contenido: { es: "Aquí puedes ir a las 3 partes del juego: Preguntas, Casino y Tienda. Usa el menú (⚙️) para cambiar música, sonidos y más.", en: "Here you can go to the 3 parts of the game: Questions, Casino and Shop. Use the menu (⚙️) to change music, sounds and more." }, icono: "🏠" },
      { titulo: { es: "Monedas", en: "Coins" }, contenido: { es: "Las monedas sirven para jugar. Puedes ganar monedas respondiendo preguntas o jugando en el casino. Si no tienes monedas, recibirás 10 gratis después de un rato.", en: "Coins are the game currency. You can earn coins by answering questions or playing in the casino. If you run out of coins, you'll get 10 free after a while." }, icono: "🪙" },
      { titulo: { es: "Sección Preguntas", en: "Questions Section" }, contenido: { es: "Elige un tema y una dificultad. Responde bien las preguntas para ganar monedas. Si eliges difícil, ganarás más monedas.", en: "Choose a topic and difficulty. Answer questions correctly to earn coins. Harder difficulty gives more coins." }, icono: "❓" },
      { titulo: { es: "Sección Casino", en: "Casino Section" }, contenido: { es: "En el casino hay varios juegos: Tragamonedas, Memoria, Duelo de Dados, Ruleta y Jackpot de Dados. Cada juego tiene sus propias reglas y premios.", en: "The casino has several games: Slots, Memory, Dice Duel, Roulette and Dice Jackpot. Each game has its own rules and prizes." }, icono: "🎰" },
      { titulo: { es: "Tienda", en: "Shop" }, contenido: { es: "Gasta tus monedas en mejoras para las preguntas, ayudas para el casino y accesorios. Los objetos se guardan en tu bolsa.", en: "Spend your coins on question upgrades, casino power-ups and accessories. Items are saved in your bag." }, icono: "🛒" }
    ]
  },
  "juegos": {
    titulo: { es: "Casino - Elige un Juego", en: "Casino - Choose a Game" },
    secciones: [
      { titulo: { es: "Navegación", en: "Navigation" }, contenido: { es: "Usa las flechas para moverte entre los juegos. Haz clic en la imagen o presiona Enter para entrar al juego. También puedes usar las teclas A/D o las flechas del teclado.", en: "Use the arrows to move between games. Click the image or press Enter to enter the game. You can also use A/D keys or arrow keys." }, icono: "🎮" },
      { titulo: { es: "Tragamonedas", en: "Slots" }, contenido: { es: "Gira los rodillos y consigue 3 símbolos iguales para ganar. Apuesta mínimo 10 monedas. Si aciertas, multiplicas tu apuesta por 50.", en: "Spin the reels and get 3 matching symbols to win. Minimum bet is 10 coins. If you win, you multiply your bet by 50." }, icono: "🎰" },
      { titulo: { es: "Memoria", en: "Memory" }, contenido: { es: "Encuentra los pares de cartas iguales. Completa todos los pares en pocos movimientos para ganar el doble de tu apuesta. Apuesta desde 7 monedas.", en: "Find the matching card pairs. Complete all pairs in few moves to win double your bet. Bet from 7 coins." }, icono: "🧠" },
      { titulo: { es: "Duelo de Dados", en: "Dice Duel" }, contenido: { es: "Lanza 2 dados. Ganas si: salen iguales (x4), son seguidos (x3), o los dos son pares (x2). Apuesta fija de 5 monedas.", en: "Roll 2 dice. You win if: they match (x4), they are consecutive (x3), or both are even (x2). Fixed bet of 5 coins." }, icono: "🎲" },
      { titulo: { es: "Ruleta", en: "Roulette" }, contenido: { es: "Apunta a números, columnas o colores. Gira la ruleta: número exacto (35x), columna (2x) o color (1x).", en: "Bet on numbers, columns or colors. Spin the wheel: exact number (35x), column (2x) or color (1x)." }, icono: "🎡" },
      { titulo: { es: "Jackpot de Dados", en: "Dice Jackpot" }, contenido: { es: "Parecido al Duelo de Dados pero puedes elegir cuánto apostar. Apuesta mínimo 10. Gana con pares, números seguidos o pares iguales.", en: "Similar to Dice Duel but you can choose your bet. Minimum bet 10. Win with pairs, consecutive numbers or both even." }, icono: "🎲" }
    ]
  },
  "preguntas": {
    titulo: { es: "Sección de Preguntas", en: "Questions Section" },
    secciones: [
      { titulo: { es: "Cómo jugar", en: "How to play" }, contenido: { es: "1. Elige un tema (botones de colores).\n2. Escoge la dificultad con las flechas.\n3. Responde las preguntas.\n4. Gana monedas por cada respuesta correcta.", en: "1. Choose a topic (colored buttons).\n2. Pick difficulty with the arrows.\n3. Answer the questions.\n4. Earn coins for each correct answer." }, icono: "📖" },
      { titulo: { es: "Áreas de Conocimiento", en: "Knowledge Areas" }, contenido: { es: "Cada botón de color es un tema diferente: Ciencias, Historia, Matemáticas, Geografía, Deportes, Entretenimiento.", en: "Each colored button is a different topic: Science, History, Math, Geography, Sports, Entertainment." }, icono: "🎯" },
      { titulo: { es: "Dificultad", en: "Difficulty" }, contenido: { es: "Fácil: preguntas sencillas, pocas monedas.\nMedio: un poco más difícil, mejores premios.\nDifícil: preguntas difíciles, grandes recompensas.", en: "Easy: simple questions, few coins.\nMedium: a bit harder, better prizes.\nHard: hard questions, big rewards." }, icono: "📊" },
      { titulo: { es: "Recompensas", en: "Rewards" }, contenido: { es: "Cada respuesta correcta te da monedas. A mayor dificultad, más monedas ganarás.", en: "Each correct answer gives you coins. The harder the difficulty, the more coins you earn." }, icono: "🏆" }
    ]
  },
  "tienda": {
    titulo: { es: "Tienda de Objetos", en: "Item Shop" },
    secciones: [
      { titulo: { es: "Categorías", en: "Categories" }, contenido: { es: "Preguntas: mejoras para ayudarte.\nCasino: ayudas para los juegos.\nAccesorios: objetos para decorar (pronto).", en: "Questions: upgrades to help you.\nCasino: power-ups for games.\nAccessories: decorative items (coming soon)." }, icono: "🏪" },
      { titulo: { es: "Cómo comprar", en: "How to buy" }, contenido: { es: "Elige una categoría, navega con las flechas y haz clic en COMPRAR. Puedes tener hasta 3 objetos en tu bolsa.", en: "Choose a category, navigate with arrows and click BUY. You can have up to 3 items in your bag." }, icono: "🛍️" },
      { titulo: { es: "Usar objetos", en: "Use items" }, contenido: { es: "Ve a tu bolsa (icono de bolsa), elige un objeto y confirma para usarlo. Las mejoras se activan solas.", en: "Go to your bag (bag icon), select an item and confirm to use it. Upgrades activate automatically." }, icono: "🎒" },
      { titulo: { es: "Monedas", en: "Coins" }, contenido: { es: "Revisa tus monedas en la esquina de arriba a la derecha. Si no tienes suficientes, juega a preguntas o al casino para ganar más.", en: "Check your coins in the top right corner. If you don't have enough, play questions or casino to earn more." }, icono: "💰" }
    ]
  },
  "tragamonedas": {
    titulo: { es: "Tragamonedas - Cómo jugar", en: "Slots - How to play" },
    secciones: [
      { titulo: { es: "Objetivo", en: "Goal" }, contenido: { es: "Consigue que los 3 rodillos muestren el mismo símbolo para ganar el premio mayor.", en: "Get all 3 reels to show the same symbol to win the jackpot." }, icono: "🎯" },
      { titulo: { es: "Apuesta", en: "Bet" }, contenido: { es: "Usa el control deslizante para elegir tu apuesta (mínimo 10, máximo 500 monedas).", en: "Use the slider to choose your bet (minimum 10, maximum 500 coins)." }, icono: "💰" },
      { titulo: { es: "Premios", en: "Prizes" }, contenido: { es: "Si los 3 símbolos son iguales, ganas tu apuesta x 50. ¡Gran premio!", en: "If all 3 symbols match, you win your bet x 50. Big prize!" }, icono: "🏆" },
      { titulo: { es: "Controles", en: "Controls" }, contenido: { es: "Haz clic en el botón rojo GIRAR o presiona Enter/Espacio para girar.", en: "Click the red SPIN button or press Enter/Space to spin." }, icono: "🎮" }
    ]
  },
  "memoria": {
    titulo: { es: "Memoria - Cómo jugar", en: "Memory - How to play" },
    secciones: [
      { titulo: { es: "Objetivo", en: "Goal" }, contenido: { es: "Encuentra todos los pares de cartas iguales. Cada nivel tiene más pares.", en: "Find all matching card pairs. Each level has more pairs." }, icono: "🎯" },
      { titulo: { es: "Apuesta", en: "Bet" }, contenido: { es: "Elige tu apuesta (mínimo 7, máximo 500 monedas).", en: "Choose your bet (minimum 7, maximum 500 coins)." }, icono: "💰" },
      { titulo: { es: "Ganar", en: "Win" }, contenido: { es: "Si completas todos los pares en los movimientos permitidos, ganas el premio. ¡Mientras más difícil el nivel, mayor el premio!", en: "If you complete all pairs within the allowed moves, you win the prize. The harder the level, the bigger the prize!" }, icono: "🏆" },
      { titulo: { es: "Consejos", en: "Tips" }, contenido: { es: "Concéntrate y recuerda dónde está cada carta. A menos movimientos, más chances de ganar.", en: "Focus and remember where each card is. Fewer moves means more chances to win." }, icono: "💡" }
    ]
  },
  "ruleta": {
    titulo: { es: "✨ ¡La Ruleta Mágica! ✨", en: "✨ The Magic Roulette! ✨" },
    secciones: [
      { titulo: { es: "🎯 ¿Cómo se juega?", en: "🎯 How to play?" }, contenido: { es: "Tienes que adivinar qué número va a salir. ¡Como un adivino pero con monedas! Puedes apostar a un solo número, a una columna entera o a un color.", en: "You have to guess which number will pop out! Like a fortune teller but with coins! You can bet on one number, a whole column, or a color." }, icono: "🎯" },
      { titulo: { es: "💰 ¿Cuánto puedes GANAR?", en: "💰 How much can you WIN?" }, contenido: { es: "🎯 Un solo número → ¡35 veces tu apuesta! (¡millonario!)\n📊 Una columna (Col 1/2/3) → 2 veces tu apuesta\n🔴⚫ Un color (Rojo/Negro) → 1 vez tu apuesta\n👟 Entre más números marques, menos ganas pero más fácil le atinas.", en: "🎯 One number → 35 times your bet! (jackpot!)\n📊 A column (Col 1/2/3) → 2 times your bet\n🔴⚫ A color (Red/Black) → 1 times your bet\n👟 The more numbers you pick, the less you win but it's easier to hit!" }, icono: "💰" },
      { titulo: { es: "🖱️ Cómo apostar paso a paso", en: "🖱️ How to bet step by step" }, contenido: { es: "1️⃣ Elige tus números: haz clic en los numeritos de la mesa\n2️⃣ O elige más rápido: presiona Col 1/2/3 o ROJO/NEGRO\n3️⃣ ¿Quieres cambiar? Haz clic en los números que NO quieras\n4️⃣ Mueve la palanquita para escoger tu apuesta\n5️⃣ ¡Presiona GIRAR o la tecla Enter y cruza los dedos! 🤞", en: "1️⃣ Pick your numbers: click the numbers on the table\n2️⃣ Or go faster: press Col 1/2/3 or RED/BLACK\n3️⃣ Want to change? Click the numbers you DON'T want\n4️⃣ Move the slider to choose your bet\n5️⃣ Press SPIN or the Enter key and cross your fingers! 🤞" }, icono: "🎮" },
      { titulo: { es: "🌟 Truco: Columnas y Colores", en: "🌟 Pro Tip: Columns & Colors" }, contenido: { es: "Cuando eliges una columna o color, se marcan TODOS sus números solitos. ¡Luego puedes quitar los que no quieras! Así es más rápido jugar. Mira el contador para saber cuántos números llevas marcados.", en: "When you pick a column or color, ALL its numbers get selected by magic! Then you can remove the ones you don't want. It's a faster way to play! Check the counter to see how many numbers you picked." }, icono: "🌟" },
      { titulo: { es: "📏 La Apuesta Mínima", en: "📏 Minimum Bet" }, contenido: { es: "Cada número que marcas cuesta 2 moneditas. Entre más números, más moneditas necesitas.\n1 número → mínimo 6 monedas\n6 números → mínimo 12 monedas\n12 números (columna) → mínimo 24 monedas\n18 números (color) → mínimo 36 monedas\n¡Elige bien cuántos números quieres!", en: "Each number you mark costs 2 coins. The more numbers, the more coins you need.\n1 number → minimum 6 coins\n6 numbers → minimum 12 coins\n12 numbers (column) → minimum 24 coins\n18 numbers (color) → minimum 36 coins\nChoose your numbers wisely!" }, icono: "📏" },
      { titulo: { es: "🎡 A girar", en: "🎡 Let's spin" }, contenido: { es: "Cuando estés listo, presiona el botón rojo GIRAR o la tecla Enter. ¡La ruleta da vueltas y vueltas... y si le atinas, GANASTE! 🎉", en: "When you're ready, press the red SPIN button or the Enter key. The wheel spins round and round... and if you guessed right, YOU WIN! 🎉" }, icono: "🎡" }
    ]
  },
  "casinoroyale": {
    titulo: { es: "Jackpot de Dados - Cómo jugar", en: "Dice Jackpot - How to play" },
    secciones: [
      { titulo: { es: "Objetivo", en: "Goal" }, contenido: { es: "Lanza 2 dados y consigue combinaciones ganadoras: pares, números seguidos o los dos pares.", en: "Roll 2 dice and get winning combinations: pairs, consecutive numbers or both even." }, icono: "🎯" },
      { titulo: { es: "Apuesta", en: "Bet" }, contenido: { es: "Elige tu apuesta (mínimo 10, máximo 500 monedas).", en: "Choose your bet (minimum 10, maximum 500 coins)." }, icono: "💰" },
      { titulo: { es: "Combinaciones", en: "Combinations" }, contenido: { es: "Pares (iguales): x4 de tu apuesta.\nSecuencia (ej: 3-4): x3 de tu apuesta.\nAmbos pares: x2 de tu apuesta.", en: "Pairs (equal): x4 your bet.\nSequence (e.g. 3-4): x3 your bet.\nBoth even: x2 your bet." }, icono: "🏆" },
      { titulo: { es: "Cómo jugar", en: "How to play" }, contenido: { es: "Presiona APOSTAR para lanzar los dados.", en: "Press BET to roll the dice." }, icono: "🎲" }
    ]
  },
  "balatro": {
    titulo: { es: "Cartas Retro - Póker de Cartas", en: "Retro Cards - Card Poker" },
    secciones: [
      { titulo: { es: "Objetivo", en: "Goal" }, contenido: { es: "Consigue la mejor mano de póker posible con 5 cartas. Gana según la jerarquía de la mano.", en: "Get the best possible poker hand with 5 cards. Win according to hand ranking." }, icono: "🎯" },
      { titulo: { es: "Apuesta", en: "Bet" }, contenido: { es: "Usa el slider para elegir tu apuesta (mínimo 10, máximo 500 monedas).", en: "Use the slider to choose your bet (minimum 10, maximum 500 coins)." }, icono: "💰" },
      { titulo: { es: "Manos y Premios", en: "Hands & Prizes" }, contenido: { es: "Escalera Real: x70\nEscalera Color: x40\nPóker: x18\nFull House: x7\nColor: x5\nEscalera: x3\nTrío: x2\nDoble Par: x1\nPar o menos: pierdes la apuesta", en: "Royal Flush: x70\nStraight Flush: x40\nFour of a Kind: x18\nFull House: x7\nFlush: x5\nStraight: x3\nThree of a Kind: x2\nTwo Pair: x1\nPair or less: you lose your bet" }, icono: "🏆" },
      { titulo: { es: "Comodines", en: "Jokers" }, contenido: { es: "Los comodines son cartas especiales que pueden actuar como cualquier carta para completar tu mano. ¡Aparecen aleatoriamente en el mazo!", en: "Jokers are special cards that can act as any card to complete your hand. They appear randomly in the deck!" }, icono: "🃏" },
      { titulo: { es: "Nuevos Palos", en: "New Suits" }, contenido: { es: "Además de los 4 palos clásicos (♠♥♣♦), ahora hay 2 más: ⚜ y ☘. ¡Más chances de hacer color!", en: "In addition to the 4 classic suits (♠♥♣♦), there are 2 new ones: ⚜ and ☘. More chances for a flush!" }, icono: "✨" }
    ]
  },
  "duelodados": {
    titulo: { es: "Duelo de Dados - Cómo jugar", en: "Dice Duel - How to play" },
    secciones: [
      { titulo: { es: "Objetivo", en: "Goal" }, contenido: { es: "Gana 2 rondas antes que la máquina. El primero en llegar a 2 puntos gana el duelo y el premio.", en: "Win 2 rounds before the machine does. First to 2 points wins the duel and the prize." }, icono: "🎯" },
      { titulo: { es: "Sistema de Jefes", en: "Boss System" }, contenido: { es: "Hay 5 jefes con dificultad creciente:\n🟢 Novato: empate = tú ganas\n🔵 Soldado: 1d6 normal\n🟠 Élite: +1 para la máquina\n🔴 Campeón: +2 para la máquina\n👑 Rey Dado: +3 para la máquina", en: "There are 5 bosses with increasing difficulty:\n🟢 Rookie: tie = you win\n🔵 Soldier: normal 1d6\n🟠 Elite: +1 for the machine\n🔴 Champion: +2 for the machine\n👑 Dice King: +3 for the machine" }, icono: "👹" },
      { titulo: { es: "Cómo jugar", en: "How to play" }, contenido: { es: "1. Elige tu apuesta (mínimo 6, máximo 500).\n2. Presiona LANZAR DADOS.\n3. Gana rondas para avanzar de jefe.\n4. Derrota a los 5 jefes para completar el juego.", en: "1. Choose your bet (min 6, max 500).\n2. Press ROLL DICE.\n3. Win rounds to advance to the next boss.\n4. Defeat all 5 bosses to complete the game." }, icono: "🎲" },
      { titulo: { es: "Premio", en: "Prize" }, contenido: { es: "Ganas el doble de tu apuesta al derrotar a un jefe. A mayor apuesta, mayor premio.", en: "You win double your bet when defeating a boss. Higher bet means bigger prize." }, icono: "💰" }
    ]
  }
};

function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes("principalpage") || path.endsWith("/Let_s go Catbling 2026 - copia (2)/")) return "principalpage";
  if (path.includes("juegosprincipalpage")) return "juegos";
  if (path.includes("preguntasinicialpage")) return "preguntas";
  if (path.includes("tienda")) return "tienda";
  if (path.includes("tragamonedaindex") || path.includes("tragamonedas")) return "tragamonedas";
  if (path.includes("memoria")) return "memoria";
  if (path.includes("ruleta")) return "ruleta";
  if (path.includes("casinoroyale")) return "casinoroyale";
  if (path.includes("balatro")) return "balatro";
  if (path.includes("dadosindex")) return "duelodados";
  return "principalpage";
}

function openHelp() {
  const page = getCurrentPage();
  const data = HELP_DATA[page];
  if (!data) return;

  const lang = typeof config !== 'undefined' && config.idioma ? config.idioma : 'es';

  let overlay = document.getElementById("help-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "help-overlay";
    document.body.appendChild(overlay);
  }

  const closeSrc = getBasePath() + "resources/assets/exit.png";
  const titulo = typeof data.titulo === 'object' ? data.titulo[lang] : data.titulo;
  let html = '<div class="help-content"><img src="' + closeSrc + '" class="help-close" id="help-close"><h2 class="help-title">' + titulo + '</h2><div class="help-secciones">';

  data.secciones.forEach(function(s) {
    const stitulo = typeof s.titulo === 'object' ? s.titulo[lang] : s.titulo;
    const scontenido = typeof s.contenido === 'object' ? s.contenido[lang] : s.contenido;
    html += '<div class="help-seccion"><div class="help-seccion-header"><span class="help-icono">' + s.icono + '</span><h3>' + stitulo + '</h3></div><p class="help-texto">' + scontenido.replace(/\n/g, "<br>") + '</p></div>';
  });

  html += '</div></div>';
  overlay.innerHTML = html;
  overlay.classList.add("active");

  document.getElementById("help-close").onclick = function() { closeHelp(); };
  overlay.onclick = function(e) { if (e.target === overlay) closeHelp(); };
  document.addEventListener("keydown", helpKeyHandler);
}

function closeHelp() {
  const overlay = document.getElementById("help-overlay");
  if (overlay) overlay.classList.remove("active");
  document.removeEventListener("keydown", helpKeyHandler);
}

function helpKeyHandler(e) {
  if (e.key === "Escape") closeHelp();
}

function getBasePath() {
  const path = window.location.pathname;
  if (path.includes("/tienda/") || path.includes("/preguntas/") || (path.includes("/juegos/") && !path.includes("/memoria/") && !path.includes("/ruleta/") && !path.includes("/tragamonedasm/") && !path.includes("/casinoroyale/") && !path.includes("/balatro/") && !path.includes("/dados/"))) return "../";
  if (path.includes("/memoria/") || path.includes("/ruleta/") || path.includes("/tragamonedasm/") || path.includes("/casinoroyale/") || path.includes("/balatro/") || path.includes("/dados/")) return "../../";
  return "./";
}

function initHelpButton() {
  const page = getCurrentPage();
  const soloJuegos = ["tragamonedas", "memoria", "ruleta", "casinoroyale", "preguntas", "balatro", "duelodados"];
  if (!soloJuegos.includes(page)) return;
  if (document.getElementById("btn-ayuda")) return;
  const btn = document.createElement("div");
  btn.id = "btn-ayuda";
  btn.textContent = "?";
  btn.onclick = openHelp;
  document.body.appendChild(btn);
}

document.addEventListener("DOMContentLoaded", function() {
  // setTimeout(initHelpButton, 300);
});
