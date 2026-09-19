/**
 * ui-seleccion.js
 * -----------------------------------------------------------------------
 * Controla las pantallas de selección de hipódromo, el grid de los 16
 * caballos participantes y el overlay de perfil de cada caballo
 * (personalidad + historial + botón de apostar). No sabe nada sobre el
 * motor de carrera: sólo produce, al confirmar la apuesta, el evento
 * `onApuestaConfirmada` que el orquestador (script.js) escucha para
 * pasar a la pantalla de carrera.
 * -----------------------------------------------------------------------
 */
(function () {

  let hipodromoElegido = null;
  let participantesActuales = [];
  let caballoEnPerfil = null;
  let caballoApostado = null;
  let apuestaBloqueada = false; // true en cuanto se confirma la apuesta
  let modoApuestaActual = 'simple'; // 'simple' | 'puesto' — se resetea en cada perfil/carrera nueva

  const DOM = {}; // se rellena en init()

  function cachearDOM() {
    DOM.pantallaSeleccion = document.getElementById('pantalla-seleccion-hipodromo');
    DOM.listaHipodromos = document.getElementById('lista-hipodromos');

    DOM.pantallaCaballos = document.getElementById('pantalla-caballos');
    DOM.gridCaballos = document.getElementById('grid-caballos');
    DOM.tituloHipodromoElegido = document.getElementById('titulo-hipodromo-elegido');
    DOM.btnVolverHipodromos = document.getElementById('btn-volver-hipodromos');

    DOM.overlayPerfil = document.getElementById('overlay-perfil-caballo');
    DOM.btnVolverCaballos = document.getElementById('btn-volver-caballos');
    DOM.perfilSprite = document.getElementById('perfil-sprite');
    DOM.perfilNombre = document.getElementById('perfil-nombre');
    DOM.perfilCuota = document.getElementById('perfil-cuota');
    DOM.perfilPersonalidad = document.getElementById('perfil-personalidad');
    DOM.perfilResumenHistorial = document.getElementById('perfil-resumen-historial');
    DOM.perfilHistorialLista = document.getElementById('perfil-historial-lista');
    DOM.btnApostar = document.getElementById('btn-apostar');
    DOM.perfilBetSection = document.getElementById('perfil-bet-section');
    DOM.btnConfirmarApuesta = document.getElementById('btn-confirmar-apuesta');

    // Apuesta por puesto (UI que faltaba: la lógica ya existía en
    // apuestas-carreras.js/ui-carrera.js pero no había ningún control
    // real para activar este modo desde la pantalla de perfil).
    DOM.tabsModo = document.getElementById('modo-apuesta-tabs');
    DOM.btnModoSimple = document.getElementById('btn-modo-simple');
    DOM.btnModoPuesto = document.getElementById('btn-modo-puesto');
    DOM.betPuestoSection = document.getElementById('perfil-bet-puesto-section');
    DOM.gridPuestos = document.getElementById('grid-puestos');
    DOM.puestoCostoActual = document.getElementById('puesto-costo-actual');
    DOM.puestoMultiplicadorActual = document.getElementById('puesto-multiplicador-actual');
    DOM.btnConfirmarApuestaPuesto = document.getElementById('btn-confirmar-apuesta-puesto');
  }

  /**
   * Ordinal de puesto traducido ("1.º" / "#1" / "1着" / "第1名"…). Antes
   * estaba escrito a mano como `puesto + '.º'` en tres sitios distintos, así
   * que el sufijo salía en español en los 6 idiomas. Usa la clave central
   * carreras_ordinal (no hay un segundo sistema de traducción).
   */
  function ordinal(puesto) {
    return (typeof __f === 'function') ? __f('carreras_ordinal', { puesto: puesto }) : (puesto + '.º');
  }

  /**
   * Distancia del hipódromo con su unidad traducida. El separador de miles
   * también sigue al idioma activo: antes estaba fijo en 'es'.
   */
  function formatearDistancia(metros) {
    const lang = (typeof config === 'object' && config && config.idioma) ? config.idioma : 'es';
    let n;
    try { n = metros.toLocaleString(lang); } catch (e) { n = String(metros); }
    return (typeof __f === 'function') ? __f('carreras_metros', { distancia: n }) : (n + ' m');
  }

  function mostrarPantalla(el) {
    document.querySelectorAll('.pantalla').forEach(function (p) { p.classList.remove('activa'); });
    el.classList.add('activa');
  }

  // ---------------------------------------------------------------------
  // PANTALLA 1: hipódromos
  // ---------------------------------------------------------------------
  function renderHipodromos() {
    DOM.listaHipodromos.innerHTML = '';
    window.HIPODROMOS.forEach(function (h) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tarjeta-hipodromo';
      const nombreT = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(h, 'nombre') : h.nombre;
      const descripcionT = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(h, 'descripcion') : h.descripcion;
      const climaT = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(h, 'clima') : h.clima;
      const terrenoT = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(h, 'terreno') : h.terreno;
      const condicionT = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(h, 'condicion') : h.condicion;
      card.innerHTML =
        '<div class="tarjeta-hipodromo-imagen" style="background-image:url(\'' + h.imagen + '\')"></div>' +
        '<div class="tarjeta-hipodromo-info">' +
        '  <h3>' + nombreT + '</h3>' +
        '  <p class="tarjeta-hipodromo-desc">' + descripcionT + '</p>' +
        '  <ul class="tarjeta-hipodromo-datos">' +
        '    <li><strong>' + __("carreras_distancia") + '</strong> ' + formatearDistancia(h.distanciaMetros) + '</li>' +
        '    <li><strong>' + __("carreras_terreno") + '</strong> ' + terrenoT + '</li>' +
        '    <li><strong>' + __("carreras_clima") + '</strong> ' + climaT + '</li>' +
        '    <li><strong>' + __("carreras_condicion") + '</strong> ' + condicionT + '</li>' +
        '  </ul>' +
        '</div>';
      card.addEventListener('click', function () { elegirHipodromo(h); });
      DOM.listaHipodromos.appendChild(card);
    });
  }

  function elegirHipodromo(hipodromo) {
    hipodromoElegido = hipodromo;
    participantesActuales = window.generarParticipantes(hipodromo);
    caballoApostado = null;
    apuestaBloqueada = false;

    DOM.tituloHipodromoElegido.textContent = typeof window.obtenerHipodromoCampoTraducido === 'function' ? window.obtenerHipodromoCampoTraducido(hipodromo, 'nombre') : hipodromo.nombre;
    renderGridCaballos();
    mostrarPantalla(DOM.pantallaCaballos);
  }

  // ---------------------------------------------------------------------
  // PANTALLA 2: grid de 16 caballos
  // ---------------------------------------------------------------------
  function renderGridCaballos() {
    DOM.gridCaballos.innerHTML = '';
    participantesActuales.forEach(function (caballo) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'item-caballo';
      const spriteEl = window.SpritesCaballo.crearElementoSprite(caballo, 'idle');
      item.appendChild(spriteEl);
      const nombre = document.createElement('span');
      nombre.className = 'item-caballo-nombre';
      nombre.textContent = caballo.nombre;
      item.appendChild(nombre);
      const cuota = document.createElement('span');
      cuota.className = 'item-caballo-cuota';
      cuota.textContent = caballo.cuota + 'x';
      item.appendChild(cuota);

      item.addEventListener('click', function () { abrirPerfil(caballo); });
      DOM.gridCaballos.appendChild(item);
    });
  }

  // ---------------------------------------------------------------------
  // OVERLAY: perfil del caballo
  // ---------------------------------------------------------------------
  // Textos traducibles del perfil (separado de abrirPerfil para poder
  // refrescarlos solos cuando el usuario cambia de idioma con el perfil
  // ya abierto, sin re-disparar el resto de la lógica de apertura).
  function actualizarTextosPerfil(caballo) {
    DOM.perfilNombre.textContent = caballo.nombre; // Nombre propio: NUNCA se traduce
    DOM.perfilCuota.textContent = __("carreras_cuota_estimada") + ' ' + caballo.cuota + 'x';
    DOM.perfilPersonalidad.textContent = typeof window.obtenerCaballoPersonalidadTraducida === 'function' ? window.obtenerCaballoPersonalidadTraducida(caballo) : caballo.personalidad;

    const r = caballo.historial.resumen;
    DOM.perfilResumenHistorial.textContent =
      r.totalCarreras + ' ' + __("carreras_carreras_registradas") + ' · ' +
      r.porcentajeVictorias + '% ' + __("carreras_de_victorias") + ' · ' +
      r.porcentajeTop5 + '% ' + __("carreras_entre_5_primeros") + ' · ' + __("carreras_puesto_promedio") + ' ' + r.puestoPromedio;
  }

  function renderChipsHistorial(caballo) {
    DOM.perfilHistorialLista.innerHTML = '';
    caballo.historial.carreras.forEach(function (c) {
      const chip = document.createElement('span');
      chip.className = 'chip-historial ' + claseSegunPuesto(c.puesto);
      chip.textContent = ordinal(c.puesto);
      DOM.perfilHistorialLista.appendChild(chip);
    });
  }

  function abrirPerfil(caballo) {
    if (apuestaBloqueada) return; // ya no se puede navegar tras apostar
    caballoEnPerfil = caballo;

    DOM.perfilSprite.innerHTML = '';
    DOM.perfilSprite.appendChild(window.SpritesCaballo.crearElementoSprite(caballo, 'idle'));
    actualizarTextosPerfil(caballo);

    renderChipsHistorial(caballo);

    DOM.perfilBetSection.classList.add('oculto');
    DOM.btnApostar.classList.remove('oculto');
    DOM.btnApostar.disabled = false;

    // Cada vez que se abre un perfil (caballo nuevo, o el mismo tras
    // volver atrás) el flujo de apuesta arranca limpio: modo simple por
    // defecto y ninguna selección de puestos arrastrada de una apertura
    // anterior sin confirmar.
    window.ApuestasCarreras.limpiarSeleccionPuestos();
    seleccionarModoApuesta('simple');
    DOM.betPuestoSection.classList.add('oculto');

    DOM.overlayPerfil.classList.add('activo');
  }

  function traducirControlesCarreras() {
    if (DOM.btnApostar) DOM.btnApostar.textContent = (typeof __ === 'function') ? __('carreras_apostar') : 'APOSTAR';
    if (DOM.btnConfirmarApuesta) DOM.btnConfirmarApuesta.textContent = (typeof __ === 'function') ? __('carreras_confirmar_apuesta') : 'CONFIRMAR APUESTA';
    if (DOM.btnConfirmarApuestaPuesto) DOM.btnConfirmarApuestaPuesto.textContent = (typeof __ === 'function') ? __('carreras_confirmar_apuesta_puesto') : 'CONFIRMAR APUESTA POR PUESTO';
    if (DOM.btnModoSimple) DOM.btnModoSimple.textContent = (typeof __ === 'function') ? __('carreras_apuesta_simple') : 'Apuesta simple';
    if (DOM.btnModoPuesto) DOM.btnModoPuesto.textContent = (typeof __ === 'function') ? __('carreras_apuesta_puesto') : 'Apuesta por puesto';
  }

  // ---------------------------------------------------------------------
  // Apuesta por puesto: selector de modo + grid de puestos 1..5
  // ---------------------------------------------------------------------
  function seleccionarModoApuesta(modo) {
    if (apuestaBloqueada) return;
    modoApuestaActual = (modo === 'puesto') ? 'puesto' : 'simple';

    DOM.btnModoSimple.classList.toggle('activo', modoApuestaActual === 'simple');
    DOM.btnModoPuesto.classList.toggle('activo', modoApuestaActual === 'puesto');

    // Cambiar de modo reinicia el flujo de apuesta a "sin abrir todavía":
    // hay que volver a pulsar APOSTAR para el modo elegido. Así nunca
    // queda una sección de un modo visible mientras el otro está activo.
    DOM.perfilBetSection.classList.add('oculto');
    DOM.betPuestoSection.classList.add('oculto');
    DOM.btnApostar.classList.remove('oculto');
  }

  function renderGridPuestos() {
    if (!DOM.gridPuestos) return;
    const max = window.CARRERA_CONFIG.APUESTA_POSICION.MAX_PUESTOS_SELECCIONABLES;
    DOM.gridPuestos.innerHTML = '';
    for (let puesto = 1; puesto <= max; puesto++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'puesto-opcion';
      btn.dataset.puesto = String(puesto);
      btn.textContent = ordinal(puesto);
      btn.addEventListener('click', function () {
        window.ApuestasCarreras.togglePuesto(puesto);
        actualizarUIPuestos();
      });
      DOM.gridPuestos.appendChild(btn);
    }
  }

  function actualizarUIPuestos() {
    if (!DOM.gridPuestos) return;
    const seleccionados = window.ApuestasCarreras.getPuestosSeleccionados();
    DOM.gridPuestos.querySelectorAll('.puesto-opcion').forEach(function (btn) {
      const puesto = parseInt(btn.dataset.puesto, 10);
      btn.classList.toggle('seleccionado', seleccionados.indexOf(puesto) !== -1);
    });
    const costo = window.ApuestasCarreras.getCostoActualPuestos();
    const multiplicador = window.ApuestasCarreras.getMultiplicadorActualPuestos();
    if (DOM.puestoCostoActual) DOM.puestoCostoActual.textContent = costo;
    if (DOM.puestoMultiplicadorActual) DOM.puestoMultiplicadorActual.textContent = multiplicador;
    if (DOM.btnConfirmarApuestaPuesto) DOM.btnConfirmarApuestaPuesto.disabled = seleccionados.length === 0;
  }

  function claseSegunPuesto(puesto) {
    if (puesto === 1) return 'chip-oro';
    if (puesto <= 5) return 'chip-verde';
    if (puesto <= 10) return 'chip-neutro';
    return 'chip-rojo';
  }

  function cerrarPerfil() {
    if (apuestaBloqueada) return;
    DOM.overlayPerfil.classList.remove('activo');
    caballoEnPerfil = null;
  }

  function mostrarSeccionApuesta() {
    DOM.btnApostar.classList.add('oculto');
    if (modoApuestaActual === 'puesto') {
      DOM.betPuestoSection.classList.remove('oculto');
      actualizarUIPuestos();
    } else {
      DOM.perfilBetSection.classList.remove('oculto');
      window.ApuestasCarreras.initApuestaInput();
    }
  }

  function confirmarApuestaSobreCaballoActual() {
    if (!caballoEnPerfil || apuestaBloqueada) return;
    const ok = window.ApuestasCarreras.confirmarApuesta();
    if (!ok) return;

    caballoApostado = caballoEnPerfil;
    apuestaBloqueada = true;

    // A partir de aquí: ya no se puede volver a elegir caballo ni cambiar
    // la apuesta (se ocultan/​deshabilitan los botones de navegación).
    DOM.btnVolverCaballos.classList.add('oculto');
    DOM.btnVolverHipodromos.classList.add('oculto');
    document.getElementById('bet-input').disabled = true;
    DOM.btnConfirmarApuesta.disabled = true;
    DOM.btnConfirmarApuesta.textContent = __("carreras_apuesta_confirmada");
    if (DOM.tabsModo) DOM.tabsModo.classList.add('oculto');

    // BUGFIX: antes este overlay nunca se cerraba al confirmar la
    // apuesta (solo se limpiaba mucho después, al volver al menú desde
    // la pantalla de resultado), así que quedaba encima de toda la
    // pantalla de carrera con su fondo oscuro bloqueando la vista y los
    // clics durante prácticamente toda la animación. Ahora se cierra
    // aquí mismo, con su propia animación de salida, y solo se dispara
    // el evento que arranca la carrera cuando el overlay ya está
    // completamente oculto (display:none real, sin capa interceptando
    // eventos ni z-index visible).
    cerrarOverlayPerfilConTransicion(function () {
      document.dispatchEvent(new CustomEvent('carreras:apuestaConfirmada', {
        detail: {
          hipodromo: hipodromoElegido,
          participantes: participantesActuales,
          caballoApostado: caballoApostado,
          modoApuesta: 'simple',
          monto: window.ApuestasCarreras.getApuestaActual()
        }
      }));
    });
  }

  /**
   * Equivalente a confirmarApuestaSobreCaballoActual() pero para el modo
   * "apuesta por puesto": descuenta el costo fijo según la cantidad de
   * puestos elegidos (nunca un monto libre) y arranca la carrera con
   * modoApuesta:'puesto', para que ui-carrera.js liquide contra la RPC
   * segura (autenticados) o el fallback local (invitados).
   */
  function confirmarApuestaPorPuestoSobreCaballoActual() {
    if (!caballoEnPerfil || apuestaBloqueada) return;
    const resultado = window.ApuestasCarreras.confirmarApuestaPorPuestos();
    if (!resultado.ok) return;

    // Se capturan ANTES de que la carrera termine y limpie la selección
    // (liquidarApuestaPorPuestosSegura la reinicia al liquidar).
    const puestosSeleccionados = window.ApuestasCarreras.getPuestosSeleccionados();
    const multiplicador = window.ApuestasCarreras.getMultiplicadorActualPuestos();

    caballoApostado = caballoEnPerfil;
    apuestaBloqueada = true;

    DOM.btnVolverCaballos.classList.add('oculto');
    DOM.btnVolverHipodromos.classList.add('oculto');
    if (DOM.tabsModo) DOM.tabsModo.classList.add('oculto');
    DOM.gridPuestos.querySelectorAll('.puesto-opcion').forEach(function (btn) { btn.disabled = true; });
    DOM.btnConfirmarApuestaPuesto.disabled = true;
    DOM.btnConfirmarApuestaPuesto.textContent = __("carreras_apuesta_confirmada");

    cerrarOverlayPerfilConTransicion(function () {
      document.dispatchEvent(new CustomEvent('carreras:apuestaConfirmada', {
        detail: {
          hipodromo: hipodromoElegido,
          participantes: participantesActuales,
          caballoApostado: caballoApostado,
          modoApuesta: 'puesto',
          puestosSeleccionados: puestosSeleccionados,
          costo: resultado.costo,
          multiplicador: multiplicador
        }
      }));
    });
  }

  /**
   * Cierra #overlay-perfil-caballo reproduciendo su animación de salida
   * (clase .cerrando, definida en style.css: fade + desplazamiento hacia
   * abajo) y solo AL TERMINAR esa transición retira también la clase
   * .activo, dejando el overlay en display:none real (no solo opacity:0)
   * para que no quede ninguna capa fixed interceptando eventos ni
   * tapando el vídeo/los caballos. onCompleto se invoca justo después.
   */
  function cerrarOverlayPerfilConTransicion(onCompleto) {
    const duracionMs = window.CARRERA_CONFIG.POST_CARRERA.TRANSICION_APUESTA_MS;

    if (!DOM.overlayPerfil.classList.contains('activo')) {
      // Ya estaba cerrado (no debería pasar en este flujo, pero por
      // robustez evitamos reproducir una animación sobre algo oculto).
      if (typeof onCompleto === 'function') onCompleto();
      return;
    }

    DOM.overlayPerfil.style.setProperty('--duracion-cierre', duracionMs + 'ms');
    DOM.overlayPerfil.classList.add('cerrando');

    setTimeout(function () {
      DOM.overlayPerfil.classList.remove('activo');
      DOM.overlayPerfil.classList.remove('cerrando');
      DOM.overlayPerfil.style.removeProperty('--duracion-cierre');
      caballoEnPerfil = null;
      if (typeof onCompleto === 'function') onCompleto();
    }, duracionMs);
  }

  function volverAHipodromos() {
    if (apuestaBloqueada) return;
    mostrarPantalla(DOM.pantallaSeleccion);
  }

  function reiniciarParaNuevaCarrera() {
    apuestaBloqueada = false;
    caballoApostado = null;
    caballoEnPerfil = null;
    hipodromoElegido = null;
    DOM.overlayPerfil.classList.remove('activo');
    DOM.overlayPerfil.classList.remove('cerrando');
    DOM.overlayPerfil.style.removeProperty('--duracion-cierre');
    DOM.btnVolverCaballos.classList.remove('oculto');
    DOM.btnVolverHipodromos.classList.remove('oculto');

    // Reinicio completo del flujo de apuesta por puesto entre carreras
    // (además del reinicio ya existente de btnConfirmarApuesta/bet-input
    // más abajo, en abrirPerfil): sin esto, una segunda carrera podría
    // heredar botones deshabilitados, texto "APUESTA CONFIRMADA" o una
    // selección de puestos de la carrera anterior.
    window.ApuestasCarreras.limpiarSeleccionPuestos();
    modoApuestaActual = 'simple';
    if (DOM.tabsModo) DOM.tabsModo.classList.remove('oculto');
    if (DOM.btnModoSimple) DOM.btnModoSimple.classList.add('activo');
    if (DOM.btnModoPuesto) DOM.btnModoPuesto.classList.remove('activo');
    if (DOM.betPuestoSection) DOM.betPuestoSection.classList.add('oculto');
    if (DOM.gridPuestos) {
      DOM.gridPuestos.querySelectorAll('.puesto-opcion').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('seleccionado');
      });
    }
    if (DOM.btnConfirmarApuestaPuesto) {
      DOM.btnConfirmarApuestaPuesto.disabled = true;
      DOM.btnConfirmarApuestaPuesto.textContent = (typeof __ === 'function') ? __('carreras_confirmar_apuesta_puesto') : 'CONFIRMAR APUESTA POR PUESTO';
    }

    // BUG REAL encontrado por prueba funcional (no del arnés): el botón y
    // el input de la apuesta SIMPLE se deshabilitaban al confirmar (ver
    // confirmarApuestaSobreCaballoActual) pero nunca se volvían a
    // habilitar aquí — sólo se había añadido el reinicio del lado de
    // "apuesta por puesto". Efecto observable: la segunda carrera (en
    // CUALQUIER combinación) mostraba "APUESTA CONFIRMADA" deshabilitado
    // y el input de monto bloqueado, sin forma de volver a apostar en
    // modo simple.
    const betInput = document.getElementById('bet-input');
    if (betInput) betInput.disabled = false;
    if (DOM.btnConfirmarApuesta) {
      DOM.btnConfirmarApuesta.disabled = false;
      DOM.btnConfirmarApuesta.textContent = (typeof __ === 'function') ? __('carreras_confirmar_apuesta') : 'CONFIRMAR APUESTA';
    }

    mostrarPantalla(DOM.pantallaSeleccion);
  }

  function init() {
    cachearDOM();
    traducirControlesCarreras();
    renderHipodromos();
    renderGridPuestos();

    DOM.btnVolverHipodromos.addEventListener('click', volverAHipodromos);
    DOM.btnVolverCaballos.addEventListener('click', cerrarPerfil);
    DOM.btnApostar.addEventListener('click', mostrarSeccionApuesta);
    DOM.btnConfirmarApuesta.addEventListener('click', confirmarApuestaSobreCaballoActual);

    window.addEventListener('idiomaAplicado', function () {
      traducirControlesCarreras();
      // Estas tres partes se construyen con innerHTML/textContent en tiempo
      // de ejecución, así que aplicarIdioma() (que sólo recorre [data-i18n])
      // no podía tocarlas: al cambiar de idioma se quedaban con el texto
      // anterior. Se vuelven a dibujar aquí, sin re-disparar ninguna lógica
      // de apuesta ni de navegación.
      renderHipodromos();
      renderGridPuestos();
      actualizarUIPuestos();
      if (hipodromoElegido) {
        DOM.tituloHipodromoElegido.textContent = (typeof window.obtenerHipodromoCampoTraducido === 'function')
          ? window.obtenerHipodromoCampoTraducido(hipodromoElegido, 'nombre')
          : hipodromoElegido.nombre;
      }
      if (caballoEnPerfil) {
        actualizarTextosPerfil(caballoEnPerfil);
        renderChipsHistorial(caballoEnPerfil);
      }
    });

    if (DOM.btnModoSimple) DOM.btnModoSimple.addEventListener('click', function () { seleccionarModoApuesta('simple'); });
    if (DOM.btnModoPuesto) DOM.btnModoPuesto.addEventListener('click', function () { seleccionarModoApuesta('puesto'); });
    if (DOM.btnConfirmarApuestaPuesto) DOM.btnConfirmarApuestaPuesto.addEventListener('click', confirmarApuestaPorPuestoSobreCaballoActual);
  }

  window.UISeleccion = {
    init: init,
    reiniciarParaNuevaCarrera: reiniciarParaNuevaCarrera
  };
})();
