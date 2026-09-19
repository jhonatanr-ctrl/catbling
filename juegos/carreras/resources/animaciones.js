/**
 * animaciones.js
 * -----------------------------------------------------------------------
 * Lógica de animación reutilizable, independiente del motor de carrera:
 *  - Contador de salida (2s de espera + "1,2,3,4,5,¡GO!" cada 1s), con
 *    una única animación CSS reutilizada para cada texto (no una por
 *    número) y parpadeo rojo de los bordes de pantalla en cada cambio.
 *  - Aparición de la clasificación final desde abajo.
 * -----------------------------------------------------------------------
 */
(function () {

  function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Reproduce la secuencia de conteo dentro de un contenedor dado.
   * @param {HTMLElement} contenedor   elemento donde se inserta cada texto
   * @param {HTMLElement} bordeFlash   elemento que parpadea en rojo
   * @param {function} onPasoMostrado  callback opcional(texto) al mostrar cada paso
   * @returns {Promise<void>} resuelve justo cuando termina "¡GO!"
   */
  async function reproducirConteo(contenedor, bordeFlash, onPasoMostrado) {
    const cfg = window.CARRERA_CONFIG.CONTEO;

    await esperar(cfg.ESPERA_INICIAL_MS);

    for (let i = 0; i < cfg.PASOS.length; i++) {
      const pasoOriginal = cfg.PASOS[i];
      const texto = (pasoOriginal === '¡GO!' && typeof __ === 'function') ? __('carreras_go') : pasoOriginal;
      mostrarTextoConteo(contenedor, texto);
      parpadearBorde(bordeFlash);
      if (typeof onPasoMostrado === 'function') onPasoMostrado(texto);
      await esperar(cfg.DURACION_PASO_MS);
    }

    // Limpieza del último texto tras su ciclo de salida.
    contenedor.innerHTML = '';
  }

  function mostrarTextoConteo(contenedor, texto) {
    // Reutiliza siempre la misma clase de animación (conteo-item):
    // "cae desde el cielo, se queda visible, cae hacia fuera".
    const anterior = contenedor.querySelector('.conteo-item');
    if (anterior) anterior.remove();

    const el = document.createElement('div');
    el.className = 'conteo-item';
    el.textContent = texto;
    // La duración de la animación CSS se fija aquí en lugar de dejarla
    // fija en el .css, para que SIEMPRE coincida con
    // CARRERA_CONFIG.CONTEO.DURACION_PASO_MS (una única fuente de verdad,
    // sin tener que recordar actualizar dos archivos a la vez).
    el.style.animationDuration = window.CARRERA_CONFIG.CONTEO.DURACION_PASO_MS + 'ms';
    contenedor.appendChild(el);
  }

  /**
   * Mismo ordinal traducido que usa ui-seleccion.js (clave central
   * carreras_ordinal). Antes la clasificación final imprimía '.º' fijo, así
   * que los 16 puestos salían en español en los 6 idiomas.
   */
  function ordinalPuesto(puesto) {
    return (typeof __f === 'function') ? __f('carreras_ordinal', { puesto: puesto }) : (puesto + '.º');
  }

  function parpadearBorde(bordeFlash) {
    if (!bordeFlash) return;
    bordeFlash.classList.remove('flash-rojo');
    void bordeFlash.offsetWidth; // reinicia la animación aunque se repita
    bordeFlash.classList.add('flash-rojo');
  }

  /**
   * Anima la lista de clasificación subiendo desde la parte inferior,
   * con un pequeño retraso escalonado entre cada fila.
   */
  function animarClasificacion(listaElemento, filas) {
    const staggerMs = window.CARRERA_CONFIG.POST_CARRERA.CLASIFICACION_STAGGER_MS;
    listaElemento.innerHTML = '';
    filas.forEach(function (fila, i) {
      const li = document.createElement('li');
      li.className = 'fila-clasificacion';
      li.style.transitionDelay = (i * staggerMs) + 'ms';
      li.innerHTML =
        '<span class="puesto-num">' + ordinalPuesto(fila.puesto) + '</span>' +
        '<span class="puesto-nombre">' + fila.nombre + '</span>';
      listaElemento.appendChild(li);
      // Forzar reflow para que la transición se dispare al agregar la clase.
      void li.offsetWidth;
      requestAnimationFrame(function () { li.classList.add('visible'); });
    });
  }

  window.AnimacionesCarrera = {
    reproducirConteo: reproducirConteo,
    animarClasificacion: animarClasificacion
  };
})();
