/**
 * ui-carrera.js
 * -----------------------------------------------------------------------
 * Controla la pantalla de carrera. Este archivo NUNCA decide quién gana:
 * sólo lee el resultado ya calculado por window.MotorCarrera.simularCarrera()
 * y lo traduce en animación (posiciones, sprites, contador, vídeo).
 * -----------------------------------------------------------------------
 */
(function () {

  const DOM = {};
  let resultadoSimulacion = null;
  let participantes = [];
  let hipodromo = null;
  let caballoApostado = null;
  let modoApuesta = 'simple';
  let apuestaPuestoDetalle = null; // { puestosSeleccionados, costo, multiplicador } cuando modoApuesta === 'puesto'
  let resultadoIdCarreraPromise = null; // Fase 7: promesa del id verificable en Supabase (sólo modo puesto + autenticado)
  let rafId = null;
  let inicioRealMs = 0;
  let movimientoVertical = {};
  let carreraTerminadaVisualmente = false;
  let carreraEnProgreso = false; // evita un doble arranque si el evento se disparara dos veces
  let ultimoResultadoGano = null; // Recordado sólo para poder re-traducir el título si cambia el idioma
  let resultadoNoVerificado = false; // true cuando la liquidación no llegó a ejecutarse (ver caso C)

  function cachearDOM() {
    DOM.pantallaCarrera = document.getElementById('pantalla-carrera');
    DOM.video = document.getElementById('video-carrera');
    DOM.fondoAlterno = document.getElementById('fondo-pista-alterno');
    DOM.pista = document.getElementById('pista-caballos');
    DOM.barraPosicionesPista = document.getElementById('barra-posiciones-pista');
    DOM.contador = document.getElementById('contador-salida');
    DOM.bordeFlash = document.getElementById('borde-flash');
    DOM.overlayGanador = document.getElementById('overlay-ganador');
    DOM.textoGanador = document.getElementById('texto-ganador');
    DOM.pantallaResultado = document.getElementById('pantalla-resultado');
    DOM.resultadoApuestaTitulo = document.getElementById('resultado-apuesta-titulo');
    DOM.listaClasificacion = document.getElementById('lista-clasificacion');
    DOM.btnVolverMenu = document.getElementById('btn-volver-menu-resultado');
    // Punto 5: etiqueta "Tu caballo: X" (contenedor añadido en carreras.html).
    DOM.tuCaballoIndicador = document.getElementById('tu-caballo-indicador');
    DOM.tuCaballoEtiqueta = document.getElementById('tu-caballo-etiqueta');
    DOM.tuCaballoNombre = document.getElementById('tu-caballo-nombre');
  }

  /**
   * Punto 5: escribe la etiqueta inferior desde caballoApostado — la MISMA
   * variable que ya usan la barra (marcarCaballoApostadoEnBarra), la pista
   * (colocarCaballosEnPista) y la validación (calcularGanoApuestaPorPuesto /
   * comparación con ganadorId). No hay ninguna segunda fuente de verdad.
   * El texto de la izquierda se traduce; el NOMBRE nunca.
   */
  function actualizarIndicadorTuCaballo() {
    if (!DOM.tuCaballoIndicador) return;
    if (!caballoApostado) {
      DOM.tuCaballoIndicador.classList.remove('visible');
      return;
    }
    if (DOM.tuCaballoEtiqueta && typeof __ === 'function') {
      DOM.tuCaballoEtiqueta.textContent = __('carreras_tu_caballo');
    }
    if (DOM.tuCaballoNombre) DOM.tuCaballoNombre.textContent = caballoApostado.nombre;
    DOM.tuCaballoIndicador.classList.add('visible');
  }

  function ocultarIndicadorTuCaballo() {
    if (DOM.tuCaballoIndicador) DOM.tuCaballoIndicador.classList.remove('visible');
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /**
   * Punto de entrada: arranca toda la secuencia de carrera para la
   * apuesta ya confirmada.
   */
  async function iniciarCarrera(detalle) {
    // Salvaguarda defensiva: si por cualquier motivo el evento de apuesta
    // confirmada se disparara más de una vez, jamás se solapan dos
    // carreras ni dos bucles de animación al mismo tiempo.
    if (carreraEnProgreso) return;
    carreraEnProgreso = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    hipodromo = detalle.hipodromo;
    participantes = detalle.participantes;
    caballoApostado = detalle.caballoApostado;
    modoApuesta = detalle.modoApuesta === 'puesto' ? 'puesto' : 'simple';
    apuestaPuestoDetalle = (modoApuesta === 'puesto')
      ? { puestosSeleccionados: detalle.puestosSeleccionados || [], costo: detalle.costo || 0, multiplicador: detalle.multiplicador || 0 }
      : null;
    carreraTerminadaVisualmente = false;
    resultadoNoVerificado = false;

    document.body.classList.add('carrera-en-curso'); // oculta menú/monedas/opciones globales
    document.querySelectorAll('.pantalla').forEach(function (p) { p.classList.remove('activa'); });
    DOM.pantallaCarrera.classList.add('activa');
    DOM.pantallaResultado.classList.remove('activo');
    DOM.overlayGanador.classList.remove('activo');
    ocultarOverlaysCompartidos();

    prepararVideo();
    colocarCaballosEnPista();
    construirBarraPosiciones();
    actualizarIndicadorTuCaballo();

    // La simulación se calcula ENTERA antes de mostrar nada en movimiento:
    // el resultado ya existe en este punto, la animación sólo lo dibuja.
    resultadoSimulacion = window.MotorCarrera.simularCarrera(participantes, hipodromo);

    // Fase 7: si es apuesta por puesto, se registra la clasificación real
    // en Supabase YA MISMO (antes de que empiece la animación), para que
    // la liquidación de después se verifique contra esto — nunca contra
    // lo que el cliente diga en el momento de cobrar. No se espera aquí
    // (no bloquea la animación): se espera recién al liquidar, momento
    // para el cual esta llamada ya tuvo de sobra tiempo de responder.
    resultadoIdCarreraPromise = (modoApuesta === 'puesto')
      ? window.ApuestasCarreras.registrarResultadoCarreraSiCorresponde(
          resultadoSimulacion.clasificacion.map(function (c) { return { id: c.id, puesto: c.puesto }; })
        )
      : null;

    await window.AnimacionesCarrera.reproducirConteo(DOM.contador, DOM.bordeFlash);

    lanzarVideo();
    inicioRealMs = performance.now();
    movimientoVertical = {};
    reproducirAnimacion();
  }

  // ---------------------------------------------------------------------
  // Vídeo de fondo
  // ---------------------------------------------------------------------
  function prepararVideo() {
    const src = hipodromo.video;
    DOM.video.pause();
    DOM.video.currentTime = 0;
    DOM.video.loop = false; // nunca en loop durante la carrera
    const source = DOM.video.querySelector('source');
    source.src = src;
    DOM.video.load();
    DOM.fondoAlterno.classList.remove('visible');

    // Si el vídeo no puede cargar (todavía no hay archivos de vídeo
    // reales para cada hipódromo), se usa un fondo alterno en CSS para
    // que la carrera nunca dependa de un asset ausente.
    DOM.video.onerror = function () {
      DOM.fondoAlterno.classList.add('visible');
    };
  }

  function lanzarVideo() {
    const promesa = DOM.video.play();
    if (promesa && typeof promesa.catch === 'function') {
      promesa.catch(function () { DOM.fondoAlterno.classList.add('visible'); });
    }
  }

  function pausarVideo() {
    const cfg = window.CARRERA_CONFIG.VIDEO;
    const ejecutarPausa = function () {
      DOM.video.pause();
      // Requisito: el vídeo no debe reiniciarse solo tras pausarse.
      DOM.video.onended = function () { DOM.video.pause(); };
    };
    if (cfg.MODO_PAUSA === 'delay' && cfg.DELAY_MS > 0) {
      setTimeout(ejecutarPausa, cfg.DELAY_MS);
    } else {
      ejecutarPausa();
    }
  }

  // ---------------------------------------------------------------------
  // Colocación de los 16 caballos (con efecto de profundidad)
  // ---------------------------------------------------------------------
  let geometriaCarriles = {}; // horseId -> centro vertical (px) de SU carril dentro de la pista

  function colocarCaballosEnPista() {
    DOM.pista.innerHTML = '';
    geometriaCarriles = {};
    participantes.forEach(function (caballo, i) {
      const carril = document.createElement('div');
      carril.className = 'carril' + (i % 2 === 0 ? ' carril-par' : ' carril-impar');
      carril.style.zIndex = String(participantes.length - i);
      carril.dataset.horseId = caballo.id;

      // La identificación del caballo ya no se muestra aquí (ver Fase 3):
      // ahora vive en la barra de posiciones superior, con su color y su
      // puesto. Colocar aquí una etiqueta lateral duplicaría esa función.
      const track = document.createElement('div');
      track.className = 'carril-track';
      const sprite = window.SpritesCaballo.crearElementoSprite(caballo, 'idle');
      sprite.classList.add('carril-sprite');
      // Punto 4: resaltado/destello rojo del caballo apostado. La clase se
      // pone UNA vez, aquí, sobre el wrapper .caballo-sprite — que
      // sprites.js nunca recrea (sólo cambia el src del <img> interno), así
      // que el destello sobrevive a cualquier cambio de frame, velocidad o
      // posición. El criterio es el ID del caballo apostado, el mismo que
      // usan la barra, la etiqueta inferior y la validación de la apuesta.
      if (caballoApostado && caballo.id === caballoApostado.id) {
        sprite.classList.add('caballo-sprite-apostado');
      }
      track.appendChild(sprite);
      carril.appendChild(track);

      DOM.pista.appendChild(carril);
    });

    // Se mide la geometría real DESPUÉS de insertar los 16 carriles (la
    // pantalla de carrera ya está .activa en este punto, así que el
    // layout ya existe): cada caballo recuerda el centro vertical de SU
    // propio carril dentro de la pista completa, para poder calcular más
    // adelante un desplazamiento relativo que lo lleve a cualquier punto
    // de la pista, no solo dentro de su franja original.
    participantes.forEach(function (caballo) {
      const carril = DOM.pista.querySelector('.carril[data-horse-id="' + caballo.id + '"]');
      if (!carril) return;
      geometriaCarriles[caballo.id] = carril.offsetTop + carril.offsetHeight / 2;
    });
  }

  // ---------------------------------------------------------------------
  // Barra de posiciones (Fase 3): sólo lee el progreso ya calculado por el
  // motor (resultadoSimulacion.timeline, vía obtenerProgresoEn) y lo pinta
  // como un porcentaje horizontal. No recalcula nada, no crea una segunda
  // simulación, y se congela sola en cuanto el bucle frame() deja de
  // llamarse (mismo mecanismo que detiene el resto de la animación).
  // ---------------------------------------------------------------------
  function construirBarraPosiciones() {
    if (!DOM.barraPosicionesPista) return;
    DOM.barraPosicionesPista.innerHTML = '';
    participantes.forEach(function (caballo) {
      const marcador = document.createElement('div');
      marcador.className = 'barra-marcador';
      marcador.dataset.horseId = caballo.id;
      marcador.style.background = caballo.color;
      marcador.style.left = '0%';
      DOM.barraPosicionesPista.appendChild(marcador);
    });
    marcarCaballoApostadoEnBarra();
  }

  /**
   * Punto 2: la barra ilumina EXCLUSIVAMENTE al caballo apostado, sin
   * importar si va 1.º o 16.º. Se aplica una sola vez al construir la barra
   * (el marcador es el mismo elemento durante toda la carrera, sólo cambia
   * su "left"), así que el resaltado no puede perderse a mitad de carrera
   * ni saltar a otro caballo cuando cambia el líder.
   *
   * Sustituye a la antigua actualizarLiderBarra(liderId), que se llamaba en
   * CADA frame con el id del caballo que iba primero — justo lo contrario
   * de lo pedido.
   */
  function marcarCaballoApostadoEnBarra() {
    if (!DOM.barraPosicionesPista) return;
    const apostadoId = caballoApostado ? caballoApostado.id : null;
    DOM.barraPosicionesPista.querySelectorAll('.barra-marcador').forEach(function (m) {
      m.classList.toggle('barra-marcador-apostado', !!apostadoId && m.dataset.horseId === apostadoId);
    });
  }

  /**
   * Actualiza un marcador ya existente con el progreso YA calculado por el
   * llamador (frame() lo obtiene de obtenerProgresoEn, la misma función que
   * usa para mover el sprite del caballo) — aquí no se vuelve a leer el
   * timeline ni se recalcula nada.
   */
  function actualizarMarcadorBarra(horseId, progreso) {
    if (!DOM.barraPosicionesPista) return;
    const marcador = DOM.barraPosicionesPista.querySelector('.barra-marcador[data-horse-id="' + horseId + '"]');
    if (!marcador) return;
    marcador.style.left = (Math.min(1, Math.max(0, progreso)) * 100) + '%';
  }

  /**
   * Se llama una sola vez, cuando ya se muestra la pantalla de resultado:
   * añade el número de puesto a cada marcador usando
   * resultadoSimulacion.clasificacion (la misma clasificación que ya
   * decidió el motor, no una nueva). La barra ya está congelada en ese
   * punto porque frame() dejó de ejecutarse.
   */
  function mostrarClasificacionEnBarra(clasificacion) {
    if (!DOM.barraPosicionesPista) return;
    clasificacion.forEach(function (c) {
      const marcador = DOM.barraPosicionesPista.querySelector('.barra-marcador[data-horse-id="' + c.id + '"]');
      if (!marcador) return;
      marcador.style.left = '100%';
      let badge = marcador.querySelector('.barra-marcador-puesto');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'barra-marcador-puesto';
        marcador.appendChild(badge);
      }
      badge.textContent = String(c.puesto);
    });
  }

  function obtenerProgresoEn(horseId, elapsedMs) {
    const cfg = window.CARRERA_CONFIG.SIMULACION;
    const muestras = resultadoSimulacion.timeline[horseId];
    const idx = Math.min(muestras.length - 1, Math.max(0, Math.floor(elapsedMs / cfg.PASO_MS)));
    return muestras[idx].progreso;
  }

  /**
   * Instante (ms, en el mismo reloj que "elapsed") en el que ESTE caballo
   * cruzó su propia meta lógica. Al terminar, el motor deja de añadir
   * muestras al timeline de ese caballo, así que la última muestra
   * registrada es exactamente el momento en que su progreso llegó a 1.
   */
  function obtenerTiempoLlegada(horseId) {
    const muestras = resultadoSimulacion.timeline[horseId];
    return muestras[muestras.length - 1].t;
  }

  // ---------------------------------------------------------------------
  // Movimiento vertical (100% visual, ver window.MotorCarrera para la
  // separación con la simulación lógica: esto nunca toca progreso/velocidad).
  // ---------------------------------------------------------------------
  function calcularGeometriaVertical() {
    const alturaPista = DOM.pista.clientHeight || 500;
    const cfg = window.CARRERA_CONFIG.VISUAL.MOVIMIENTO_VERTICAL;
    const amplitud = Math.max(10, (alturaPista / 2) - cfg.MARGEN_SEGURIDAD_PX) * cfg.RANGO_FRACCION_ALTURA;
    return { centroPista: alturaPista / 2, amplitud: amplitud };
  }

  function obtenerObjetivoVertical(cfg, geometria, centroCarrilPropio) {
    const preferencia = cfg.PREFERENCIA_SUPERIOR;
    let objetivoAbsoluto;
    if (preferencia.ACTIVADA && Math.random() < preferencia.PROBABILIDAD) {
      // Mitad superior de TODA la pista (no solo por encima del propio
      // carril): de ahí sale la tendencia visual hacia la zona superior.
      objetivoAbsoluto = geometria.centroPista - Math.random() * geometria.amplitud;
    } else {
      objetivoAbsoluto = geometria.centroPista - geometria.amplitud + Math.random() * (geometria.amplitud * 2);
    }
    // Se convierte a un desplazamiento RELATIVO al centro del propio
    // carril del caballo, que es el sistema de coordenadas que usa su
    // sprite (translateY se aplica dentro de su propio .carril-track).
    return objetivoAbsoluto - centroCarrilPropio;
  }

  function obtenerMovimientoVertical(horseId, nowMs, geometria, centroCarrilPropio) {
    const cfg = window.CARRERA_CONFIG.VISUAL.MOVIMIENTO_VERTICAL;
    if (!cfg.ACTIVADO) return 0;
    const multiplicadorDuracion = Math.max(1, cfg.DURACION_MULTIPLICADOR || 1);
    const duracionObjetivo = function () {
      return (cfg.CAMBIO_MIN_MS + Math.random() * (cfg.CAMBIO_MAX_MS - cfg.CAMBIO_MIN_MS)) * multiplicadorDuracion;
    };

    let estado = movimientoVertical[horseId];
    if (!estado) {
      estado = {
        actual: 0,
        inicio: 0,
        inicioMs: nowMs,
        objetivo: obtenerObjetivoVertical(cfg, geometria, centroCarrilPropio),
        cambioEn: 0
      };
      estado.cambioEn = nowMs + duracionObjetivo();
      movimientoVertical[horseId] = estado;
    }

    if (nowMs >= estado.cambioEn) {
      estado.inicio = estado.actual;
      estado.inicioMs = nowMs;
      estado.objetivo = obtenerObjetivoVertical(cfg, geometria, centroCarrilPropio);
      estado.cambioEn = nowMs + duracionObjetivo();
    }

    const duracionCambio = Math.max(1, estado.cambioEn - estado.inicioMs);
    const avance = Math.min(1, Math.max(0, (nowMs - estado.inicioMs) / duracionCambio));
    const suavizado = avance * avance * (3 - 2 * avance);
    estado.actual = estado.inicio + (estado.objetivo - estado.inicio) * suavizado;
    return estado.actual;
  }

  // ---------------------------------------------------------------------
  // Bucle de animación (sólo dibuja: la lógica ya está resuelta)
  // ---------------------------------------------------------------------
  function reproducirAnimacion() {
    const duracionMs = resultadoSimulacion.duracionMs;
    const finalInicioFraccion = resultadoSimulacion.finalInicioFraccion;
    const salidaDuracionMs = window.CARRERA_CONFIG.VISUAL.SALIDA.DURACION_MS;
    const geometriaVertical = calcularGeometriaVertical();
    let ganadorAnunciado = false;

    function frame(nowMs) {
      const elapsed = nowMs - inicioRealMs;
      const fraccionTiempo = Math.min(1, elapsed / duracionMs);
      let todosTerminaron = true;

      participantes.forEach(function (caballo) {
        const carril = DOM.pista.querySelector('.carril[data-horse-id="' + caballo.id + '"]');
        if (!carril) return;
        const track = carril.querySelector('.carril-track');
        const spriteEl = carril.querySelector('.caballo-sprite');

        const progreso = obtenerProgresoEn(caballo.id, elapsed);
        actualizarMarcadorBarra(caballo.id, progreso);

        // Distinción clave (ver informe): "cruzar la meta" (progreso===1)
        // no es lo mismo que "haber terminado su recorrido VISUAL". Tras
        // cruzar, el caballo sigue avanzando a la derecha un tramo más
        // hasta salir de pantalla; solo entonces se considera terminado
        // a efectos de la animación general.
        let msDesdeLlegada = 0;
        if (progreso >= 1) {
          msDesdeLlegada = elapsed - obtenerTiempoLlegada(caballo.id);
          if (msDesdeLlegada < salidaDuracionMs) todosTerminaron = false;
        } else {
          todosTerminaron = false;
        }

        const visualX = window.MotorCarrera.progresoAVisual(progreso, fraccionTiempo, finalInicioFraccion, msDesdeLlegada);
        const anchoDisponible = track.clientWidth - spriteEl.offsetWidth;
        const visualY = obtenerMovimientoVertical(caballo.id, nowMs, geometriaVertical, geometriaCarriles[caballo.id] || 0);
        spriteEl.style.transform = 'translate(' + Math.max(0, anchoDisponible * visualX) + 'px, calc(-50% + ' + visualY + 'px))';

        // Ciclo de sprites de carrera: cada caballo avanza SU PROPIA
        // animación (sus propios frames PNG o su silueta de respaldo, a
        // su propio intervalo, ver sprites.js) — no hay una secuencia
        // compartida por los 16 caballos.
        window.SpritesCaballo.avanzarAnimacion(spriteEl, nowMs);
      });

      if (carreraTerminadaVisualmente) return;

      if (!ganadorAnunciado && obtenerProgresoEn(resultadoSimulacion.ganadorId, elapsed) >= 1) {
        ganadorAnunciado = true;
        anunciarGanador();
      }

      if (todosTerminaron) {
        finalizarAnimacion();
        return;
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
  }

  function anunciarGanador() {
    const ganador = participantes.find(function (c) { return c.id === resultadoSimulacion.ganadorId; });
    // El nombre sale siempre del objeto del caballo ganador, nunca de un
    // texto fijo en la interfaz.
    DOM.textoGanador.textContent = (typeof __f === 'function')
      ? __f('carreras_ha_ganado', { caballo: ganador.nombre })
      : 'Ha ganado ' + ganador.nombre;
    DOM.overlayGanador.classList.add('activo');
    // Este aviso es una distinción de "EVENTO 1" (ganador determinado):
    // se muestra brevemente y se retira solo, sin esperar a que el resto
    // del pelotón termine de cruzar y salir de pantalla ("EVENTO 2"). Así
    // la carrera nunca se ve "congelada" detrás de este overlay mientras
    // los demás caballos siguen corriendo.
    setTimeout(function () {
      DOM.overlayGanador.classList.remove('activo');
    }, window.CARRERA_CONFIG.POST_CARRERA.MOSTRAR_GANADOR_MS);
  }

  async function finalizarAnimacion() {
    if (carreraTerminadaVisualmente) return;
    carreraTerminadaVisualmente = true;
    if (rafId) cancelAnimationFrame(rafId);
    pausarVideo();

    // CAUSA RAÍZ (Carreras nunca contaba como "juego usado" para
    // invitados): a diferencia del resto de juegos (casino, dados,
    // ruleta, tragamonedas, memoria, cartas retro -- todos llaman a
    // marcarJuegoCompletado() al concluir su ronda), en ningún archivo de
    // juegos/carreras/ se llamaba nunca a esta función. invitadoPuedeJugar()
    // sí se comprobaba al entrar (script.js), pero como nunca se marcaba
    // el uso, un invitado podía repetir Carreras sin límite mientras que
    // los demás juegos sí quedaban bloqueados tras un solo uso. Se marca
    // aquí, al concluir la animación de la carrera (igual que
    // evaluateResult() en casino/dados hace justo al tener el resultado),
    // independientemente de si la apuesta ganó, perdió o no pudo
    // verificarse -- lo que cuenta como "uso" es haber jugado la ronda,
    // no el resultado económico.
    if (typeof marcarJuegoCompletado === 'function') marcarJuegoCompletado();

    // El aviso "Ha ganado X" ya se auto-oculta mucho antes (ver
    // anunciarGanador): en este punto TODOS los caballos ya cruzaron su
    // meta y salieron de pantalla, así que aquí sólo queda una limpieza
    // defensiva por si quedara visible en algún caso límite, sin
    // introducir una espera adicional que congele la transición al
    // resultado de la apuesta.
    DOM.overlayGanador.classList.remove('activo');

    let gano;
    let gananciaBruta = 0;

    if (modoApuesta === 'puesto') {
      // Fase 7: la apuesta por puesto se liquida de forma VERIFICABLE.
      // El cálculo local (ganoLocal/premioLocal) es el que se usa tal
      // cual para invitados (sin Supabase, nada que verificar del lado
      // servidor); para autenticados es sólo un valor de referencia —
      // quien decide de verdad es liquidarApuestaPorPuestosSegura(),
      // contra el resultado que YA se guardó en Supabase antes de
      // empezar la animación (nunca contra lo que se envíe ahora).
      const cantidad = apuestaPuestoDetalle.puestosSeleccionados.length;
      const costoSeguro = window.ApuestasCarreras.costoPorCantidadPuestos(cantidad) || apuestaPuestoDetalle.costo;
      const multiplicadorSeguro = window.ApuestasCarreras.multiplicadorPorCantidadPuestos(cantidad) || apuestaPuestoDetalle.multiplicador;
      const ganoLocal = calcularGanoApuestaPorPuesto();
      const premioLocal = ganoLocal ? costoSeguro * multiplicadorSeguro : 0;

      const resultadoIdCarrera = resultadoIdCarreraPromise ? await resultadoIdCarreraPromise : null;
      const liquidacion = await window.ApuestasCarreras.liquidarApuestaPorPuestosSegura(
        resultadoIdCarrera,
        caballoApostado.id,
        apuestaPuestoDetalle.puestosSeleccionados,
        ganoLocal,
        premioLocal
      );
      // Caso C: liquidarApuestaPorPuestosSegura() devuelve null cuando la
      // apuesta NO llegó a liquidarse (sin resultadoId válido, RPC caída,
      // ok:false). En ese camino el servidor tampoco descontó ni pagó nada,
      // así que mostrar "¡PERDISTE!" convertía un fallo técnico en una
      // derrota falsa. Ahora no se muestra ni victoria ni derrota: se avisa
      // de que el resultado no pudo verificarse y no se toca el saldo.
      if (liquidacion === null) {
        resultadoNoVerificado = true;
        gano = false;
        gananciaBruta = 0;
      } else {
        gano = liquidacion.gano;
        gananciaBruta = liquidacion.premio;
        if (gano) {
          mostrarVictoriaCompartida(gananciaBruta - costoSeguro);
        } else {
          mostrarDerrotaCompartida();
        }
      }
    } else {
      // Endurecimiento defensivo (no sustituye una validación real en
      // servidor, ver informe): aunque apuestaActual y caballoApostado.multiplicadorPago
      // ya deberían estar dentro de rango por construcción, se vuelven a
      // acotar aquí a los límites configurados justo antes de calcular el
      // pago, para no propagar un valor fuera de rango si algo en memoria
      // fue alterado entre la confirmación de la apuesta y este punto.
      const cfgApuesta = window.CARRERA_CONFIG;
      gano = caballoApostado.id === resultadoSimulacion.ganadorId;
      const apuestaActual = Math.min(
        cfgApuesta.APUESTA_MAX,
        Math.max(cfgApuesta.APUESTA_MIN, window.ApuestasCarreras.getApuestaActual())
      );
      const multiplicadorPagoSeguro = Math.min(
        cfgApuesta.CUOTAS.MAX,
        Math.max(cfgApuesta.CUOTAS.MIN, caballoApostado.multiplicadorPago)
      );
      if (gano) {
        // Ganancia neta según el multiplicador de pago del caballo, igual que
        // los demás juegos aplicando después el bono de ítems si corresponde
        // (mismo helper global window.calcularGananciaConItems).
        let gananciaNeta = Math.round(apuestaActual * (multiplicadorPagoSeguro - 1));
        if (typeof window.calcularGananciaConItems === 'function') {
          gananciaNeta = window.calcularGananciaConItems(gananciaNeta, apuestaActual);
        }
        gananciaBruta = apuestaActual + gananciaNeta;
        mostrarVictoriaCompartida(gananciaNeta);
      } else {
        mostrarDerrotaCompartida();
      }
      // Modo simple: sin cambios respecto a antes de la Fase 7, sigue
      // usando la RPC genérica que ya comparten todos los demás juegos.
      await window.ApuestasCarreras.liquidarApuesta(gano, gananciaBruta);
    }

    if (!resultadoNoVerificado) {
      await esperar(gano ? window.CARRERA_CONFIG.POST_CARRERA.OVERLAY_VICTORIA_MS : window.CARRERA_CONFIG.POST_CARRERA.OVERLAY_DERROTA_MS);
    }
    ocultarOverlaysCompartidos();
    mostrarResultadoFinal(gano);
  }

  /**
   * Apuesta por puesto: gana si el puesto FINAL real del caballo
   * apostado (tomado de resultadoSimulacion.clasificacion, la misma
   * clasificación que ya decidió el motor y que ya se muestra en la
   * pantalla de resultado) está entre los puestos que el jugador
   * seleccionó. Nunca se recalcula ni se aproxima: es una búsqueda
   * directa en la clasificación real.
   */
  function calcularGanoApuestaPorPuesto() {
    if (!apuestaPuestoDetalle || !apuestaPuestoDetalle.puestosSeleccionados.length) return false;
    const fila = resultadoSimulacion.clasificacion.find(function (c) { return c.id === caballoApostado.id; });
    if (!fila) return false;
    return apuestaPuestoDetalle.puestosSeleccionados.indexOf(fila.puesto) !== -1;
  }

  function ocultarOverlaysCompartidos() {
    DOM.overlayGanador.classList.remove('activo');
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('lose-overlay').classList.remove('active');
  }

  // ---- Reutiliza EXACTAMENTE el mismo overlay de victoria/derrota que
  //      usan los demás juegos (mismo markup #win-overlay/#lose-overlay). ----
  function mostrarVictoriaCompartida(gananciaNeta) {
    const overlay = document.getElementById('win-overlay');
    const winAmount = document.getElementById('win-amount');
    if (winAmount) winAmount.textContent = '+' + gananciaNeta;
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(function () { overlay.classList.remove('active'); }, window.CARRERA_CONFIG.POST_CARRERA.OVERLAY_VICTORIA_MS);
    }
  }

  function mostrarDerrotaCompartida() {
    const overlay = document.getElementById('lose-overlay');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(function () { overlay.classList.remove('active'); }, window.CARRERA_CONFIG.POST_CARRERA.OVERLAY_DERROTA_MS);
    }
  }

  /**
   * Texto del título de la pantalla de resultado. Centralizado aquí para que
   * mostrarResultadoFinal() y el handler de 'idiomaAplicado' no dupliquen la
   * misma cadena de condiciones (antes estaban escritas dos veces).
   */
  function textoTituloResultado(gano) {
    if (resultadoNoVerificado) {
      return (typeof __ === 'function') ? __('carreras_sin_verificar') : 'No se pudo verificar el resultado de la carrera. La apuesta no se ha cobrado.';
    }
    if (modoApuesta === 'puesto') {
      const fila = resultadoSimulacion.clasificacion.find(function (c) { return c.id === caballoApostado.id; });
      const puestoFinal = fila ? fila.puesto : '?';
      return gano
        ? (typeof __f === 'function' ? __f('carreras_acertaste_puesto', { caballo: caballoApostado.nombre, puesto: puestoFinal }) : '¡Acertaste! ' + caballoApostado.nombre + ' llegó en el puesto ' + puestoFinal)
        : (typeof __f === 'function' ? __f('carreras_fuera_puesto', { caballo: caballoApostado.nombre, puesto: puestoFinal }) : caballoApostado.nombre + ' llegó en el puesto ' + puestoFinal + ' (fuera de tu selección)');
    }
    return gano
      ? (typeof __f === 'function' ? __f('carreras_acertaste', { caballo: caballoApostado.nombre }) : '¡Acertaste! ' + caballoApostado.nombre + ' ganó la carrera')
      : (typeof __f === 'function' ? __f('carreras_no_gano', { caballo: caballoApostado.nombre }) : caballoApostado.nombre + ' no ganó esta vez');
  }

  function mostrarResultadoFinal(gano) {
    ultimoResultadoGano = gano;
    DOM.resultadoApuestaTitulo.textContent = textoTituloResultado(gano);
    // En el caso "no verificado" no es ni victoria ni derrota: se usa una
    // tercera clase para no pintarlo con los colores de una pérdida.
    DOM.resultadoApuestaTitulo.classList.toggle('resultado-gano', gano && !resultadoNoVerificado);
    DOM.resultadoApuestaTitulo.classList.toggle('resultado-perdio', !gano && !resultadoNoVerificado);
    DOM.resultadoApuestaTitulo.classList.toggle('resultado-no-verificado', resultadoNoVerificado);

    const filas = resultadoSimulacion.clasificacion.map(function (c) {
      const caballo = participantes.find(function (p) { return p.id === c.id; });
      return { puesto: c.puesto, nombre: caballo.nombre };
    });
    window.AnimacionesCarrera.animarClasificacion(DOM.listaClasificacion, filas);
    mostrarClasificacionEnBarra(resultadoSimulacion.clasificacion);

    // Punto 5: la etiqueta "Tu caballo" pertenece a la fase de carrera; al
    // aparecer la pantalla de resultado (que ya dice qué caballo se apostó y
    // en qué puesto llegó) se retira para no duplicar esa información ni
    // quedar flotando sobre la clasificación.
    ocultarIndicadorTuCaballo();

    DOM.pantallaResultado.classList.add('activo');

    // La UI global (menú, monedas, opciones) vuelve a aparecer aquí.
    document.body.classList.remove('carrera-en-curso');
    carreraEnProgreso = false;
  }

  function init() {
    cachearDOM();
    DOM.btnVolverMenu.addEventListener('click', function () {
      DOM.pantallaResultado.classList.remove('activo');
      window.UISeleccion.reiniciarParaNuevaCarrera();
    });

    // Si el usuario cambia de idioma con la pantalla de resultado ya
    // visible, se refresca el título ("¡Acertaste!...") sin recargar
    // ni volver a disparar animaciones/efectos secundarios.
    window.addEventListener('idiomaAplicado', function () {
      // La etiqueta "Tu caballo: X" se escribe por JS, así que aplicarIdioma()
      // (que sólo recorre [data-i18n]) no la alcanza una vez escrita. Se
      // refresca aquí sólo si está visible; el NOMBRE no se traduce nunca.
      if (DOM.tuCaballoIndicador && DOM.tuCaballoIndicador.classList.contains('visible')) {
        actualizarIndicadorTuCaballo();
      }
      if (!DOM.pantallaResultado || !DOM.pantallaResultado.classList.contains('activo')) return;
      // Fallo detectado en prueba real: al cambiar de idioma con la pantalla
      // de resultado ya visible, los ordinales de la clasificación ("1.º",
      // "1着"…) se quedaban en el idioma anterior, porque animarClasificacion()
      // los escribe una sola vez con innerHTML. Se reescriben aquí SÓLO los
      // números de puesto (no se vuelve a animar la lista ni se tocan los
      // nombres de los caballos, que nunca se traducen).
      if (DOM.listaClasificacion && typeof __f === 'function') {
        DOM.listaClasificacion.querySelectorAll('.fila-clasificacion').forEach(function (li, i) {
          const num = li.querySelector('.puesto-num');
          if (num) num.textContent = __f('carreras_ordinal', { puesto: i + 1 });
        });
      }
      if (ultimoResultadoGano === null || !caballoApostado || !resultadoSimulacion) return;
      if (typeof __f !== 'function') return;
      DOM.resultadoApuestaTitulo.textContent = textoTituloResultado(ultimoResultadoGano);
    });
  }

  window.UICarrera = {
    init: init,
    iniciarCarrera: iniciarCarrera
  };
})();
