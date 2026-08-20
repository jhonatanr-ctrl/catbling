// 🚀 TODO LO VISUAL / ESPECÍFICO DE ESTA PÁGINA
document.addEventListener("DOMContentLoaded", () => {

  // 🎰 IMAGEN GIRATORIA
  let angulo = 0;
  const imagen = document.getElementById("imagen-giratoria");

  function girar() {
    if (config.animaciones && imagen) {
      angulo += 1;
      imagen.style.transform = `translateX(-50%) rotate(${angulo}deg)`;
    }
    requestAnimationFrame(girar);
  }

  // 🧠 TEXTO DINÁMICO (hover opciones)
  const opciones = document.querySelectorAll(".opcion");
  const subtitulo = document.getElementById("subtitulo");

  opciones.forEach(opcion => {
    opcion.addEventListener("mouseenter", () => {
      if (subtitulo) {
        subtitulo.textContent = opcion.dataset.texto;
        subtitulo.classList.add("animar-texto");
      }
    });

    opcion.addEventListener("mouseleave", () => {
      if (subtitulo) {
        subtitulo.textContent = "";
        subtitulo.classList.remove("animar-texto");
      }
    });
  });

  // 🎛️ MENÚ (abrir/cerrar)
  const btn = document.getElementById("btn-opciones");
  const menu = document.getElementById("menu-opciones");
  const overlay = document.getElementById("overlay-menu");
  const cerrar = document.getElementById("cerrar-menu");

  if (btn && menu && overlay && cerrar) {
    btn.onclick = () => {
      menu.classList.add("active");
      overlay.classList.add("active");
    };

    cerrar.onclick = () => {
      menu.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  // 🔊 ACTIVAR AUDIO (por interacción del usuario)
  const musica = document.getElementById("bgMusic");

  if (musica) {
    document.addEventListener("click", () => {
      musica.muted = false;
      musica.play().catch(() => {});
    }, { once: true });
  }

  // 🎬 INICIO
  girar();

  if (typeof tutorialInit === 'function') tutorialInit();
});