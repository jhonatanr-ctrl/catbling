/* ─────────────────────────────────────────────────────────
   MODO EDICIÓN VISUAL — juego de memoria
   Activar entrando a la página con ?edit=1 al final de la URL.
   Ejemplo: memoria.html?edit=1

   DOS HERRAMIENTAS EN UNA:

   1) MOVER BLOQUES (como antes): arrastra un bloque completo
      (título, barra superior, apuesta, niveles, tablero, etc.)
      para moverlo, y usa el círculo dorado para cambiar su
      tamaño completo. Los botones "Traer al frente / Enviar
      atrás" cambian el orden de superposición.

   2) AJUSTAR TEXTO E IMÁGENES (nuevo): sin arrastrar, solo haz
      clic (sin mover el mouse) sobre cualquier texto o imagen
      individual de la página. Se abre un panel con el tamaño
      de letra (para texto) o el ancho/alto (para imágenes),
      y se aplica solo a ESE elemento, sin mover nada de lugar.

   Para las cartas del juego (se barajan al azar, así que no se
   pueden ajustar una por una): usa los campos "Tamaño de
   cartas" en la barra de herramientas, que afectan a todas por
   igual.

   Todo se guarda solo (localStorage), por separado para
   móvil / tablet / escritorio. Botón "Exportar CSS" copia todo
   el layout + estilos actuales como CSS listo para pegar en
   style.css y dejarlo fijo para todos los visitantes.
───────────────────────────────────────────────────────────── */
(function () {
  const LAYOUT_PREFIX = 'catbling_layout_memoria_';
  const FX_PREFIX = 'catbling_fx_memoria_';

  function getBreakpoint() {
    const w = window.innerWidth;
    if (w <= 480) return 'mobile';
    if (w <= 768) return 'tablet';
    return 'desktop';
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ---------- almacenamiento: posición / tamaño de bloques ---------- */
  function loadLayout(bp) {
    try {
      const raw = localStorage.getItem(LAYOUT_PREFIX + bp);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveLayout(bp, layout) {
    localStorage.setItem(LAYOUT_PREFIX + bp, JSON.stringify(layout));
  }

  /* ---------- almacenamiento: tipografía / imágenes individuales ---------- */
  function loadFx(bp) {
    try {
      const raw = localStorage.getItem(FX_PREFIX + bp);
      return raw ? JSON.parse(raw) : { paths: {}, cardSize: {} };
    } catch (e) {
      return { paths: {}, cardSize: {} };
    }
  }
  function saveFx(bp, data) {
    localStorage.setItem(FX_PREFIX + bp, JSON.stringify(data));
  }

  /* ---------- aplica lo guardado (SIEMPRE, con o sin ?edit=1) ---------- */
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

  function applyFx() {
    const bp = getBreakpoint();
    const data = loadFx(bp);

    Object.keys(data.paths || {}).forEach((path) => {
      let el;
      try {
        el = document.querySelector(path);
      } catch (e) {
        el = null;
      }
      if (!el) return;
      const d = data.paths[path];
      if (d.fontSize) el.style.fontSize = d.fontSize + 'px';
      if (d.width) el.style.width = d.width + 'px';
      if (d.height) el.style.height = d.height + 'px';
    });

    let styleTag = document.getElementById('editor-fx-card-style');
    const cs = data.cardSize || {};
    if (cs.width || cs.height) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'editor-fx-card-style';
        document.head.appendChild(styleTag);
      }
      let css = '.card {';
      if (cs.width) css += `width:${cs.width}px;`;
      if (cs.height) css += `height:${cs.height}px;`;
      css += '}';
      styleTag.textContent = css;
    } else if (styleTag) {
      styleTag.textContent = '';
    }
  }

  function applyAll() {
    applyLayout();
    applyFx();
  }

  document.addEventListener('DOMContentLoaded', applyAll);
  window.addEventListener('resize', debounce(applyAll, 300));
  // El tablero, la lista de niveles, etc. se generan por JS después de
  // cargar datos: reaplicamos cuando cambie el DOM para no perdernos
  // elementos que aparecen tarde.
  new MutationObserver(debounce(applyAll, 200)).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ─── A partir de aquí, solo corre si la URL trae ?edit=1 ───
  const params = new URLSearchParams(location.search);
  if (params.get('edit') !== '1') return;

  let currentBp = getBreakpoint();
  let layout = loadLayout(currentBp);
  let fx = loadFx(currentBp);
  let maxZ = 100000;
  let selectedSection = null;
  let fxPanelEl = null;

  document.addEventListener('DOMContentLoaded', () => {
    injectHint();
    injectToolbar();
    document.querySelectorAll('[data-edit-id]').forEach(setupSection);
    scanFxTargets(document.body);
    new MutationObserver(
      debounce(() => scanFxTargets(document.body), 200)
    ).observe(document.body, { childList: true, subtree: true });
  });

  /* ================= UI general ================= */

  function injectHint() {
    const hint = document.createElement('div');
    hint.id = 'editor-hint';
    hint.innerHTML =
      'MODO EDICIÓN — arrastra un bloque para moverlo · clic (sin arrastrar) sobre un texto o imagen para ajustar su tamaño';
    document.body.appendChild(hint);
  }

  function injectToolbar() {
    const bar = document.createElement('div');
    bar.id = 'editor-toolbar';
    bar.innerHTML = `
      <span id="editor-bp-label"></span>
      <button id="editor-front">Traer al frente</button>
      <button id="editor-back">Enviar atrás</button>
      <span class="editor-toolbar-sep"></span>
      <label class="editor-card-size">Cartas
        <input type="number" id="editor-card-w" placeholder="ancho" min="20" max="400">
        ×
        <input type="number" id="editor-card-h" placeholder="alto" min="20" max="400">
      </label>
      <span class="editor-toolbar-sep"></span>
      <button id="editor-reset">Restablecer todo</button>
      <button id="editor-export">Exportar CSS</button>
      <button id="editor-exit">Salir</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('editor-bp-label').textContent =
      currentBp === 'mobile' ? 'MÓVIL' : currentBp === 'tablet' ? 'TABLET' : 'ESCRITORIO';

    const cardW = document.getElementById('editor-card-w');
    const cardH = document.getElementById('editor-card-h');
    if (fx.cardSize) {
      if (fx.cardSize.width) cardW.value = fx.cardSize.width;
      if (fx.cardSize.height) cardH.value = fx.cardSize.height;
    }
    function updateCardSize() {
      fx.cardSize = {
        width: parseInt(cardW.value, 10) || undefined,
        height: parseInt(cardH.value, 10) || undefined,
      };
      saveFx(currentBp, fx);
      applyFx();
    }
    cardW.addEventListener('input', updateCardSize);
    cardH.addEventListener('input', updateCardSize);

    document.getElementById('editor-front').onclick = () => {
      if (!selectedSection) return;
      maxZ += 1;
      selectedSection.style.zIndex = maxZ;
      persistSection(selectedSection);
    };
    document.getElementById('editor-back').onclick = () => {
      if (!selectedSection) return;
      selectedSection.style.zIndex = 1;
      persistSection(selectedSection);
    };
    document.getElementById('editor-reset').onclick = () => {
      if (!confirm('¿Restablecer TODO el diseño de "' + currentBp + '" (posiciones, tamaños de letra e imágenes)?')) return;
      layout = {};
      fx = { paths: {}, cardSize: {} };
      saveLayout(currentBp, layout);
      saveFx(currentBp, fx);
      cardW.value = '';
      cardH.value = '';
      const styleTag = document.getElementById('editor-fx-card-style');
      if (styleTag) styleTag.textContent = '';
      document.querySelectorAll('[data-edit-id]').forEach((el) => {
        ['position', 'left', 'top', 'width', 'height', 'zIndex', 'right', 'bottom', 'margin', 'transform']
          .forEach((prop) => (el.style[prop] = ''));
      });
      document.querySelectorAll('.editor-fx-target').forEach((el) => {
        el.style.fontSize = '';
        el.style.width = '';
        el.style.height = '';
      });
      closeFxPanel();
    };
    document.getElementById('editor-export').onclick = exportCSS;
    document.getElementById('editor-exit').onclick = () => {
      const url = new URL(location.href);
      url.searchParams.delete('edit');
      location.href = url.toString();
    };
  }

  /* ================= 1) mover / redimensionar bloques ================= */

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

  function selectSection(el) {
    if (selectedSection) selectedSection.classList.remove('editor-selected');
    selectedSection = el;
    el.classList.add('editor-selected');
  }

  function persistSection(el) {
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

  function setupSection(el) {
    el.classList.add('editor-editable');

    const label = document.createElement('div');
    label.className = 'editor-label';
    label.textContent = el.dataset.editId;
    el.appendChild(label);

    const handle = document.createElement('div');
    handle.className = 'editor-resize-handle';
    el.appendChild(handle);

    const DRAG_THRESHOLD = 4;

    el.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      e.stopPropagation();
      const pointerId = e.pointerId;
      const clickTarget = e.target;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startRect = el.getBoundingClientRect();
      let moved = false;
      el.setPointerCapture(pointerId);

      function onMove(ev) {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          moved = true;
          closeFxPanel();
          selectSection(el);
          ensureFixed(el);
          el.style.left = startRect.left + 'px';
          el.style.top = startRect.top + 'px';
        }
        if (moved) {
          el.style.left = startRect.left + dx + 'px';
          el.style.top = startRect.top + dy + 'px';
        }
      }
      function onUp() {
        el.releasePointerCapture(pointerId);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (moved) {
          persistSection(el);
        } else {
          handleClickSelect(clickTarget, el);
        }
      }
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });

    let resizing = false;
    let rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0;
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeFxPanel();
      selectSection(el);
      ensureFixed(el);
      resizing = true;
      const rect = el.getBoundingClientRect();
      rStartX = e.clientX;
      rStartY = e.clientY;
      rStartW = rect.width;
      rStartH = rect.height;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const dx = e.clientX - rStartX;
      const dy = e.clientY - rStartY;
      el.style.width = Math.max(24, rStartW + dx) + 'px';
      el.style.height = Math.max(24, rStartH + dy) + 'px';
    });
    function endResize() {
      if (!resizing) return;
      resizing = false;
      persistSection(el);
    }
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
  }

  /* ================= 2) ajustar texto / imágenes individuales ================= */

  function withinOwnUi(node) {
    return !!node.closest(
      '.editor-label, .editor-resize-handle, #editor-toolbar, #editor-hint, #editor-fx-panel'
    );
  }

  function hasOwnText(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim() !== '') return true;
    }
    return false;
  }

  function isFxTarget(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (withinOwnUi(node)) return false;
    if (node.closest('#game-board')) return false; // las cartas se barajan: usar "Tamaño de cartas"
    if (node.tagName === 'IMG') return true;
    if (hasOwnText(node)) return true;
    return false;
  }

  function buildPath(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) {
        parts.unshift('#' + node.id);
        break;
      }
      const tag = node.tagName.toLowerCase();
      let idx = 1;
      let sib = node;
      while ((sib = sib.previousElementSibling)) {
        if (sib.tagName === node.tagName) idx++;
      }
      parts.unshift(tag + ':nth-of-type(' + idx + ')');
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function scanFxTargets(root) {
    root.querySelectorAll('*').forEach((el) => {
      if (el.classList.contains('editor-fx-target')) return;
      if (!isFxTarget(el)) return;
      el.classList.add('editor-fx-target');
      el.addEventListener('click', onFxClick);
    });
  }

  function onFxClick(e) {
    e.stopPropagation();
    openFxPanel(e.currentTarget);
  }

  function handleClickSelect(clickTarget, sectionEl) {
    let node = clickTarget;
    let fxEl = null;
    while (node && node !== sectionEl.parentElement) {
      if (node.classList && node.classList.contains('editor-fx-target')) {
        fxEl = node;
        break;
      }
      if (node === sectionEl) break;
      node = node.parentElement;
    }
    if (fxEl) {
      openFxPanel(fxEl);
    } else {
      selectSection(sectionEl);
    }
  }

  function closeFxPanel() {
    if (fxPanelEl) {
      fxPanelEl.remove();
      fxPanelEl = null;
    }
    document.querySelectorAll('.editor-fx-selected').forEach((el) => el.classList.remove('editor-fx-selected'));
  }

  function openFxPanel(el) {
    closeFxPanel();
    el.classList.add('editor-fx-selected');
    const path = buildPath(el);
    const isImg = el.tagName === 'IMG';

    const panel = document.createElement('div');
    panel.id = 'editor-fx-panel';

    if (isImg) {
      const rect = el.getBoundingClientRect();
      panel.innerHTML = `
        <div class="editor-fx-title">Imagen · ${el.alt || el.id || 'sin nombre'}</div>
        <label>Ancho (px) <input type="number" id="fx-w" min="8" max="1000" value="${Math.round(rect.width)}"></label>
        <label>Alto (px) <input type="number" id="fx-h" min="8" max="1000" value="${Math.round(rect.height)}"></label>
        <label class="editor-fx-checkbox"><input type="checkbox" id="fx-lock" checked> Mantener proporción</label>
        <div class="editor-fx-buttons">
          <button id="fx-reset">Restablecer</button>
          <button id="fx-close">Cerrar</button>
        </div>
      `;
      document.body.appendChild(panel);
      fxPanelEl = panel;

      const wInput = panel.querySelector('#fx-w');
      const hInput = panel.querySelector('#fx-h');
      const lock = panel.querySelector('#fx-lock');
      const ratio = rect.width / rect.height || 1;

      function apply() {
        const w = parseInt(wInput.value, 10);
        const h = parseInt(hInput.value, 10);
        if (w) el.style.width = w + 'px';
        if (h) el.style.height = h + 'px';
        persistFx(path, { width: w || undefined, height: h || undefined });
      }
      wInput.addEventListener('input', () => {
        if (lock.checked) hInput.value = Math.round(parseInt(wInput.value, 10) / ratio);
        apply();
      });
      hInput.addEventListener('input', () => {
        if (lock.checked) wInput.value = Math.round(parseInt(hInput.value, 10) * ratio);
        apply();
      });
    } else {
      const cs = getComputedStyle(el);
      const currentSize = parseInt(cs.fontSize, 10) || 16;
      panel.innerHTML = `
        <div class="editor-fx-title">Texto · "${(el.textContent || '').trim().slice(0, 24)}"</div>
        <label>Tamaño de letra (px)
          <input type="range" id="fx-fs-range" min="8" max="96" value="${currentSize}">
          <input type="number" id="fx-fs-num" min="8" max="200" value="${currentSize}">
        </label>
        <div class="editor-fx-buttons">
          <button id="fx-reset">Restablecer</button>
          <button id="fx-close">Cerrar</button>
        </div>
      `;
      document.body.appendChild(panel);
      fxPanelEl = panel;

      const range = panel.querySelector('#fx-fs-range');
      const num = panel.querySelector('#fx-fs-num');
      function apply(v) {
        el.style.fontSize = v + 'px';
        persistFx(path, { fontSize: v });
      }
      range.addEventListener('input', () => {
        num.value = range.value;
        apply(parseInt(range.value, 10));
      });
      num.addEventListener('input', () => {
        range.value = num.value;
        apply(parseInt(num.value, 10));
      });
    }

    panel.querySelector('#fx-close').onclick = closeFxPanel;
    panel.querySelector('#fx-reset').onclick = () => {
      el.style.fontSize = '';
      el.style.width = '';
      el.style.height = '';
      delete fx.paths[path];
      saveFx(currentBp, fx);
      closeFxPanel();
    };
  }

  function persistFx(path, values) {
    fx.paths = fx.paths || {};
    fx.paths[path] = Object.assign({}, fx.paths[path], values);
    saveFx(currentBp, fx);
  }

  /* ================= exportar CSS ================= */

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

    Object.keys(fx.paths || {}).forEach((path) => {
      const d = fx.paths[path];
      css += `${indent}${path} {\n`;
      if (d.fontSize) css += `${indent}  font-size: ${Math.round(d.fontSize)}px;\n`;
      if (d.width) css += `${indent}  width: ${Math.round(d.width)}px;\n`;
      if (d.height) css += `${indent}  height: ${Math.round(d.height)}px;\n`;
      css += `${indent}}\n`;
    });

    if (fx.cardSize && (fx.cardSize.width || fx.cardSize.height)) {
      css += `${indent}.card {\n`;
      if (fx.cardSize.width) css += `${indent}  width: ${fx.cardSize.width}px;\n`;
      if (fx.cardSize.height) css += `${indent}  height: ${fx.cardSize.height}px;\n`;
      css += `${indent}}\n`;
    }

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
