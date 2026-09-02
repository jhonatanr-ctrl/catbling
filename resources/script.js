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

  // 🎥 Video de introducción: debe aparecer como overlay inicial SOLO en las
  // 4 páginas principales (principal, tienda, preguntas, juegos) y NO dentro
  // de los mini-juegos individuales.
  const debeVerVideoIntro = () => {
    const path = window.location.pathname || '';
    const nombre = path.split('/').pop();
    const paginasConVideo = [
      'principalpage.html',
      'tienda.html',
      'preguntasinicialpage.html',
      'juegosprincipalpage.html'
    ];
    // Ruta raíz (sin nombre de archivo) también cuenta como principalpage.html
    return paginasConVideo.includes(nombre) || path === '/' || path === '';
  };

if (debeVerVideoIntro()) {
    // --- CALCULAR RUTA CORRECTA AL VIDEO ---
    // El video está en: /catbling/resources/assets/9438466.mp4 (desde raíz del dominio en localhost)
    // En producción (Vercel) puede servirse desde raíz /resources/assets/9438466.mp4
    // Detectamos la base del proyecto dinámicamente.
    
    const pathActual = window.location.pathname || '';
    // Detectar si estamos bajo /catbling/ (localhost) o en raíz (producción)
    const esLocalhostCatbling = pathActual.startsWith('/catbling/');
    const basePath = esLocalhostCatbling ? '/catbling' : '';
    const videoAbsoluto = basePath + '/resources/assets/9438466.mp4';
    
    // console.log('[INTRO] URL final del video:', videoAbsoluto);

    // Crear overlay superpuesto a toda la pantalla
    // Debe estar por encima de TODO el contenido
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: black;
      z-index: 999999999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const video = document.createElement('video');
    video.src = videoAbsoluto;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.loop = false;
    video.controls = false;
    
    // Eventos para diagnóstico y manejo de carga
    video.onerror = () => {
      // Si el video no puede cargar, no dejar la pantalla bloqueada en negro:
      // quitar el overlay igual que si hubiera terminado.
      overlay.remove();
    };
    video.oncanplaythrough = () => {
      // console.log('[INTRO] Video cargado exitosamente');
    };
    video.onplay = () => {
      // console.log('[INTRO] Video reproduciéndose');
    };
    
    // Claves para asegurar reproducción automática en navegadores modernos
    video.preload = 'auto';
    
    video.style.objectFit = 'contain';
    video.style.width = '100%';
    video.style.height = '100%';

    overlay.appendChild(video);
    document.body.appendChild(overlay);

    // Cuando el video termine, remover el overlay automáticamente
    video.onended = () => {
      overlay.remove();
      clearTimeout(introTimeoutId);
    };

    // Red de seguridad: si por autoplay bloqueado por el navegador (u otra
    // causa no capturada por onerror) el video nunca llega a reproducirse
    // ni a terminar, no dejar la pantalla negra bloqueada indefinidamente.
    const introTimeoutId = setTimeout(() => {
      overlay.remove();
    }, 20000);
  }
});