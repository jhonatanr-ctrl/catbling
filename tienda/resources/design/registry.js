/* ============================================================================
   REGISTRO CENTRAL DEL SISTEMA DE DISEÑO DE LA TIENDA
   ----------------------------------------------------------------------------
   Único lugar donde se declaran:
     · BREAKPOINTS  → puntos de ruptura (reutilizan los del proyecto: 768px y 480px)
     · PROPS        → propiedades editables y su traducción a CSS
     · ELEMENTS     → elementos editables con id estable + selector CSS
   Para hacer editable un elemento nuevo basta con añadir una línea en ELEMENTS.
   Los ids (clave "id") NO deben renombrarse: los diseños guardados los usan.
   No contiene lógica de la tienda (compras, monedas, Supabase, idiomas).
   ========================================================================== */
(function (global) {
  'use strict';

  /* Cada dispositivo aplica en un rango propio y excluyente, de modo que
     editar uno NUNCA altera a los otros. Coinciden con los @media de style.css. */
  const BREAKPOINTS = {
    desktop: { label: 'Escritorio', media: '(min-width: 769px)',                      frame: { w: 1366, h: 768 } },
    tablet:  { label: 'Tablet',     media: '(min-width: 481px) and (max-width: 768px)', frame: { w: 768,  h: 1024 } },
    mobile:  { label: 'Móvil',      media: '(max-width: 480px)',                       frame: { w: 390,  h: 844 } }
  };

  const FONTS = {
    'Press Start 2P': "'Press Start 2P', cursive",
    'Pixelify Sans': "'Pixelify Sans', sans-serif",
    'Josefin Sans': "'Josefin Sans', sans-serif",
    'Bungee Spice': "'Bungee Spice', cursive",
    'Sixtyfour': "'Sixtyfour', monospace",
    'Sistema (serif)': 'serif',
    'Sistema (sans)': 'sans-serif'
  };

  /* type: len (número+unidad) | num | color | select | opacity
     css : propiedad CSS. Las propiedades "compuestas" (moveX/moveY, hidden…)
           las traduce el motor (engine.js). */
  const PROPS = {
    // Tamaño
    width:     { css: 'width',      type: 'len', cat: 'size', label: 'Ancho' },
    height:    { css: 'height',     type: 'len', cat: 'size', label: 'Alto' },
    minWidth:  { css: 'min-width',  type: 'len', cat: 'size', label: 'Ancho mín.' },
    maxWidth:  { css: 'max-width',  type: 'len', cat: 'size', label: 'Ancho máx.' },
    minHeight: { css: 'min-height', type: 'len', cat: 'size', label: 'Alto mín.' },
    maxHeight: { css: 'max-height', type: 'len', cat: 'size', label: 'Alto máx.' },
    scale:     { css: 'scale',      type: 'num', cat: 'size', label: 'Escala', step: 0.05, min: 0.1, max: 4 },
    fontSize:  { css: 'font-size',  type: 'len', cat: 'text', label: 'Tamaño de fuente', units: ['px', 'em', 'rem', 'vw'] },
    // Posición (desplazamiento visual: respeta el flujo del documento)
    moveX:     { css: null, type: 'len', cat: 'pos', label: 'Mover X', units: ['px'], allowNeg: true },
    moveY:     { css: null, type: 'len', cat: 'pos', label: 'Mover Y', units: ['px'], allowNeg: true },
    order:     { css: 'order', type: 'num', cat: 'layout', label: 'Orden', step: 1, min: -20, max: 50 },
    // Espaciado
    marginTop:     { css: 'margin-top',     type: 'len', cat: 'space', label: 'Margen ↑', allowNeg: true },
    marginRight:   { css: 'margin-right',   type: 'len', cat: 'space', label: 'Margen →', allowNeg: true },
    marginBottom:  { css: 'margin-bottom',  type: 'len', cat: 'space', label: 'Margen ↓', allowNeg: true },
    marginLeft:    { css: 'margin-left',    type: 'len', cat: 'space', label: 'Margen ←', allowNeg: true },
    paddingTop:    { css: 'padding-top',    type: 'len', cat: 'space', label: 'Relleno ↑' },
    paddingRight:  { css: 'padding-right',  type: 'len', cat: 'space', label: 'Relleno →' },
    paddingBottom: { css: 'padding-bottom', type: 'len', cat: 'space', label: 'Relleno ↓' },
    paddingLeft:   { css: 'padding-left',   type: 'len', cat: 'space', label: 'Relleno ←' },
    gap:       { css: 'gap', type: 'len', cat: 'layout', label: 'Separación (gap)' },
    // Distribución
    flexDirection:  { css: 'flex-direction',  type: 'select', cat: 'layout', label: 'Dirección',
                      options: { row: 'Fila', column: 'Columna', 'row-reverse': 'Fila invertida', 'column-reverse': 'Columna invertida' } },
    justifyContent: { css: 'justify-content', type: 'select', cat: 'layout', label: 'Distribución (eje principal)',
                      options: { 'flex-start': 'Inicio', center: 'Centro', 'flex-end': 'Final', 'space-between': 'Espacio entre', 'space-around': 'Espacio alrededor', 'space-evenly': 'Espacio uniforme' } },
    alignItems:     { css: 'align-items', type: 'select', cat: 'layout', label: 'Alineación (eje cruzado)',
                      options: { 'flex-start': 'Inicio', center: 'Centro', 'flex-end': 'Final', stretch: 'Estirar' } },
    textAlign:      { css: 'text-align', type: 'select', cat: 'text', label: 'Alineación del texto',
                      options: { left: 'Izquierda', center: 'Centro', right: 'Derecha' } },
    // Texto
    fontFamily: { css: 'font-family', type: 'select', cat: 'text', label: 'Tipografía', options: FONTS, raw: true },
    fontWeight: { css: 'font-weight', type: 'select', cat: 'text', label: 'Grosor',
                  options: { 400: 'Normal', 500: 'Medio', 600: 'Seminegrita', 700: 'Negrita' } },
    color:      { css: 'color', type: 'color', cat: 'look', label: 'Color del texto' },
    textShadow: { css: 'text-shadow', type: 'text', cat: 'text', label: 'Sombra del texto', placeholder: '0 0 10px #ffd700' },
    // Apariencia
    bg:          { css: 'background', type: 'color', cat: 'look', label: 'Color de fondo' },
    borderColor: { css: 'border-color', type: 'color', cat: 'look', label: 'Color del borde' },
    borderWidth: { css: 'border-width', type: 'len', cat: 'look', label: 'Grosor del borde', units: ['px'] },
    borderStyle: { css: 'border-style', type: 'select', cat: 'look', label: 'Estilo del borde',
                   options: { none: 'Ninguno', solid: 'Sólido', dashed: 'Guiones', dotted: 'Puntos', double: 'Doble' } },
    borderRadius: { css: 'border-radius', type: 'len', cat: 'look', label: 'Radio de esquinas', units: ['px', '%'] },
    opacity:     { css: 'opacity', type: 'opacity', cat: 'look', label: 'Opacidad' },
    boxShadow:   { css: 'box-shadow', type: 'text', cat: 'look', label: 'Sombra de la caja', placeholder: '0 0 20px rgba(0,255,0,.3)' },
    // Responsive
    hidden:      { css: null, type: 'bool', cat: 'vis', label: 'Ocultar en este dispositivo' }
  };

  /* kind: hints opcionales; la aplicabilidad real se calcula en el editor con
     getComputedStyle (p.ej. gap solo si el elemento es flex/grid).
     preview: clases a añadir SOLO en la vista previa del editor para mostrar
              overlays ocultos (bolsa, menú, tutorial…). */
  const ELEMENTS = [
    // ── Barra superior / HUD ────────────────────────────────────────────────
    { id: 'hud.opciones',        group: 'Encabezado', label: 'Botón de opciones',       sel: '#btn-opciones' },
    { id: 'hud.monedas',         group: 'Encabezado', label: 'Panel de monedas',        sel: '.monedas-ui' },
    { id: 'hud.monedas-icono',   group: 'Encabezado', label: 'Icono de monedas',        sel: '#icono-monedasm' },
    { id: 'hud.monedas-cantidad',group: 'Encabezado', label: 'Cantidad de monedas',     sel: '#cantidad-monedasm' },
    { id: 'hud.bolsa',           group: 'Encabezado', label: 'Botón de bolsa',          sel: '#btn-bag' },
    // ── Navegación ──────────────────────────────────────────────────────────
    { id: 'nav.volver',          group: 'Navegación', label: 'Botón volver/salir',      sel: '.btn-volver-tienda' },
    { id: 'nav.volver-img',      group: 'Navegación', label: 'Imagen volver/salir',     sel: '#btn-volver-img' },
    { id: 'nav.subir',           group: 'Navegación', label: 'Flecha subir (botón)',    sel: '#btn-subir' },
    { id: 'nav.subir-img',       group: 'Navegación', label: 'Flecha subir (imagen)',   sel: '#btn-subir img' },
    { id: 'nav.bajar',           group: 'Navegación', label: 'Flecha bajar (botón)',    sel: '#btn-bajar' },
    { id: 'nav.bajar-img',       group: 'Navegación', label: 'Flecha bajar (imagen)',   sel: '#btn-bajar img' },
    // ── Estructura ──────────────────────────────────────────────────────────
    { id: 'tienda.contenedor',   group: 'Estructura', label: 'Contenedor principal',    sel: '.tienda-container' },
    // ── Lista de artículos (cinta) ──────────────────────────────────────────
    { id: 'lista.cinta',         group: 'Lista de artículos', label: 'Cinta (contenedor)', sel: '.items-list-container' },
    { id: 'lista.items',         group: 'Lista de artículos', label: 'Lista de artículos', sel: '.items-list' },
    { id: 'lista.item',          group: 'Lista de artículos', label: 'Tarjeta de artículo (todas)', sel: '.items-list .item' },
    { id: 'lista.item-nombre',   group: 'Lista de artículos', label: 'Nombre en tarjeta', sel: '.items-list .item-nombre' },
    { id: 'lista.item-imagen-caja', group: 'Lista de artículos', label: 'Caja de imagen en tarjeta', sel: '.items-list .item-img-container' },
    { id: 'lista.item-imagen',   group: 'Lista de artículos', label: 'Imagen en tarjeta', sel: '.items-list .item-img-container img' },
    // ── Detalle del artículo ────────────────────────────────────────────────
    { id: 'detalle.caja',        group: 'Detalle del artículo', label: 'Caja de detalles (fondo negro + borde)', sel: '.detalle-item' },
    { id: 'detalle.texto',       group: 'Detalle del artículo', label: 'Bloque de textos',  sel: '.detalle-texto' },
    { id: 'detalle.nombre',      group: 'Detalle del artículo', label: 'Nombre',            sel: '#nombre-item' },
    { id: 'detalle.descripcion', group: 'Detalle del artículo', label: 'Descripción',       sel: '#descripcion-item' },
    { id: 'detalle.mejora',      group: 'Detalle del artículo', label: 'Mejora',            sel: '#mejora-item' },
    { id: 'detalle.precio',      group: 'Detalle del artículo', label: 'Precio',            sel: '#precio-item' },
    { id: 'detalle.imagen-caja', group: 'Detalle del artículo', label: 'Caja de imagen',    sel: '.detalle-imagen' },
    { id: 'detalle.imagen',      group: 'Detalle del artículo', label: 'Imagen del artículo', sel: '#imagen-item-seleccionado' },
    { id: 'detalle.boton-caja',  group: 'Detalle del artículo', label: 'Caja del botón',    sel: '.detalle-boton' },
    { id: 'detalle.comprar',     group: 'Detalle del artículo', label: 'Botón COMPRAR',     sel: '#btn-comprar' },
    // ── Selector de categorías ──────────────────────────────────────────────
    { id: 'cat.overlay',         group: 'Categorías', label: 'Fondo de categorías',     sel: '.categorias-container' },
    { id: 'cat.caja',            group: 'Categorías', label: 'Caja de categorías',      sel: '.categorias-box' },
    { id: 'cat.icono',           group: 'Categorías', label: 'Categoría (todas)',       sel: '.categoria-icon' },
    { id: 'cat.imagen',          group: 'Categorías', label: 'Imagen de categoría',     sel: '.categoria-icon img' },
    { id: 'cat.texto',           group: 'Categorías', label: 'Texto de categoría',      sel: '.categoria-icon span' },
    // ── Menú de opciones ────────────────────────────────────────────────────
    { id: 'menu.caja',           group: 'Menú de opciones', label: 'Caja del menú',     sel: '.menu-box', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.titulo',         group: 'Menú de opciones', label: 'Título',            sel: '.menu-box h2', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.scroll',         group: 'Menú de opciones', label: 'Zona de opciones',  sel: '.menu-scroll', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.opcion',         group: 'Menú de opciones', label: 'Fila de opción (todas)', sel: '.opcion-item', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.botones',        group: 'Menú de opciones', label: 'Grupo de botones',  sel: '.grupo-botones', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.boton',          group: 'Menú de opciones', label: 'Botón de opción (todos)', sel: '.opcion-item button', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.idioma',         group: 'Menú de opciones', label: 'Selector de idioma', sel: '.idioma-selector-btn', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    { id: 'menu.cerrar',         group: 'Menú de opciones', label: 'Botón cerrar menú', sel: '#cerrar-menu', preview: { add: ['active'], targets: ['#menu-opciones', '#overlay-menu'] } },
    // ── Bolsa e inventario ──────────────────────────────────────────────────
    { id: 'bolsa.contenido',     group: 'Bolsa', label: 'Contenido de la bolsa',        sel: '#bag-content', preview: { add: ['active'], targets: ['#bag-overlay'] } },
    { id: 'bolsa.items',         group: 'Bolsa', label: 'Contenedor de artículos',      sel: '#bag-items-container', preview: { add: ['active'], targets: ['#bag-overlay'] } },
    { id: 'bolsa.cerrar',        group: 'Bolsa', label: 'Botón cerrar bolsa',           sel: '#bag-close-btn', preview: { add: ['active'], targets: ['#bag-overlay'] } },
    { id: 'uso.contenido',       group: 'Bolsa', label: 'Panel de usar artículo',       sel: '#item-use-content', preview: { add: ['active'], targets: ['#item-use-overlay'] } },
    // ── Avisos ──────────────────────────────────────────────────────────────
    { id: 'trabajando.mensaje',  group: 'Avisos', label: 'Mensaje "trabajando en eso"', sel: '.trabajando-mensaje', preview: { add: ['active'], targets: ['#trabajando-overlay'] } },
    { id: 'confirma.caja',       group: 'Avisos', label: 'Confirmar cerrar sesión (caja)', sel: '.confirmacion-contenido', preview: { add: ['active'], targets: ['#confirmacion-cerrar-sesion'] } },
    { id: 'confirma.titulo',     group: 'Avisos', label: 'Confirmar: título',           sel: '.confirmacion-titulo', preview: { add: ['active'], targets: ['#confirmacion-cerrar-sesion'] } },
    { id: 'confirma.texto',      group: 'Avisos', label: 'Confirmar: texto',            sel: '.confirmacion-texto', preview: { add: ['active'], targets: ['#confirmacion-cerrar-sesion'] } },
    { id: 'confirma.botones',    group: 'Avisos', label: 'Confirmar: botones (todos)',  sel: '.confirmacion-btn', preview: { add: ['active'], targets: ['#confirmacion-cerrar-sesion'] } },
    // ── Tutorial ────────────────────────────────────────────────────────────
    { id: 'tuto.personaje',      group: 'Tutorial', label: 'Personaje',                 sel: '.tutorial-character-wrapper', preview: { add: ['active', 'cb-preview'], targets: ['#tutorial-overlay'] } },
    { id: 'tuto.dialogo',        group: 'Tutorial', label: 'Cuadro de diálogo',         sel: '.tutorial-speech', preview: { add: ['active', 'cb-preview'], targets: ['#tutorial-overlay'] } },
    { id: 'tuto.texto',          group: 'Tutorial', label: 'Texto del diálogo',         sel: '#tutorial-text', preview: { add: ['active', 'cb-preview'], targets: ['#tutorial-overlay'] } },
    { id: 'tuto.saltar',         group: 'Tutorial', label: 'Botón SALTAR',              sel: '#tutorial-skip', preview: { add: ['active', 'cb-preview'], targets: ['#tutorial-overlay'] } },
    { id: 'tuto.siguiente',      group: 'Tutorial', label: 'Botón SIGUIENTE',           sel: '#tutorial-next', preview: { add: ['active', 'cb-preview'], targets: ['#tutorial-overlay'] } }
  ];

  const byId = {};
  ELEMENTS.forEach(e => { byId[e.id] = e; });

  global.CB_REGISTRY = { BREAKPOINTS, PROPS, ELEMENTS, FONTS, byId, STORAGE_KEY: 'cbDesign.v1', VERSION: 1 };
})(window);
