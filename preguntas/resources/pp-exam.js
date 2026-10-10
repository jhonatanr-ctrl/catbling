// pp-exam.js — examen personalizado: reutiliza los componentes visuales de la página de
// preguntas (#zona-preguntas, #opciones-respuesta, #panel-explicacion, flashes, animación de monedas).
// La corrección y la economía las decide SIEMPRE el servidor (doc_responder).
(function (pp) {
  'use strict';
  const C = window.PP_CONFIG;
  let E = null;      // estado del examen en curso

  const $ = id => document.getElementById(id);

  function barra() {
    let b = $('pp-topbar');
    if (!b) { b = pp.el('div', { id: 'pp-topbar', class: 'pp-topbar', 'aria-live': 'polite' }, [pp.el('span', { class: 'pp-prog' }), pp.el('span', { class: 'pp-difbadge' })]); document.body.appendChild(b); }
    return b;
  }
  function pintarBarra() {
    const b = barra(), d = C.DIFICULTADES.find(x => x.id === E.dif);
    b.querySelector('.pp-prog').textContent = pp.t('pp_progreso', { n: Math.min(E.idx + 1, C.PREGUNTAS), total: C.PREGUNTAS });
    const badge = b.querySelector('.pp-difbadge');
    badge.textContent = pp.t('pp_dif_badge', { dif: pp.t(d.labelKey), rec: E.rec, pen: E.pen });
    badge.style.setProperty('--dif-color', d.color);
  }

  function pintarPregunta(animar) {
    const q = E.preguntas[E.idx];
    E.respondido = false; E.ocupado = false;
    $('panel-explicacion').classList.remove('visible');
    const bs = $('btn-siguiente'), be = $('btn-explicacion');
    bs.classList.remove('habilitado'); be.classList.remove('habilitado');
    $('respondidas').textContent = E.idx + 1; $('total').textContent = C.PREGUNTAS;
    $('texto-pregunta').textContent = q.enunciado;
    const cont = $('opciones-respuesta'); cont.innerHTML = '';
    q.opciones.forEach((txt, i) => {
      const b = pp.el('button', { class: 'opcion-respuesta', type: 'button', text: txt });
      b.addEventListener('click', () => responder(i));
      cont.appendChild(b);
    });
    if (animar) { const bl = $('bloque-pregunta'); bl.classList.remove('entrar-derecha', 'salir-izquierda'); void bl.offsetWidth; bl.classList.add('entrar-derecha'); }
    pintarBarra();
  }

  async function responder(i) {
    if (!E || E.ocupado || E.respondido) return;
    E.ocupado = true;                                   // bloquea doble envío en el cliente (el servidor también es idempotente)
    const botones = Array.from(document.querySelectorAll('#opciones-respuesta .opcion-respuesta'));
    botones.forEach(b => b.disabled = true);
    const q = E.preguntas[E.idx];
    const r = await window.ppApi.responder(E.id, q.id, i);
    if (!r.ok) {                                        // sin efecto económico: se puede reintentar
      E.ocupado = false; botones.forEach(b => b.disabled = false);
      return pp.toast(pp.errMsg(r.codigo));
    }
    E.respondido = true;
    q.respondida = true;
    botones[r.indice_correcto].classList.add('correcta');
    if (!r.es_correcta) botones[r.elegido].classList.add('incorrecta');
    const flash = $(r.es_correcta ? 'flash-correcto' : 'flash-incorrecto');
    flash.classList.add('visible'); setTimeout(() => flash.classList.remove('visible'), 600);
    if (!r.repetida && r.delta_aplicado !== 0 && typeof mostrarAnimacionMonedas === 'function') mostrarAnimacionMonedas(Math.abs(r.delta_aplicado), r.delta_aplicado > 0);
    if (!r.repetida && !r.es_correcta && r.delta_aplicado > r.delta_nominal) pp.toast(pp.t('pp_penal_parcial', { aplicada: Math.abs(r.delta_aplicado), nominal: Math.abs(r.delta_nominal) }));
    $('texto-explicacion').textContent = r.explicacion + (r.referencia ? '\n\n' + pp.t('pp_referencia', { ref: r.referencia }) : '');
    $('btn-explicacion').classList.add('habilitado'); $('btn-siguiente').classList.add('habilitado');
    $('panel-explicacion').classList.add('visible');
    E.sesion = r.sesion; E.finalizado = !!r.finalizado;
    pp.refrescarMonedas();
    pp.history && pp.history.recargar();
  }

  function siguiente() {
    if (!E || !E.respondido) return;
    $('panel-explicacion').classList.remove('visible');
    const bl = $('bloque-pregunta'); bl.classList.remove('salir-izquierda', 'entrar-derecha'); void bl.offsetWidth; bl.classList.add('salir-izquierda');
    setTimeout(() => {
      if (E.finalizado || E.idx + 1 >= E.preguntas.length) return terminar();
      E.idx++; pintarPregunta(true);
    }, 500);
  }

  function ocultarJuego() {
    const zona = $('zona-preguntas');
    zona.classList.remove('pp-activa'); $('botones-pregunta').style.display = 'none';
    $('panel-explicacion').classList.remove('visible');
    const b = $('pp-topbar'); if (b) b.remove();
  }

  async function terminar() {
    const s = E.sesion; ocultarJuego(); E = null;
    pp.exam.resumen(s);
  }

  pp.exam = {
    // Empieza o REANUDA: siempre desde lo que dice el servidor (primera pregunta sin responder).
    async empezar(id) {
      const fin = pp.cargando('pp_cargando');
      const r = await window.ppApi.obtenerExamen(id);
      fin();
      if (!r.ok) return pp.toast(pp.errMsg(r.codigo));
      if (r.sesion.estado === 'finalizado') return pp.exam.resumen(r.sesion);
      pp.main.ocultarSeleccion();
      const preguntas = r.preguntas;
      const idx = Math.max(0, preguntas.findIndex(q => !q.respondida));
      E = { id, preguntas, idx, sesion: r.sesion, dif: r.sesion.dificultad, rec: r.recompensa_acierto, pen: r.penalizacion_fallo, respondido: false, ocupado: false, finalizado: false };
      pp.upload.cerrar(); pp.setup.cerrar();
      const ov = $('pp-resumen'); if (ov) ov.remove();
      $('zona-preguntas').classList.add('pp-activa');
      $('botones-pregunta').style.display = 'flex';
      $('btn-siguiente').onclick = siguiente;
      $('btn-explicacion').onclick = () => { if (E && E.respondido) $('panel-explicacion').classList.toggle('visible'); };
      pintarPregunta(false);
    },

    // Overlay de resultados (mismo estilo/flecha que el de preguntas generales, con los datos de la ronda).
    async resumen(sesion) {
      let res = sesion.resumen;
      if (!res) { const r = await window.ppApi.obtenerSesion(sesion.id); if (r.ok) { sesion = r.sesion; res = r.sesion.resumen; } }
      if (!res) return pp.toast(pp.errMsg('estado_invalido'));
      pp.main.ocultarSeleccion();
      pp.upload.cerrar(); pp.setup.cerrar();
      const saldo = await pp.refrescarMonedas();        // saldo confirmado por el servidor
      const fila = (k, v, cls) => pp.el('div', { class: 'pp-res-fila ' + (cls || '') }, [pp.el('span', { text: pp.t(k) }), pp.el('strong', { text: String(v) })]);
      const sg = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
      const parcial = res.penalizaciones_nominales > res.penalizaciones;
      const ov = pp.el('div', { id: 'pp-resumen', class: 'pp-overlay pp-resumen', role: 'dialog', 'aria-modal': 'true' }, [
        pp.el('div', { class: 'pp-resumen-box' }, [
          pp.el('p', { class: 'pp-completado', i18n: 'preg_completado' }),
          pp.el('p', { class: 'pp-res-doc', text: sesion.nombre + ' · ' + pp.nombreDif(res.dificultad) + ' · ' + pp.fmtFecha(res.fecha) }),
          fila('pp_res_correctas', res.correctas + ' / ' + res.total, 'pp-ok'),
          fila('pp_res_incorrectas', res.incorrectas, 'pp-mal'),
          fila('pp_res_porcentaje', res.porcentaje + ' %'),
          fila('pp_res_recompensas', sg(res.recompensas), 'pp-ok'),
          fila('pp_res_penalizaciones', sg(-res.penalizaciones), 'pp-mal'),
          fila('pp_res_entrada', sg(-res.coste_entrada), 'pp-mal'),
          fila('pp_res_neto', sg(res.neto), res.neto >= 0 ? 'pp-ok pp-neto' : 'pp-mal pp-neto'),
          fila('pp_res_saldo', saldo != null ? saldo : res.saldo_final),
          parcial ? pp.el('p', { class: 'pp-muted', text: pp.t('pp_penal_nota', { nominal: res.penalizaciones_nominales, aplicada: res.penalizaciones }) }) : null,
          pp.el('div', { class: 'pp-row pp-res-botones' }, [
            pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'pp_historial', onclick: () => { ov.remove(); pp.upload.abrir(); pp.history.abrirPanel(); } }),
            sesion.tiene_archivo ? pp.el('button', { class: 'pp-btn pp-btn-main', type: 'button', i18n: 'pp_nuevo_examen', onclick: () => nuevoExamen(sesion, ov) }) : null,
            pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'pp_salir', onclick: () => location.reload() }),
          ]),
        ]),
      ]);
      document.body.appendChild(ov);
      ov.querySelector('.pp-btn').focus();
    },
    refrescarIdioma() { if (E) pintarBarra(); },
  };
  pp.exam.estaActivo = () => !!E;

  // Nuevo examen con el MISMO documento: sesión nueva (copia del archivo) => se procesa y se configura.
  async function nuevoExamen(origen, ov) {
    const fin = pp.cargando('pp_paso_creando');
    const nuevo = window.ppApi.uuid();
    const c = await window.ppApi.crearSesion(nuevo, origen.nombre, origen.formato, origen.tamano_bytes, origen.id);
    if (!c.ok) { fin(); return pp.toast(pp.errMsg(c.codigo)); }
    const cp = await window.ppApi.copiar(c.origen_storage_path, c.storage_path);
    fin();
    if (!cp.ok) return pp.toast(pp.errMsg('error_subida'));
    ov.remove();
    await pp.procesarSesion(nuevo);
  }
})(window.pp);
