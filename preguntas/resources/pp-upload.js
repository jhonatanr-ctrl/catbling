// pp-upload.js — pantalla de carga de documentos: selección, arrastrar y soltar,
// validación en cliente (el servidor valida de nuevo), subida y procesamiento.
(function (pp) {
  'use strict';
  const C = window.PP_CONFIG;
  let root = null, estado = { archivo: null, ocupado: false };

  const ICONO = '<svg viewBox="0 0 16 20" width="64" height="80" aria-hidden="true" shape-rendering="crispEdges">' +
    '<path d="M1 0h9l5 5v15H1z" fill="#ffd700"/><path d="M10 0v5h5z" fill="#b8860b"/><path d="M3 9h10v1H3zM3 12h10v1H3zM3 15h7v1H3z" fill="#1a1a1a"/></svg>';

  function extension(nombre) { const m = /\.([a-z0-9]+)$/i.exec(nombre || ''); return m ? m[1].toLowerCase() : ''; }

  // Devuelve null si es válido, o el código de error.
  function validar(f) {
    const ext = extension(f.name);
    if (!C.FORMATOS[ext]) return 'formato_no_soportado';
    if (f.size === 0) return 'archivo_vacio';
    if (f.size > C.MAX_BYTES) return 'archivo_demasiado_grande';
    return null;
  }

  function mostrarError(codigo) {
    const n = root.querySelector('.pp-error');
    n.textContent = codigo ? pp.errMsg(codigo) : '';
    n.hidden = !codigo;
  }

  function pintarArchivo() {
    const box = root.querySelector('.pp-fileinfo');
    const f = estado.archivo;
    box.hidden = !f;
    if (f) box.innerHTML = '', box.appendChild(pp.el('div', {}, [
      pp.el('strong', { text: f.name }),
      pp.el('span', { class: 'pp-muted', text: ' · ' + extension(f.name).toUpperCase() + ' · ' + pp.fmtSize(f.size) }),
    ]));
  }

  function bloquear(b) {
    estado.ocupado = b;
    if (!root) return;                 // la pantalla ya se cerró (p. ej. tras pasar al ajuste del examen)
    root.classList.toggle('pp-busy', b);
    root.querySelectorAll('button.pp-pick, button.pp-hist-toggle').forEach(x => x.disabled = b);
    root.querySelector('.pp-drop').setAttribute('aria-busy', b ? 'true' : 'false');
    root.querySelector('.pp-loadbar').hidden = !b;
  }
  function paso(key) { root.querySelector('.pp-loadmsg').textContent = pp.t(key); }

  async function elegir(f) {
    if (!f || estado.ocupado) return;
    estado.archivo = f; pintarArchivo();
    const err = validar(f);
    mostrarError(err);
    if (err) return;
    await procesar(f);
  }

  // Crea la sesión (idempotente), sube el original al bucket privado y lo procesa.
  async function procesar(f) {
    bloquear(true);
    try {
      const ext = extension(f.name);
      paso('pp_paso_creando');
      const id = pp.ultimaId && pp.ultimaClave === f.name + f.size + f.lastModified ? pp.ultimaId : window.ppApi.uuid();
      pp.ultimaId = id; pp.ultimaClave = f.name + f.size + f.lastModified;   // reintento del mismo archivo = misma sesión (sin duplicados)
      const c = await window.ppApi.crearSesion(id, f.name, ext, f.size);
      if (!c.ok) { mostrarError(c.codigo); return; }
      paso('pp_paso_subiendo');
      if (c.sesion.estado === 'cargando') {
        const s = await window.ppApi.subir(c.storage_path, f, ext);
        if (!s.ok) { mostrarError('error_subida'); pp.history && pp.history.recargar(); return; }
      }
      await pp.procesarSesion(id);
    } finally { bloquear(false); }
  }

  // Procesa (o reintenta) una sesión ya creada. Reutilizado por el historial.
  pp.procesarSesion = async function (id) {
    if (root) paso('pp_paso_procesando');
    const fin = root ? null : pp.cargando('pp_paso_procesando');
    const r = await window.ppApi.procesar(id);
    if (fin) fin();
    pp.history && pp.history.recargar();
    if (!r.ok) {
      const msg = pp.errMsg(r.codigo);
      if (root) mostrarError(r.codigo); else pp.toast(msg);
      return false;
    }
    if (root) { mostrarError(null); }
    pp.upload.cerrar();
    pp.setup.abrir(id);
    return true;
  };

  pp.upload = {
    abrir: function () {
      if (root) return;
      const input = pp.el('input', { type: 'file', class: 'pp-file', accept: '.pdf,.docx,.txt,' + Object.values(C.FORMATOS).join(','), hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
      input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; elegir(f); });

      const drop = pp.el('div', { class: 'pp-drop', tabindex: '0', role: 'button', 'aria-label': pp.t('pp_subir_titulo') }, [
        pp.el('div', { class: 'pp-icon', 'aria-hidden': 'true' }),
        pp.el('p', { class: 'pp-p pp-drop-text', i18n: 'pp_subir_texto' }),
        pp.el('button', { class: 'pp-btn pp-btn-main pp-pick', type: 'button', i18n: 'pp_elegir_archivo', onclick: e => { e.stopPropagation(); input.click(); } }),
        pp.el('p', { class: 'pp-muted pp-hint', text: pp.t('pp_formatos_hint', { max: Math.round(C.MAX_BYTES / 1048576) }), 'data-hint': '1' }),
      ]);
      drop.querySelector('.pp-icon').innerHTML = ICONO;
      drop.addEventListener('click', () => { if (!estado.ocupado) input.click(); });
      drop.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !estado.ocupado) { e.preventDefault(); input.click(); } });
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (!estado.ocupado) drop.classList.add('pp-drag'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('pp-drag'); }));
      drop.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; elegir(f); });

      root = pp.el('div', { id: 'pp-upload', class: 'pp-overlay pp-screen' }, [
        pp.el('div', { class: 'pp-box pp-upload-box' }, [
          pp.el('h2', { class: 'pp-h2', i18n: 'pp_subir_titulo' }),
          drop,
          input,
          pp.el('div', { class: 'pp-fileinfo', hidden: true }),
          pp.el('p', { class: 'pp-error', role: 'alert', hidden: true }),
          pp.el('div', { class: 'pp-loadbar', hidden: true, role: 'status', 'aria-live': 'polite' }, [pp.el('div', { class: 'pp-spinner' }), pp.el('span', { class: 'pp-loadmsg' })]),
          pp.el('p', { class: 'pp-muted pp-privacy', i18n: 'pp_privacidad' }),
          pp.el('div', { class: 'pp-row' }, [
            pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'volver', onclick: () => { pp.upload.cerrar(); pp.main.mostrarModo(); } }),
            pp.el('button', { class: 'pp-btn pp-btn-sec pp-hist-toggle', type: 'button', i18n: 'pp_historial', onclick: () => pp.history.alternar() }),
          ]),
        ]),
      ]);
      document.body.appendChild(root);
      pp.history.montar(root);
      drop.focus();
    },
    cerrar: function () { if (root) { pp.history && pp.history.desmontar(); pp.cerrar(root); root = null; estado = { archivo: null, ocupado: false }; } },
    refrescarIdioma: function () {
      if (!root) return;
      const h = root.querySelector('[data-hint]'); if (h) h.textContent = pp.t('pp_formatos_hint', { max: Math.round(C.MAX_BYTES / 1048576) });
    },
    _validar: validar,
  };
})(window.pp);
