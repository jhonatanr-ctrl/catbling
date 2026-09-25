/**
 * config-carrera.js
 * -----------------------------------------------------------------------
 * Punto ÚNICO de configuración para el juego "Carreras de Caballos".
 * Nada relacionado con tiempos, cantidades o comportamientos del motor
 * debe escribirse como número mágico en otros archivos: todo se lee
 * desde aquí para poder ajustarlo fácilmente en el futuro (duraciones
 * reales por hipódromo, velocidad de sprites, fase final, etc.)
 * -----------------------------------------------------------------------
 */
window.CARRERA_CONFIG = {

  // ---- Estructura general ----
  MAX_HIPODROMOS: 8,
  PARTICIPANTES_POR_CARRERA: 16,
  HISTORIAL_MAX_CARRERAS: 15,
  HISTORIAL_MIN_CARRERAS: 5,

  // ---- Apuesta (mismos límites usados por el resto del casino) ----
  APUESTA_MIN: 6,
  APUESTA_MAX: 500,
  JUEGO_ID_CASINO: 'carreras', // valor del enum casino_juego en Supabase

  // ---- Duración provisional de referencia (1 min 15s) ----
  // Cada hipódromo puede sobreescribir esto en data-hipodromos.js.
  // NUNCA se debe escribir "75000" directamente en otro archivo: siempre
  // se debe leer hipodromo.duracionMs || CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT
  DURACION_CARRERA_MS_DEFAULT: 75000,

  // ---- Contador de salida ----
  CONTEO: {
    ESPERA_INICIAL_MS: 2000,
    DURACION_PASO_MS: 1000,
    PASOS: ['1', '2', '3', '4', '5', '¡GO!']
  },

  // ---- Fase final (expresada como fracción de la duración total,
  //      así funciona igual sin importar la duración real del hipódromo) ----
  FASE_FINAL: {
    // Para 75s equivale aprox. a 40s-55s de inicio y hasta el final de carrera
    INICIO_FRACCION_MIN: 40 / 75,
    INICIO_FRACCION_MAX: 55 / 75,
    FIN_FRACCION: 1.0
  },

  // ---- Sprites ----
  SPRITE: {
    INTERVALO_CAMBIO_MS: 140,      // velocidad de cambio de frame de carrera
    SECUENCIA: ['run1', 'run2', 'run3']
  },

  // ---- Vídeo de fondo ----
  VIDEO: {
    // 'inmediato'  -> se pausa apenas termina el último caballo
    // 'delay'      -> se pausa DELAY_MS después de terminar
    // 'al_ultimo'  -> igual que inmediato (alias explícito pedido en el spec)
    MODO_PAUSA: 'inmediato',
    DELAY_MS: 0
  },

  // ---- Tiempos de la secuencia posterior a la carrera (para que ningún
  //      archivo de UI tenga un setTimeout/espera con un número "mágico") ----
  POST_CARRERA: {
    MOSTRAR_GANADOR_MS: 1600,      // cuánto se ve el overlay "Ha ganado X" antes de pasar al resultado
    OVERLAY_VICTORIA_MS: 4500,     // duración del overlay de victoria compartido
    OVERLAY_DERROTA_MS: 4000,      // duración del overlay de derrota compartido
    CLASIFICACION_STAGGER_MS: 60,  // retraso escalonado entre cada fila de la clasificación
    TRANSICION_APUESTA_MS: 380     // duración de la animación de salida del overlay de perfil al confirmar la apuesta
  },

  // ---- Motor de simulación (todo esto es interno, el jugador nunca lo ve) ----
  SIMULACION: {
    PASO_MS: 50,                 // resolución temporal del motor determinista
    SUAVIZADO: 0.12,             // inercia: cuánto se acerca por paso al nuevo objetivo
    VELOCIDAD_INICIAL_MIN: 0.30, // factor inicial mínimo individual
    VELOCIDAD_INICIAL_MAX: 1.10, // factor inicial máximo individual
    FACTOR_VELOCIDAD_MIN: 0.68,  // límite acumulado inferior
    FACTOR_VELOCIDAD_MAX: 1.42,  // límite acumulado superior
    CAMBIO_MINIMO_EVENTO: 0.025, // cambio mínimo acumulativo de un evento
    PERDIDA_MAX: 0.18,           // pérdida máxima acumulativa por evento normal
    GANANCIA_MAX: 0.22,          // ganancia máxima acumulativa por evento normal
    GANANCIA_EXTRA_MAX: 0.30,    // ganancia máxima acumulativa en un evento excepcional
    // Cada caballo tiene su PROPIO calendario de eventos (ver
    // participante.proximoEvento en el motor): el próximo evento de cada
    // uno se sortea de forma independiente dentro de este rango, así que
    // nunca "todos cambian de velocidad a la vez". El promedio (~2000ms)
    // se mantiene similar al de la versión anterior para conservar el
    // balance de incertidumbre ya probado, sin imponer un reloj global.
    INTERVALO_MIN_EVENTO_MS: 900,
    INTERVALO_MAX_EVENTO_MS: 1800,
    PROB_EVENTO_NORMAL: 0.55,     // prob. de "evento" de velocidad por chequeo fuera de fase final
    PROB_EVENTO_FASE_FINAL: 0.95, // prob. de "evento" de velocidad por chequeo en fase final (más frecuente)
    RAMPA_SALIDA_FRACCION: 0.08, // fracción inicial dedicada a "acelerar" desde parados
    TOPE_TIEMPO_EXTRA: 1.25,     // margen extra (x duración) por si algún caballo va muy retrasado
    CIERRE_POST_META: {
      DURACION_OBJETIVO_MS: 4000,
      FACTOR_VELOCIDAD_MAX: 10.00,
      SUAVIZADO: 0.32
    }
  },

  // ---- Ventaja del caballo pre-seleccionado como ganador (ver informe:
  //      "el ganador debe estar determinado desde el principio"). Se
  //      elige ANTES de simular (con probabilidad proporcional a su
  //      fuerza, igual que sus cuotas) y luego recibe una ventaja
  //      acotada y gradual: nunca decide su posición cambiando su x en
  //      pantalla, solo hace más probable que sus propios eventos de
  //      velocidad independientes le favorezcan. ----
  GANADOR: {
    BONIFICACION_MEJOR_PROMEDIO: 1.5, // +50% de probabilidad relativa para el mejor promedio de la carrera
    SESGO_POSITIVO_EXTRA: 0.85,        // se suma a su probabilidad de que un evento sea de ganancia (no de pérdida)
    REDUCCION_MAGNITUD_PERDIDA: 0.35,  // sus pérdidas de velocidad se multiplican por esto (más bajo = pierde menos)
    BONIFICACION_FINAL_MAX: 0.25,      // tope de bonificación extra de velocidad durante su closing kick
    DURACION_CLOSING_KICK_FRACCION: 0.25, // últimos X% de la carrera donde se activa gradualmente esa bonificación
    MAX_REINTENTOS_GARANTIA: 10        // reintentos completos de la simulación si el sesgo no bastó para que cruce 1º
  },

  // ---- Impulso gradual para los tres caballos que van en cabeza ----
  PODIO: {
    BONIFICACION_FINAL_MAX: 0.10,       // +10% de velocidad como máximo
    INICIO_FRACCION_MIN: 0.72,          // no empieza antes del 72% de la carrera
    INICIO_FRACCION_MAX: 0.86,          // inicio aleatorio hasta el 86%
    DURACION_BONIFICACION_FRACCION: 0.10 // tarda el 10% de la carrera en alcanzar el máximo
  },


  // ---- Mapeo visual (posición en pantalla, NO la lógica de la carrera) ----
  VISUAL: {
    ZONA_SALIDA: 0.05,      // posición inicial en pantalla (0 = borde izquierdo)
    ZONA_CENTRAL_MIN: 0.20,
    ZONA_CENTRAL_MAX: 0.75,
    ZONA_META: 0.95,        // posición visual de la meta (coordenada física, no un teletransporte)
    // Tras cruzar su propia meta, un caballo NO se congela: sigue
    // avanzando a la derecha hasta abandonar completamente el área
    // visible. ZONA_FUERA > 1 garantiza que quede fuera del ancho de
    // pista disponible (ver progresoAVisual). DURACION_MS controla cuánto
    // tarda ese tramo final, puramente visual, en completarse.
    SALIDA: {
      ZONA_FUERA: 1.3,
      DURACION_MS: 3000
    },
    MOVIMIENTO_VERTICAL: {
      ACTIVADO: true,
      // El rango vertical ya NO es un número de píxeles fijo: se calcula
      // en tiempo real a partir del alto real de la pista (ver
      // ui-carrera.js/calcularRangoVerticalPx), como una fracción de la
      // mitad de esa altura, para que los caballos puedan usar
      // prácticamente todo el área visible sin importar el tamaño de
      // pantalla. MARGEN_SEGURIDAD_PX se descuenta para que el sprite
      // nunca quede cortado por el borde superior/inferior de la pista.
      RANGO_FRACCION_ALTURA: 0.50,
      MARGEN_SEGURIDAD_PX: 34,
      CAMBIO_MIN_MS: 2500,   // mínimo que mantiene una dirección/objetivo
      CAMBIO_MAX_MS: 4500,   // máximo que mantiene una dirección/objetivo
      DURACION_MULTIPLICADOR: 4.5, // +70% al subir o bajar hacia cada objetivo
      PREFERENCIA_SUPERIOR: {
        ACTIVADA: true,
        PROBABILIDAD: 0.72    // probabilidad de elegir un objetivo por encima del centro de la pista
      }
    }
  },

  // ---- Cuotas / pago ----
  CUOTAS: {
    MARGEN_CASA: 0.10, // 10% de margen sobre la probabilidad estimada
    MIN: 1.4,
    MAX: 25
  },

  // ---- Apuesta por puesto (Fase 6/7): costo y multiplicador fijos
  //      según CUÁNTOS puestos se seleccionen (1 a 5), nunca decididos
  //      por el cliente en el momento de liquidar (ver
  //      supabase/migrations/006_carreras_apuesta_puesto_segura.sql,
  //      donde esta misma tabla existe también en el servidor). ----
  APUESTA_POSICION: {
    MAX_PUESTOS_SELECCIONABLES: 5,
    COSTOS: { 1: 6, 2: 10, 3: 14, 4: 18, 5: 22 },
    MULTIPLICADORES: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }
  }
};
