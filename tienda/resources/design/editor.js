/* ============================================================================
   EDITOR VISUAL DE LA TIENDA (solo editor.html)
   · La tienda real se carga en un <iframe> con el tamaño del dispositivo
     elegido → los @media originales responden de verdad.
   · Una capa transparente sobre el iframe recibe el ratón: la tienda NUNCA
     recibe clics del editor (imposible comprar o disparar eventos por error).
   · Solo escribe en la configuración (CBDesign → localStorage). No importa ni
     llama a nada de compras, monedas, Supabase o autenticación.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.CBDesign, R = window.CB_REGISTRY, P = R.PROPS, BP = R.BREAKPOINTS;
  const $ = s => document.querySelector(s);
  const frame = $('#cbe-frame'), wrap = $('#cbe-frame-wrap'), overlay = $('#cbe-overlay'),
        panel = $('#cbe-panel'), tree = $('#cbe-tree'), stage = $('#cbe-stage'), toastEl = $('#cbe-toast');

  const INTERACTIVE = ['detalle.comprar', 'nav.subir', 'nav.bajar', 'nav.volver', 'hud.opciones', 'hud.bolsa', 'hud.monedas'];
  const TIENDA_GROUPS = ['Estructura', 'Lista de artículos', 'Detalle del artículo', 'Navegación'];

  let draft = D.load();
  let savedJson = JSON.stringify(D.sanitize(draft));
  let device = 'desktop', selId = null, selEl = null, hoverEntry = null, scale = 1, zoom = 'fit';
  let view = { mode: 'tienda', cat: 'boosts', item: 0 };
  let previewed = [];
  let drag = null;
  const undo = [], redo = [];

  /* ── utilidades ─────────────────────────────────────────────────────────── */
  const h = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, ''); else if (v !== false && v != null) n.setAttribute(k, v);
    });
    kids.flat().forEach(c => { if (c != null) n.append(c.nodeType ? c : document.createTextNode(c)); });
    return n;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fw = () => { try { return frame.contentWindow; } catch (e) { return null; } };
  const fd = () => { try { return frame.contentDocument; } catch (e) { return null; } };
  // Lectura de variables `let` de nivel superior de la tienda (no son propiedades de window).
  const fread = (expr, fallback) => { try { return fw().eval(expr); } catch (e) { return fallback; } };
  const round = n => Math.round(n * 100) / 100;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 2200); }

  const devOv = () => (draft.devices[device] = draft.devices[device] || {});
  const getOv = (id, dev) => (draft.devices[dev || device] || {})[id] || {};
  const hasAny = id => Object.keys(BP).some(d => Object.keys(getOv(id, d)).length);

  /* ── historial / estado ─────────────────────────────────────────────────── */
  function pushHistory() { undo.push(JSON.stringify(draft)); if (undo.length > 100) undo.shift(); redo.length = 0; syncButtons(); }
  function restore(json) { draft = JSON.parse(json); commit(true); }
  function doUndo() { if (!undo.length) return; redo.push(JSON.stringify(draft)); restore(undo.pop()); }
  function doRedo() { if (!redo.length) return; undo.push(JSON.stringify(draft)); restore(redo.pop()); }
  function isDirty() { return JSON.stringify(D.sanitize(draft)) !== savedJson; }
  function syncButtons() {
    $('#cbe-undo').disabled = !undo.length; $('#cbe-redo').disabled = !redo.length;
    const d = isDirty(), s = $('#cbe-status');
    s.textContent = d ? 'Cambios sin guardar' : 'Guardado'; s.classList.toggle('dirty', d);
    $('#cbe-save').disabled = !d; $('#cbe-discard').disabled = !d;
  }
  function previewApply() { const w = fw(); if (w && w.CBDesign) w.CBDesign.apply(D.sanitize(draft)); }
  function commit(rerender) { previewApply(); syncButtons(); markTree(); if (rerender) renderPanel(); }

  function setProp(id, prop, value, opts) {
    const ov = devOv(); const cur = Object.assign({}, ov[id] || {});
    if (value === null || value === '' || value === undefined) delete cur[prop]; else cur[prop] = value;
    if (Object.keys(cur).length) ov[id] = cur; else delete ov[id];
    commit(false); if (!opts || !opts.quiet) refreshMarkers();
  }

  /* ── marco (iframe) y dispositivos ──────────────────────────────────────── */
  function layout() {
    const f = BP[device].frame, availW = stage.clientWidth - 32, availH = stage.clientHeight - 32;
    scale = zoom === 'fit' ? Math.min(1, availW / f.w, availH / f.h) : Number(zoom);
    frame.style.width = f.w + 'px'; frame.style.height = f.h + 'px'; frame.style.transform = 'scale(' + scale + ')';
    wrap.style.width = Math.round(f.w * scale) + 'px'; wrap.style.height = Math.round(f.h * scale) + 'px';
  }
  function setDevice(d, silent) {
    device = d; document.querySelectorAll('#cbe-devices button').forEach(b => b.classList.toggle('on', b.dataset.device === d));
    layout(); if (!silent) { renderPanel(); }
  }

  function onFrameLoad() {
    const doc = fd(); if (!doc) return;
    const st = doc.createElement('style'); st.id = 'cbe-frame-style';
    // Solo dentro del marco del editor: sin transiciones, para que arrastrar/medir sea inmediato.
    st.textContent = '#tutorial-overlay:not(.cb-preview){display:none!important}html{cursor:default}*,*::before,*::after{transition:none!important}';
    doc.head.appendChild(st);
    previewApply();
    setTimeout(() => { applyView(); markTree(); renderPanel(); }, 700);
  }

  async function applyView() {
    const w = fw(); if (!w) return; clearPreview();
    try {
      if (view.mode === 'categorias') { if (typeof w.mostrarCategorias === 'function') w.mostrarCategorias(); }
      else if (typeof w.seleccionarCategoria === 'function') { w.seleccionarCategoria(view.cat); await sleep(450); if (typeof w.seleccionarItem === 'function') w.seleccionarItem(fread('indiceInicio', 0) + view.item); }
    } catch (e) { console.warn('[editor] vista', e); }
    await sleep(100); markTree(); renderPanel();
  }

  function showPreview(entry) {
    clearPreview(); const doc = fd(); if (!doc || !entry.preview) return;
    entry.preview.targets.forEach(sel => doc.querySelectorAll(sel).forEach(n => entry.preview.add.forEach(c => { if (!n.classList.contains(c)) { n.classList.add(c); previewed.push([n, c]); } })));
  }
  function clearPreview() { previewed.forEach(([n, c]) => n.classList.remove(c)); previewed = []; }

  /* ── selección ──────────────────────────────────────────────────────────── */
  function entryFor(el) {
    const doc = fd(); if (!doc) return null;
    for (let n = el; n && n.nodeType === 1 && n !== doc.documentElement; n = n.parentElement) {
      let best = null;
      R.ELEMENTS.forEach(e => { try { if (n.matches(e.sel) && (!best || e.sel.length > best.sel.length)) best = e; } catch (x) {} });
      if (best) return { entry: best, el: n };
    }
    return null;
  }
  function isVisible(n) {
    const w = fw(); if (!w) return false; const cs = w.getComputedStyle(n), r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
  }
  const matches = id => { const doc = fd(); return doc ? [...doc.querySelectorAll(R.byId[id].sel)] : []; };

  function select(id, el) {
    const entry = R.byId[id]; if (!entry) return;
    if (view.mode !== 'categorias' && entry.group === 'Categorías') { $('#cbe-view').value = 'categorias'; view.mode = 'categorias'; syncViewControls(); applyView(); }
    else if (view.mode === 'categorias' && TIENDA_GROUPS.includes(entry.group)) { $('#cbe-view').value = 'tienda'; view.mode = 'tienda'; syncViewControls(); applyView(); }
    if (entry.preview) showPreview(entry); else clearPreview();
    selId = id;
    const list = matches(id);
    selEl = (el && list.includes(el)) ? el : (list.find(isVisible) || list[0] || null);
    markTree(); renderPanel();
  }
  function deselect() { selId = null; selEl = null; markTree(); renderPanel(); }
  function parentEntry() { if (!selEl) return null; const p = selEl.parentElement && entryFor(selEl.parentElement); return p; }

  function pointInFrame(e) { const r = wrap.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function pick(e, alt) {
    const doc = fd(); if (!doc) return;
    const p = pointInFrame(e); const stack = doc.elementsFromPoint(p.x, p.y); let hit = null;
    for (const n of stack) { const f = entryFor(n); if (f) { hit = f; break; } }
    if (!hit) { deselect(); return; }
    if (alt) { let cur = hit.el.parentElement, up = cur && entryFor(cur); if (up) hit = up; }
    select(hit.entry.id, hit.el);
  }
  function hoverAt(e) {
    const doc = fd(); if (!doc) return; const p = pointInFrame(e); let hit = null;
    for (const n of doc.elementsFromPoint(p.x, p.y)) { const f = entryFor(n); if (f) { hit = f; break; } }
    hoverEntry = hit;
  }

  /* ── capa superpuesta: cajas, tiradores, arrastre ───────────────────────── */
  let lastKey = '';
  function boxHtml(el, cls, label, handles) {
    const r = el.getBoundingClientRect(); const x = r.left * scale, y = r.top * scale, w = r.width * scale, hh = r.height * scale;
    const chip = label ? '<span class="cbe-chip' + (y < 24 ? ' in' : '') + '">' + label + '</span>' : '';
    const hs = handles ? ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].map(k => '<i class="cbe-h" data-h="' + k + '"></i>').join('') : '';
    return '<div class="cbe-box ' + cls + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + hh + 'px">' + chip + hs + '</div>';
  }
  function draw() {
    requestAnimationFrame(draw);
    const doc = fd(); if (!doc || !doc.body) return; let html = '';
    if (hoverEntry && (!selEl || hoverEntry.el !== selEl) && !drag) html += boxHtml(hoverEntry.el, 'hover', hoverEntry.entry.label, false);
    if (selId && selEl && selEl.isConnected) {
      matches(selId).forEach(n => { if (n !== selEl && isVisible(n)) html += boxHtml(n, 'sib', '', false); });
      const r = selEl.getBoundingClientRect();
      html += boxHtml(selEl, 'sel', R.byId[selId].label + ' · ' + Math.round(r.width) + '×' + Math.round(r.height), true);
    }
    const key = html + scale; if (key !== lastKey) { overlay.innerHTML = html; lastKey = key; }
  }

  overlay.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; overlay.setPointerCapture(e.pointerId);
    const hnd = e.target.dataset && e.target.dataset.h;
    drag = { sx: e.clientX, sy: e.clientY, moved: false, h: hnd || null, alt: e.altKey };
    if (selId && selEl) {
      const ov = getOv(selId), w = fw(), cs = w.getComputedStyle(selEl);
      Object.assign(drag, { mx: parseFloat(ov.moveX) || 0, my: parseFloat(ov.moveY) || 0, w0: parseFloat(cs.width) || selEl.offsetWidth, h0: parseFloat(cs.height) || selEl.offsetHeight, k: (parseFloat(cs.scale) || 1) });
      const r = selEl.getBoundingClientRect(), p = pointInFrame(e);
      drag.inside = p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
    }
  });
  overlay.addEventListener('pointermove', e => {
    if (!drag) { hoverAt(e); return; }
    const dx = (e.clientX - drag.sx) / scale, dy = (e.clientY - drag.sy) / scale;
    if (!drag.moved && Math.hypot(dx, dy) > 3 && selId && (drag.h || drag.inside)) { drag.moved = true; pushHistory(); }
    if (!drag.moved) return;
    if (!drag.h) {          // mover (translate: respeta el flujo del documento)
      let mx = dx, my = dy; if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) my = 0; else mx = 0; }
      setProp(selId, 'moveX', round(drag.mx + mx) + 'px', { quiet: true }); setProp(selId, 'moveY', round(drag.my + my) + 'px', { quiet: true });
    } else {                // redimensionar
      const k = drag.k, dwl = dx / k, dhl = dy / k; let w = drag.w0, hh = drag.h0, mx = drag.mx, my = drag.my; const c = drag.h;
      if (c.includes('e')) w = drag.w0 + dwl; if (c.includes('w')) { w = drag.w0 - dwl; mx = drag.mx + dx; }
      if (c.includes('s')) hh = drag.h0 + dhl; if (c.includes('n')) { hh = drag.h0 - dhl; my = drag.my + dy; }
      if (e.shiftKey && drag.w0 && drag.h0) { const ratio = drag.w0 / drag.h0; if (c.length === 2 || c === 'e' || c === 'w') hh = w / ratio; else w = hh * ratio; }
      w = Math.max(8, w); hh = Math.max(8, hh);
      if (c !== 'n' && c !== 's') setProp(selId, 'width', round(w) + 'px', { quiet: true });
      if (c !== 'e' && c !== 'w') setProp(selId, 'height', round(hh) + 'px', { quiet: true });
      if (c.includes('w')) setProp(selId, 'moveX', round(mx) + 'px', { quiet: true });
      if (c.includes('n')) setProp(selId, 'moveY', round(my) + 'px', { quiet: true });
    }
  });
  overlay.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved) { renderPanel(); refreshWarnings(); } else pick(e, d.alt || e.altKey);
  });
  overlay.addEventListener('pointerleave', () => { hoverEntry = null; });

  document.addEventListener('keydown', e => {
    const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if (e.key === 'Escape') { deselect(); return; }
    if (selId && e.key.startsWith('Arrow')) {
      e.preventDefault(); const st = e.shiftKey ? 10 : 1, ov = getOv(selId); let mx = parseFloat(ov.moveX) || 0, my = parseFloat(ov.moveY) || 0;
      if (e.key === 'ArrowLeft') mx -= st; if (e.key === 'ArrowRight') mx += st; if (e.key === 'ArrowUp') my -= st; if (e.key === 'ArrowDown') my += st;
      pushHistory(); setProp(selId, 'moveX', mx + 'px', { quiet: true }); setProp(selId, 'moveY', my + 'px'); syncMoveFields();
    }
  });

  /* ── árbol de elementos ─────────────────────────────────────────────────── */
  let treeFilter = '';
  function renderTree() {
    tree.innerHTML = '';
    const inp = h('input', { type: 'text', placeholder: 'Buscar elemento…', value: treeFilter, oninput: e => { treeFilter = e.target.value.toLowerCase(); renderTreeRows(); } });
    tree.append(h('div', { class: 'cbe-search' }, inp), h('div', { id: 'cbe-rows' }));
    renderTreeRows();
  }
  function renderTreeRows() {
    const box = $('#cbe-rows'); if (!box) return; box.innerHTML = ''; let last = '';
    R.ELEMENTS.forEach(e => {
      if (treeFilter && !(e.label + ' ' + e.id + ' ' + e.group).toLowerCase().includes(treeFilter)) return;
      if (e.group !== last) { box.append(h('div', { class: 'cbe-tg' }, e.group)); last = e.group; }
      const n = matches(e.id).length;
      box.append(h('div', { class: 'cbe-tr' + (e.id === selId ? ' on' : '') + (n ? '' : ' off'), 'data-id': e.id, title: e.id + (n ? '' : ' (no está en pantalla ahora)'), onclick: () => select(e.id) },
        h('span', { class: 'cbe-tl' }, e.label), n > 1 ? h('span', { class: 'cbe-n' }, '×' + n) : null, hasAny(e.id) ? h('span', { class: 'cbe-dot', title: 'Tiene cambios' }) : null));
    });
  }
  function markTree() { renderTreeRows(); }

  /* ── panel de propiedades ───────────────────────────────────────────────── */
  const parseLen = v => { const m = /^(-?\d*\.?\d+)(px|%|vw|vh|em|rem)$/.exec(v || ''); return m ? { n: m[1], u: m[2] } : null; };
  const rgbToHex = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : '#000000'; };
  const hexOf = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : (/^#[0-9a-f]{3}$/i.test(v || '') ? '#' + v.slice(1).split('').map(x => x + x).join('') : rgbToHex(v));

  function applicable(prop, el, cs) {
    const w = fw(); const flex = /flex|grid/.test(cs.display), isFlex = /flex/.test(cs.display);
    const pcs = el.parentElement ? w.getComputedStyle(el.parentElement) : null, inFlex = pcs && /flex|grid/.test(pcs.display);
    const hasText = el.tagName !== 'IMG' && (el.textContent || '').trim().length > 0;
    switch (prop) {
      case 'gap': case 'justifyContent': case 'alignItems': return flex;
      case 'flexDirection': return isFlex;
      case 'order': return !!inFlex;
      case 'fontSize': case 'fontFamily': case 'fontWeight': case 'textAlign': case 'textShadow': case 'color': return hasText;
      default: return true;
    }
  }

  function field(prop, cs, el) {
    const def = P[prop], id = selId, ov = getOv(id), cur = ov[prop], f = h('div', { class: 'cbe-f' + (cur !== undefined ? ' mod' : '') });
    const label = h('label', { title: def.css || prop }, def.label);
    const reset = h('button', { class: 'cbe-x', title: 'Restablecer esta propiedad', onclick: () => { pushHistory(); setProp(id, prop, null); renderPanel(); } }, '↺');
    let ctl;
    const set = v => { setProp(id, prop, v); };
    const startEdit = () => { if (!startEdit.done) { pushHistory(); startEdit.done = true; } };
    const endEdit = () => { startEdit.done = false; };
    const compVal = def.css ? cs.getPropertyValue(def.css) : '';

    if (def.type === 'len') {
      const auto = /^(width|height|margin|minWidth|minHeight)/.test(prop), none = /^max/.test(prop);
      const units = (def.units || ['px', '%', 'vw', 'vh', 'em', 'rem']).concat(auto ? ['auto'] : none ? ['none'] : []);
      const p = parseLen(cur), special = (cur === 'auto' || cur === 'none') ? cur : null;
      const num = h('input', { type: 'number', step: 1, value: p ? p.n : (prop === 'moveX' || prop === 'moveY') ? (cur ? parseFloat(cur) : '') : '', placeholder: prop === 'moveX' || prop === 'moveY' ? '0' : (parseFloat(compVal) ? String(round(parseFloat(compVal))) : (compVal || '')), disabled: !!special });
      const u = units.length > 1 ? h('select', {}, units.map(x => h('option', { value: x, selected: (special || (p && p.u) || 'px') === x }, x))) : h('span', { class: 'cbe-hint' }, units[0]);
      const emit = () => {
        const unit = u.value || units[0];
        if (unit === 'auto' || unit === 'none') { num.disabled = true; set(unit); return; }
        num.disabled = false; if (num.value === '') set(null); else set(num.value + unit);
      };
      num.addEventListener('input', () => { startEdit(); emit(); }); num.addEventListener('change', endEdit);
      if (u.tagName === 'SELECT') u.addEventListener('change', () => { pushHistory(); emit(); });
      if (prop === 'moveX' || prop === 'moveY') num.dataset.move = prop;
      ctl = h('div', { class: 'cbe-c' }, num, u);
    } else if (def.type === 'num') {
      const n = h('input', { type: 'number', step: def.step || 1, min: def.min, max: def.max, value: cur != null ? cur : '', placeholder: prop === 'scale' ? (parseFloat(cs.scale) || 1) : (cs.getPropertyValue(def.css) || '') });
      n.addEventListener('input', () => { startEdit(); set(n.value === '' ? null : Number(n.value)); }); n.addEventListener('change', endEdit);
      ctl = h('div', { class: 'cbe-c' }, n);
    } else if (def.type === 'opacity') {
      const base = cur != null ? cur : round(parseFloat(cs.opacity) * 100);
      const r = h('input', { type: 'range', min: 0, max: 100, value: base }), n = h('input', { type: 'number', min: 0, max: 100, value: base });
      r.addEventListener('input', () => { startEdit(); n.value = r.value; set(Number(r.value)); });
      n.addEventListener('input', () => { startEdit(); r.value = n.value; set(n.value === '' ? null : Number(n.value)); });
      [r, n].forEach(x => x.addEventListener('change', endEdit));
      ctl = h('div', { class: 'cbe-c' }, r, n);
    } else if (def.type === 'color') {
      const compColor = prop === 'bg' ? cs.backgroundColor : prop === 'borderColor' ? cs.borderTopColor : cs.color;
      const pick = h('input', { type: 'color', value: hexOf(cur || compColor) }), tx = h('input', { type: 'text', value: cur || '', placeholder: compColor.replace(/\s+/g, ' ') });
      pick.addEventListener('input', () => { startEdit(); tx.value = pick.value; set(pick.value); }); pick.addEventListener('change', endEdit);
      tx.addEventListener('input', () => { startEdit(); set(tx.value.trim() || null); }); tx.addEventListener('change', endEdit);
      ctl = h('div', { class: 'cbe-c' }, pick, tx);
    } else if (def.type === 'select') {
      const s = h('select', {}, h('option', { value: '' }, 'Original' + (compVal && !def.raw ? ' (' + compVal + ')' : '')),
        Object.entries(def.options).map(([k, v]) => h('option', { value: k, selected: String(cur) === k }, v)));
      s.addEventListener('change', () => { pushHistory(); set(s.value || null); });
      ctl = h('div', { class: 'cbe-c' }, s);
    } else if (def.type === 'text') {
      const t = h('input', { type: 'text', value: cur || '', placeholder: def.placeholder || compVal || '' });
      t.addEventListener('input', () => { startEdit(); set(t.value.trim() || null); }); t.addEventListener('change', endEdit);
      ctl = h('div', { class: 'cbe-c' }, t);
    } else if (def.type === 'bool') {
      const c = h('input', { type: 'checkbox', checked: cur === true });
      const hint = h('span', { class: 'cbe-hint' }, cur === true ? 'Oculto' : 'Visible');
      c.addEventListener('change', () => { pushHistory(); set(c.checked ? true : null); hint.textContent = c.checked ? 'Oculto' : 'Visible'; });
      ctl = h('div', { class: 'cbe-c' }, c, hint);
    }
    f.append(label, ctl, reset); f.dataset.prop = prop; return f;
  }

  const SECTIONS = [
    ['size', 'Tamaño y dimensiones'], ['pos', 'Posición'], ['space', 'Márgenes y relleno'], ['layout', 'Distribución'],
    ['text', 'Texto'], ['look', 'Apariencia'], ['vis', 'Responsive']
  ];
  const openState = { size: true, pos: true, space: false, layout: true, text: true, look: true, vis: true };

  function renderPanel() {
    const scrollTop = panel.scrollTop; panel.innerHTML = '';
    if (!selId) {
      panel.append(h('div', { class: 'cbe-empty' },
        h('b', {}, 'Selecciona un elemento'), h('br'),
        'Haz clic sobre la vista previa o elígelo en la lista de la izquierda.', h('br'), h('br'),
        '• Arrastra para moverlo y usa los tiradores para cambiar su tamaño.', h('br'),
        '• Alt + clic selecciona el contenedor padre.', h('br'),
        '• Flechas: mover 1 px (Shift: 10 px).', h('br'),
        '• Ctrl+Z / Ctrl+Y: deshacer / rehacer.', h('br'), h('br'),
        'Estás editando: ', h('b', {}, BP[device].label), ' — los cambios no afectan a los otros dispositivos.'), warningsBox());
      return;
    }
    const entry = R.byId[selId], list = matches(selId);
    if (!selEl || !selEl.isConnected) selEl = list.find(isVisible) || list[0] || null;
    if (!selEl) {
      panel.append(h('div', { class: 'cbe-ph' }, h('span', { class: 'cbe-devbadge' }, BP[device].label), h('h3', {}, entry.label), h('code', {}, entry.sel)),
        h('div', { class: 'cbe-empty' }, 'Este elemento no existe en la vista actual. Cambia la vista (Tienda / Categorías) o el panel simulado.'));
      return;
    }
    const w = fw(), cs = w.getComputedStyle(selEl);
    const head = h('div', { class: 'cbe-ph' },
      h('span', { class: 'cbe-devbadge' }, 'Editando: ' + BP[device].label), h('h3', {}, entry.label),
      h('code', {}, entry.id + '  ·  ' + entry.sel),
      list.length > 1 ? h('div', { class: 'cbe-hint' }, 'Afecta a ' + list.length + ' elementos del mismo tipo.') : null,
      h('div', { class: 'cbe-chips' }, Object.keys(BP).map(d => h('button', { class: Object.keys(getOv(selId, d)).length ? 'has' : '', title: 'Ir a ' + BP[d].label, onclick: () => setDevice(d) }, (d === device ? '● ' : '') + BP[d].label + (Object.keys(getOv(selId, d)).length ? ' ✎' : '')))),
      h('div', { class: 'cbe-nav' },
        h('button', { onclick: () => { const p = parentEntry(); if (p) select(p.entry.id, p.el); else toast('No hay contenedor editable superior'); } }, '↑ Padre'),
        ...childEntries(selEl).slice(0, 6).map(c => h('button', { title: c.entry.id, onclick: () => select(c.entry.id, c.el) }, '↳ ' + c.entry.label))));
    panel.append(head);

    SECTIONS.forEach(([cat, title]) => {
      const props = Object.keys(P).filter(k => P[k].cat === cat && applicable(k, selEl, cs));
      if (cat === 'vis') { /* siempre */ } else if (!props.length) return;
      const det = h('details', { class: 'cbe-sec' }, h('summary', {}, title));
      if (openState[cat]) det.open = true; det.addEventListener('toggle', () => { openState[cat] = det.open; });
      const body = h('div', { class: 'cbe-sec-b' });
      if (cat === 'pos') body.append(h('div', { class: 'cbe-hint' }, 'Mover desplaza el elemento visualmente sin sacarlo del flujo (no usa position:absolute).'));
      props.forEach(k => body.append(field(k, cs, selEl)));
      if (cat === 'vis') body.append(...responsiveTools());
      det.append(body); panel.append(det);
    });
    panel.append(warningsBox()); panel.scrollTop = scrollTop;
  }
  function childEntries(el) {
    const out = [], seen = new Set();
    el.querySelectorAll('*').forEach(n => { const f = entryFor(n); if (f && f.el === n && !seen.has(f.entry.id) && f.entry.id !== selId) { seen.add(f.entry.id); out.push(f); } });
    return out;
  }
  function responsiveTools() {
    const others = Object.keys(BP).filter(d => d !== device);
    return [
      h('div', { class: 'cbe-hint' }, 'Copiar los valores de ' + BP[device].label + ' a otro dispositivo (usar la misma configuración):'),
      h('div', { class: 'cbe-chips' }, others.map(d => h('button', { onclick: () => { pushHistory(); draft.devices[d] = draft.devices[d] || {}; const src = getOv(selId); if (Object.keys(src).length) draft.devices[d][selId] = Object.assign({}, src); else delete draft.devices[d][selId]; commit(true); toast('Copiado a ' + BP[d].label); } }, '→ ' + BP[d].label))),
      h('div', { class: 'cbe-chips' },
        h('button', { onclick: () => { pushHistory(); delete devOv()[selId]; commit(true); toast('Elemento restablecido (' + BP[device].label + ')'); } }, 'Restablecer (' + BP[device].label + ')'),
        h('button', { class: 'cbe-danger', onclick: () => { pushHistory(); Object.keys(BP).forEach(d => { if (draft.devices[d]) delete draft.devices[d][selId]; }); commit(true); toast('Elemento restablecido en todos los dispositivos'); } }, 'Restablecer en todos'))
    ];
  }
  function refreshMarkers() {
    if (!selId) return; const ov = getOv(selId);
    panel.querySelectorAll('.cbe-f').forEach(f => f.classList.toggle('mod', ov[f.dataset.prop] !== undefined));
    refreshWarnings();
  }
  function syncMoveFields() {
    const ov = getOv(selId); panel.querySelectorAll('input[data-move]').forEach(i => { i.value = parseFloat(ov[i.dataset.move]) || ''; });
    panel.querySelectorAll('.cbe-f').forEach(f => f.classList.toggle('mod', ov[f.dataset.prop] !== undefined));
  }

  /* ── avisos: desbordamientos y superposiciones ──────────────────────────── */
  function runChecks() {
    const doc = fd(); if (!doc) return []; const fr = BP[device].frame, out = [], ov = draft.devices[device] || {};
    const visible = id => matches(id).filter(isVisible);
    Object.keys(ov).forEach(id => visible(id).slice(0, 8).forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.right <= 0 || r.bottom <= 0 || r.left >= fr.w || r.top >= fr.h) out.push('«' + R.byId[id].label + '» queda fuera de la pantalla (inaccesible).');
      else if (r.left < -2 || r.top < -2 || r.right > fr.w + 2 || r.bottom > fr.h + 2) out.push('«' + R.byId[id].label + '» sobresale del borde de la pantalla.');
    }));
    if (doc.documentElement.scrollWidth > fr.w + 1) out.push('La página tiene desplazamiento horizontal (contenido más ancho que la pantalla).');
    const vis = INTERACTIVE.map(id => ({ id, n: visible(id)[0] })).filter(x => x.n);
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      if (!ov[vis[i].id] && !ov[vis[j].id]) continue;   // solo lo que has tocado en este dispositivo
      const a = vis[i].n.getBoundingClientRect(), b = vis[j].n.getBoundingClientRect();
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (ix * iy > 0.3 * Math.min(a.width * a.height, b.width * b.height)) out.push('«' + R.byId[vis[i].id].label + '» se superpone con «' + R.byId[vis[j].id].label + '».');
    }
    return [...new Set(out)];
  }
  function warningsBox(list) {
    const w = list || runChecks(); const box = h('div', { id: 'cbe-warnbox' });
    if (w.length) box.append(h('div', { class: 'cbe-warn' }, h('b', {}, '⚠ Revisión (' + BP[device].label + ')'), h('ul', {}, w.map(x => h('li', {}, x)))));
    else if (Object.keys(draft.devices[device] || {}).length) box.append(h('div', { class: 'cbe-okbox' }, '✓ Sin desbordamientos ni superposiciones en ' + BP[device].label + '.'));
    return box;
  }
  function refreshWarnings() { const old = $('#cbe-warnbox'); if (old) old.replaceWith(warningsBox()); }

  async function auditAll() {
    const cur = device, results = [];
    toast('Revisando los 3 dispositivos…');
    for (const d of Object.keys(BP)) { setDevice(d, true); await sleep(500); results.push([d, runChecks()]); }
    setDevice(cur); await sleep(300); renderPanel();
    const box = h('div', { class: 'cbe-warn', style: 'border-color:var(--acc)' }, h('b', {}, 'Resultado de la revisión responsive'),
      h('ul', {}, results.map(([d, w]) => h('li', {}, BP[d].label + ': ' + (w.length ? '' : '✓ sin problemas'), w.length ? h('ul', {}, w.map(x => h('li', {}, x))) : null))));
    panel.prepend(box);
  }

  /* ── guardar, descartar, restablecer, importar/exportar ─────────────────── */
  function save() {
    try { D.save(draft); savedJson = JSON.stringify(D.sanitize(draft)); syncButtons(); toast('Diseño guardado'); }
    catch (e) { toast('No se pudo guardar (¿almacenamiento bloqueado?)'); console.error(e); }
  }
  function discard() { if (!isDirty() || !confirm('¿Descartar los cambios sin guardar?')) return; draft = D.load(); undo.length = redo.length = 0; commit(true); }
  function resetDevice() { if (!confirm('¿Restablecer TODO el diseño de ' + BP[device].label + '? (Se puede deshacer antes de guardar)')) return; pushHistory(); draft.devices[device] = {}; commit(true); toast(BP[device].label + ' restablecido'); }
  function resetAll() { if (!confirm('¿Restablecer el diseño COMPLETO de todos los dispositivos al original? (Se puede deshacer antes de guardar)')) return; pushHistory(); draft = D.emptyDoc(); commit(true); toast('Diseño completo restablecido — pulsa Guardar para confirmarlo'); }
  function exportJson() {
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(D.sanitize(draft), null, 2)], { type: 'application/json' })), download: 'catbling-tienda-diseno.json' });
    document.body.append(a); a.click(); a.remove(); toast('Diseño exportado');
  }
  function importJson(file) {
    const rd = new FileReader();
    rd.onload = () => { try { const doc = D.sanitize(JSON.parse(rd.result)); if (!confirm('¿Reemplazar el diseño actual por el archivo importado?')) return; pushHistory(); draft = doc; commit(true); toast('Diseño importado — pulsa Guardar para conservarlo'); } catch (e) { toast('Archivo no válido'); } };
    rd.readAsText(file);
  }
  async function copyPublish() {
    const txt = 'window.CB_DESIGN_PUBLISHED = ' + JSON.stringify(D.sanitize(draft), null, 2) + ';\n';
    try { await navigator.clipboard.writeText(txt); toast('Copiado. Pégalo en design/published.js'); }
    catch (e) { const t = h('textarea', { style: 'position:fixed;opacity:0' }, txt); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); toast('Copiado. Pégalo en design/published.js'); }
  }

  /* ── controles de la barra superior ─────────────────────────────────────── */
  function syncViewControls() { $('#cbe-cat-wrap').style.display = $('#cbe-item-wrap').style.display = view.mode === 'tienda' ? '' : 'none'; }
  document.querySelectorAll('#cbe-devices button').forEach(b => b.addEventListener('click', () => setDevice(b.dataset.device)));
  $('#cbe-view').addEventListener('change', e => { view.mode = e.target.value; syncViewControls(); deselect(); applyView(); });
  $('#cbe-cat').addEventListener('change', e => { view.cat = e.target.value; view.item = 0; $('#cbe-item').value = '0'; deselect(); applyView(); });
  $('#cbe-item').addEventListener('change', e => { view.item = Number(e.target.value); const w = fw(); if (w && w.seleccionarItem) w.seleccionarItem(fread('indiceInicio', 0) + view.item); });
  $('#cbe-zoom').addEventListener('change', e => { zoom = e.target.value; layout(); });
  $('#cbe-undo').addEventListener('click', doUndo); $('#cbe-redo').addEventListener('click', doRedo);
  $('#cbe-save').addEventListener('click', save); $('#cbe-discard').addEventListener('click', discard);
  $('#cbe-audit').addEventListener('click', auditAll);
  $('#cbe-export').addEventListener('click', exportJson); $('#cbe-publish').addEventListener('click', copyPublish);
  $('#cbe-import').addEventListener('click', () => $('#cbe-file').click());
  $('#cbe-file').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
  $('#cbe-reset-device').addEventListener('click', resetDevice); $('#cbe-reset-all').addEventListener('click', resetAll);
  $('#cbe-hidepreview').addEventListener('click', () => { clearPreview(); toast('Paneles simulados ocultos'); });
  document.querySelectorAll('.cbe-menu-list button').forEach(b => b.addEventListener('click', () => { $('.cbe-menu').open = false; }));
  window.addEventListener('resize', layout);
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  frame.addEventListener('load', onFrameLoad);

  /* arranque */
  renderTree(); syncViewControls(); setDevice('desktop', true); syncButtons();
  frame.src = './tienda.html?cbframe=1';
  requestAnimationFrame(draw);

  // API mínima para pruebas automatizadas
  window.__cbe = { get draft() { return draft; }, select, setDevice, save, get selId() { return selId; }, runChecks, get scale() { return scale; } };
})();
