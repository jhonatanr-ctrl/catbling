/**
 * script.js (carreras)
 * -----------------------------------------------------------------------
 * Bootstrap del juego. Conecta:
 *   ui-seleccion.js  --(evento carreras:apuestaConfirmada)-->  ui-carrera.js
 * y engancha el menú/opciones compartido igual que el resto de juegos.
 * -----------------------------------------------------------------------
 */

function initMenuCarreras() {
  const btn = document.getElementById('btn-opciones');
  const overlay = document.getElementById('overlay-menu');
  const menu = document.getElementById('menu-opciones');
  const cerrar = document.getElementById('cerrar-menu');
  if (btn) btn.onclick = function () { overlay.classList.add('active'); menu.classList.add('active'); };
  if (cerrar) cerrar.onclick = function () { overlay.classList.remove('active'); menu.classList.remove('active'); };
  if (overlay) overlay.onclick = function () { overlay.classList.remove('active'); menu.classList.remove('active'); };
}

function initBotonSalidaAnimado() {
  const menuImg = document.getElementById('menu-img');
  const menuBtn = document.getElementById('menu-button-salida');
  let timeout1, timeout2;
  if (!menuBtn || !menuImg) return;

  menuBtn.addEventListener('mouseenter', function () {
    clearTimeout(timeout1); clearTimeout(timeout2);
    timeout1 = setTimeout(function () { menuImg.src = '../assets/salida2.png'; }, 100);
    timeout2 = setTimeout(function () { menuImg.src = '../assets/salida3.png'; }, 300);
  });
  menuBtn.addEventListener('mouseleave', function () {
    clearTimeout(timeout1); clearTimeout(timeout2);
    menuImg.src = '../assets/salida3.png';
    timeout1 = setTimeout(function () { menuImg.src = '../assets/salida2.png'; }, 100);
    timeout2 = setTimeout(function () { menuImg.src = '../assets/salida1.png'; }, 300);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
    requerirAutenticacion();
    return;
  }

  window.UISeleccion.init();
  window.UICarrera.init();

  document.addEventListener('carreras:apuestaConfirmada', function (e) {
    window.UICarrera.iniciarCarrera(e.detail);
  });

  initMenuCarreras();
  initBotonSalidaAnimado();
  if (typeof actualizarUI === 'function') actualizarUI();
  if (typeof actualizarBotonFullscreen === 'function') actualizarBotonFullscreen();
  if (typeof tutorialInit === 'function') tutorialInit();
});
