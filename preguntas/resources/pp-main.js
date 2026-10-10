// pp-main.js — overlay inicial: "Preguntas generales" (flujo existente intacto) o "Preguntas personalizadas".
(function (pp) {
  'use strict';
  let ov = null;

  function general() {
    cerrarModo();
    if (typeof window.catblingMostrarSeleccionNivel === 'function') window.catblingMostrarSeleccionNivel();
  }

  function personalizadas() {
    if (!pp.estaAutenticado()) {                 // el servidor exige sesión; invitados van al login existente
      pp.toast(pp.t('pp_requiere_sesion'));
      if (typeof requerirAutenticacion === 'function') setTimeout(requerirAutenticacion, 900);
      return;
    }
    cerrarModo();
    pp.upload.abrir();
  }

  function cerrarModo() { if (ov) { ov.remove(); ov = null; } }

  function tarjeta(cls, titleKey, descKey, fn) {
    return pp.el('button', { class: 'pp-modo-card ' + cls, type: 'button', onclick: fn }, [
      pp.el('span', { class: 'pp-modo-titulo', i18n: titleKey }),
      pp.el('span', { class: 'pp-modo-desc', i18n: descKey }),
    ]);
  }

  async function banner(box) {
    if (!pp.estaAutenticado()) return;
    try {
      const r = await window.ppApi.listar();
      if (!r.ok || !ov) return;
      const s = (r.sesiones || []).find(x => x.estado === 'en_curso');
      if (!s) return;
      box.appendChild(pp.el('div', { class: 'pp-banner', role: 'status' }, [
        pp.el('span', { class: 'pp-banner-txt', text: pp.t('pp_banner_continuar', { nombre: s.nombre }) }),
        pp.el('button', { class: 'pp-btn pp-btn-sm pp-btn-main', type: 'button', i18n: 'pp_continuar', onclick: () => { cerrarModo(); pp.exam.empezar(s.id); } }),
      ]));
    } catch (e) { /* el banner es opcional */ }
  }

  pp.main = {
    mostrarModo: function () {
      if (ov) return;
      pp.main.ocultarSeleccion(true);
      const box = pp.el('div', { class: 'pp-modo-box' }, [
        pp.el('h2', { class: 'pp-modo-h', i18n: 'pp_modo_titulo' }),
        pp.el('div', { class: 'pp-modo-cards' }, [
          tarjeta('pp-modo-general', 'pp_modo_general', 'pp_modo_general_desc', general),
          tarjeta('pp-modo-custom', 'pp_modo_personalizada', 'pp_modo_personalizada_desc', personalizadas),
        ]),
      ]);
      ov = pp.el('div', { id: 'pp-modo', class: 'pp-overlay pp-modo-ov' }, [box]);
      document.body.appendChild(ov);
      ov.querySelector('.pp-modo-card').focus();
      banner(box);
    },
    // Oculta lo que haya detrás (selector de nivel y pantalla de ajustes de preguntas generales).
    ocultarSeleccion: function (mantenerModo) {
      const mc = document.getElementById('main-container'); if (mc) mc.style.display = 'none';
      const n = document.getElementById('nivel-academico-overlay'); if (n) n.classList.remove('visible');
      if (!mantenerModo) cerrarModo();
    },
    general: general,
  };

  function arrancar() {
    try { pp.main.mostrarModo(); }
    catch (e) {                                    // si algo falla, el flujo general sigue funcionando
      console.error('[pp] no se pudo mostrar el selector de modo', e);
      general();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
  window.addEventListener('idiomaAplicado', function () { if (ov) ov.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = pp.t(n.getAttribute('data-i18n')); }); });
})(window.pp);
