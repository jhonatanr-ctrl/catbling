/* ============================================================================
   MOTOR DE DISEÑO (ligero, sin UI) — se carga siempre en la tienda.
   Lee la configuración (localStorage → published.js), la valida y genera UNA
   hoja <style id="cb-design-overrides"> con reglas por dispositivo.
   · No usa position:absolute: mover = propiedad CSS `translate` (respeta el
     flujo y no choca con los `transform` de las animaciones existentes);
     escalar = propiedad `scale`.
   · No toca lógica de compras, monedas, Supabase, idiomas ni eventos.
   · Los valores se validan (lista blanca de propiedades y caracteres) para que
     un JSON importado no pueda inyectar CSS/JS arbitrario.
   ========================================================================== */
(function (global) {
  'use strict';
  const R = global.CB_REGISTRY;
  if (!R) { console.warn('[CBDesign] registry.js no cargado'); return; }

  const STYLE_ID = 'cb-design-overrides';
  const SAFE_VALUE = /^[\w\s#%.,()\-+\/'"]*$/;
  const listeners = [];

  const clone = o => JSON.parse(JSON.stringify(o));
  const emptyDoc = () => ({ version: R.VERSION, devices: { desktop: {}, tablet: {}, mobile: {} } });

  function safeValue(v) {
    if (typeof v === 'number') return isFinite(v);
    if (typeof v === 'boolean') return true;
    if (typeof v !== 'string' || v.length > 200) return false;
    if (/url\s*\(|expression|@import|javascript:/i.test(v)) return false;
    return SAFE_VALUE.test(v);
  }

  /* Devuelve un documento limpio: solo dispositivos, ids y propiedades conocidos. */
  function sanitize(doc) {
    const out = emptyDoc();
    if (!doc || typeof doc !== 'object' || !doc.devices) return out;
    Object.keys(R.BREAKPOINTS).forEach(dev => {
      const src = doc.devices[dev];
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(id => {
        if (!R.byId[id] || typeof src[id] !== 'object') return;
        const clean = {};
        Object.keys(src[id]).forEach(p => {
          if (R.PROPS[p] && safeValue(src[id][p])) clean[p] = src[id][p];
        });
        if (Object.keys(clean).length) out.devices[dev][id] = clean;
      });
    });
    return out;
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(R.STORAGE_KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) { /* almacenamiento no disponible o JSON dañado → usar publicado */ }
    return sanitize(global.CB_DESIGN_PUBLISHED);
  }

  function save(doc) {
    global.localStorage.setItem(R.STORAGE_KEY, JSON.stringify(sanitize(doc)));
  }

  function clearSaved() {
    try { global.localStorage.removeItem(R.STORAGE_KEY); } catch (e) {}
  }

  /* Traduce las propiedades de un elemento a declaraciones CSS. */
  function declarations(p) {
    const d = [];
    Object.keys(p).forEach(k => {
      const def = R.PROPS[k]; const v = p[k];
      if (!def || v === '' || v == null) return;
      if (k === 'moveX' || k === 'moveY' || k === 'hidden') return;   // compuestas
      if (k === 'opacity') { d.push('opacity:' + (Number(v) / 100)); return; }
      if (k === 'fontFamily') { d.push('font-family:' + (R.FONTS[v] || v)); return; }
      if (k === 'color') { d.push('color:' + v, '-webkit-text-fill-color:' + v); return; }
      if (k === 'borderWidth' && !p.borderStyle) { d.push('border-width:' + v, 'border-style:solid'); return; }
      d.push(def.css + ':' + v);
    });
    if (p.moveX != null || p.moveY != null) d.push('translate:' + (p.moveX || '0px') + ' ' + (p.moveY || '0px'));
    if (p.hidden === true) d.push('display:none');
    return d.map(x => x + ' !important').join(';');
  }

  /* Prefijo "html body" → especificidad mayor que las reglas originales,
     incluidas las de los @media existentes. Sin tocar los CSS originales. */
  function buildCss(doc) {
    let css = '/* Generado por CBDesign — no editar a mano */\n';
    Object.keys(R.BREAKPOINTS).forEach(dev => {
      const els = doc.devices[dev] || {};
      const rules = Object.keys(els).map(id => {
        const decl = declarations(els[id]);
        return decl ? 'html body ' + R.byId[id].sel.split(',').map(s => s.trim()).join(', html body ') + '{' + decl + '}' : '';
      }).filter(Boolean);
      if (rules.length) css += '@media ' + R.BREAKPOINTS[dev].media + '{\n' + rules.join('\n') + '\n}\n';
    });
    return css;
  }

  function styleTag(target) {
    const doc = target || document;
    let tag = doc.getElementById(STYLE_ID);
    if (!tag) { tag = doc.createElement('style'); tag.id = STYLE_ID; (doc.head || doc.documentElement).appendChild(tag); }
    return tag;
  }

  function apply(doc, target) {
    styleTag(target).textContent = buildCss(sanitize(doc));
    listeners.forEach(fn => { try { fn(doc); } catch (e) {} });
  }

  /* Etiqueta los elementos con data-cb-id (identificador estable visible en
     DevTools). Los generados dinámicamente se etiquetan al aparecer. */
  function tagElements(root) {
    const scope = root || document;
    R.ELEMENTS.forEach(e => {
      scope.querySelectorAll(e.sel).forEach(n => { if (n.getAttribute('data-cb-id') !== e.id) n.setAttribute('data-cb-id', e.id); });
    });
  }

  let tagTimer = null;
  function watchDom() {
    if (!global.MutationObserver) return;
    new MutationObserver(() => {
      clearTimeout(tagTimer);
      tagTimer = setTimeout(() => tagElements(document), 60);
    }).observe(document.body, { childList: true, subtree: true });
  }

  const CBDesign = {
    registry: R, sanitize, load, save, clearSaved, buildCss, apply, tagElements,
    emptyDoc, clone, onApply: fn => listeners.push(fn),
    current: null
  };
  global.CBDesign = CBDesign;

  // Aplicación inmediata (estamos en <head>: evita parpadeo del diseño original).
  CBDesign.current = load();
  apply(CBDesign.current);

  document.addEventListener('DOMContentLoaded', function () { tagElements(document); watchDom(); });

  // Si el diseño cambia en otra pestaña (p.ej. desde el editor), se refleja aquí.
  global.addEventListener('storage', function (e) {
    if (e.key === R.STORAGE_KEY) { CBDesign.current = load(); apply(CBDesign.current); }
  });
})(window);
