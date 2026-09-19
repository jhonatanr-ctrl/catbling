document.addEventListener("DOMContentLoaded", () => {
  // SELECCIÓN DE ÁREA Y OPCIONES
  let current = 0;

  function mostrarNoMonedasOverlay(costo) {
      if (typeof mostrarOverlayGlobal === 'function') {
          mostrarOverlayGlobal(costo);
      }
  }

  // Aviso de error técnico (RPC caída, función inexistente, red, etc.).
  // Deliberadamente independiente de mostrarOverlayGlobal(): ese overlay
  // se autocancela en silencio si el usuario ya tiene monedas suficientes
  // (ver resources/coins.js), lo cual está bien para "saldo insuficiente"
  // pero NO debe usarse para errores técnicos, donde el saldo es irrelevante
  // y el usuario necesita ver que algo falló en el servidor.
  function mostrarErrorTecnicoOverlay(mensaje) {
      const existente = document.getElementById("error-tecnico-overlay");
      if (existente) existente.remove();

      const overlay = document.createElement("div");
      overlay.id = "error-tecnico-overlay";
      overlay.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        max-width: 320px; text-align: center; padding: 16px 20px;
        font-family: 'Press Start 2P', cursive; font-size: 13px; line-height: 1.5;
        color: #ffffff; background: rgba(120, 0, 0, 0.92); border: 2px solid #ff5555;
        border-radius: 8px; z-index: 600; pointer-events: none;
        text-shadow: 0 0 10px rgba(255,0,0,0.6);
      `;
      overlay.textContent = "⚠️ " + (mensaje || ((typeof __ === 'function') ? __('error_conexion_servidor') : "Error de conexión con el servidor. Intenta de nuevo."));
      document.body.appendChild(overlay);

      setTimeout(() => {
          if (overlay.parentNode) overlay.remove();
      }, 3500);
  }

  const previews = [
      {id: "socials", img: "./assets/topics/socials.png", text: "SOCIALES", textKey: "topic_sociales", width: "183px"},
      {id: "literature", img: "./assets/topics/literaturetopic.png", text: "LITERATURA", textKey: "topic_literatura", width: "170px"},
      {id: "physics", img: "./assets/topics/physicstopic.png", text: "FÍSICA", textKey: "topic_fisica", width: "164px"},
      {id: "math", img: "./assets/topics/mathtopic.png", text: "MATEMÁTICAS", textKey: "topic_matematicas", width: "135px"},
      {id: "logic", img: "./assets/topics/logitopic.png", text: "LÓGICA", textKey: "topic_logica", width: "150px"},
      {id: "english", img: "./assets/topics/englishtopic.png", text: "INGLES", textKey: "topic_ingles", width: "169px"},
  ];

  function updateSelection(index) {
      options.forEach(opt => opt.classList.remove("active"));
      options[index].classList.add("active");
      previewImg.src = previews[index].img;
      previewText.innerText = (typeof __ === "function") ? __(previews[index].textKey, previews[index].text) : previews[index].text;
      previewImg.style.width = previews[index].width;
      previewImg.style.marginTop = "";
      previewImg.style.top = "";
      previewImg.style.marginBottom = "";
      previewImg.dataset.topic = previews[index].id;
  }

  const options = document.querySelectorAll(".option");
  const previewImg = document.getElementById("preview-img");
  const previewText = document.getElementById("display-text");

  options.forEach((opt, index) => {
      const wrapper = opt.closest('.option-wrapper');
      if (wrapper) {
          wrapper.addEventListener("mouseenter", () => {
              current = index;
              updateSelection(current);
          });
      }
  });

  updateSelection(0);

  // BOTÓN SALIDA ANIMADO
  const menuImg = document.getElementById("menu-img");
  const menuBtn = document.querySelector(".menu-button");
  let timeout1, timeout2;

  menuBtn.addEventListener("mouseenter", () => {
      clearTimeout(timeout1); clearTimeout(timeout2);
      timeout1 = setTimeout(() => { menuImg.src = "./assets/salida2.png"; }, 100);
      timeout2 = setTimeout(() => { menuImg.src = "./assets/salida3.png"; }, 300);
  });
  menuBtn.addEventListener("mouseleave", () => {
      clearTimeout(timeout1); clearTimeout(timeout2);
      menuImg.src = "./assets/salida3.png";
      timeout1 = setTimeout(() => { menuImg.src = "./assets/salida2.png"; }, 100);
      timeout2 = setTimeout(() => { menuImg.src = "./assets/salida1.png"; }, 300);
  });

  // DIFICULTAD
  // "costo" aquí es solo el costo de ENTRADA de la ronda (se cobra una vez,
  // vía cobrar_entrada_pregunta_ronda). La recompensa POR PREGUNTA ya no es
  // fija por dificultad: depende de la combinación real
  // (nivel académico x dificultad), calculada y validada en el servidor
  // (tabla recompensas_nivel). RECOMPENSAS_NIVEL de abajo es solo un espejo
  // para mostrar una vista previa en la UI (igual que el catálogo de la
  // tienda, que también está duplicado en cliente solo para mostrarlo).
  const dificultades = [
      { nombre: "FÁCIL",   labelKey: "nivel_facil",   img: "./assets/dificultades/facil.png",   tiempo: 10, costo: 5 },
      { nombre: "NORMAL",  labelKey: "nivel_normal",  img: "./assets/dificultades/normal.png",  tiempo: 15, costo: 10 },
      { nombre: "DIFÍCIL", labelKey: "nivel_dificil", img: "./assets/dificultades/difícil.png", tiempo: 25, costo: 15 },
  ];

  // Espejo de supabase/migrations/003_recompensas_dinamicas_antifarming.sql
  // (tabla recompensas_nivel). Solo para vista previa; el servidor jamás
  // confía en este objeto ni en ningún valor calculado en el cliente.
  const RECOMPENSAS_NIVEL = {
      primariaBasica:       { facil: 2, normal: 4,  dificil: 6  },
      primariaAvanzada:     { facil: 3, normal: 6,  dificil: 9  },
      bachilleratoBasico:   { facil: 4, normal: 8,  dificil: 12 },
      bachilleratoAvanzado: { facil: 5, normal: 10, dificil: 15 },
      universitario:        { facil: 7, normal: 13, dificil: 20 },
  };

  function obtenerNivelAcademicoActual() {
      return window.nivelAcademicoSeleccionado || 'bachilleratoAvanzado';
  }

  let dificultadActual = 0;
  const panel     = document.querySelector(".dificultad-panel");
  const nomEl     = document.getElementById("dificultad-nombre");
  const imgDifEl  = document.getElementById("dificultad-img");
  const flechaIzq = document.getElementById("flecha-izq");
  const flechaDer = document.getElementById("flecha-der");

  // Vista previa de recompensa: "Recompensa: +N monedas por acierto"
  const recompensaPreview = document.createElement("p");
  recompensaPreview.id = "recompensa-preview";
  panel.appendChild(recompensaPreview);

  function actualizarRecompensaPreview() {
      const claveDif = ["facil", "normal", "dificil"][dificultadActual];
      const nivel = obtenerNivelAcademicoActual();
      const tabla = RECOMPENSAS_NIVEL[nivel] || RECOMPENSAS_NIVEL.bachilleratoAvanzado;
      const valor = tabla[claveDif];
      recompensaPreview.textContent = (typeof __f === "function") ? __f("preg_recompensa_por_acierto", { valor: valor }) : `+${valor} 🪙 por acierto`;
  }

  function actualizarDificultad() {
      const d = dificultades[dificultadActual];
      nomEl.textContent = (typeof __ === "function") ? __(d.labelKey, d.nombre) : d.nombre;
      panel.dataset.dif = dificultadActual;
      imgDifEl.classList.remove("animar");
      void imgDifEl.offsetWidth;
      imgDifEl.src = d.img;
      imgDifEl.classList.add("animar");
      actualizarRecompensaPreview();
  }

  flechaIzq.addEventListener("click", () => {
    dificultadActual = (dificultadActual - 1 + dificultades.length) % dificultades.length;
    actualizarDificultad();
});
flechaDer.addEventListener("click", () => {
    dificultadActual = (dificultadActual + 1) % dificultades.length;
    actualizarDificultad();
});
actualizarDificultad();

  // PANTALLA CONFIRMACIÓN
const pantalla = document.createElement("div");
pantalla.id = "pantalla-resultado";
pantalla.innerHTML = `
    <h2 id="res-titulo" data-i18n="preg_seguro">¿SEGURO?</h2>
    <p id="res-area"></p>
    <p id="res-dif"></p>
    <div style="display:flex; gap:24px; margin-top:30px;">
        <img src="./assets/rejectbutton.png"  id="btn-volver-conf"  style="width:90px; cursor:pointer;">
        <img src="./assets/acceptbutton.png" id="btn-aceptar-conf" style="width:90px; cursor:pointer;">
    </div>
`;
document.body.appendChild(pantalla);

// 🎓 OVERLAY DE SELECCIÓN DE NIVEL ACADÉMICO
const nivelesAcademico = [
    { id: 'primariaBasica',     nombre: 'Primaria básica',       nombreKey: 'nivel_primaria_basica',       color: '#44cc44' },
    { id: 'primariaAvanzada',   nombre: 'Primaria avanzada',     nombreKey: 'nivel_primaria_avanzada',     color: '#ffdd00' },
    { id: 'bachilleratoBasico', nombre: 'Bachillerato básico',   nombreKey: 'nivel_bachillerato_basico',   color: '#ff8800' },
    { id: 'bachilleratoAvanzado', nombre: 'Bachillerato avanzado', nombreKey: 'nivel_bachillerato_avanzado', color: '#ff4444' },
    { id: 'universitario',      nombre: 'Universitario',         nombreKey: 'nivel_universitario',         color: '#9944ff' },
];

const nivelOverlay = document.createElement('div');
nivelOverlay.id = 'nivel-academico-overlay';
nivelOverlay.innerHTML = `
    <div id="nivel-overlay-content">
        <h2 id="nivel-titulo" data-i18n="preg_nivel_titulo">Selecciona tu nivel académico</h2>
        <div id="nivel-tarjetas">
            ${nivelesAcademico.map(n => `
                <div class="nivel-tarjeta" data-nivel="${n.id}" style="--nivel-color: ${n.color}">
                    <span class="nivel-tarjeta-texto" data-i18n="${n.nombreKey}">${n.nombre}</span>
                </div>
            `).join('')}
        </div>
    </div>
`;
document.body.appendChild(nivelOverlay);

function mostrarInterfazPreguntas() {
    const mainContainer = document.getElementById('main-container');
    mainContainer.style.display = 'block';

    const animElements = document.querySelectorAll('.dificultad-panel, .dificultad-selector, .dificultad-display, .flecha-dif');
    animElements.forEach(el => {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    });
}

function cerrarOverlayNivel() {
    mostrarInterfazPreguntas();
    nivelOverlay.classList.remove('visible');
    setTimeout(() => {
        if (nivelOverlay.parentNode) nivelOverlay.remove();
    }, 500);
}

nivelOverlay.querySelectorAll('.nivel-tarjeta').forEach(tarjeta => {
    tarjeta.addEventListener('click', () => {
        window.nivelAcademicoSeleccionado = tarjeta.dataset.nivel;
        if (typeof actualizarRecompensaPreview === 'function') actualizarRecompensaPreview();
        cerrarOverlayNivel();
    });
});

document.getElementById('main-container').style.display = 'none';
nivelOverlay.classList.add('visible');

const btnVolverConf = pantalla.querySelector("#btn-volver-conf");
const btnAceptarConf = pantalla.querySelector("#btn-aceptar-conf");

btnVolverConf.addEventListener("click", () => {
    pantalla.classList.remove("visible");
});

btnAceptarConf.addEventListener("mouseenter", () => {
    if (pantalla.classList.contains("visible")) {
        const fb = document.createElement("div");
        fb.id = "preview-moneda";
        fb.textContent = "-" + dificultades[dificultadActual].costo;
        document.body.appendChild(fb);
    }
});

btnAceptarConf.addEventListener("mouseleave", () => {
    const fb = document.getElementById("preview-moneda");
    if (fb) fb.remove();
});

btnAceptarConf.addEventListener("click", async () => {
    const costo = dificultades[currentDifficulty].costo;
    let currentCoins = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas') || '0');
    if (currentCoins === null && typeof fetchMonedas === 'function') {
        currentCoins = await fetchMonedas();
    }
    if (currentCoins < costo) {
        pantalla.classList.remove("visible");
        mostrarNoMonedasOverlay(costo);
        return;
    }

    const dificultadEntrada = ["facil", "normal", "dificil"][currentDifficulty];

    // COSTO DE ENTRADA de la ronda: se cobra UNA SOLA VEZ aquí, antes de
    // iniciarJuego(). La economía de cada respuesta individual la sigue
    // manejando registrar_respuesta_pregunta (sin cambios).
    let sesionValida = false;
    if (window.supabase && typeof window.supabase.auth.getSession === 'function') {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            sesionValida = !!session;
        } catch (e) {
            console.warn('[CATBLING][ECONOMIA] Error verificando sesión (entrada ronda):', e);
        }
    }

    if (sesionValida && window.apiRpc && window.apiRpc.cobrarEntradaPreguntaRonda) {
        console.log('[CATBLING][ECONOMIA] RPC cobrar_entrada_pregunta_ronda (entrada ronda)', {
            dificultad: dificultadEntrada,
            costo
        });

        try {
            const r = await window.apiRpc.cobrarEntradaPreguntaRonda(dificultadEntrada);

            console.log('[CATBLING][ECONOMIA] Resultado RPC entrada ronda', {
                success: r.success,
                ok: r.data?.ok,
                nuevo_saldo: r.data?.nuevo_saldo,
                error: r.error
            });

            if (!r.success || !r.data?.ok) {
                console.warn('[CATBLING][ECONOMIA] Entrada de ronda rechazada (saldo insuficiente u otro motivo):', r.error || r.data);
                if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                    await window.coinsAPI.fetch();
                } else if (typeof fetchMonedas === 'function') {
                    await fetchMonedas();
                }
                pantalla.classList.remove("visible");
                if (r.success) {
                    // r.success === true y data.ok === false: el servidor SÍ
                    // respondió y rechazó la operación explícitamente
                    // (p. ej. saldo insuficiente). Comportamiento sin cambios.
                    mostrarNoMonedasOverlay(costo);
                } else {
                    // r.success === false: la llamada RPC falló por un motivo
                    // técnico (función inexistente en el schema, red caída,
                    // error del servidor), no por saldo. No usar
                    // mostrarNoMonedasOverlay aquí: esa función se autocancela
                    // en silencio si el usuario ya tiene monedas suficientes,
                    // dejando el fallo sin ningún aviso visible.
                    mostrarErrorTecnicoOverlay((typeof __ === 'function') ? __('preg_no_pudo_iniciar_ronda') : 'No se pudo iniciar la ronda. Intenta de nuevo en unos segundos.');
                }
                return;
            }

            if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                await window.coinsAPI.fetch();
            } else if (typeof fetchMonedas === 'function') {
                await fetchMonedas();
            }
        } catch (e) {
            console.error('[CATBLING][ECONOMIA] Excepción cobrando entrada de ronda:', e);
            pantalla.classList.remove("visible");
            // Excepción real (red, JS, etc.) — nunca es "saldo insuficiente",
            // así que usamos el aviso de error técnico, no mostrarNoMonedasOverlay.
            mostrarErrorTecnicoOverlay((typeof __ === 'function') ? __('preg_no_pudo_iniciar_ronda') : 'No se pudo iniciar la ronda. Intenta de nuevo en unos segundos.');
            return;
        }
    } else if (typeof window.cambiarMonedasLocal === 'function') {
        // Invitado: mismo fallback local ya usado para la economía de preguntas
        window.cambiarMonedasLocal(-costo, false);
    }

    const rondaIniciada = await iniciarJuego(currentArea, currentDifficulty);
    if (rondaIniciada) {
        pantalla.classList.remove("visible");
    }
});

let currentArea = "";
let currentDifficulty = 0;

options.forEach((opt, index) => {
    const wrapper = opt.closest('.option-wrapper');
    const clickTarget = wrapper || opt;
    clickTarget.addEventListener("click", async () => {
        if (typeof invitadoPuedeResponder === 'function' && typeof requerirAutenticacion === 'function' && !(await invitadoPuedeResponder())) {
            requerirAutenticacion();
            return;
        }
        const costo = dificultades[dificultadActual].costo;
        let currentCoins = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas') || '0');
        if (currentCoins === null && typeof fetchMonedas === 'function') {
            currentCoins = await fetchMonedas();
        }
        if (currentCoins < costo) {
            mostrarNoMonedasOverlay(costo);
            return;
        }
        const areaTraducida = (typeof __ === "function") ? __(previews[index].textKey, previews[index].text) : previews[index].text;
        const difTraducida = (typeof __ === "function") ? __(dificultades[dificultadActual].labelKey, dificultades[dificultadActual].nombre) : dificultades[dificultadActual].nombre;
        document.getElementById("res-area").textContent = ((typeof __ === "function") ? __("preg_area_prefijo") : "Área:") + " " + areaTraducida;
        document.getElementById("res-dif").textContent  = ((typeof __ === "function") ? __("preg_dificultad_prefijo") : "Dificultad:") + " " + difTraducida;
        pantalla.classList.add("visible");
        currentArea = previews[index].text;
        currentDifficulty = dificultadActual;
    });
});

// SISTEMA DE JUEGO
const flashCorrecto   = document.createElement("div"); flashCorrecto.id   = "flash-correcto";
const flashIncorrecto = document.createElement("div"); flashIncorrecto.id = "flash-incorrecto";
const zonaPreguntas   = document.createElement("div"); zonaPreguntas.id   = "zona-preguntas";
const botonesPreg     = document.createElement("div"); botonesPreg.id     = "botones-pregunta";
const panelExpl       = document.createElement("div"); panelExpl.id       = "panel-explicacion";

zonaPreguntas.innerHTML = `
    <div id="contador-preguntas">
        <span class="respondidas" id="respondidas">0</span>
        <span class="slash">/</span>
        <span class="total" id="total">15</span>
    </div>
    <div id="bloque-pregunta">
        <p id="texto-pregunta"></p>
        <div id="opciones-respuesta"></div>
    </div>
`;

botonesPreg.innerHTML = `
    <img id="btn-explicacion" src="./assets/explicacion.png" title="Ver explicación" alt="EXPLICACIÓN" class="boton-pregunta-img" data-i18n-title="preg_ver_explicacion" data-i18n-alt="explicacion_titulo">
    <img id="btn-siguiente" src="./assets/arrowder1.png" title="Siguiente pregunta" alt="SIGUIENTE" class="boton-pregunta-img" data-i18n-title="preg_siguiente_pregunta" data-i18n-alt="siguiente">
`;

panelExpl.innerHTML = `<h3 data-i18n="explicacion_titulo">EXPLICACIÓN</h3><p id="texto-explicacion"></p>`;

document.body.appendChild(flashCorrecto);
document.body.appendChild(flashIncorrecto);
document.body.appendChild(zonaPreguntas);
document.body.appendChild(botonesPreg); botonesPreg.style.display = "none";
document.body.appendChild(panelExpl);

// elementos del juego
  let preguntasActuales = [];
  let indicePregunta    = 0;
  let preguntaIdActual  = null; // ID estable de la pregunta en pantalla, usado para el gate de "pregunta servida"
  let respondido        = false;
  let explicacionVisible = false;
  let preguntaTimerInterval = null;
  let tiempoRestante    = 15;
  let correctas         = 0;
  let incorrectas       = 0;

// Timer HTML
const timerElement = document.createElement("div");
timerElement.id = "timer-pregunta";
timerElement.innerHTML = '<span id="timer-texto">15</span>';
timerElement.style.display = "none";
document.body.appendChild(timerElement);

function iniciarTimer() {
    detenerTimer();
    const tiempoInicial = dificultades[currentDifficulty].tiempo || 15;
    tiempoRestante = tiempoInicial;
    timerElement.style.display = "block";
    actualizarTimerUI();
    
    preguntaTimerInterval = setInterval(() => {
        tiempoRestante--;
        actualizarTimerUI();
        
        if (tiempoRestante <= 0) {
            detenerTimer();
            if (!respondido) {
                tiempoAgotado();
            }
        }
    }, 1000);
}

function detenerTimer() {
    if (preguntaTimerInterval) {
        clearInterval(preguntaTimerInterval);
        preguntaTimerInterval = null;
    }
    timerElement.style.display = "none";
}

function actualizarTimerUI() {
    const timerTexto = document.getElementById("timer-texto");
    if (!timerTexto) return;
    
    const tiempoInicial = dificultades[currentDifficulty].tiempo || 15;
    timerTexto.textContent = tiempoRestante;
    
    // Calcular progreso (0 a 1, donde 1 es tiempo agotado)
    const progreso = 1 - (tiempoRestante / tiempoInicial);
    
    // Cambiar color gradualmente: verde -> amarillo -> naranja -> rojo
    let r, g, b = 0;
    
    if (progreso < 0.33) {
        // Verde a amarillo (0-33%)
        const p = progreso / 0.33;
        r = Math.round(255 * p);
        g = 255;
    } else if (progreso < 0.66) {
        // Amarillo a naranja (33-66%)
        const p = (progreso - 0.33) / 0.33;
        r = 255;
        g = Math.round(255 * (1 - p * 0.5));
    } else {
        // Naranja a rojo (66-100%)
        const p = (progreso - 0.66) / 0.34;
        r = 255;
        g = Math.round(127 * (1 - p));
    }
    
    timerTexto.style.color = `rgb(${r}, ${g}, ${b})`;
    timerTexto.style.textShadow = `0 0 20px rgba(${r}, ${g}, ${b}, 1), 0 0 40px rgba(${r}, ${g}, ${b}, 0.6)`;
    
    // Parpadeo más rápido cuando queda poco tiempo
    if (tiempoRestante <= 3) {
        timerTexto.style.animation = "blink 0.3s infinite";
    } else if (tiempoRestante <= 5) {
        timerTexto.style.animation = "blink 0.5s infinite";
    } else {
        timerTexto.style.animation = "none";
    }
}

function tiempoAgotado() {
    respondido = true;
    detenerTimer();
    
    const botones = document.querySelectorAll(".opcion-respuesta");
    botones.forEach(b => b.disabled = true);
    
    // Marcar como incorrecta
    botones.forEach(b => b.classList.add("incorrecta"));
    
    flashIncorrecto.classList.add("visible");
    setTimeout(() => flashIncorrecto.classList.remove("visible"), 600);
    
    // Flash rojo en toda la pantalla
    document.body.classList.add("flash-tiempo-agotado");
    setTimeout(() => document.body.classList.remove("flash-tiempo-agotado"), 600);
    
    incorrectas++;
    
    const btnExpl = document.getElementById("btn-explicacion");
    const btnSig  = document.getElementById("btn-siguiente");
    
    if (btnExpl) btnExpl.classList.add("habilitado");
    if (btnSig) btnSig.classList.add("habilitado");
}

// mezclar array y tomar n elementos
function mezclarYTomar(array, n) {
    const mezclado = [...array];
    for (let i = mezclado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    return mezclado.slice(0, n);
}

// barajar opciones pero mantener referencia a la correcta
function barajarConIndice(opciones, indiceCorrecto) {
    const items = opciones.map((texto, i) => ({ texto: texto, indiceOriginal: i }));
    const correcta = items[indiceCorrecto];
    
    // barajar el array
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    
    return items;
}

// elementos a animar al salir
const elementosSalida = [
    document.querySelector(".slot"),
    document.querySelector(".options"),
    document.querySelector(".machine-screen"),
    document.querySelector(".dificultad-panel"),
];

async function iniciarJuego(area, difIndex) {
    if (typeof invitadoPuedeResponder === 'function' && typeof requerirAutenticacion === 'function' && !(await invitadoPuedeResponder())) {
        console.warn('[CATBLING][PREGUNTAS] No se pudo iniciar la ronda: autenticación requerida.');
        return false;
    }

    // CAUSA RAÍZ (abandonar la ronda a medias permitía repetirla): antes
    // solo se llamaba a marcarPreguntasCompletadas() dentro de finJuego(),
    // es decir, al llegar al final de las 15 preguntas. Si el invitado
    // cerraba la pestaña, recargaba o navegaba fuera antes de terminar,
    // finJuego() nunca se ejecutaba y GUEST_QUESTIONS_KEY seguía en
    // "false", así que podía volver a entrar y recibir una ronda
    // completamente nueva sin límite. Se marca aquí, al arrancar la
    // ronda (justo tras el guard de arriba, que ya confirma que el
    // invitado SÍ tenía derecho a empezarla), para que "iniciar" ya
    // cuente como el uso, tal como pide el flujo esperado. La llamada
    // que ya existía en finJuego() se deja igual (es idempotente).
    if (typeof marcarPreguntasCompletadas === 'function') marcarPreguntasCompletadas();

    const claveDif = ["FACIL", "NORMAL", "DIFICIL"][difIndex];
    const claveArea = {
        "SOCIALES":    "SOCIALES",
        "LITERATURA":  "LITERATURA",
        "FÍSICA":      "FISICA",
        "MATEMÁTICAS": "MATEMATICAS",
        "LÓGICA":      "LOGICA",
        "INGLES":      "INGLES",
    }[area] || "SOCIALES";

    // Ocultar botón de ayuda mientras se responde
    const btnAyuda = document.getElementById("btn-ayuda");
    if (btnAyuda) btnAyuda.style.display = "none";

    // animar salida de elementos
    elementosSalida.forEach(el => {
        if (el) el.classList.add("salir-abajo");
    });

    setTimeout(() => {
        elementosSalida.forEach(el => {
            if (el) el.style.visibility = "hidden";
        });

        // cargar preguntas desde preguntas.js - solo 15 aleatorias
        // Se etiqueta cada pregunta con un ID estable
        // "nivel:area:dificultad:posición" (posición dentro del banco
        // ANTES de barajar), usado para el gate de "pregunta servida" y
        // la validación real de la respuesta en servidor. No requiere
        // tocar el contenido de questions.js.
        const nivelParaId = obtenerNivelAcademicoActual();
        const todasLasPreguntas = obtenerPreguntas(claveArea, claveDif).map((p, i) => ({
            ...p,
            _preguntaId: `${nivelParaId}:${claveArea}:${claveDif}:${i}`
        }));
        if (!todasLasPreguntas || todasLasPreguntas.length === 0) {
            alert((typeof __ === 'function') ? __('preg_sin_preguntas_nivel') : 'No hay preguntas disponibles para este nivel académico.');
            location.reload();
            return;
        }
        preguntasActuales = mezclarYTomar(todasLasPreguntas, 15);
        indicePregunta    = 0;
        correctas         = 0;
        incorrectas       = 0;
        zonaPreguntas.classList.add("activa");
        botonesPreg.style.display = "flex";
        mostrarPregunta();
    }, 650);
    return true;
}

function alternarExplicacion(forzarEstado = null) {
    if (!respondido) return false;
    if (forzarEstado !== null) {
        explicacionVisible = forzarEstado;
    } else {
        explicacionVisible = !explicacionVisible;
    }
    panelExpl.classList.toggle("visible", explicacionVisible);
    return explicacionVisible;
}

function mostrarPregunta(animacion = false) {
    respondido        = false;
    explicacionVisible = false;
    panelExpl.classList.remove("visible");

    const btnExpl = document.getElementById("btn-explicacion");
    const btnSig  = document.getElementById("btn-siguiente");
    if (btnExpl) btnExpl.classList.remove("habilitado");
    if (btnSig) btnSig.classList.remove("habilitado");

    const p = (typeof obtenerPreguntaTraducida === "function") ? obtenerPreguntaTraducida(preguntasActuales[indicePregunta]) : preguntasActuales[indicePregunta];
    const bloque = document.getElementById("bloque-pregunta");

    // Avisar al servidor de qué pregunta se está mostrando (gate de
    // "pregunta servida" + arranque del mínimo de lectura de 1.2s). No
    // bloquea el RENDER de la pregunta (se ve de inmediato); lo que sí
    // queda bloqueado hasta cumplir ese margen son los botones de
    // respuesta para usuarios autenticados (ver bloque de más abajo).
    preguntaIdActual = p._preguntaId || null;

    // CAUSA RAÍZ (las monedas no se actualizan correctamente tras cada
    // respuesta): registrar_respuesta_pregunta() en Supabase exige, como
    // parte de su antifraude, que hayan pasado >=1200ms desde que se
    // llamó a marcar_pregunta_servida() para ESA misma pregunta. Antes,
    // los botones de respuesta quedaban habilitados de inmediato mientras
    // marcarPreguntaServida() se disparaba en paralelo sin esperarse
    // ("fire and forget"): si el jugador respondía antes de que se
    // cumpliera ese margen (+ la latencia de red de esa llamada), el
    // servidor rechazaba la transacción (ok:false) sin lanzar ningún
    // error. El cliente nunca comprobaba ese campo "ok" (solo que
    // "nuevo_saldo" viniera definido, cosa que la RPC siempre devuelve,
    // incluso al rechazar), así que la animación optimista de +/- monedas
    // se mostraba igual, pero el saldo real nunca cambiaba y no había
    // ningún aviso. Se corrige esperando aquí ese mismo margen (solo para
    // usuarios autenticados, que son los que pasan por este candado del
    // servidor) antes de habilitar los botones, y comprobando "ok" al
    // procesar la respuesta (ver procesarRespuesta más abajo).
    const preguntaMostradaEn = Date.now();
    let promesaPreguntaServida = Promise.resolve();
    if (preguntaIdActual && window.apiRpc && window.apiRpc.marcarPreguntaServida) {
        const nivelParaServir = obtenerNivelAcademicoActual();
        const claveDifRpc = ["facil", "normal", "dificil"][currentDifficulty];
        promesaPreguntaServida = window.apiRpc.marcarPreguntaServida(nivelParaServir, claveDifRpc, preguntaIdActual)
            .catch(e => console.warn('[CATBLING][ECONOMIA] No se pudo marcar pregunta servida:', e));
    }

    document.getElementById("respondidas").textContent = indicePregunta + 1;
    document.getElementById("total").textContent = preguntasActuales.length;

    if (animacion) {
        bloque.classList.remove("entrar-derecha", "salir-izquierda");
        void bloque.offsetWidth;
        bloque.classList.add("entrar-derecha");
    }

    document.getElementById("texto-pregunta").textContent = p.pregunta;

    const contenedor = document.getElementById("opciones-respuesta");
    contenedor.innerHTML = "";

    // Barajar opciones
    const opcionesBarajadas = barajarConIndice(p.opciones, p.correcta);
    const indiceBarajadoCorrecto = opcionesBarajadas.findIndex(item => item.indiceOriginal === p.correcta);

    opcionesBarajadas.forEach((item, i) => {
        const btn = document.createElement("button");
        btn.className      = "opcion-respuesta";
        btn.textContent    = item.texto;
        btn.addEventListener("click", () => responder(i, indiceBarajadoCorrecto, p.explicacion, item.indiceOriginal));
        contenedor.appendChild(btn);
    });

    // Ver nota de "CAUSA RAÍZ" más arriba: para usuarios autenticados, no
    // dejar responder hasta que se cumpla el mismo margen que exige
    // registrar_respuesta_pregunta() en el servidor. Guest queda igual
    // que antes (su economía es local, sin este candado).
    if (typeof _isAuthenticatedSync === 'function' && _isAuthenticatedSync()) {
        const botonesDeEstaPregunta = Array.from(contenedor.querySelectorAll(".opcion-respuesta"));
        const idPreguntaDeEstosBotones = preguntaIdActual;
        botonesDeEstaPregunta.forEach(b => b.disabled = true);
        promesaPreguntaServida.then(() => {
            const restante = Math.max(0, 1300 - (Date.now() - preguntaMostradaEn));
            setTimeout(() => {
                // Si mientras se esperaba el jugador ya cambió de pregunta
                // (Cambiar/siguiente) o ya respondió, no reactivar botones
                // obsoletos.
                if (preguntaIdActual !== idPreguntaDeEstosBotones || respondido) return;
                botonesDeEstaPregunta.forEach(b => b.disabled = false);
            }, restante);
        });
    }

    // conectar botones
    if (btnExpl) {
        btnExpl.onclick = () => alternarExplicacion();
    }
    if (btnSig) {
        btnSig.onclick = () => {
            if (!respondido) return;
            const bloque = document.getElementById("bloque-pregunta");
            bloque.classList.remove("salir-izquierda", "entrar-derecha");
            void bloque.offsetWidth;
            bloque.classList.add("salir-izquierda");
            panelExpl.classList.remove("visible");

            setTimeout(() => {
                indicePregunta++;
                if (indicePregunta >= preguntasActuales.length) {
                    finJuego();
                } else {
                    mostrarPregunta(true);
                }
            }, 500);
        };
    }
    
    iniciarTimer();
}

function responder(elegida, correcta, explicacion, indiceOriginalElegido) {
    if (respondido) return;
    respondido = true;
    detenerTimer();

    const botones = document.querySelectorAll(".opcion-respuesta");
    botones.forEach(b => b.disabled = true);
    botones[correcta].classList.add("correcta");

    document.getElementById("texto-explicacion").textContent = explicacion;

    const btnExpl = document.getElementById("btn-explicacion");
    const btnSig  = document.getElementById("btn-siguiente");

    if (btnExpl) btnExpl.classList.add("habilitado");
    if (btnSig) btnSig.classList.add("habilitado");

    const esCorrecta = (elegida === correcta);
    // Vista previa optimista (se corrige de inmediato con el saldo real del
    // servidor tras la RPC). Refleja el nivel académico real, pero NO el
    // descuento por dominio -- ese ajuste fino solo importa para el saldo
    // real, que siempre se vuelve a sincronizar justo después via
    // window.coinsAPI.fetch().
    const nivelParaPreview = obtenerNivelAcademicoActual();
    const claveDifParaPreview = ["facil", "normal", "dificil"][currentDifficulty];
    const tablaParaPreview = RECOMPENSAS_NIVEL[nivelParaPreview] || RECOMPENSAS_NIVEL.bachilleratoAvanzado;
    const costoPregunta = tablaParaPreview[claveDifParaPreview];

    if (esCorrecta) {
        botones[elegida].classList.add("correcta");
        flashCorrecto.classList.add("visible");
        setTimeout(() => flashCorrecto.classList.remove("visible"), 600);
        correctas++;
        if (typeof mostrarAnimacionMonedas === 'function') {
            mostrarAnimacionMonedas(costoPregunta, true);
        }
    } else {
        botones[elegida].classList.add("incorrecta");
        flashIncorrecto.classList.add("visible");
        setTimeout(() => flashIncorrecto.classList.remove("visible"), 600);
        incorrectas++;
        if (typeof mostrarAnimacionMonedas === 'function') {
            mostrarAnimacionMonedas(-costoPregunta, false);
        }
    }

    // TRANSACCIÓN ECONÓMICA REAL EN SUPABASE por cada respuesta
    async function procesarRespuesta() {
        if (!window.apiRpc || !window.apiRpc.registrarRespuestaPregunta) {
            console.warn('[CATBLING][ECONOMIA] RPC registrarRespuestaPregunta no disponible');
            if (typeof window.cambiarMonedasLocal === 'function') {
                window.cambiarMonedasLocal(esCorrecta ? costoPregunta : -costoPregunta, esCorrecta);
            }
            return;
        }

        // Verificar sesión Supabase real antes de ejecutar RPC
        if (window.supabase && typeof window.supabase.auth.getSession === 'function') {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (!session) {
                    console.warn('[CATBLING][ECONOMIA] Sin sesión Supabase válida — no se ejecuta RPC');
                    if (typeof window.cambiarMonedasLocal === 'function') {
                        window.cambiarMonedasLocal(esCorrecta ? costoPregunta : -costoPregunta, esCorrecta);
                    }
                    return;
                }
            } catch (e) {
                console.warn('[CATBLING][ECONOMIA] Error verificando sesión:', e);
            }
        }

        const dificultad = ["facil", "normal", "dificil"][currentDifficulty];
        const nivelAcademico = obtenerNivelAcademicoActual();

        console.log('[CATBLING][ECONOMIA] RPC registrar_respuesta_pregunta', {
            nivelAcademico,
            dificultad,
            preguntaId: preguntaIdActual,
            indiceOriginalElegido,
            costoPregunta
        });

        try {
            const r = await window.apiRpc.registrarRespuestaPregunta(nivelAcademico, dificultad, preguntaIdActual, indiceOriginalElegido);
            
            console.log('[CATBLING][ECONOMIA] Resultado RPC', {
                success: r.success,
                ok: r.data?.ok,
                nuevo_saldo: r.data?.nuevo_saldo,
                error: r.error
            });

            // CAUSA RAÍZ: antes solo se comprobaba "r.data?.nuevo_saldo !==
            // undefined", pero registrar_respuesta_pregunta() SIEMPRE
            // devuelve nuevo_saldo (incluso cuando rechaza la respuesta),
            // así que esta rama se tomaba como "éxito" tanto si la
            // transacción se aplicó como si el servidor la rechazó por su
            // antifraude (ok:false). Ahora se exige "ok === true" para
            // considerar la respuesta realmente registrada.
            if (r.success && r.data?.ok === true && r.data?.nuevo_saldo !== undefined) {
                console.log('[CATBLING][ECONOMIA] Transacción confirmada en Supabase, nuevo saldo:', r.data.nuevo_saldo);
                if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                    await window.coinsAPI.fetch();
                } else if (typeof fetchMonedas === 'function') {
                    await fetchMonedas();
                }
            } else {
                console.warn('[CATBLING][ECONOMIA] RPC falló o rechazó la respuesta:', {
                    error: r.error,
                    data: r.data
                });
                // NO modificar saldo local - obtener saldo real de Supabase
                if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                    await window.coinsAPI.fetch();
                } else if (typeof fetchMonedas === 'function') {
                    await fetchMonedas();
                }
                // Avisar honestamente: la animación ya mostró +/- monedas,
                // pero el servidor no aplicó el cambio. Se reutiliza el
                // overlay de error técnico ya existente en este archivo
                // (no se crea un segundo sistema de avisos).
                if (r.success && r.data?.ok === false) {
                    mostrarErrorTecnicoOverlay((typeof __ === 'function') ? __('preg_respuesta_no_registrada') : 'Esta respuesta no se pudo registrar. Se muestra tu saldo real.');
                } else {
                    mostrarErrorTecnicoOverlay();
                }
            }
        } catch (e) {
            console.error('[CATBLING][ECONOMIA] Excepción en RPC:', {
                message: e.message,
                stack: e.stack,
                name: e.name
            });
            // NO modificar saldo local - obtener saldo real de Supabase
            if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                await window.coinsAPI.fetch();
            } else if (typeof fetchMonedas === 'function') {
                await fetchMonedas();
            }
        }
    }

    procesarRespuesta();
    alternarExplicacion(true);
}

function cambiarMonedasLocal(valor, positivo) {
    if (_isAuthenticatedSync()) {
        // Para usuarios autenticados, las mutaciones reales se hacen via RPC.
        console.warn('[preguntas] cambiarMonedasLocal: uso RPC para usuarios autenticados');
        return;
    }
    
    // Fallback para invitados
    if (typeof window.cambiarMonedas === 'function') {
        window.cambiarMonedas(valor);
    } else if (typeof setMonedas === 'function') {
        const actual = typeof getMonedas === 'function' ? getMonedas() : 0;
        const nuevo = Math.max(0, actual + valor);
        setMonedas(nuevo);
        if (typeof actualizarUI === 'function') actualizarUI();
    }

    if (typeof mostrarAnimacionMonedas === 'function') {
        mostrarAnimacionMonedas(valor, positivo);
    } else {
        // Fallback: crear el feedback flotante
        const fb = document.createElement("div");
        fb.className   = "feedback-monedas " + (positivo ? "positivo" : "negativo");
        fb.textContent = (positivo ? "+" : "") + Math.abs(valor);
        
        // Posicionar cerca del icono de monedas
        const icono = document.querySelector('.monedas-ui img');
        if (icono) {
            const rect = icono.getBoundingClientRect();
            fb.style.position = 'fixed';
            fb.style.left = (rect.left + rect.width / 2) + 'px';
            fb.style.top = (rect.top - 20) + 'px';
            fb.style.transform = 'translateX(-50%)';
        } else {
            fb.style.right = '180px';
            fb.style.top = '40px';
        }
        
        document.body.appendChild(fb);
        setTimeout(() => fb.remove(), 1200);
    }
}

async function finJuego() {
    if (typeof marcarPreguntasCompletadas === 'function') marcarPreguntasCompletadas();
    detenerTimer();
    zonaPreguntas.classList.remove("activa");
    botonesPreg.style.display = "none";
    panelExpl.classList.remove("visible");

    // Registrar ronda en Supabase via RPC (SOLO ESTADÍSTICAS - cambios monetarios ya hechos por pregunta)
    let monedasFinal = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem("monedas") || "0");
    let rondaRegistrada = false;
    let dominioMensaje = '';

    // CAUSA RAÍZ ("Ronda no registrada" aparece también para invitados):
    // esta condición comprobaba solo si window.apiRpc.registrarRondaPreguntas
    // EXISTE como función -- y existe siempre, para invitado y autenticado
    // por igual, ya que api.js define el objeto apiRpc sin condicionarlo a
    // la sesión. Así que un invitado también entraba a esta rama, llamaba
    // a la RPC real, y esta la rechazaba (ok:false) porque auth.uid() es
    // NULL sin sesión -- mostrando "Ronda no registrada" SIEMPRE al
    // invitado, aunque su ronda local fuera perfectamente normal. El resto
    // del flujo (cobrar_entrada_pregunta_ronda más arriba, procesarRespuesta
    // más abajo) ya comprobaba la sesión real antes de llamar a su RPC; se
    // aplica aquí el mismo patrón para que sea consistente en todo el
    // archivo.
    let sesionValidaFin = false;
    if (window.supabase && typeof window.supabase.auth.getSession === 'function') {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            sesionValidaFin = !!session;
        } catch (e) {
            console.warn('[CATBLING][ECONOMIA] Error verificando sesión (fin de ronda):', e);
        }
    }

    if (sesionValidaFin && window.apiRpc && window.apiRpc.registrarRondaPreguntas) {
        try {
            const dificultad = ["facil", "normal", "dificil"][currentDifficulty]; // sin tildes, coincide con el enum dificultad_nivel de Supabase
            const nivelAcademico = obtenerNivelAcademicoActual();
            const tablaEstim = RECOMPENSAS_NIVEL[nivelAcademico] || RECOMPENSAS_NIVEL.bachilleratoAvanzado;
            const costoPregunta = tablaEstim[dificultad];
            // monedas_ganadas: solo un valor informativo enviado al servidor
            // (que la RPC ya recalcula por su cuenta y no usa como fuente de
            // verdad); NO se aplican cambios monetarios aquí, ya se hicieron
            // vía registrar_respuesta_pregunta por cada respuesta.
            const monedas_ganadas = (correctas - incorrectas) * costoPregunta;

            console.log('[CATBLING][ECONOMIA] RPC registrar_ronda_preguntas', {
                nivelAcademico,
                dificultad,
                area: currentArea,
                preguntasTotal: 15,
                correctas,
                incorrectas,
                monedas_ganadas
            });

            const r = await window.apiRpc.registrarRondaPreguntas(nivelAcademico, dificultad, currentArea, 15, correctas, monedas_ganadas);

            console.log('[CATBLING][ECONOMIA] Resultado RPC ronda', {
                success: r.success,
                id: r.data?.id,
                error: r.error
            });

            if (r.success && r.data?.ok) {
                rondaRegistrada = true;
                // Obtener saldo real actualizado (ya modificado por registrar_respuesta_pregunta)
                if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                    monedasFinal = await window.coinsAPI.fetch();
                } else if (typeof fetchMonedas === 'function') {
                    monedasFinal = await fetchMonedas();
                }

                // Mensaje amigable de progresión (NO académico/vigilante):
                // se consulta el dominio vigente de ESTA combinación y, si
                // está alto, se invita a subir de dificultad/nivel para
                // mejores recompensas -- nunca se bloquea ni se acusa nada.
                if (window.apiRpc.obtenerDominioActual) {
                    try {
                        const d = await window.apiRpc.obtenerDominioActual(nivelAcademico, dificultad);
                        if (d.success && d.data?.racha_dominio >= 4) {
                            const txtDomina = (typeof __ === 'function') ? __('preg_dominas_nivel') : '💪 ¡Dominas este nivel! Prueba una dificultad o nivel mayor para ganar más monedas.';
                            dominioMensaje = '<p style="font-family:\'Pixelify Sans\',sans-serif; color:#7fffd4; font-size:15px; margin-bottom:10px;">' + txtDomina + '</p>';
                        }
                    } catch (e) {
                        console.warn('[CATBLING][ECONOMIA] No se pudo leer dominio actual:', e);
                    }
                }
            } else {
                console.warn('[CATBLING][ECONOMIA] RPC registrar_ronda_preguntas falló:', {
                    error: r.error,
                    data: r.data
                });
                // Obtener saldo real aunque falle el registro de estadísticas
                if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                    monedasFinal = await window.coinsAPI.fetch();
                }
            }
        } catch (e) {
            console.warn('[preguntas] Error registrando ronda:', e);
            if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                monedasFinal = await window.coinsAPI.fetch();
            }
        }
    } else {
        // Invitado (sin sesión válida) o sin RPC disponible: no se llama a
        // Supabase, se usa el saldo local (fetchMonedas ya distingue esto).
        if (typeof fetchMonedas === 'function') {
            monedasFinal = await fetchMonedas();
        }
    }

    const fin = document.createElement("div");
    fin.style.cssText = `
        position:fixed; inset:0; display:flex; flex-direction:column;
        justify-content:center; align-items:center; z-index:350;
        background:rgba(0,0,0,0.85);
    `;
    
    let mensajeExtra = '';
    if (!rondaRegistrada && sesionValidaFin && window.apiRpc && window.apiRpc.registrarRondaPreguntas) {
        const txtNoRegistrada = (typeof __ === 'function') ? __('preg_ronda_no_registrada') : '⚠ Ronda no registrada en servidor. Se muestra saldo actual.';
        mensajeExtra = '<p style="font-family:\'Pixelify Sans\',sans-serif; color:#ffaa00; font-size:14px; margin-bottom:10px;">' + txtNoRegistrada + '</p>';
    }
    const txtCompletado = (typeof __ === 'function') ? __('preg_completado') : '¡COMPLETADO!';
    const txtResumen = (typeof __f === 'function') ? __f('preg_resultado_resumen', { correctas: correctas, incorrectas: incorrectas, monedas: monedasFinal }) : ('Correctas: ' + correctas + ' | Incorrectas: ' + incorrectas + ' | Monedas: ' + monedasFinal);

    fin.innerHTML = `
        <p style="font-family:'Press Start 2P',cursive; color:gold; font-size:20px; margin-bottom:20px;">
            ${txtCompletado}
        </p>
        <p style="font-family:'Pixelify Sans',sans-serif; color:white; font-size:26px; margin-bottom:30px;">
            ${txtResumen}
        </p>
        ${mensajeExtra}
        ${dominioMensaje}
        <img src="./assets/reply-arrow.png" id="btn-fin-volver"
             style="width:90px; cursor:pointer;">
    `;
    document.body.appendChild(fin);

    document.getElementById("btn-fin-volver").addEventListener("click", () => {
        location.reload();
    });
}

// ⏸️ PAUSAR / REANUDAR TIMER (usado por la bolsa)
window.pausarTimerPregunta = function() {
  if (!juegoEstaActivo()) return;
  if (!preguntaTimerInterval) return;
  if (respondido) return;
  clearInterval(preguntaTimerInterval);
  preguntaTimerInterval = null;
  // Keep the timer visible so the player sees the frozen time
  timerElement.style.display = 'block';
};

window.reanudarTimerPregunta = function() {
  if (!juegoEstaActivo()) return;
  if (respondido) return;
  if (preguntaTimerInterval) return;
  if (tiempoRestante <= 0) return;
  timerElement.style.display = 'block';
  preguntaTimerInterval = setInterval(() => {
    tiempoRestante--;
    actualizarTimerUI();
    if (tiempoRestante <= 0) {
      detenerTimer();
      if (!respondido) {
        tiempoAgotado();
      }
    }
  }, 1000);
};

// 🎯 SISTEMA DE ITEMS EN PREGUNTAS
window.itemsActivosPregunta = {};

function juegoEstaActivo() {
  return zonaPreguntas && zonaPreguntas.classList.contains('activa');
}

function obtenerRespuestaCorrecta() {
  const botones = document.querySelectorAll(".opcion-respuesta");
  for (let i = 0; i < botones.length; i++) {
    if (botones[i].classList.contains("correcta")) {
      return { boton: botones[i], indice: i };
    }
  }
  const p = preguntasActuales[indicePregunta];
  if (!p) return null;
  const opcionesBarajadas = document.querySelectorAll(".opcion-respuesta");
  const correctaOriginal = p.correcta;
  const opcionesConIndice = p.opciones.map((texto, i) => ({ texto, indiceOriginal: i }));
  for (let i = 0; i < opcionesConIndice.length; i++) {
    const item = opcionesConIndice[i];
    if (item.indiceOriginal === correctaOriginal) {
      return { boton: opcionesBarajadas[i], indice: i, texto: item.texto };
    }
  }
  return null;
}

function getIndiceCorrectoBarajado() {
  const p = preguntasActuales[indicePregunta];
  if (!p) return -1;
  const opcionesBarajadas = p.opciones.map((texto, i) => ({ texto, indiceOriginal: i }));
  for (let i = 0; i < opcionesBarajadas.length; i++) {
    if (opcionesBarajadas[i].indiceOriginal === p.correcta) return i;
  }
  return -1;
}

function aplicarPistaBreve() {
  if (!juegoEstaActivo()) return;
  const p = (typeof obtenerPreguntaTraducida === "function") ? obtenerPreguntaTraducida(preguntasActuales[indicePregunta]) : preguntasActuales[indicePregunta];
  if (!p) return;
  const palabras = (p.explicacion || p.pregunta).split(/\s+/).filter(w => w.length > 4);
  if (palabras.length === 0) return;
  const palabraClave = palabras[Math.floor(Math.random() * palabras.length)];
  
  const hintEl = document.createElement("div");
  hintEl.id = "pista-breve-hint";
  hintEl.style.cssText = `
    position: fixed; top: 15%; left: 50%; transform: translateX(-50%);
    font-family: 'Press Start 2P', cursive; font-size: 14px;
    color: #00ffff; background: rgba(0,0,0,0.8);
    border: 2px solid #00ffff; border-radius: 10px;
    padding: 12px 24px; z-index: 500;
    text-shadow: 0 0 15px rgba(0,255,255,0.8);
    animation: pista-aparecer 0.5s ease forwards;
  `;
  hintEl.textContent = (typeof __f === "function") ? __f("preg_pista_prefijo", { palabra: palabraClave }) : ("💡 Pista: " + palabraClave);
  document.body.appendChild(hintEl);
  setTimeout(() => {
    if (hintEl.parentNode) hintEl.remove();
  }, 8000);
}

function aplicarEliminarOpcion() {
  if (!juegoEstaActivo()) return;
  const botones = document.querySelectorAll(".opcion-respuesta");
  if (botones.length <= 1) return;
  const correctoIdx = getIndiceCorrectoBarajado();
  const incorrectos = [];
  botones.forEach((b, i) => {
    if (i !== correctoIdx && b.style.display !== 'none') incorrectos.push(b);
  });
  if (incorrectos.length === 0) return;
  const eliminar = incorrectos[Math.floor(Math.random() * incorrectos.length)];
  eliminar.style.transition = 'all 0.5s cubic-bezier(0.55, 0, 1, 0.45)';
  eliminar.style.transform = 'scale(0)';
  eliminar.style.opacity = '0';
  setTimeout(() => { eliminar.style.display = 'none'; }, 500);
}

let congelarTimeout = null;

function aplicarCongelarTiempo() {
  if (!juegoEstaActivo() || !preguntaTimerInterval || respondido) return;
  const tiempoActual = tiempoRestante;
  detenerTimer();
  const overlay = document.createElement("div");
  overlay.id = "congelar-overlay";
  overlay.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-family: 'Press Start 2P', cursive; font-size: 24px;
    color: #00aaff; z-index: 500; pointer-events: none;
    text-shadow: 0 0 30px rgba(0,170,255,0.9);
    animation: congelar-pulse 0.5s ease infinite alternate;
  `;
  overlay.textContent = "⏸️ TIEMPO CONGELADO";
  document.body.appendChild(overlay);
  
  if (congelarTimeout) clearTimeout(congelarTimeout);
  congelarTimeout = setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
    if (!respondido) {
      tiempoRestante = tiempoActual;
      timerElement.style.display = "block";
      iniciarTimer();
    }
  }, 3000);
}

function aplicarCambiarPregunta() {
  if (!juegoEstaActivo() || respondido) return;
  const btnSig = document.getElementById("btn-siguiente");
  if (btnSig && btnSig.classList.contains("habilitado")) {
    btnSig.click();
    return;
  }
  detenerTimer();
  respondido = true;
  const bloque = document.getElementById("bloque-pregunta");
  bloque.classList.remove("salir-izquierda", "entrar-derecha");
  void bloque.offsetWidth;
  bloque.classList.add("salir-izquierda");
  panelExpl.classList.remove("visible");
  setTimeout(() => {
    indicePregunta++;
    if (indicePregunta >= preguntasActuales.length) {
      finJuego();
    } else {
      mostrarPregunta(true);
    }
  }, 500);
}

function aplicarRespuestaPopular() {
  if (!juegoEstaActivo()) return;
  const p = preguntasActuales[indicePregunta];
  if (!p) return;
  const botones = document.querySelectorAll(".opcion-respuesta");
  if (botones.length === 0) return;
  const correctoIdx = getIndiceCorrectoBarajado();
  const esCorrecta = Math.random() < 0.6;
  const elegirIdx = esCorrecta ? correctoIdx : (() => {
    const incorrectos = [];
    botones.forEach((_, i) => { if (i !== correctoIdx) incorrectos.push(i); });
    return incorrectos[Math.floor(Math.random() * incorrectos.length)];
  })();
  
  const popularEl = document.createElement("div");
  popularEl.style.cssText = `
    position: fixed; z-index: 500; pointer-events: none;
    font-family: 'Press Start 2P', cursive; font-size: 12px;
    color: #ffd700; text-shadow: 0 0 15px rgba(255,215,0,0.8);
    animation: popular-flotar 3s ease forwards;
  `;
  const rect = botones[elegirIdx].getBoundingClientRect();
  popularEl.style.left = (rect.right + 10) + 'px';
  popularEl.style.top = (rect.top + rect.height / 2 - 10) + 'px';
  popularEl.textContent = (typeof __ === "function") ? __("preg_popular") : "👥 POPULAR";
  document.body.appendChild(popularEl);
  setTimeout(() => { if (popularEl.parentNode) popularEl.remove(); }, 3000);
  
  botones[elegirIdx].style.borderColor = '#ffd700';
  botones[elegirIdx].style.boxShadow = '0 0 20px rgba(255,215,0,0.8)';
  setTimeout(() => {
    botones[elegirIdx].style.borderColor = '';
    botones[elegirIdx].style.boxShadow = '';
  }, 3000);
}

function aplicarReintentar() {
  if (!juegoEstaActivo() || !respondido) return;
  const btnExpl = document.getElementById("btn-explicacion");
  const btnSig = document.getElementById("btn-siguiente");
  const botones = document.querySelectorAll(".opcion-respuesta");
  botones.forEach(b => {
    b.disabled = false;
    b.classList.remove("correcta", "incorrecta");
    b.style.borderColor = 'rgba(255,215,0,0.5)';
    b.style.background = 'rgba(0,0,0,0.55)';
  });
  respondido = false;
  if (btnExpl) btnExpl.classList.remove("habilitado");
  if (btnSig) btnSig.classList.remove("habilitado");
  panelExpl.classList.remove("visible");
  const tiempoInicial = dificultades[currentDifficulty].tiempo || 15;
  tiempoRestante = tiempoInicial;
  timerElement.style.display = "block";
  iniciarTimer();
  
  const msg = document.createElement("div");
  msg.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    font-family: 'Press Start 2P', cursive; font-size: 14px;
    color: #ff8800; z-index: 500; animation: flotar-feedback 2s ease forwards;
    text-shadow: 0 0 20px rgba(255,136,0,0.8);
  `;
  msg.textContent = (typeof __ === "function") ? __("preg_intenta_de_nuevo") : "♻️ ¡INTENTA DE NUEVO!";
  document.body.appendChild(msg);
  setTimeout(() => { if (msg.parentNode) msg.remove(); }, 2000);
}

function aplicarTiempoInfinito() {
  if (!juegoEstaActivo() || respondido) return;
  detenerTimer();
  timerElement.style.display = "none";
  
  const msg = document.createElement("div");
  msg.id = "infinito-msg";
  msg.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    font-family: 'Press Start 2P', cursive; font-size: 16px;
    color: #ff00ff; z-index: 500; pointer-events: none;
    text-shadow: 0 0 30px rgba(255,0,255,0.9);
    animation: flotar-feedback 3s ease forwards;
  `;
  msg.textContent = (typeof __ === "function") ? __("preg_tiempo_infinito") : "⌛ ¡TIEMPO INFINITO!";
  document.body.appendChild(msg);
  setTimeout(() => { if (msg.parentNode) msg.remove(); }, 3000);
}

function aplicarTicketDorado() {
  if (!juegoEstaActivo() || respondido) return;
  const correcto = getIndiceCorrectoBarajado();
  if (correcto < 0) return;
  const botones = document.querySelectorAll(".opcion-respuesta");
  if (botones[correcto]) {
    botones[correcto].click();
  }
}

// 🎯 FUNCIÓN PRINCIPAL - llamada desde config.js
window.aplicarItemPregunta = function(nombre, itemData) {
  switch (nombre) {
    case "Pista": return aplicarPistaBreve();
    case "Eliminar": return aplicarEliminarOpcion();
    case "Congelar": return aplicarCongelarTiempo();
    case "Cambiar": return aplicarCambiarPregunta();
    case "Popular": return aplicarRespuestaPopular();
    case "Reintentar": return aplicarReintentar();
    case "Infinito": return aplicarTiempoInfinito();
    case "Dorado": return aplicarTicketDorado();
    default: return;
  }
};

// Añadir keyframes dinámicos para animaciones de items
  (function() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pista-aparecer {
        0% { transform: translateX(-50%) scale(0); opacity: 0; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }
      @keyframes congelar-pulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
      }
      @keyframes popular-flotar {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-40px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  })();

  // 🔊 ACTIVAR AUDIO (por interacción del usuario)
  const musica = document.getElementById("bgMusic");
  if (musica) {
    document.addEventListener("click", () => {
      musica.muted = false;
      musica.play().catch(() => {});
    }, { once: true });
  }

  if (typeof tutorialInit === 'function') tutorialInit();

  // Refresca los textos ya visibles (selector de área, panel de
  // dificultad, pantalla de confirmación) si el usuario cambia de idioma,
  // sin recargar la página. currentArea/claveArea (usados como IDs
  // internos) no se tocan, solo lo que se muestra en pantalla.
  window.addEventListener('idiomaAplicado', function () {
    if (typeof __ !== 'function') return;
    previewText.innerText = __(previews[current].textKey, previews[current].text);
    nomEl.textContent = __(dificultades[dificultadActual].labelKey, dificultades[dificultadActual].nombre);
    if (typeof actualizarRecompensaPreview === 'function') actualizarRecompensaPreview();
    if (pantalla.classList.contains('visible')) {
      const areaEl = document.getElementById('res-area');
      const difEl = document.getElementById('res-dif');
      if (areaEl) areaEl.textContent = __('preg_area_prefijo') + ' ' + __(previews[current].textKey, previews[current].text);
      if (difEl) difEl.textContent = __('preg_dificultad_prefijo') + ' ' + __(dificultades[dificultadActual].labelKey, dificultades[dificultadActual].nombre);
    }
    // Nota: la pregunta actualmente visible (si hay una ronda en curso) no
    // se vuelve a renderizar aquí a propósito: mostrarPregunta() reinicia
    // el temporizador de la ronda, así que hacerlo solo por un cambio de
    // idioma penalizaría injustamente el tiempo del jugador. La pregunta
    // en curso se termina de responder en el idioma en que se mostró; la
    // traducción (si existe) se aplicará a partir de la siguiente
    // pregunta, que ya pasa por obtenerPreguntaTraducida().
  });
});

