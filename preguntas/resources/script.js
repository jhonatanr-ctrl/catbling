document.addEventListener("DOMContentLoaded", () => {
  // SELECCIÓN DE ÁREA Y OPCIONES
  let current = 0;

  function mostrarNoMonedasOverlay(costo) {
      if (typeof mostrarOverlayGlobal === 'function') {
          mostrarOverlayGlobal(costo);
      }
  }

  const previews = [
      {img: "./assets/topics/socials.png",      text: "SOCIALES",     width: "183px", marginTop: "19px"},
      {img: "./assets/topics/literaturetopic.png", text: "LITERATURA", width: "170px", marginTop: "6px"},
      {img: "./assets/topics/physicstopic.png", text: "FÍSICA",        width: "164px", marginTop: "6px"},
      {img: "./assets/topics/mathtopic.png",    text: "MATEMÁTICAS",   width: "135px", marginTop: "12px"},
      {img: "./assets/topics/logitopic.png",    text: "LÓGICA",        width: "150px", marginTop: "1px"},
      {img: "./assets/topics/englishtopic.png", text: "INGLES",        width: "169px", marginTop: "-25px"},
  ];

  function updateSelection(index) {
      options.forEach(opt => opt.classList.remove("active"));
      options[index].classList.add("active");
      previewImg.src = previews[index].img;
      previewText.innerText = previews[index].text;
      previewImg.style.width = previews[index].width;
      previewImg.style.marginTop = previews[index].marginTop;
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
  const dificultades = [
      { nombre: "FÁCIL",   img: "./assets/dificultades/facil.png",   tiempo: 10, costo: 5 },
      { nombre: "NORMAL",  img: "./assets/dificultades/normal.png",  tiempo: 15, costo: 10 },
      { nombre: "DIFÍCIL", img: "./assets/dificultades/difícil.png", tiempo: 25, costo: 15 },
  ];

  let dificultadActual = 0;
  const panel     = document.querySelector(".dificultad-panel");
  const nomEl     = document.getElementById("dificultad-nombre");
  const imgDifEl  = document.getElementById("dificultad-img");
  const flechaIzq = document.getElementById("flecha-izq");
  const flechaDer = document.getElementById("flecha-der");

  function actualizarDificultad() {
      const d = dificultades[dificultadActual];
      nomEl.textContent = d.nombre;
      panel.dataset.dif = dificultadActual;
      imgDifEl.classList.remove("animar");
      void imgDifEl.offsetWidth;
      imgDifEl.src = d.img;
      imgDifEl.classList.add("animar");
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
    <h2 id="res-titulo">¿SEGURO?</h2>
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
    { id: 'primariaBasica',     nombre: 'Primaria básica',       color: '#44cc44' },
    { id: 'primariaAvanzada',   nombre: 'Primaria avanzada',     color: '#ffdd00' },
    { id: 'bachilleratoBasico', nombre: 'Bachillerato básico',   color: '#ff8800' },
    { id: 'bachilleratoAvanzado', nombre: 'Bachillerato avanzado', color: '#ff4444' },
    { id: 'universitario',      nombre: 'Universitario',         color: '#9944ff' },
];

const nivelOverlay = document.createElement('div');
nivelOverlay.id = 'nivel-academico-overlay';
nivelOverlay.innerHTML = `
    <div id="nivel-overlay-content">
        <h2 id="nivel-titulo">Selecciona tu nivel académico</h2>
        <div id="nivel-tarjetas">
            ${nivelesAcademico.map(n => `
                <div class="nivel-tarjeta" data-nivel="${n.id}" style="--nivel-color: ${n.color}">
                    <span class="nivel-tarjeta-texto">${n.nombre}</span>
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

btnAceptarConf.addEventListener("click", () => {
    const costo = dificultades[currentDifficulty].costo;
    const currentCoins = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas') || '0');
    if (currentCoins < costo) {
        pantalla.classList.remove("visible");
        mostrarNoMonedasOverlay(costo);
        return;
    }
    pantalla.classList.remove("visible");
    cambiarMonedasLocal(-costo, false);
    iniciarJuego(currentArea, currentDifficulty);
});

let currentArea = "";
let currentDifficulty = 0;

options.forEach((opt, index) => {
    const wrapper = opt.closest('.option-wrapper');
    const clickTarget = wrapper || opt;
    clickTarget.addEventListener("click", () => {
        if (typeof invitadoPuedeResponder === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeResponder()) {
            requerirAutenticacion();
            return;
        }
        const costo = dificultades[dificultadActual].costo;
        const currentCoins = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas') || '0');
        if (currentCoins < costo) {
            mostrarNoMonedasOverlay(costo);
            return;
        }
        document.getElementById("res-area").textContent = "Área: " + previews[index].text;
        document.getElementById("res-dif").textContent  = "Dificultad: " + dificultades[dificultadActual].nombre;
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
    <img id="btn-explicacion" src="./assets/explicacion.png" title="Ver explicación" alt="EXPLICACIÓN" style="cursor:pointer; width:91px;">
    <img id="btn-siguiente" src="./assets/arrowder1.png" title="Siguiente pregunta" alt="SIGUIENTE" style="cursor:pointer; width:61px;">
`;

panelExpl.innerHTML = `<h3>EXPLICACIÓN</h3><p id="texto-explicacion"></p>`;

document.body.appendChild(flashCorrecto);
document.body.appendChild(flashIncorrecto);
document.body.appendChild(zonaPreguntas);
document.body.appendChild(botonesPreg); botonesPreg.style.display = "none";
document.body.appendChild(panelExpl);

// elementos del juego
let preguntasActuales = [];
let indicePregunta    = 0;
let respondido        = false;
let explicacionVisible = false;
let preguntaTimerInterval = null;
let tiempoRestante    = 15;

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
    
    cambiarMonedas(-dificultades[currentDifficulty].costo, false);
    
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

function iniciarJuego(area, difIndex) {
    if (typeof invitadoPuedeResponder === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeResponder()) {
        requerirAutenticacion();
        return;
    }
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
        const todasLasPreguntas = obtenerPreguntas(claveArea, claveDif);
        if (!todasLasPreguntas || todasLasPreguntas.length === 0) {
            alert('No hay preguntas disponibles para este nivel académico.');
            location.reload();
            return;
        }
        preguntasActuales = mezclarYTomar(todasLasPreguntas, 15);
        indicePregunta    = 0;
        zonaPreguntas.classList.add("activa");
        botonesPreg.style.display = "flex";
        mostrarPregunta();
    }, 650);
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

    const p = preguntasActuales[indicePregunta];
    const bloque = document.getElementById("bloque-pregunta");

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
        btn.addEventListener("click", () => responder(i, indiceBarajadoCorrecto, p.explicacion));
        contenedor.appendChild(btn);
    });

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

function responder(elegida, correcta, explicacion) {
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

    const valorMoneda = dificultades[currentDifficulty].costo;

    if (elegida === correcta) {
        botones[elegida].classList.add("correcta");
        flashCorrecto.classList.add("visible");
        setTimeout(() => flashCorrecto.classList.remove("visible"), 600);
        cambiarMonedasLocal(+valorMoneda, true);
    } else {
        botones[elegida].classList.add("incorrecta");
        flashIncorrecto.classList.add("visible");
        setTimeout(() => flashIncorrecto.classList.remove("visible"), 600);
        cambiarMonedasLocal(-valorMoneda, false);
    }

    alternarExplicacion(true);
}

function cambiarMonedasLocal(valor, positivo) {
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

function finJuego() {
    if (typeof marcarPreguntasCompletadas === 'function') marcarPreguntasCompletadas();
    detenerTimer();
    zonaPreguntas.classList.remove("activa");
    botonesPreg.style.display = "none";
    panelExpl.classList.remove("visible");

    const fin = document.createElement("div");
    fin.style.cssText = `
        position:fixed; inset:0; display:flex; flex-direction:column;
        justify-content:center; align-items:center; z-index:350;
        background:rgba(0,0,0,0.85);
    `;
    const monedasFinal = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem("monedas") || "0");
    fin.innerHTML = `
        <p style="font-family:'Press Start 2P',cursive; color:gold; font-size:20px; margin-bottom:20px;">
            ¡COMPLETADO!
        </p>
        <p style="font-family:'Pixelify Sans',sans-serif; color:white; font-size:26px; margin-bottom:30px;">
            Monedas: ${monedasFinal}
        </p>
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
  const p = preguntasActuales[indicePregunta];
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
  hintEl.textContent = "💡 Pista: " + palabraClave;
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
  popularEl.textContent = "👥 POPULAR";
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
  msg.textContent = "♻️ ¡INTENTA DE NUEVO!";
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
  msg.textContent = "⌛ ¡TIEMPO INFINITO!";
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
    case "Pista Breve": return aplicarPistaBreve();
    case "Eliminar Opcion": return aplicarEliminarOpcion();
    case "Congelar Tiempo": return aplicarCongelarTiempo();
    case "Cambiar Pregunta": return aplicarCambiarPregunta();
    case "Respuesta Popular": return aplicarRespuestaPopular();
    case "Reintentar": return aplicarReintentar();
    case "Tiempo Infinito": return aplicarTiempoInfinito();
    case "Ticket Dorado": return aplicarTicketDorado();
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
});

