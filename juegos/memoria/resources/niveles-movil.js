/* ─────────────────────────────────────────────────────────
   SELECTOR DE NIVELES — VERSIÓN MÓVIL
   Este archivo NO reimplementa la lógica de niveles: solo
   observa el DOM que ya genera initNiveles() en script.js
   (nivel actual, bloqueados/desbloqueados, etc.) y añade el
   comportamiento de abrir/cerrar del selector compacto para
   pantallas móviles.

   No modifica NIVELES, nivelActual, nivelMaxDesbloqueado,
   generarCartas() ni ningún onclick existente en los
   .nivel-item — se limita a mirar y a togglear una clase.
───────────────────────────────────────────────────────────── */
(function () {
  function init() {
    var panel = document.querySelector('.niveles-panel');
    var header = document.getElementById('niveles-movil-header');
    var lista = document.getElementById('niveles-lista');
    var infoSpan = document.getElementById('niveles-movil-info');
    if (!panel || !header || !lista || !infoSpan) return;

    function sincronizarHeader() {
      var activo = lista.querySelector('.nivel-item.active');
      // Si por algún motivo no hay nivel activo (p. ej. justo durante un
      // re-render), no se toca el contenido previo del header.
      if (!activo) return;
      // Reutiliza tal cual el contenido ya generado por initNiveles()
      // (nivel-num, nivel-info, nivel-premio) en vez de reconstruirlo.
      infoSpan.innerHTML = activo.innerHTML;
    }

    function cerrar() {
      if (!panel.classList.contains('abierto')) return;
      panel.classList.remove('abierto');
      header.setAttribute('aria-expanded', 'false');
    }

    function toggle() {
      var abierto = panel.classList.toggle('abierto');
      header.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    }

    header.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    // Cerrar al tocar/clicar fuera del componente
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target)) cerrar();
    });

    // Cerrar con Escape (accesibilidad, gratis además del click-outside)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
    });

    // initNiveles() (en script.js) reconstruye #niveles-lista por completo
    // al iniciar, al cambiar de idioma y al desbloquear un nivel nuevo; y
    // el onclick de cada .nivel-item alterna la clase "active" al elegir
    // nivel. Ambos casos se detectan aquí sin tocar esas funciones:
    var observer = new MutationObserver(function (mutations) {
      sincronizarHeader();
      // Si el cambio vino de una selección de nivel (toggle de "active"
      // sobre nodos ya existentes) o de un re-render completo, se cierra
      // el selector — igual que pidió el usuario al elegir un nivel.
      cerrar();
    });
    observer.observe(lista, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    // Estado inicial (para cuando el selector móvil carga con la lista
    // ya generada por initNiveles() en el DOMContentLoaded de script.js)
    sincronizarHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
