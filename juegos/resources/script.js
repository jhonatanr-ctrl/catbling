const juegos = [
    {
        titulo: "TRAGAMONEDAS",
        subtitulo: "¡Prueba tu suerte con el gran tragamonedas!",
        imagen: "./assets/slotmachineicon.png",
        pagina: "./tragamonedasm/tragamonedaindex.html"
    },
    {
        titulo: "MEMORIA",
        subtitulo: "¡Encuentra los pares en la menor cantidad de movimientos!",
        imagen: "./assets/fichasicon.png",
        pagina: "./memoria/memoria.html"
    },
    {
        titulo: "DUELO DE DADOS",
        subtitulo: "¡Lanza los dados y compite contra los locales!",
        imagen: "./assets/diceicon.png",
        pagina: "./dados/dadosindex.html"
    },
    {
        titulo: "RULETA",
        subtitulo: "¿Serás capas  de acertar el próximo número de la ruleta?",
        imagen: "./assets/ruleta2.png",
        pagina: "./ruleta/ruleta.html"
    },
    {
        titulo: "CARTAS RETRO",
        subtitulo: "¡Consigue la mejor mano de póker y gana premios!",
        imagen: "./assets/card-icon.png",
        pagina: "./cartas retro/cartas retro.html"
    },
    {
        titulo: "CASINO ROYALE",
        subtitulo: "¡Lanza los dados y consigue grandes multiplicadores!",
        imagen: "./assets/casinoroyaleicon.png",
        pagina: "./casinoroyale/casinoroyale.html"
    }
];

let indiceActual = 0;

const tituloEl = document.getElementById("titulo");
const subtituloEl = document.getElementById("subtitulo");
const imagenEl = document.getElementById("imagen-principal");
const flechaIzq = document.getElementById("flecha-izq");
const flechaDer = document.getElementById("flecha-der");

function actualizarJuego() {
    const juego = juegos[indiceActual];
    tituloEl.textContent = juego.titulo;
    subtituloEl.textContent = juego.subtitulo;
    imagenEl.src = juego.imagen;
    imagenEl.dataset.pagina = juego.pagina || "";
}

const paginasJuegos = {
    "TRAGAMONEDAS": "./tragamonedasm/tragamonedaindex.html",
    "MEMORIA": "./memoria/memoria.html",
    "DUELO DE DADOS": "./dados/dadosindex.html",
    "RULETA": "./ruleta/ruleta.html",
    "CARTAS RETRO": "./balatro/balatro.html",
    "CASINO ROYALE": "./casinoroyale/casinoroyale.html"
};

function irAJuego() {
    const juego = juegos[indiceActual];
    const pagina = juego.pagina || paginasJuegos[juego.titulo];
    if (pagina) {
        localStorage.setItem("juegoAnterior", indiceActual);
        window.location.href = pagina;
    }
}

function irAnterior() {
    imagenEl.classList.remove("entrar-derecha", "salir-izquierda", "entrar-izquierda", "salir-derecha");
    void imagenEl.offsetWidth;
    imagenEl.classList.add("salir-derecha");
    
    setTimeout(() => {
        indiceActual = (indiceActual - 1 + juegos.length) % juegos.length;
        actualizarJuego();
        imagenEl.classList.remove("salir-derecha");
        void imagenEl.offsetWidth;
        imagenEl.classList.add("entrar-izquierda");
    }, 500);
}

function irSiguiente() {
    imagenEl.classList.remove("entrar-derecha", "salir-izquierda", "entrar-izquierda", "salir-derecha");
    void imagenEl.offsetWidth;
    imagenEl.classList.add("salir-izquierda");
    
    setTimeout(() => {
        indiceActual = (indiceActual + 1) % juegos.length;
        actualizarJuego();
        imagenEl.classList.remove("salir-izquierda");
        void imagenEl.offsetWidth;
        imagenEl.classList.add("entrar-derecha");
    }, 500);
}

flechaIzq.addEventListener("click", irAnterior);
flechaDer.addEventListener("click", irSiguiente);

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        irAnterior();
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        irSiguiente();
    }
    if (e.key === "Enter") {
        irAJuego();
    }
});

imagenEl.addEventListener("click", irAJuego);

const juegoGuardado = localStorage.getItem("juegoAnterior");
if (juegoGuardado !== null) {
    indiceActual = parseInt(juegoGuardado);
    localStorage.removeItem("juegoAnterior");
}

actualizarJuego();
document.addEventListener("DOMContentLoaded", function() {
    if (typeof tutorialInit === 'function') tutorialInit();
});

// Botón de salida animado
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

// Menú de opciones
const btn = document.getElementById("btn-opciones");
const menu = document.getElementById("menu-opciones");
const overlay = document.getElementById("overlay-menu");
const cerrar = document.getElementById("cerrar-menu");

if (btn && menu && overlay && cerrar) {
    btn.onclick = () => { menu.classList.add("active"); overlay.classList.add("active"); };
    cerrar.onclick = () => { menu.classList.remove("active"); overlay.classList.remove("active"); };
}
