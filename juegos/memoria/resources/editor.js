/* ─────────────────────────────────────────────────────────
   MODO EDICIÓN VISUAL — juego de memoria
   Activar entrando a la página con ?edit=1 al final de la URL.
   Ejemplo: memoria.html?edit=1

   - Arrastra cualquier elemento marcado (borde punteado dorado)
     para moverlo libremente.
   - Usa el círculo dorado en la esquina inferior derecha de un
     elemento para cambiar su tamaño.
   - Los cambios se guardan solos (localStorage), por separado
     para móvil / tablet / escritorio.
   - Botón "Exportar CSS" copia el layout actual como CSS listo
     para pegar en style.css y dejarlo fijo para todos.
   - Botón "Restablecer" borra los ajustes del tamaño actual de
     pantalla y vuelve al diseño original.
───────────────────────────────────────────────────────────── */
(function () {
  const STORAGE_PREFIX = 'catbling_layout_memoria_';

  function getBreakpoint() {
    const w = window.innerWidth;
    if (w <= 480) return 'mobile';
    if (w <= 768) return 'tablet';
    return 'desktop';
  }

  function storageKey(bp) {
    return STORAGE_PREFIX + bp;
  }

  function loadLayout(bp) {
    try {
      const raw = localStorage.getItem(storageKey(bp));
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveLayout(bp, layout) {
    localStorage.setItem(storageKey(bp), JSON.stringify(layout));
  }

  // Aplica el layout guardado a los elementos marcados con data-edit-id.
  // Corre SIEMPRE (con o sin ?edit=1) para que los cambios se vean
  // también cuando la página se visita normalmente.
  function applyLayout() {
    const bp = getBreakpoint();
    const layout = loadLayout(bp);
    document.querySelectorAll('[data-edit-id]').forEach((el) => {
      const d = layout[el.dataset.editId];
      if (!d) return;
      el.style.position = 'fixed';
      el.style.left = d.left + 'px';
      el.style.top = d.top + 'px';
      if (d.width) el.style.width = d.width + 'px';
      if (d.height) el.style.height = d.height + 'px';
      if (d.zIndex) el.style.zIndex = d.zIndex;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.margin = '0';
      el.style.transform = 'none';
    });
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  document.addEventListener('DOMContentLoaded', applyLayout);
  window.addEventListener('resize', debounce(applyLayout, 300));

  // ─── A partir de aquí, solo corre si la URL trae ?edit=1 ───
  const params = new URLSearchParams(location.search);
  if (params.get('edit') !== '1') return;

  let currentBp = getBreakpoint();
  let layout = loadLayout(currentBp);
  let maxZ = 100000;
  let selected = null;

  document.addEventListener('DOMContentLoaded', () => {
    injectHint();
    injectToolbar();
    document.querySelectorAll('[data-edit-id]').forEach(setupEditable);
  });

  function injectHint() {
    const hint = document.createElement('div');
    hint.id = 'editor-hint';
    hint.textContent = 'MODO EDICIÓN — arrastra para mover, usa el círculo dorado para redimensionar';
    document.body.appendChild(hint);
  }

  function injectToolbar() {
    const bar = document.createElement('div');
    bar.id = 'editor-toolbar';
    bar.innerHTML = `
      <span id="editor-bp-label"></span>
      <button id="editor-front">Traer al frente</button>
      <button id="editor-back">Enviar atrás</button>
      <button id="editor-reset">Restablecer</button>
      <button id="editor-export">Exportar CSS</button>
      <button id="editor-exit">Salir</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('editor-bp-label').textContent =
      currentBp === 'mobile' ? 'MÓVIL' : currentBp === 'tablet' ? 'TABLET' : 'ESCRITORIO';

    document.getElementById('editor-front').onclick = () => {
      if (!selected) return;
      maxZ += 1;
      selected.style.zIndex = maxZ;
      persist(selected);
    };
    document.getElementById('editor-back').onclick = () => {
      if (!selected) return;
      selected.style.zIndex = 1;
      persist(selected);
    };
    document.getElementById('editor-reset').onclick = () => {
      if (!confirm('¿Restablecer el diseño de "' + currentBp + '" a su posición original?')) return;
      layout = {};
      saveLayout(currentBp, layout);
      document.querySelectorAll('[data-edit-id]').forEach((el) => {
        ['position', 'left', 'top', 'width', 'height', 'zIndex', 'right', 'bottom', 'margin', 'transform']
          .forEach((prop) => (el.style[prop] = ''));
      });
    };
    document.getElementById('editor-export').onclick = exportCSS;
    document.getElementById('editor-exit').onclick = () => {
      const url = new URL(location.href);
      url.searchParams.delete('edit');
      location.href = url.toString();
    };
  }

  function ensureFixed(el) {
    if (el.style.position === 'fixed') return;
    const rect = el.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.margin = '0';
    el.style.transform = 'none';
  }

  function select(el) {
    if (selected) selected.classList.remove('editor-selected');
    selected = el;
    el.classList.add('editor-selected');
  }

  function persist(el) {
    const rect = el.getBoundingClientRect();
    layout[el.dataset.editId] = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      zIndex: el.style.zIndex || undefined,
    };
    saveLayout(currentBp, layout);
  }

  function setupEditable(el) {
    el.classList.add('editor-editable');

    const label = document.createElement('div');
    label.className = 'editor-label';
    label.textContent = el.dataset.editId;
    el.appendChild(label);

    const handle = document.createElement('div');
    handle.className = 'editor-resize-handle';
    el.appendChild(handle);

    let dragging = false;
    let resizing = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, startW = 0, startH = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      e.preventDefault();
      e.stopPropagation();
      select(el);
      ensureFixed(el);
      dragging = true;
      const rect = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = startLeft + dx + 'px';
      el.style.top = startTop + dy + 'px';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      persist(el);
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      select(el);
      ensureFixed(el);
      resizing = true;
      const rect = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startW = rect.width;
      startH = rect.height;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.width = Math.max(24, startW + dx) + 'px';
      el.style.height = Math.max(24, startH + dy) + 'px';
    });

    function endResize(e) {
      if (!resizing) return;
      resizing = false;
      persist(el);
    }
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
  }

  function exportCSS() {
    const mqOpen =
      currentBp === 'mobile' ? '@media (max-width: 480px) {\n' :
      currentBp === 'tablet' ? '@media (max-width: 768px) {\n' : '';
    const mqClose = mqOpen ? '}\n' : '';
    const indent = mqOpen ? '  ' : '';

    let css = `/* Layout "${currentBp}" generado por el modo edición — pégalo en style.css */\n`;
    css += mqOpen;
    Object.keys(layout).forEach((id) => {
      const d = layout[id];
      css += `${indent}[data-edit-id="${id}"] {\n`;
      css += `${indent}  position: fixed;\n`;
      css += `${indent}  left: ${Math.round(d.left)}px;\n`;
      css += `${indent}  top: ${Math.round(d.top)}px;\n`;
      if (d.width) css += `${indent}  width: ${Math.round(d.width)}px;\n`;
      if (d.height) css += `${indent}  height: ${Math.round(d.height)}px;\n`;
      if (d.zIndex) css += `${indent}  z-index: ${d.zIndex};\n`;
      css += `${indent}}\n`;
    });
    css += mqClose;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(css).then(
        () => alert('CSS copiado al portapapeles. Pégalo en style.css para dejarlo fijo para todos.'),
        () => prompt('Copia este CSS manualmente:', css)
      );
    } else {
      prompt('Copia este CSS manualmente:', css);
    }
  }
})();
