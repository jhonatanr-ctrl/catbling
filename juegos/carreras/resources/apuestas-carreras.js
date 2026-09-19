/**
 * apuestas-carreras.js
 * -----------------------------------------------------------------------
 * Capa fina sobre la infraestructura de apuestas YA EXISTENTE en el
 * casino (resources/coins.js, resources/config.js, resources/api.js,
 * resources/guest.js). No se reimplementa nada de eso: este archivo
 * sólo conecta el input de apuesta reutilizado (#bet-input, misma
 * clase/markup que dados, ruleta, etc.) con el flujo propio de Carreras.
 * -----------------------------------------------------------------------
 */
(function () {

  let apuestaActual = window.CARRERA_CONFIG.APUESTA_MIN;
  let apuestaDeducida = false; // igual que en los demás juegos: evita doble descuento

  function getApuestaActual() { return apuestaActual; }

  // -----------------------------------------------------------------
  // APUESTA POR PUESTO (Fase 6) — modo alternativo a la apuesta simple
  // de arriba. Es un modo aparte con su propio costo (fijo, según la
  // cantidad de puestos elegidos) y su propio multiplicador; no
  // comparte estado con `apuestaActual`/`apuestaDeducida` para no
  // arriesgar la lógica de la apuesta simple que ya funcionaba.
  // -----------------------------------------------------------------
  const CFG_POSICION = window.CARRERA_CONFIG.APUESTA_POSICION;
  let puestosSeleccionados = [];
  let apuestaPuestoDeducida = false;

  function costoPorCantidadPuestos(n) { return CFG_POSICION.COSTOS[n] || 0; }
  function multiplicadorPorCantidadPuestos(n) { return CFG_POSICION.MULTIPLICADORES[n] || 0; }

  function getPuestosSeleccionados() { return puestosSeleccionados.slice(); }

  /**
   * Alterna un puesto (1 a 5) dentro/fuera de la selección actual.
   * @returns {number[]} la selección resultante, ordenada
   */
  function togglePuesto(puesto) {
    if (puesto < 1 || puesto > CFG_POSICION.MAX_PUESTOS_SELECCIONABLES) return getPuestosSeleccionados();
    const idx = puestosSeleccionados.indexOf(puesto);
    if (idx === -1) puestosSeleccionados.push(puesto);
    else puestosSeleccionados.splice(idx, 1);
    puestosSeleccionados.sort(function (a, b) { return a - b; });
    return getPuestosSeleccionados();
  }

  function limpiarSeleccionPuestos() { puestosSeleccionados = []; }

  function getCostoActualPuestos() { return costoPorCantidadPuestos(puestosSeleccionados.length); }
  function getMultiplicadorActualPuestos() { return multiplicadorPorCantidadPuestos(puestosSeleccionados.length); }

  /**
   * Misma validación (auth/saldo/crédito temporal) que la apuesta
   * simple, usando los mismos helpers globales del casino — no se
   * reimplementa nada de eso, sólo cambia CUÁNTO se valida (el costo
   * fijo de la selección de puestos, no un monto libre).
   */
  function validarApuestaPorPuestos() {
    if (puestosSeleccionados.length === 0) return { ok: false, motivo: 'sin_puestos' };
    const costo = getCostoActualPuestos();
    if (costo <= 0) return { ok: false, motivo: 'sin_puestos' };

    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
      requerirAutenticacion();
      return { ok: false, motivo: 'auth' };
    }

    const monedas = getMonedas();
    if (monedas < costo) {
      if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(costo)) {
        return { ok: true, costo: costo };
      }
      if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(costo);
      return { ok: false, motivo: 'sin_saldo' };
    }
    return { ok: true, costo: costo };
  }

  /**
   * Registra en Supabase la clasificación real de la carrera recién
   * simulada, ANTES de liquidar cualquier apuesta por puesto (Fase 7) —
   * así la liquidación se verifica contra un dato que el servidor ya
   * guardó, nunca contra lo que el cliente diga en ese momento. Sólo
   * aplica a usuarios autenticados; los invitados no tienen fila en
   * Supabase y siguen con el cálculo local de siempre.
   * @param {Array<{id:string, puesto:number}>} clasificacion
   * @returns {Promise<string|null>} resultado_id, o null si no aplica/falla
   */
  async function registrarResultadoCarreraSiCorresponde(clasificacion) {
    if (typeof _isAuthenticatedSync !== 'function' || !_isAuthenticatedSync()) return null;
    if (!window.apiRpc || typeof window.apiRpc.registrarResultadoCarrera !== 'function') return null;
    try {
      // CAUSA REAL DEL BUG "apuesta válida marcada como perdida" (ver informe):
      // window.apiRpc.* siempre resuelve el envoltorio {success, data} de
      // _supabaseRequest (resources/api.js), NUNCA el objeto de dominio
      // {ok, resultado_id} directamente. Leer `r.ok`/`r.resultado_id` aquí
      // leía una propiedad que jamás existió en `r` (undefined siempre),
      // así que esta función devolvía `null` en el 100% de los casos aunque
      // la RPC hubiera guardado la clasificación correctamente en el
      // servidor. Con resultadoId siempre null, liquidarApuestaPorPuestosSegura()
      // caía siempre en la rama "sin resultadoId válido" y reportaba
      // pérdida sin importar el resultado real. Mismo patrón correcto que
      // ya usan liquidarApuesta() más abajo y resources/coins.js (`r.success`
      // / `r.data.*`).
      const r = await window.apiRpc.registrarResultadoCarrera(clasificacion);
      return (r && r.success && r.data && r.data.ok) ? r.data.resultado_id : null;
    } catch (e) {
      console.warn('[carreras] No se pudo registrar el resultado en Supabase:', e);
      return null;
    }
  }

  /**
   * Liquida la apuesta por puesto.
   * - Autenticados: SIEMPRE a través de liquidar_apuesta_puesto_carrera,
   *   que decide "gano" y el premio en el servidor comparando contra el
   *   resultado ya guardado — nunca se envía "gané tanto" desde aquí.
   *   Si la RPC falla o no hay resultadoId (por ejemplo, un fallo de red
   *   al registrar el resultado), se trata como pérdida: no existe un
   *   camino que acredite monedas sin que el servidor lo confirme.
   * - Invitados: sin Supabase, se usa el mismo cálculo local que ya
   *   existía desde la Fase 6 (gano/premio ya vienen decididos por
   *   quien llama, con la clasificación real del propio motor).
   *
   * CONTRATO (ampliado tras la auditoría, sin inventar propiedades nuevas):
   * devuelve {gano, premio} SÓLO cuando la apuesta quedó realmente liquidada
   * — por el servidor (autenticados) o localmente (invitados). Si la
   * liquidación NO llegó a ejecutarse (sin resultadoId válido, RPC caída,
   * error de red, o la RPC respondió ok:false) devuelve **null**, que es un
   * valor distinguible de "perdió con premio 0". Antes ambos casos
   * devolvían {gano:false, premio:0}, así que un fallo técnico era
   * indistinguible de una derrota real y se mostraba como "¡PERDISTE!"
   * aunque el caballo hubiera ganado y no se hubiera cobrado nada.
   * @returns {Promise<{gano: boolean, premio: number}|null>}
   */
  async function liquidarApuestaPorPuestosSegura(resultadoId, caballoId, puestosSeleccionados, ganoLocalInvitado, premioLocalInvitado) {
    const autenticado = typeof _isAuthenticatedSync === 'function' && _isAuthenticatedSync();

    if (!autenticado) {
      // Invitado: el costo ya se descontó localmente al confirmar
      // (confirmarApuestaPorPuestos). Aquí sólo se acredita el premio.
      if (ganoLocalInvitado && premioLocalInvitado > 0) {
        cambiarMonedas(premioLocalInvitado);
      } else if (typeof window.procesarPerdida === 'function') {
        window.procesarPerdida();
      }
      if (typeof actualizarUI === 'function') actualizarUI();
      apuestaPuestoDeducida = false;
      limpiarSeleccionPuestos();
      return { gano: !!ganoLocalInvitado, premio: premioLocalInvitado || 0 };
    }

    // null = "no liquidada". Sólo se sustituye por un objeto si el servidor
    // confirma la operación (r.data.ok), que es el único caso en el que
    // realmente se movieron monedas.
    let resultado = null;
    if (resultadoId && window.apiRpc && typeof window.apiRpc.liquidarApuestaPuestoCarrera === 'function') {
      try {
        // Mismo bug que en registrarResultadoCarreraSiCorresponde: hay que
        // leer r.data.ok/r.data.gano/r.data.premio (el objeto de dominio
        // real que devuelve la RPC), no r.ok/r.gano/r.premio directamente
        // sobre el envoltorio {success, data} de _supabaseRequest.
        const r = await window.apiRpc.liquidarApuestaPuestoCarrera(resultadoId, caballoId, puestosSeleccionados);
        if (r && r.success && r.data && r.data.ok) {
          resultado = { gano: !!r.data.gano, premio: r.data.premio || 0 };
          if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') window.coinsAPI.fetch();
          else if (typeof fetchMonedas === 'function') fetchMonedas();
        } else {
          console.warn('[carreras] liquidar_apuesta_puesto_carrera no tuvo éxito:', r);
        }
      } catch (e) {
        console.warn('[carreras] Error liquidando apuesta por puesto:', e);
      }
    } else {
      console.warn('[carreras] Sin resultadoId válido: no se puede liquidar la apuesta por puesto de forma verificada.');
    }

    apuestaPuestoDeducida = false;
    limpiarSeleccionPuestos();
    return resultado;
  }

  /**
   * Confirma la apuesta por puesto sobre el caballo ya elegido en el
   * perfil. Descuenta el costo fijo (según cuántos puestos se hayan
   * seleccionado) exactamente igual que la apuesta simple descuenta su
   * monto: localmente para invitados, o dentro de la RPC para
   * autenticados (ver liquidarApuestaPorPuestosSegura más arriba).
   * @returns {{ok: boolean, costo?: number}}
   */
  function confirmarApuestaPorPuestos() {
    const validacion = validarApuestaPorPuestos();
    if (!validacion.ok) return { ok: false };

    if (!apuestaPuestoDeducida) {
      const costo = validacion.costo;
      if (costo > 0 && typeof _isAuthenticatedSync === 'function' && !_isAuthenticatedSync()) {
        cambiarMonedas(-costo);
      }
      apuestaPuestoDeducida = true;
    }
    return { ok: true, costo: validacion.costo };
  }

  /**
   * Enlaza el mismo componente de apuesta (input numérico + límites) que
   * usan los demás juegos del casino. El markup (#bet-input, .bet-input,
   * .apuesta-slider-wrapper, etc.) es una copia exacta del usado en
   * juegos/dados para conservar estilo y comportamiento.
   */
  function initApuestaInput(onChange) {
    const input = document.getElementById('bet-input');
    const apuestaText = document.getElementById('apuesta-actual');
    if (!input) return;

    const min = window.CARRERA_CONFIG.APUESTA_MIN;
    const max = window.CARRERA_CONFIG.APUESTA_MAX;

    function sync(finalize) {
      input.max = max; input.min = min;
      let n = parseInt(input.value, 10);
      if (isNaN(n)) n = finalize ? min : apuestaActual;
      if (finalize) { n = Math.max(min, Math.min(max, n)); input.value = n; }
      apuestaActual = n;
      if (apuestaText) apuestaText.textContent = apuestaActual;
      if (typeof onChange === 'function') onChange(apuestaActual);
    }

    input.addEventListener('input', function () { sync(false); });
    input.addEventListener('change', function () { sync(true); });
    input.addEventListener('blur', function () { sync(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { sync(true); input.blur(); } });
    sync(true);
  }

  /**
   * Verifica que el jugador puede apostar (autenticación de invitado,
   * saldo suficiente, crédito temporal, etc.) usando exactamente los
   * mismos helpers globales que usan los demás juegos.
   * @returns {{ok: boolean, motivo?: string}}
   */
  function validarApuesta() {
    if (typeof invitadoPuedeJugar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeJugar()) {
      requerirAutenticacion();
      return { ok: false, motivo: 'auth' };
    }

    const monedas = getMonedas();
    if (monedas < apuestaActual) {
      if (typeof window.verificarCreditoTemporal === 'function' && window.verificarCreditoTemporal(apuestaActual)) {
        return { ok: true };
      }
      if (typeof mostrarOverlayGlobal === 'function') mostrarOverlayGlobal(apuestaActual);
      return { ok: false, motivo: 'sin_saldo' };
    }
    return { ok: true };
  }

  /**
   * Confirma la apuesta sobre un caballo. A partir de aquí el jugador ya
   * no puede volver a elegir caballo ni modificar el monto (eso lo
   * controla la UI bloqueando la navegación, ver ui-seleccion.js).
   * @returns {boolean} true si la apuesta quedó confirmada
   */
  function confirmarApuesta() {
    const validacion = validarApuesta();
    if (!validacion.ok) return false;

    if (!apuestaDeducida) {
      const deduccion = typeof window.calcularDeduccionApuesta === 'function'
        ? window.calcularDeduccionApuesta(apuestaActual)
        : apuestaActual;
      // Igual que en los demás juegos: a los usuarios autenticados el
      // descuento real se aplica más adelante, de forma atómica, dentro
      // de la RPC registrar_sesion_casino junto con el premio. A los
      // invitados (sin sesión en Supabase) se les descuenta localmente.
      if (deduccion > 0 && typeof _isAuthenticatedSync === 'function' && !_isAuthenticatedSync()) {
        cambiarMonedas(-deduccion);
      }
      apuestaDeducida = true;
    }
    return true;
  }

  /**
   * Liquida la apuesta al terminar la carrera: reutiliza la misma RPC
   * (`registrar_sesion_casino`) y el mismo fallback local que usan todos
   * los demás juegos de casino, para no crear un sistema paralelo de
   * monedas/recompensas.
   *
   * @param {boolean} gano
   * @param {number} gananciaBruta  monto que se acredita si gano=true (0 si no)
   * @param {number} [apuestaUsada] monto realmente cobrado por esta apuesta.
   *   Si no se pasa, se usa `apuestaActual` (apuesta simple, comportamiento
   *   de siempre, sin cambios). La apuesta por puesto SIEMPRE lo pasa
   *   explícitamente (su costo fijo, no `apuestaActual`).
   * @returns {Promise<void>}
   */
  async function liquidarApuesta(gano, gananciaBruta, apuestaUsada) {
    const apuestaParaRegistro = (typeof apuestaUsada === 'number') ? apuestaUsada : apuestaActual;
    const resultadoMonedas = gano ? gananciaBruta : 0;

    if (typeof _isAuthenticatedSync === 'function' && _isAuthenticatedSync() && window.apiRpc && window.apiRpc.registrarSesionCasino) {
      try {
        const r = await window.apiRpc.registrarSesionCasino(
          window.CARRERA_CONFIG.JUEGO_ID_CASINO,
          apuestaParaRegistro,
          resultadoMonedas,
          gano
        );
        if (r && r.success) {
          if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
            window.coinsAPI.fetch();
          } else if (typeof fetchMonedas === 'function') {
            fetchMonedas();
          }
        }
      } catch (e) {
        console.warn('[carreras] Error registrando partida:', e);
      }
    } else {
      // Fallback local (invitados): la apuesta ya se descontó en
      // confirmarApuesta()/confirmarApuestaPorPuestos(), así que aquí
      // sólo se acredita la GANANCIA NETA (premio bruto menos lo
      // cobrado), igual que hacen los demás juegos en su fallback de
      // invitado (ver juegos/dados/resources/script.js).
      if (gano) {
        cambiarMonedas(gananciaBruta - apuestaParaRegistro);
      } else if (typeof window.procesarPerdida === 'function') {
        window.procesarPerdida();
      }
      if (typeof actualizarUI === 'function') actualizarUI();
    }

    apuestaDeducida = false;
    apuestaPuestoDeducida = false;
    limpiarSeleccionPuestos();
  }

  window.ApuestasCarreras = {
    initApuestaInput: initApuestaInput,
    getApuestaActual: getApuestaActual,
    confirmarApuesta: confirmarApuesta,
    liquidarApuesta: liquidarApuesta,
    // Apuesta por puesto (Fase 6)
    togglePuesto: togglePuesto,
    getPuestosSeleccionados: getPuestosSeleccionados,
    limpiarSeleccionPuestos: limpiarSeleccionPuestos,
    getCostoActualPuestos: getCostoActualPuestos,
    getMultiplicadorActualPuestos: getMultiplicadorActualPuestos,
    costoPorCantidadPuestos: costoPorCantidadPuestos,
    multiplicadorPorCantidadPuestos: multiplicadorPorCantidadPuestos,
    confirmarApuestaPorPuestos: confirmarApuestaPorPuestos,
    registrarResultadoCarreraSiCorresponde: registrarResultadoCarreraSiCorresponde,
    liquidarApuestaPorPuestosSegura: liquidarApuestaPorPuestosSegura
  };
})();