// pp-history.js — panel lateral con el historial de documentos/sesiones del usuario.
// Reanudar, ver resultados, configurar, reintentar (sin duplicar ni cobrar) y eliminar (con confirmación).
(function (pp) {
  'use strict';
  let host = null, panel = null, abierto = false, sesiones = [], timer = null, cargaId = 0;

  const ETIQ = { cargando: 'pp_estado_cargando', procesando: 'pp_estado_procesando', listo: 'pp_estado_listo', en_curso: 'pp_estado_en_curso', finalizado: 'pp_estado_finalizado', error: 'pp_estado_error' };

  function accion(key, cls, fn) { return pp.el('button', { class: 'pp-btn pp-btn-sm ' + cls, type: 'button', i18n: key, onclick: fn }); }

  async function borrar(s) {
    const r = await window.ppApi.eliminar(s.id);
    if (!r.ok) return pp.toast(pp.errMsg(r.codigo));
    if (r.storage_path) window.ppApi.borrarArchivo(r.storage_path);
    pp.toast(pp.t('pp_eliminado'), 'ok');
    recargar();
  }

  function tarjeta(s) {
    const acc = [];
    if (s.estado === 'en_curso') acc.push(accion('pp_continuar', 'pp-btn-main', () => pp.setup.abrir(s.id)));
    else if (s.estado === 'finalizado') {
      acc.push(accion('pp_ver_resultados', 'pp-btn-main', () => pp.exam.resumen(s)));
      if (s.tiene_archivo) acc.push(accion('pp_nuevo_examen', 'pp-btn-sec', () => pp.setup.abrir(s.id)));
    } else if (s.estado === 'listo') acc.push(accion('pp_configurar', 'pp-btn-main', () => pp.setup.abrir(s.id)));
    if ((s.estado === 'error' || s.estado === 'procesando' || s.estado === 'cargando') && s.puede_reintentar)
      acc.push(accion('pp_reintentar', 'pp-btn-main', async () => { await pp.procesarSesion(s.id); }));
    if (s.estado !== 'en_curso')
      acc.push(accion('pp_eliminar', 'pp-btn-danger', () => pp.confirmar('pp_eliminar_titulo', pp.t('pp_eliminar_texto', { nombre: s.nombre }), () => borrar(s), { peligro: true, yesKey: 'pp_eliminar' })));

    const meta = [s.formato.toUpperCase(), pp.fmtSize(s.tamano_bytes), pp.fmtFecha(s.creado_en)].join(' · ');
    const det = [];
    if (s.dificultad && (s.estado === 'en_curso' || s.estado === 'finalizado')) det.push(pp.nombreDif(s.dificultad));
    if (s.estado === 'en_curso') det.push(pp.t('pp_hist_progreso', { n: s.respondidas, total: window.PP_CONFIG.PREGUNTAS }));
    if (s.estado === 'finalizado' && s.resumen) det.push(s.resumen.correctas + '/' + s.resumen.total + ' (' + s.resumen.porcentaje + '%)', (s.resumen.neto > 0 ? '+' : '') + s.resumen.neto + ' 🪙');
    return pp.el('li', { class: 'pp-hist-item pp-st-' + s.estado }, [
      pp.el('div', { class: 'pp-hist-name', text: s.nombre, title: s.nombre }),
      pp.el('div', { class: 'pp-muted pp-hist-meta', text: meta }),
      pp.el('div', { class: 'pp-hist-state' }, [
        pp.el('span', { class: 'pp-badge pp-badge-' + s.estado, text: pp.t(ETIQ[s.estado] || 'pp_estado_error') }),
        det.length ? pp.el('span', { class: 'pp-muted', text: det.join(' · ') }) : null,
      ]),
      s.estado === 'error' ? pp.el('p', { class: 'pp-error pp-hist-err', text: pp.errMsg(s.error_codigo) }) : null,
      pp.el('div', { class: 'pp-hist-actions' }, acc),
    ]);
  }

  function pintar(msg) {
    if (!panel) return;
    const lista = panel.querySelector('.pp-hist-list');
    lista.innerHTML = '';
    if (msg) { lista.appendChild(pp.el('li', { class: 'pp-muted pp-hist-vacio', text: msg })); return; }
    if (!sesiones.length) lista.appendChild(pp.el('li', { class: 'pp-muted pp-hist-vacio', text: pp.t('pp_hist_vacio') }));
    sesiones.forEach(s => lista.appendChild(tarjeta(s)));
  }

  async function recargar() {
    if (!panel) return;
    const mi = ++cargaId;
    const r = await window.ppApi.listar();
    if (mi !== cargaId || !panel) return;
    if (!r.ok) { pintar(pp.errMsg(r.codigo)); return; }
    sesiones = r.sesiones || [];
    pintar();
    // Sondeo suave mientras algo se está procesando (p. ej. tras recargar la página).
    clearTimeout(timer);
    if (sesiones.some(s => s.estado === 'procesando' || s.generando)) timer = setTimeout(recargar, 5000);
  }

  function fijar(v) {
    abierto = v;
    if (panel) panel.classList.toggle('pp-abierto', v);
    if (host) host.classList.toggle('pp-hist-abierto', v);
    const b = host && host.querySelector('.pp-hist-toggle'); if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) recargar();
  }

  pp.history = {
    montar: function (contenedor) {
      host = contenedor;
      panel = pp.el('aside', { class: 'pp-hist', 'aria-label': pp.t('pp_historial') }, [
        pp.el('div', { class: 'pp-hist-head' }, [
          pp.el('h3', { class: 'pp-h3', i18n: 'pp_historial' }),
          pp.el('button', { class: 'pp-btn pp-btn-sm pp-btn-sec', type: 'button', 'aria-label': pp.t('cerrar'), text: '✕', onclick: () => fijar(false) }),
        ]),
        pp.el('ul', { class: 'pp-hist-list' }),
      ]);
      host.appendChild(panel);
      const t = host.querySelector('.pp-hist-toggle'); if (t) t.setAttribute('aria-expanded', 'false');
      abierto = false;
      recargar();                                   // contenido listo (y el sondeo) aunque el panel esté cerrado
    },
    desmontar: function () { clearTimeout(timer); cargaId++; if (panel) pp.cerrar(panel); panel = null; host = null; abierto = false; },
    alternar: function () { fijar(!abierto); },
    abrirPanel: function () { fijar(true); },
    recargar: recargar,
    refrescarIdioma: function () { if (panel) { panel.setAttribute('aria-label', pp.t('pp_historial')); pintar(); } },
  };
})(window.pp);
