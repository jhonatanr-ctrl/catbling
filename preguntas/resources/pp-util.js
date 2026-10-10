// pp-util.js — utilidades compartidas por los módulos de preguntas personalizadas.
window.pp = window.pp || {};
(function (pp) {
  'use strict';

  pp.t = function (key, params) {
    if (typeof __f === 'function') return __f(key, params);
    return key;
  };

  pp.el = function (tag, attrs, children) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'i18n') { e.setAttribute('data-i18n', v); e.textContent = pp.t(v); }
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };

  pp.fmtSize = function (b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  };
  pp.fmtFecha = function (iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString((window.config && config.idioma) || undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return String(iso); }
  };
  pp.nombreDif = function (dif) {
    const d = window.PP_CONFIG.DIFICULTADES.find(x => x.id === dif);
    return d ? pp.t(d.labelKey) : '—';
  };

  // Mensaje legible para un código de error estable del servidor.
  pp.errMsg = function (codigo) {
    const k = 'pp_err_' + codigo;
    return (typeof TRADUCCIONES !== 'undefined' && TRADUCCIONES[k]) ? pp.t(k, { max: Math.round(window.PP_CONFIG.MAX_BYTES / 1048576) }) : pp.t('pp_err_generico');
  };

  // Aviso breve (misma estética que el error técnico de script.js).
  pp.toast = function (msg, tipo) {
    const prev = document.querySelector('.pp-toast'); if (prev) prev.remove();
    const n = pp.el('div', { class: 'pp-toast' + (tipo === 'ok' ? ' pp-toast-ok' : ''), role: 'alert', text: msg });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4500);
  };

  pp.refrescarMonedas = async function () {
    try {
      if (window.coinsAPI && coinsAPI.fetch) return await coinsAPI.fetch();
      if (typeof fetchMonedas === 'function') return await fetchMonedas();
    } catch (e) { /* ignora */ }
    return null;
  };

  // Overlay de "sin monedas" ya existente (coins.js), adaptado al importe que falta.
  pp.sinMonedas = async function (coste, faltanServidor) {
    const saldo = await pp.refrescarMonedas();
    const faltan = Number.isFinite(faltanServidor) ? faltanServidor : Math.max(1, coste - (saldo || 0));
    if (typeof mostrarOverlayGlobal === 'function') {
      mostrarOverlayGlobal(coste);                      // el guard de coins.js compara contra el coste total
      const n = document.getElementById('overlay-monedas-necesarias');
      if (n) n.textContent = faltan;                    // y se muestra lo que realmente falta
    } else pp.toast(pp.t('pp_faltan_monedas', { n: faltan }));
  };

  // Modal de confirmación (bordes rectos).
  pp.confirmar = function (titleKey, textHtmlOrText, onYes, opts) {
    opts = opts || {};
    const ov = pp.el('div', { class: 'pp-overlay pp-modal-ov', role: 'dialog', 'aria-modal': 'true' });
    const box = pp.el('div', { class: 'pp-box pp-confirm' }, [
      pp.el('h2', { class: 'pp-h2', i18n: titleKey }),
      pp.el('p', { class: 'pp-p', text: textHtmlOrText }),
      pp.el('div', { class: 'pp-row' }, [
        pp.el('button', { class: 'pp-btn pp-btn-sec', type: 'button', i18n: 'cancelar', onclick: () => ov.remove() }),
        pp.el('button', { class: 'pp-btn ' + (opts.peligro ? 'pp-btn-danger' : 'pp-btn-main'), type: 'button', i18n: opts.yesKey || 'aceptar', onclick: () => { ov.remove(); onYes(); } }),
      ]),
    ]);
    ov.appendChild(box);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') ov.remove(); });
    document.body.appendChild(ov);
    box.querySelector('.pp-btn-sec').focus();
  };

  // Estado de carga a pantalla completa
  pp.cargando = function (msgKey) {
    let n = document.getElementById('pp-loading');
    if (!n) {
      n = pp.el('div', { id: 'pp-loading', class: 'pp-overlay pp-loading-ov', role: 'status', 'aria-live': 'polite' }, [
        pp.el('div', { class: 'pp-spinner', 'aria-hidden': 'true' }), pp.el('p', { class: 'pp-p pp-loading-msg' }),
      ]);
      document.body.appendChild(n);
    }
    n.querySelector('.pp-loading-msg').textContent = pp.t(msgKey);
    return function fin() { const x = document.getElementById('pp-loading'); if (x) x.remove(); };
  };

  pp.cerrar = function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); };
  pp.estaAutenticado = function () { return typeof _isAuthenticatedSync === 'function' && _isAuthenticatedSync(); };

  window.addEventListener('idiomaAplicado', function () {
    ['history', 'setup', 'upload'].forEach(m => { try { pp[m] && pp[m].refrescarIdioma && pp[m].refrescarIdioma(); } catch (e) { /* nada */ } });
  });
})(window.pp);
