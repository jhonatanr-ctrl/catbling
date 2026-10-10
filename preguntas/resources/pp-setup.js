// pp-setup.js — overlay posterior a la carga: vista previa, dificultad y botón «Examen».
(function (pp) {
  'use strict';
  const C = window.PP_CONFIG;
  let root = null, S = { id: null, sesion: null, dif: null, ocupado: false };

  // ───────────── Vista previa ─────────────
  async function userId() { const { data: { session } } = await window.supabase.auth.getSession(); return session && session.user && session.user.id; }

  async function pdfjs() {
    if (pp._pdfjs) return pp._pdfjs;
    const base = new URL('resources/vendor/', CATBLING_CONFIG_ROOT).href;
    const m = await import(base + 'pdfjs-4.10.38.min.mjs');
    m.GlobalWorkerOptions.workerSrc = base + 'pdfjs-worker-4.10.38.min.mjs';
    return (pp._pdfjs = m);
  }

  async function renderPdf(cont, sesion) {
    const uid = await userId();
    const blob = uid && await window.ppApi.descargar(uid + '/' + sesion.id + '.pdf');
    if (!blob) throw new Error('sin_archivo');
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const ancho = Math.max(240, cont.clientWidth - 24), dpr = Math.min(2, window.devicePixelRatio || 1);
    for (let n = 1; n <= doc.numPages; n++) {
      if (!cont.isConnected) return;
      const page = await doc.getPage(n);
      const v0 = page.getViewport({ scale: 1 }), esc = ancho / v0.width, v = page.getViewport({ scale: esc * dpr });
      const cv = pp.el('canvas', { class: 'pp-pdf-page', 'aria-label': pp.t('pp_pagina', { n }) });
      cv.width = v.width; cv.height = v.height; cv.style.width = ancho + 'px';
      cont.appendChild(cv);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
    }
  }

  async function renderTexto(cont, sesion) {
    const r = await window.ppApi.obtenerTexto(sesion.id);
    if (!r.ok) throw new Error(r.codigo);
    r.texto.split(/\n{2,}/).forEach(par => cont.appendChild(pp.el('p', { class: 'pp-doc-p', text: par })));   // textContent: sin HTML inyectado
  }

  async function abrirPreview() {
    const sesion = S.sesion; if (!sesion) return;
    const cont = pp.el('div', { class: 'pp-preview-body', tabindex: '0' });
    const ov = pp.el('div', { id: 'pp-preview', class: 'pp-overlay pp-screen pp-preview-ov', role: 'dialog', 'aria-modal': 'true' }, [
      pp.el('div', { class: 'pp-box pp-preview-box' }, [
        pp.el('div', { class: 'pp-preview-head' }, [
          pp.el('strong', { class: 'pp-preview-title', text: sesion.nombre }),
          pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'volver', onclick: () => ov.remove() }),
        ]),
        cont,
      ]),
    ]);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') ov.remove(); });
    document.body.appendChild(ov);
    cont.focus();
    cont.appendChild(pp.el('p', { class: 'pp-muted', i18n: 'pp_cargando_vista' }));
    const limpia = () => { cont.innerHTML = ''; };
    try {
      if (sesion.formato === 'pdf' && sesion.tiene_archivo) { limpia(); await renderPdf(cont, sesion); }
      else { limpia(); await renderTexto(cont, sesion); }
    } catch (e) {
      limpia();
      try { await renderTexto(cont, sesion); }       // PDF no renderizable => texto extraído
      catch (e2) { cont.appendChild(pp.el('p', { class: 'pp-error', text: pp.t('pp_err_vista_previa') })); }
    }
  }

  // ───────────── Dificultad ─────────────
  function tarjeta(d) {
    const T = C.TARIFAS[d.id];
    return pp.el('button', { class: 'pp-dif', type: 'button', 'data-dif': d.id, role: 'radio', 'aria-checked': 'false', style: '--dif-color:' + d.color,
      onclick: () => seleccionar(d.id) }, [
      pp.el('span', { class: 'pp-dif-nombre', i18n: d.labelKey }),
      pp.el('img', { class: 'pp-dif-img', src: d.img, alt: '', loading: 'lazy' }),
      pp.el('span', { class: 'pp-dif-datos', 'data-tarifa': d.id, text: pp.t('pp_tarifa', T) }),
    ]);
  }
  function seleccionar(id) {
    S.dif = id;
    root.querySelectorAll('.pp-dif').forEach(b => { const s = b.dataset.dif === id; b.classList.toggle('pp-sel', s); b.setAttribute('aria-checked', s ? 'true' : 'false'); });
    const T = C.TARIFAS[id];
    root.querySelector('.pp-coste').textContent = pp.t('pp_coste_examen', { coste: T.coste });
    root.querySelector('.pp-error').hidden = true;
  }

  function error(codigo, extra) {
    const n = root && root.querySelector('.pp-error'); if (!n) return;
    n.textContent = pp.errMsg(codigo); n.hidden = false;
  }

  // ───────────── Botón «Examen» ─────────────
  async function examen() {
    if (S.ocupado) return;
    if (!S.id || !S.sesion || S.sesion.estado !== 'listo') return error('estado_invalido');
    if (!S.dif) return error('dificultad_requerida');
    if (!pp.estaAutenticado()) { if (typeof requerirAutenticacion === 'function') requerirAutenticacion(); return; }
    const T = C.TARIFAS[S.dif];
    S.ocupado = true;
    const saldo = await pp.refrescarMonedas();           // saldo REAL (servidor), no localStorage
    S.ocupado = false;
    if (saldo != null && saldo < T.coste) return pp.sinMonedas(T.coste);
    pp.confirmar('pp_confirmar_titulo', pp.t('pp_confirmar_texto', T), () => ejecutar(S.dif), { yesKey: 'pp_iniciar' });
  }

  async function ejecutar(dif) {
    S.ocupado = true;
    const id = S.id;
    let fin = pp.cargando('pp_paso_generando');
    try {
      const g = await window.ppApi.generar(id, dif);              // genera y valida 15 preguntas ANTES de cobrar
      fin(); fin = null;
      if (!g.ok) {
        if (g.codigo === 'saldo_insuficiente') return pp.sinMonedas(g.coste || C.TARIFAS[dif].coste, g.faltan);
        return error(g.codigo);
      }
      fin = pp.cargando('pp_paso_iniciando');
      const r = await window.ppApi.iniciarExamen(id, dif);        // cobra UNA vez (servidor)
      fin(); fin = null;
      if (!r.ok) {
        if (r.codigo === 'saldo_insuficiente') return pp.sinMonedas(r.coste || C.TARIFAS[dif].coste, r.faltan);
        return error(r.codigo);
      }
      await pp.refrescarMonedas();
      if (r.cobrado && typeof mostrarAnimacionMonedas === 'function') mostrarAnimacionMonedas(r.coste, false);
      pp.setup.cerrar();
      pp.history && pp.history.recargar();
      pp.exam.empezar(id);
    } finally { if (fin) fin(); S.ocupado = false; }
  }

  pp.setup = {
    async abrir(id) {
      const fin = pp.cargando('pp_cargando');
      const r = await window.ppApi.obtenerSesion(id);
      fin();
      if (!r.ok) return pp.toast(pp.errMsg(r.codigo));
      const s = r.sesion;
      if (s.estado === 'en_curso') return pp.exam.empezar(id);
      if (s.estado === 'finalizado') return pp.exam.resumen(s);
      if (s.estado !== 'listo') return pp.toast(pp.errMsg(s.error_codigo || 'estado_invalido'));
      pp.setup.cerrar();
      S = { id, sesion: s, dif: null, ocupado: false };
      root = pp.el('div', { id: 'pp-setup', class: 'pp-overlay pp-screen', role: 'dialog', 'aria-modal': 'true' }, [
        pp.el('div', { class: 'pp-box pp-setup-box' }, [
          pp.el('h2', { class: 'pp-h2', i18n: 'pp_config_titulo' }),
          pp.el('p', { class: 'pp-docname' }, [pp.el('strong', { text: s.nombre }), pp.el('span', { class: 'pp-muted', text: ' · ' + s.formato.toUpperCase() + ' · ' + pp.fmtSize(s.tamano_bytes) })]),
          pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'pp_vista_previa', onclick: abrirPreview }),
          pp.el('p', { class: 'pp-label', i18n: 'pp_elige_dificultad' }),
          pp.el('div', { class: 'pp-difs', role: 'radiogroup', 'aria-label': pp.t('pp_elige_dificultad') }, C.DIFICULTADES.map(tarjeta)),
          pp.el('p', { class: 'pp-coste', 'aria-live': 'polite' }),
          pp.el('p', { class: 'pp-error', role: 'alert', hidden: true }),
          pp.el('div', { class: 'pp-row' }, [
            pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'volver', onclick: () => { pp.setup.cerrar(); pp.upload.abrir(); } }),
            pp.el('button', { class: 'pp-btn pp-btn-main pp-btn-examen', type: 'button', i18n: 'pp_examen', onclick: examen }),
          ]),
        ]),
      ]);
      document.body.appendChild(root);
      root.querySelector('.pp-dif').focus();
    },
    cerrar() { if (root) { pp.cerrar(root); root = null; } const p = document.getElementById('pp-preview'); if (p) p.remove(); },
    refrescarIdioma() {
      if (!root) return;
      C.DIFICULTADES.forEach(d => { const n = root.querySelector('[data-tarifa="' + d.id + '"]'); if (n) n.textContent = pp.t('pp_tarifa', C.TARIFAS[d.id]); });
      if (S.dif) seleccionar(S.dif);
    },
  };
})(window.pp);
