/**
 * sprites.js
 * -----------------------------------------------------------------------
 * Dibuja el sprite de un caballo usando sus propios PNG (carpeta
 * resources/assets/horses/). Existen 8 conjuntos de 4 frames cada uno
 * (a/b/e/i/m/o/p/u + "Beyo" + número de frame). Como hay 32 caballos en
 * el pool y sólo 8 conjuntos de sprites, cada conjunto se REUTILIZA para
 * 4 caballos distintos (asignación determinista por el número de su id,
 * nunca por nombre ni por la posición en la que corre).
 *
 * Caso especial: el conjunto "o" no tiene `oBeyo4.png`. Su ciclo de
 * carrera usa sólo 3 frames (oBeyo1/2/3) y su pose de reposo usa el
 * archivo propio `oBeyo.png` (sin número). No se inventa un 4º frame.
 *
 * IMPORTANTE (bug corregido en esta fase): este archivo debe exponer
 * `avanzarAnimacion(elementoSprite, nowMs)`, porque resources/ui-carrera.js
 * la llama en cada frame de la animación. La versión anterior de este
 * archivo (silueta SVG de marcador de posición) NO definía esa función:
 * al llamarla, el bucle de animación lanzaba una excepción no capturada
 * dentro de un forEach, lo que abortaba el resto de esa vuelta y detenía
 * para siempre el bucle (nunca se reprogramaba el siguiente
 * requestAnimationFrame). Efecto observable: sólo el primer caballo
 * llegaba a moverse una vez, el resto quedaba quieto y la carrera nunca
 * terminaba. Ver informe final para la reproducción exacta.
 * -----------------------------------------------------------------------
 */
(function () {

  const RUTA_BASE = 'resources/assets/horses/';
  const CONJUNTOS = ['a', 'b', 'e', 'i', 'm', 'o', 'p', 'u'];

  // Cada conjunto normal tiene 4 frames de carrera (1..4). El conjunto
  // "o" es la única excepción: sólo existen oBeyo1/2/3 (no hay
  // oBeyo4.png en los assets), así que su ciclo tiene 3 frames en vez
  // de 4. Nunca se inventa el archivo que falta.
  function framesDeCarrera(conjunto) {
    if (conjunto === 'o') return ['oBeyo1.png', 'oBeyo2.png', 'oBeyo3.png'];
    return [conjunto + 'Beyo1.png', conjunto + 'Beyo2.png', conjunto + 'Beyo3.png', conjunto + 'Beyo4.png'];
  }

  // Pose de reposo (fuera de carrera: grid de selección, perfil, idle
  // antes de la salida). El conjunto "o" tiene su propio archivo base
  // sin número; el resto reutiliza su primer frame de carrera.
  function frameReposo(conjunto) {
    return conjunto === 'o' ? 'oBeyo.png' : (conjunto + 'Beyo1.png');
  }

  /**
   * Asigna un conjunto de sprites a un caballo de forma determinista a
   * partir del número en su id (p.ej. 'horse_017' -> 17), nunca por su
   * nombre ni por la posición en la que corre. Con 32 caballos y 8
   * conjuntos, cada conjunto se reutiliza exactamente para 4 caballos.
   */
  function conjuntoDeCaballo(caballo) {
    const m = /(\d+)/.exec((caballo && caballo.id) || '');
    const n = m ? parseInt(m[1], 10) : 0;
    const idx = ((n - 1) % CONJUNTOS.length + CONJUNTOS.length) % CONJUNTOS.length;
    return CONJUNTOS[idx];
  }

  function rutaFrame(nombreArchivo) {
    return RUTA_BASE + nombreArchivo;
  }

  /**
   * Crea el elemento visual de un caballo. `pose` sólo distingue el
   * estado inicial ('idle' = reposo); el ciclo de carrera lo controla
   * avanzarAnimacion() más abajo, no esta función.
   */
  function crearElementoSprite(caballo, pose) {
    pose = pose || 'idle';
    const conjunto = conjuntoDeCaballo(caballo);

    const wrapper = document.createElement('div');
    wrapper.className = 'caballo-sprite';
    wrapper.dataset.pose = pose;
    wrapper.dataset.conjunto = conjunto;
    wrapper.dataset.frameIndex = '0';

    const img = document.createElement('img');
    img.className = 'caballo-sprite-img';
    img.alt = '';
    img.draggable = false;
    img.src = rutaFrame(frameReposo(conjunto));
    // Fallback defensivo: si un PNG puntual no pudiera cargar (ruta
    // rota, archivo faltante), se conserva la pose de reposo de su
    // propio conjunto en vez de dejar un hueco de imagen rota. Nunca
    // sustituye el conjunto de otro caballo.
    img.onerror = function () {
      if (img.dataset.usandoFallback === '1') return; // evita bucle si hasta el fallback fallara
      img.dataset.usandoFallback = '1';
      img.src = rutaFrame(frameReposo(conjunto));
    };
    wrapper.appendChild(img);

    return wrapper;
  }

  /**
   * Cambia explícitamente a la pose de reposo (usado al colocar los
   * caballos en la pista antes de la salida, y en el grid/perfil de
   * selección, donde nunca corren).
   */
  function actualizarPose(elementoSprite, pose) {
    if (!elementoSprite) return;
    if (elementoSprite.dataset.pose === pose) return;
    elementoSprite.dataset.pose = pose;
    if (pose === 'idle') {
      const conjunto = elementoSprite.dataset.conjunto;
      const img = elementoSprite.querySelector('.caballo-sprite-img');
      if (img && conjunto) img.src = rutaFrame(frameReposo(conjunto));
      elementoSprite.dataset.frameIndex = '0';
    }
  }

  /**
   * Avanza el ciclo de frames de carrera de ESTE caballo. Cada elemento
   * guarda su propio último instante de cambio en su dataset, así los
   * 16 caballos animan sus patas de forma independiente (no hay un
   * reloj de sprites compartido entre todos).
   */
  function avanzarAnimacion(elementoSprite, nowMs) {
    if (!elementoSprite) return;
    const conjunto = elementoSprite.dataset.conjunto;
    if (!conjunto) return;

    if (elementoSprite.dataset.pose !== 'run') {
      elementoSprite.dataset.pose = 'run';
      elementoSprite.dataset.ultimoCambioMs = String(nowMs);
      elementoSprite.dataset.frameIndex = '0';
    }

    const intervalo = window.CARRERA_CONFIG.SPRITE.INTERVALO_CAMBIO_MS;
    const ultimoCambio = parseFloat(elementoSprite.dataset.ultimoCambioMs || '0');
    if (nowMs - ultimoCambio < intervalo) return;

    const frames = framesDeCarrera(conjunto);
    const idxActual = parseInt(elementoSprite.dataset.frameIndex || '0', 10);
    const idxSiguiente = (idxActual + 1) % frames.length;

    elementoSprite.dataset.frameIndex = String(idxSiguiente);
    elementoSprite.dataset.ultimoCambioMs = String(nowMs);

    const img = elementoSprite.querySelector('.caballo-sprite-img');
    if (img) img.src = rutaFrame(frames[idxSiguiente]);
  }

  window.SpritesCaballo = {
    crearElementoSprite: crearElementoSprite,
    actualizarPose: actualizarPose,
    avanzarAnimacion: avanzarAnimacion,
    SECUENCIA_CARRERA: window.CARRERA_CONFIG.SPRITE.SECUENCIA // ['run1','run2','run3'] (informativo/legado)
  };
})();