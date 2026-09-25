/**
 * participantes.js
 * -----------------------------------------------------------------------
 * A partir del pool completo de caballos (data-caballos.js) arma los 16
 * participantes de UNA carrera concreta: selección aleatoria sin
 * duplicados + historial visible generado + cuota estimada.
 *
 * El resultado de esta función es lo único que el resto del juego usa
 * como "lista de caballos de la carrera actual": nunca se vuelve a leer
 * directamente window.CABALLOS_POOL en otro lugar.
 * -----------------------------------------------------------------------
 */
(function () {

  function barajar(array, rng) {
    const copia = array.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  // Peso compartido por probabilidades y por la selección preliminar del ganador.
  // Combina stats internos con el historial visible del participante.
  function ratingCaballo(c) {
    const s = c.stats;
    const ratingStats = (s.velocidadBase * 0.5) + (s.aceleracion * 0.2) + (s.estabilidad * 0.2) + (s.explosividadFinal * 0.1);
    const resumen = c.historial && c.historial.resumen;
    if (!resumen) return ratingStats;

    const promedioCalidad = Math.max(0, Math.min(1, (16 - resumen.puestoPromedio) / 15));
    const victoriasCalidad = Math.max(0, Math.min(1, resumen.porcentajeVictorias / 100));
    const top5Calidad = Math.max(0, Math.min(1, resumen.porcentajeTop5 / 100));
    const ratingHistorial = (promedioCalidad * 0.55) + (victoriasCalidad * 0.25) + (top5Calidad * 0.20);
    return ratingStats * (0.72 + ratingHistorial * 0.56);
  }

  function calcularCuotas(participantes) {
    const cfg = window.CARRERA_CONFIG.CUOTAS;
    const ratings = participantes.map(ratingCaballo);
    const total = ratings.reduce((a, b) => a + b, 0);
    return participantes.map((c, i) => {
      const probabilidad = ratings[i] / total;
      let multiplicadorPago = (1 / probabilidad) * (1 - cfg.MARGEN_CASA);
      multiplicadorPago = Math.max(cfg.MIN, Math.min(cfg.MAX, multiplicadorPago));
      return {
        cuota: Math.round(probabilidad * 1000) / 10,
        multiplicadorPago: Math.round(multiplicadorPago * 10) / 10
      };
    });
  }

  /**
   * Genera los 16 participantes de una carrera concreta.
   * @param {object} hipodromo  hipódromo elegido (para usar como parte de la semilla)
   * @param {function} rng      generador aleatorio 0..1 (por defecto Math.random)
   */
  function generarParticipantes(hipodromo, rng) {
    rng = rng || Math.random;
    const cantidad = hipodromo.participantes || window.CARRERA_CONFIG.PARTICIPANTES_POR_CARRERA;
    const elegidos = barajar(window.CABALLOS_POOL, rng).slice(0, cantidad);

    const participantes = elegidos.map(function (base) {
      const historial = window.generarHistorialCaballo(base.perfilHistorial, rng);
      // Endurecimiento defensivo (ver informe, sección de seguridad):
      // cada participante queda inmutable en cuanto se genera. Esto no
      // sustituye una validación en servidor, pero evita que una
      // referencia obtenida por cualquier medio (rendering, eventos,
      // etc.) pueda alterar silenciosamente la cuota o las estadísticas
      // de un caballo ya sorteado para esta carrera.
      return {
        // Copia defensiva: cada participante es independiente aunque
        // provenga del mismo caballo "base" del pool.
        id: base.id,
        nombre: base.nombre,
        color: base.color,
        personalidad: base.personalidad,
        perfilHistorial: base.perfilHistorial,
        stats: Object.freeze(Object.assign({}, base.stats)),
        spriteInicial: base.spriteInicial,
        spriteCarrera1: base.spriteCarrera1,
        spriteCarrera2: base.spriteCarrera2,
        spriteCarrera3: base.spriteCarrera3,
        historial: Object.freeze(historial),
        cuota: 0,
        multiplicadorPago: 0
      };
    });
    const cuotas = calcularCuotas(participantes);
    return Object.freeze(participantes.map(function (participante, i) {
      return Object.freeze(Object.assign({}, participante, cuotas[i]));
    }));
  }

  window.generarParticipantes = generarParticipantes;
  // Se expone también el rating (misma fórmula que calcula las probabilidades)
  // para que motor-carrera.js pueda pre-elegir al ganador con una
  // probabilidad proporcional a su fuerza real, en vez de un sorteo
  // ciego uniforme — así el caballo pre-elegido sigue correlacionado
  // con su perfil, igual que ya lo está su cuota.
  window.RatingCaballoCarreras = ratingCaballo;
})();
