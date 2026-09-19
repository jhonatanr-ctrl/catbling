/**
 * historial.js
 * -----------------------------------------------------------------------
 * Genera el HISTORIAL VISIBLE de un caballo (lo que el jugador puede leer
 * en su perfil antes de apostar). Es completamente independiente de los
 * parámetros internos que usa el motor de carrera (resources/motor-carrera.js):
 * aporta una idea del comportamiento probable del caballo, pero nunca
 * garantiza el resultado de la carrera actual.
 *
 * Cada "perfilHistorial" tiene una distribución de puestos distinta,
 * para que el historial sea estadísticamente coherente con la fama del
 * caballo (un caballo "muy consistente" no debe mostrar saltos absurdos
 * entre el 1º y el 16º puesto sin ninguna razón).
 * -----------------------------------------------------------------------
 */
(function () {

  const TOTAL_PARTICIPANTES_HISTORICOS = 16;

  // Distribución de pesos por puesto (índice 0 = puesto 1) para cada perfil.
  // No hace falta que sumen exactamente 1: se normalizan al usarse.
  function pesosPorPerfil(perfil) {
    const pesos = new Array(TOTAL_PARTICIPANTES_HISTORICOS).fill(0);
    switch (perfil) {
      case 'dominante':
        // Más de 50% de victorias, resto repartido cerca de la punta.
        pesos[0] = 0.55;
        for (let i = 1; i < 6; i++) pesos[i] = 0.45 * Math.pow(0.55, i - 1);
        break;

      case 'ganador_ocasional':
        pesos[0] = 0.20;
        for (let i = 1; i < 10; i++) pesos[i] = 0.80 * Math.pow(0.78, i - 1) / 9 * 4;
        break;

      case 'top5_frecuente':
        // 70% concentrado en el top 5, resto disperso hacia el medio/final.
        for (let i = 0; i < 5; i++) pesos[i] = 0.70 / 5;
        for (let i = 5; i < TOTAL_PARTICIPANTES_HISTORICOS; i++) pesos[i] = 0.30 / (TOTAL_PARTICIPANTES_HISTORICOS - 5);
        break;

      case 'top5_raro':
        // Solo ~15% en el top 5, la mayoría entre puestos medios y bajos.
        for (let i = 0; i < 5; i++) pesos[i] = 0.15 / 5;
        for (let i = 5; i < TOTAL_PARTICIPANTES_HISTORICOS; i++) pesos[i] = 0.85 / (TOTAL_PARTICIPANTES_HISTORICOS - 5);
        break;

      case 'inconsistente':
        // Bimodal: o muy bien, o muy mal, pocas veces término medio.
        for (let i = 0; i < 4; i++) pesos[i] = 0.40 / 4;
        for (let i = 4; i < 11; i++) pesos[i] = 0.20 / 7;
        for (let i = 11; i < TOTAL_PARTICIPANTES_HISTORICOS; i++) pesos[i] = 0.40 / 5;
        break;

      case 'medio':
        // Concentrado en posiciones intermedias (6ª a 11ª).
        for (let i = 0; i < 5; i++) pesos[i] = 0.12 / 5;
        for (let i = 5; i < 11; i++) pesos[i] = 0.68 / 6;
        for (let i = 11; i < TOTAL_PARTICIPANTES_HISTORICOS; i++) pesos[i] = 0.20 / 5;
        break;

      case 'impredecible':
      default:
        // Prácticamente uniforme.
        pesos.fill(1 / TOTAL_PARTICIPANTES_HISTORICOS);
        break;
    }
    return pesos;
  }

  function muestrearPuesto(pesos, rng) {
    const total = pesos.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < pesos.length; i++) {
      r -= pesos[i];
      if (r <= 0) return i + 1;
    }
    return pesos.length;
  }

  /**
   * Genera un historial coherente para un perfil dado.
   * @param {string} perfil  uno de los perfiles definidos arriba
   * @param {function} rng   generador de números aleatorios 0..1 (Math.random por defecto)
   * @returns {{carreras: Array<{puesto:number, totalParticipantes:number}>, resumen: object}}
   */
  function generarHistorial(perfil, rng) {
    rng = rng || Math.random;
    const cfg = window.CARRERA_CONFIG;
    const numCarreras = cfg.HISTORIAL_MIN_CARRERAS +
      Math.floor(rng() * (cfg.HISTORIAL_MAX_CARRERAS - cfg.HISTORIAL_MIN_CARRERAS + 1));

    const pesos = pesosPorPerfil(perfil);
    const carreras = [];

    // Para el perfil "inconsistente" agrupamos los resultados en pequeñas
    // rachas (2-3 carreras seguidas de una misma "tendencia") en vez de
    // puro ruido independiente, para que se sienta orgánico y no aleatorio
    // sin sentido.
    if (perfil === 'inconsistente') {
      let generadas = 0;
      let rachaBuena = rng() < 0.5;
      while (generadas < numCarreras) {
        const largoRacha = 2 + Math.floor(rng() * 2); // 2 o 3
        for (let i = 0; i < largoRacha && generadas < numCarreras; i++) {
          const puesto = rachaBuena
            ? 1 + Math.floor(rng() * 4)                      // 1º-4º
            : (12 + Math.floor(rng() * 5));                  // 12º-16º
          carreras.push({ puesto: Math.min(puesto, TOTAL_PARTICIPANTES_HISTORICOS), totalParticipantes: TOTAL_PARTICIPANTES_HISTORICOS });
          generadas++;
        }
        rachaBuena = !rachaBuena;
      }
    } else {
      for (let i = 0; i < numCarreras; i++) {
        const puesto = muestrearPuesto(pesos, rng);
        carreras.push({ puesto, totalParticipantes: TOTAL_PARTICIPANTES_HISTORICOS });
      }
    }

    // Resumen estadístico derivado (solo para presentación, no afecta al motor)
    const victorias = carreras.filter(c => c.puesto === 1).length;
    const top5 = carreras.filter(c => c.puesto <= 5).length;
    const promedio = carreras.reduce((a, c) => a + c.puesto, 0) / carreras.length;

    return {
      carreras,
      resumen: {
        totalCarreras: carreras.length,
        victorias,
        porcentajeVictorias: Math.round((victorias / carreras.length) * 100),
        top5,
        porcentajeTop5: Math.round((top5 / carreras.length) * 100),
        puestoPromedio: Math.round(promedio * 10) / 10
      }
    };
  }

  window.generarHistorialCaballo = generarHistorial;
})();
