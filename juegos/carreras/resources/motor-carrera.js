/**
 * motor-carrera.js
 * -----------------------------------------------------------------------
 * REGLA FUNDAMENTAL: este archivo es el ÚNICO responsable de decidir el
 * resultado de la carrera. Calcula, de principio a fin, el progreso de
 * cada caballo a lo largo del tiempo ANTES de que se reproduzca ninguna
 * animación. El resultado (clasificación 1º-16º) sale exclusivamente de
 * esa simulación, nunca de la animación en pantalla, del framerate o
 * del rendimiento del navegador.
 *
 * La UI (resources/ui-carrera.js) sólo LEE la línea de tiempo que este
 * motor genera y la traduce en una posición visual (ver
 * progresoAVisual() más abajo), pero nunca decide nada por su cuenta.
 *
 * DISEÑO (2ª pasada): cada caballo tiene su PROPIO estado de velocidad y
 * su PROPIO calendario de eventos (proximoEventoT), sorteado de forma
 * independiente para cada participante. El ganador se elige ANTES de
 * simular (con probabilidad proporcional a su fuerza, igual que su
 * cuota) y durante la simulación recibe una ventaja acotada y gradual
 * (más probabilidad de eventos positivos, pérdidas más pequeñas, un
 * "closing kick" adicional en el tramo final). Como esa ventaja es
 * probabilística, se reintenta la simulación completa unas pocas veces
 * si hiciera falta; solo si ni así el ganador pre-elegido cruza primero
 * se aplica, como último recurso, una corrección DETERMINISTA que
 * retoca (de forma suave, no instantánea) únicamente el tramo final de
 * SU PROPIA línea de tiempo — nunca se mueve su sprite "a mano".
 * -----------------------------------------------------------------------
 */
(function () {

  // ---- RNG determinista (mulberry32), sembrado por carrera ----
  function crearRNG(semilla) {
    let a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSemilla(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Misma noción de "fuerza" que usa participantes.js para calcular las
  // cuotas (window.RatingCaballoCarreras), así el caballo pre-elegido
  // como ganador sigue correlacionado con su perfil real, sin ser un
  // sorteo ciego uniforme entre los 16.
  function fuerzaCaballo(caballo) {
    return (typeof window.RatingCaballoCarreras === 'function')
      ? window.RatingCaballoCarreras(caballo)
      : 1;
  }

  function elegirGanadorPreliminar(participantes, rng) {
    const fuerzas = participantes.map(fuerzaCaballo);
    const total = fuerzas.reduce(function (a, b) { return a + b; }, 0);
    let r = rng() * total;
    for (let i = 0; i < participantes.length; i++) {
      r -= fuerzas[i];
      if (r <= 0) return participantes[i].id;
    }
    return participantes[participantes.length - 1].id;
  }

  /**
   * Una única pasada completa de la simulación (estocástica, dado un rng
   * que avanza). Cada caballo evoluciona con su propio estado; el
   * caballo con id === ganadorPreliminarId recibe la ventaja configurada
   * en CARRERA_CONFIG.GANADOR, pero el resultado final sigue sin estar
   * garantizado en esta única pasada (para eso existe el reintento y,
   * como último recurso, la corrección determinista de más abajo).
   */
  function simularCarreraInterna(participantes, hipodromo, rng, ganadorPreliminarId) {
    const cfg = window.CARRERA_CONFIG;
    const sim = cfg.SIMULACION;
    const gan = cfg.GANADOR;
    const podio = cfg.PODIO;
    const cierre = sim.CIERRE_POST_META;
    const duracionMs = hipodromo.duracionMs || cfg.DURACION_CARRERA_MS_DEFAULT;
    const pasoMs = sim.PASO_MS;

    // La fase final arranca en un punto propio de ESTA carrera dentro del
    // rango configurado (40s-55s sobre 75s => se expresa como fracción).
    const finalInicioFraccion = lerp(cfg.FASE_FINAL.INICIO_FRACCION_MIN, cfg.FASE_FINAL.INICIO_FRACCION_MAX, rng());
    // Ventana, dentro de la fase final, donde se activa gradualmente el
    // closing kick extra del ganador pre-elegido.
    const closingKickInicioFraccion = Math.max(finalInicioFraccion, 1 - gan.DURACION_CLOSING_KICK_FRACCION);
    const puestosActuales = {};

    const estado = participantes.map(function (c) {
      const velocidadInicial = clamp(
        lerp(sim.VELOCIDAD_INICIAL_MIN, sim.VELOCIDAD_INICIAL_MAX, rng()) +
        (c.stats.velocidadBase - 1) * 8,
        sim.FACTOR_VELOCIDAD_MIN,
        sim.FACTOR_VELOCIDAD_MAX
      );
      return {
        id: c.id,
        esGanadorPreliminar: c.id === ganadorPreliminarId,
        progreso: 0,
        factorVelocidad: velocidadInicial,
        factorObjetivo: velocidadInicial,
        podioInicioFraccion: lerp(podio.INICIO_FRACCION_MIN, podio.INICIO_FRACCION_MAX, rng()),
        // Cada caballo agenda su PRIMER evento de velocidad en un
        // instante propio, sorteado de forma independiente: nunca
        // arrancan todos sincronizados en el mismo tick.
        proximoEventoT: sim.INTERVALO_MIN_EVENTO_MS + rng() * (sim.INTERVALO_MAX_EVENTO_MS - sim.INTERVALO_MIN_EVENTO_MS),
        terminado: false,
        tiempoLlegada: null
      };
    });

    const timeline = {}; // id -> [{t, progreso}]
    participantes.forEach(function (c) { timeline[c.id] = []; });
    // Instrumentación de depuración (no afecta al juego): registra en qué
    // instante ocurrió cada evento de velocidad de cada caballo, para
    // poder comprobar en pruebas que no están sincronizados entre sí.
    const eventosDebug = {};
    participantes.forEach(function (c) { eventosDebug[c.id] = []; });

    const tiempoTope = duracionMs * sim.TOPE_TIEMPO_EXTRA;
    let t = 0;
    let terminados = 0;
    let cierrePostMeta = null;

    while (terminados < estado.length && t <= tiempoTope) {
      const fraccionTiempo = t / duracionMs;
      const enFaseFinal = fraccionTiempo >= finalInicioFraccion;
      const enClosingKick = fraccionTiempo >= closingKickInicioFraccion;
      const avanceRampa = clamp(fraccionTiempo / sim.RAMPA_SALIDA_FRACCION, 0, 1);
      // Smoothstep evita el cambio brusco de aceleración cuando termina la
      // rampa, sin compartir una velocidad entre caballos.
      const rampa = avanceRampa * avanceRampa * (3 - 2 * avanceRampa);

      // El impulso sigue a los tres caballos que van delante en este instante.
      // Así la bonificación forma parte de la simulación y la UI la reproduce
      // desde su timeline, en lugar de mover ganadores manualmente en pantalla.
      estado
        .slice()
        .sort(function (a, b) {
          if (b.progreso !== a.progreso) return b.progreso - a.progreso;
          return a.id.localeCompare(b.id);
        })
        .forEach(function (e, index) { puestosActuales[e.id] = index + 1; });

      for (let i = 0; i < estado.length; i++) {
        const e = estado[i];
        if (e.terminado) continue;
        const caballo = participantes[i];
        const s = caballo.stats;
        const perfilAceleracion = clamp((s.aceleracion - 0.99) / 0.035, 0.65, 1.35);
        const variabilidad = lerp(0.75, 1.25, 1 - s.estabilidad);

        // --- evento de velocidad: CADA caballo consulta SU PROPIO reloj,
        //     nunca un módulo de tiempo global compartido por los 16 ---
        if (cierrePostMeta) {
          // Tras la llegada del ganador no se permiten pérdidas. Cada caballo
          // conserva su factor actual y solo puede subirlo para alcanzar su
          // instante objetivo, sin usar una velocidad común.
          const restanteTiempo = Math.max(pasoMs, e.llegadaObjetivoT - t);
          const distanciaRestante = Math.max(0, 1 - e.progreso);
          const factorNecesario = distanciaRestante * duracionMs / (restanteTiempo * Math.max(0.001, s.velocidadBase));
          // Se recalcula en cada paso, pero solo puede aumentar: cada caballo
          // conserva su estado y acelera lo necesario para su propio objetivo.
          e.factorObjetivo = Math.min(
            cierre.FACTOR_VELOCIDAD_MAX,
            Math.max(e.factorObjetivo, factorNecesario)
          );
        } else if (t >= e.proximoEventoT) {
          const probEvento = enFaseFinal ? sim.PROB_EVENTO_FASE_FINAL : sim.PROB_EVENTO_NORMAL;
          // Menos estable => más probable que sufra variaciones (para bien o para mal).
          const probAjustada = probEvento * (1.4 - s.estabilidad * 0.8);

          if (rng() < probAjustada) {
            let sesgoPositivo = 0.5 + (s.explosividadFinal - 0.5) * (enFaseFinal ? 0.6 : 0.2);
            if (e.esGanadorPreliminar) sesgoPositivo += gan.SESGO_POSITIVO_EXTRA;
            sesgoPositivo = clamp(sesgoPositivo, 0.05, 0.95);

            const esGanancia = rng() < sesgoPositivo;
            if (esGanancia) {
              const extraordinario = enFaseFinal && rng() < (0.10 + s.explosividadFinal * 0.15);
              const maxGanancia = extraordinario ? sim.GANANCIA_EXTRA_MAX : sim.GANANCIA_MAX;
              const cambio = sim.CAMBIO_MINIMO_EVENTO + rng() * Math.max(0, maxGanancia - sim.CAMBIO_MINIMO_EVENTO);
              e.factorObjetivo = clamp(
                e.factorObjetivo + cambio * perfilAceleracion * variabilidad,
                sim.FACTOR_VELOCIDAD_MIN,
                sim.FACTOR_VELOCIDAD_MAX
              );
            } else {
              let magnitudPerdida = sim.CAMBIO_MINIMO_EVENTO + rng() * Math.max(0, sim.PERDIDA_MAX - sim.CAMBIO_MINIMO_EVENTO);
              // El ganador pre-elegido también puede perder velocidad
              // (para que su trayectoria no sea sospechosamente perfecta),
              // pero sus pérdidas pesan menos.
              if (e.esGanadorPreliminar) magnitudPerdida *= gan.REDUCCION_MAGNITUD_PERDIDA;
              e.factorObjetivo = clamp(
                e.factorObjetivo - magnitudPerdida * variabilidad,
                sim.FACTOR_VELOCIDAD_MIN,
                sim.FACTOR_VELOCIDAD_MAX
              );
            }
          } else {
            // Un evento sin cambio conserva la velocidad individual existente.
          }

          // Se agenda el PRÓXIMO evento de ESTE caballo, otra vez con un
          // sorteo propio, independiente del resto.
          e.proximoEventoT = t + sim.INTERVALO_MIN_EVENTO_MS + rng() * (sim.INTERVALO_MAX_EVENTO_MS - sim.INTERVALO_MIN_EVENTO_MS);
          eventosDebug[caballo.id].push(t);
        } else {
          // Entre eventos se conserva el objetivo individual; no hay retorno
          // automático a una velocidad global común.
        }

        // Suavizado: el factor actual converge gradualmente hacia el objetivo.
        const suavizadoVelocidad = cierrePostMeta ? cierre.SUAVIZADO : sim.SUAVIZADO;
        e.factorVelocidad += (e.factorObjetivo - e.factorVelocidad) * suavizadoVelocidad;

        // Closing kick ADICIONAL, exclusivo del ganador pre-elegido:
        // gradual (rampa dentro de su propia ventana) y acotado por
        // config (GANADOR.BONIFICACION_FINAL_MAX). Nunca es un salto
        // instantáneo: crece linealmente a lo largo de su ventana.
        let bonificacionGanador = 1;
        if (e.esGanadorPreliminar && enClosingKick) {
          const avanceKick = clamp((fraccionTiempo - closingKickInicioFraccion) / Math.max(0.001, 1 - closingKickInicioFraccion), 0, 1);
          bonificacionGanador = 1 + gan.BONIFICACION_FINAL_MAX * avanceKick;
        }

        let bonificacionPodio = 1;
        if (puestosActuales[e.id] <= 3 && fraccionTiempo >= e.podioInicioFraccion) {
          const avancePodio = clamp(
            (fraccionTiempo - e.podioInicioFraccion) / Math.max(0.001, podio.DURACION_BONIFICACION_FRACCION),
            0,
            1
          );
          bonificacionPodio = 1 + podio.BONIFICACION_FINAL_MAX * avancePodio;
        }

        const velocidadInstant = s.velocidadBase * rampa * e.factorVelocidad * bonificacionGanador * bonificacionPodio;
        e.progreso += (velocidadInstant * pasoMs) / duracionMs;

        if (e.progreso >= 1 && !e.terminado) {
          e.terminado = true;
          e.progreso = 1;
          e.tiempoLlegada = t;
          terminados++;
        }

        timeline[caballo.id].push({ t: t, progreso: Math.min(e.progreso, 1) });
      }

      if (!cierrePostMeta) {
        const ganadorTerminado = estado.find(function (e) {
          return e.id === ganadorPreliminarId && e.terminado;
        });
        if (ganadorTerminado) {
          const ordenCierre = estado
            .filter(function (e) { return !e.terminado; })
            .sort(function (a, b) {
              if (b.progreso !== a.progreso) return b.progreso - a.progreso;
              return a.id.localeCompare(b.id);
            });
          cierrePostMeta = {
            inicioT: ganadorTerminado.tiempoLlegada,
            finT: ganadorTerminado.tiempoLlegada + cierre.DURACION_OBJETIVO_MS
          };
          ordenCierre.forEach(function (e, index) {
            e.llegadaObjetivoT = cierrePostMeta.inicioT +
              (cierre.DURACION_OBJETIVO_MS * (index + 1) / ordenCierre.length);
            e.proximoEventoT = t;
          });
        }
      }

      t += pasoMs;
    }

    // Salvaguarda: si alguno no cruzó dentro del tope de tiempo, se completa
    // su línea de tiempo con un
    // tramo final suave (ease-out) hasta progreso 1 en vez de dejarlo
    // parado por debajo de la meta para siempre. Sin esto, un solo
    // caballo rezagado impedía que "todos terminaron" se cumpliera nunca
    // y la animación jamás avanzaba al resultado de la apuesta.
    estado.forEach(function (e, i) {
      if (e.terminado) return;
      const caballo = participantes[i];
      const muestras = timeline[caballo.id];
      const ultima = muestras.length ? muestras[muestras.length - 1] : { t: t, progreso: e.progreso };
      const tDesde = ultima.t;
      const progresoDesde = Math.min(ultima.progreso, e.progreso);
      const tHasta = Math.max(tDesde + pasoMs, tiempoTope);
      const pasosRestantes = Math.max(1, Math.round((tHasta - tDesde) / pasoMs));

      for (let k = 1; k <= pasosRestantes; k++) {
        const tk = tDesde + k * pasoMs;
        const avanceCierre = clamp(k / pasosRestantes, 0, 1);
        const easeOut = 1 - Math.pow(1 - avanceCierre, 2);
        const progresoK = progresoDesde + (1 - progresoDesde) * easeOut;
        muestras.push({ t: tk, progreso: Math.min(progresoK, 1) });
      }

      e.terminado = true;
      e.progreso = 1;
      e.tiempoLlegada = tHasta;
      terminados++;
    });

    const clasificacion = estado
      .slice()
      .sort(function (a, b) {
        if (a.tiempoLlegada !== b.tiempoLlegada) return a.tiempoLlegada - b.tiempoLlegada;
        return b.progreso - a.progreso;
      })
      .map(function (e, i) { return { puesto: i + 1, id: e.id }; });

    return {
      duracionMs: duracionMs,
      finalInicioFraccion: finalInicioFraccion,
      timeline: timeline,          // progreso lógico por caballo a lo largo del tiempo
      clasificacion: clasificacion, // orden final 1º..16º de ESTA pasada
      ganadorId: clasificacion[0].id,
      eventosDebug: eventosDebug   // solo diagnóstico/pruebas, no lo usa la UI
    };
  }

  function tiempoLlegadaDe(resultado, id) {
    const muestras = resultado.timeline[id];
    return muestras[muestras.length - 1].t;
  }

  /**
   * Último recurso, solo si ni la ventaja ni los reintentos bastaron
   * (ver informe: se mide qué tan seguido ocurre esto; debe ser raro).
   * Retoca DE FORMA SUAVE Y CONTINUA únicamente el tramo de la línea de
   * tiempo del ganador pre-elegido posterior al inicio de la fase final
   * — jamás el arranque ni la zona media — para que su progreso llegue a
   * 1 justo antes que el actual primero. No es "mover su x en pantalla":
   * es parte de su propio estado de progreso lógico, y la UI simplemente
   * lo reproduce como cualquier otro tramo de la simulación.
   */
  function aplicarCorreccionFinalGarantizada(resultado, participantes, ganadorPreliminarId) {
    const pasoMs = window.CARRERA_CONFIG.SIMULACION.PASO_MS;
    const duracionMs = resultado.duracionMs;

    const actualPrimeroId = resultado.clasificacion[0].id;
    if (actualPrimeroId === ganadorPreliminarId) return resultado;

    const tActualPrimero = tiempoLlegadaDe(resultado, actualPrimeroId);
    const margenMs = Math.max(pasoMs * 2, 150);
    const tObjetivoGanador = Math.max(pasoMs, tActualPrimero - margenMs);

    const muestrasGanador = resultado.timeline[ganadorPreliminarId];
    const idxInicio = Math.min(
      muestrasGanador.length - 1,
      Math.max(0, Math.floor((resultado.finalInicioFraccion * duracionMs) / pasoMs))
    );
    const muestraInicio = muestrasGanador[idxInicio];
    const tInicio = muestraInicio.t;
    const progresoInicio = muestraInicio.progreso;

    const nuevasMuestras = muestrasGanador.slice(0, idxInicio + 1);
    const tFinCorreccion = Math.max(tObjetivoGanador, tInicio + pasoMs);
    for (let t = tInicio + pasoMs; t <= tFinCorreccion; t += pasoMs) {
      const avance = clamp((t - tInicio) / Math.max(1, tFinCorreccion - tInicio), 0, 1);
      const easeOut = 1 - Math.pow(1 - avance, 2); // arranque suave desde el progreso que ya tenía, sin salto
      const progreso = progresoInicio + (1 - progresoInicio) * easeOut;
      nuevasMuestras.push({ t: t, progreso: Math.min(progreso, 1) });
    }
    if (nuevasMuestras[nuevasMuestras.length - 1].progreso < 1) {
      nuevasMuestras.push({ t: tFinCorreccion, progreso: 1 });
    }

    const nuevoTimeline = Object.assign({}, resultado.timeline);
    nuevoTimeline[ganadorPreliminarId] = nuevasMuestras;

    const nuevaClasificacion = participantes
      .map(function (c) {
        const tLlegada = c.id === ganadorPreliminarId ? tObjetivoGanador : tiempoLlegadaDe(resultado, c.id);
        return { id: c.id, tLlegada: tLlegada };
      })
      .sort(function (a, b) { return a.tLlegada - b.tLlegada; })
      .map(function (e, i) { return { puesto: i + 1, id: e.id }; });

    return {
      duracionMs: resultado.duracionMs,
      finalInicioFraccion: resultado.finalInicioFraccion,
      timeline: nuevoTimeline,
      clasificacion: nuevaClasificacion,
      ganadorId: nuevaClasificacion[0].id,
      eventosDebug: resultado.eventosDebug,
      correccionGarantiaAplicada: true
    };
  }

  /**
   * Ejecuta la simulación completa de una carrera de forma síncrona.
   * @param {Array} participantes  lista devuelta por generarParticipantes()
   * @param {object} hipodromo
   * @returns {object} resultado inmutable de la carrera
   */
  function simularCarrera(participantes, hipodromo) {
    const cfg = window.CARRERA_CONFIG;

    const semilla = hashSemilla(
      hipodromo.id + '_' + Date.now() + '_' + participantes.map(function (c) { return c.id; }).join(',')
    );
    const rng = crearRNG(semilla);

    // 1) El ganador se elige ANTES de simular nada, con probabilidad
    //    proporcional a su fuerza (igual criterio que sus cuotas).
    const ganadorPreliminarId = elegirGanadorPreliminar(participantes, rng);

    // 2) Se simula (con la ventaja del ganador ya incorporada al modelo)
    //    y, si hiciera falta, se reintenta unas pocas veces completas.
    const maxIntentos = Math.max(1, cfg.GANADOR.MAX_REINTENTOS_GARANTIA);
    let resultado = null;
    let intentosUsados = 0;
    for (let intento = 0; intento < maxIntentos; intento++) {
      resultado = simularCarreraInterna(participantes, hipodromo, rng, ganadorPreliminarId);
      intentosUsados = intento + 1;
      if (resultado.ganadorId === ganadorPreliminarId) break;
    }

    // 3) Último recurso, poco frecuente si la ventaja está bien calibrada:
    //    corrección determinista y suave del tramo final del ganador.
    let correccionAplicada = false;
    if (resultado.ganadorId !== ganadorPreliminarId) {
      resultado = aplicarCorreccionFinalGarantizada(resultado, participantes, ganadorPreliminarId);
      correccionAplicada = !!resultado.correccionGarantiaAplicada;
    }

    return Object.freeze({
      duracionMs: resultado.duracionMs,
      finalInicioFraccion: resultado.finalInicioFraccion,
      timeline: resultado.timeline,
      clasificacion: resultado.clasificacion,
      ganadorId: resultado.ganadorId,
      // Campos informativos (no usados por la UI, útiles para depuración/pruebas):
      ganadorPreliminarId: ganadorPreliminarId,
      intentosUsados: intentosUsados,
      correccionGarantiaAplicada: correccionAplicada,
      eventosDebug: resultado.eventosDebug || null
    });
  }

  // ---------------------------------------------------------------------
  // SIMULACIÓN VISUAL (no decide nada, sólo traduce progreso -> pantalla)
  // ---------------------------------------------------------------------
  /**
   * Dado el progreso lógico (0..1) de un caballo y la fracción de tiempo
   * transcurrida respecto a la duración total, devuelve una posición
   * horizontal visual (0..1) para dibujarlo en pantalla.
   *
   * Diseño (ver spec): la mayor parte de la carrera el caballo se
   * mantiene visualmente en una franja central con pequeñas variaciones,
   * y sólo en la fase final avanza de verdad hacia la meta. Un caballo
   * que ya terminó (progreso 1) siempre se dibuja cruzando la meta,
   * incluso si el reloj de la animación todavía no llegó al final.
   */
  function progresoAVisual(progreso, fraccionTiempo, finalInicioFraccion, msDesdeLlegada) {
    const V = window.CARRERA_CONFIG.VISUAL;
    // Misma fracción de "rampa de salida" que usa el motor lógico
    // (CARRERA_CONFIG.SIMULACION.RAMPA_SALIDA_FRACCION): se lee del
    // mismo lugar para que el mapeo visual nunca quede desincronizado
    // si ese valor se ajusta en el futuro.
    const rampaSalida = window.CARRERA_CONFIG.SIMULACION.RAMPA_SALIDA_FRACCION;

    if (progreso >= 1) {
      // La meta es una coordenada física (V.ZONA_META), no un punto de
      // teletransporte: al cruzarla, el caballo NO se congela ahí. Sigue
      // avanzando a la derecha (msDesdeLlegada, puramente de
      // presentación) hasta abandonar completamente el área visible.
      if (!msDesdeLlegada || msDesdeLlegada <= 0) return V.ZONA_META;
      const avanceSalida = clamp(msDesdeLlegada / V.SALIDA.DURACION_MS, 0, 1);
      return lerp(V.ZONA_META, V.SALIDA.ZONA_FUERA, avanceSalida);
    }

    if (fraccionTiempo <= rampaSalida) {
      // Arranque: salen de la posición inicial y aceleran.
      return lerp(V.ZONA_SALIDA, V.ZONA_CENTRAL_MIN, clamp(fraccionTiempo / rampaSalida, 0, 1));
    }

    if (fraccionTiempo < finalInicioFraccion) {
      // Zona central: la posición depende del PROPIO progreso lógico del
      // caballo (que ahora diverge de verdad entre caballos, al venir de
      // calendarios de eventos independientes), más una pequeña
      // oscilación para que se sienta vivo.
      const avanceCentral = clamp((fraccionTiempo - rampaSalida) / Math.max(0.001, finalInicioFraccion - rampaSalida), 0, 1);
      const oscilacion = Math.sin(fraccionTiempo * 40 + progreso * 10) * 0.02;
      const base = lerp(V.ZONA_CENTRAL_MIN, V.ZONA_CENTRAL_MAX, avanceCentral);
      // El progreso lógico relativo a lo esperado en este punto desplaza
      // levemente la posición dentro de la franja central, para que se
      // note qué caballos van mejor o peor sin salir todavía a recorrer
      // toda la pantalla.
      const progresoEsperado = Math.max(0.001, avanceCentral * finalInicioFraccion);
      const desviacion = clamp((progreso - progresoEsperado) * 1.5, -0.05, 0.05);
      return clamp(base + oscilacion + desviacion, V.ZONA_CENTRAL_MIN - 0.05, V.ZONA_CENTRAL_MAX + 0.05);
    }

    // Fase final — CORRECCIÓN (ver informe, "causa real de la
    // convergencia en X"): esta rama antes devolvía una posición que
    // dependía ÚNICAMENTE de fraccionTiempo (el reloj compartido por los
    // 16), así que sin importar cuán distinto fuera el progreso real de
    // cada caballo, todos terminaban dibujados casi en el mismo punto a
    // medida que avanzaba el tiempo, y solo "escapaban" de golpe al
    // alcanzar progreso 1 (esa discontinuidad es también la causa de que
    // el impulso del ganador pareciera llegar "después" de la meta: no
    // era tardío, era el salto entre una posición ligada al tiempo y la
    // posición fija de meta). Ahora, igual que en la zona central, la
    // posición depende del progreso REAL de cada caballo respecto al que
    // tendría uno "al ritmo esperado" en este mismo instante.
    const avanceFinalTiempo = clamp((fraccionTiempo - finalInicioFraccion) / (1 - finalInicioFraccion), 0, 1);
    const progresoEsperadoFinal = lerp(finalInicioFraccion, 1, avanceFinalTiempo);
    const desviacionFinal = clamp((progreso - progresoEsperadoFinal) * 1.3, -0.15, 0.15);
    const baseFinal = lerp(V.ZONA_CENTRAL_MAX, V.ZONA_META, avanceFinalTiempo);
    // No se permite alcanzar visualmente la meta mientras progreso siga
    // siendo menor que 1 (eso es exclusivo de la rama de arriba): la
    // meta sigue siendo un punto físico, nunca un teletransporte.
    return clamp(baseFinal + desviacionFinal, V.ZONA_CENTRAL_MAX - 0.08, V.ZONA_META - 0.01);
  }

  window.MotorCarrera = {
    simularCarrera: simularCarrera,
    progresoAVisual: progresoAVisual
  };
})();
