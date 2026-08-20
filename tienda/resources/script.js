// ITEMS POR CATEGORÍA
const itemsMejoras = [
 {
            nombre: "Pista Breve",
            precio: 25,
            descripcion: "Obtén una palabra clave que te acerque a la respuesta correcta.",
            mejora: "Ayuda rápida",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/pista.png"
        },
        {
            nombre: "Eliminar Opcion",
            precio: 30,
            descripcion: "Elimina 1 opción incorrecta.",
            mejora: "Reduce dificultad",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/eliminar.png"
        },
        {
            nombre: "Congelar Tiempo",
            precio: 25,
            descripcion: "Detiene el contador durante 3 segundos.",
            mejora: "Control del tiempo",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/congelar.png"
        },
        {
            nombre: "Racha",
            precio: 130,
            descripcion: "Bonus por aciertos consecutivos.",
            mejora: "Escalado de ganancias",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/racha.png"
        },
        {
            nombre: "Cambiar Pregunta",
            precio: 35,
            descripcion: "Cambia la pregunta actual por una nueva.",
            mejora: "Evita preguntas difíciles",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/cambiar.png"
        },
        {
            nombre: "Respuesta Popular",
            precio: 40,
            descripcion: "Muestra la opción más elegida (puede fallar).",
            mejora: "Ayuda incierta",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/popular.png"
        },
        {
            nombre: "Reintentar",
            precio: 60,
            descripcion: "Permite intentar responder otra vez.",
            mejora: "Segunda oportunidad",
            tipo: "pregunta",
            rareza: "raro",
            imagen: "./resources/assets/retry.png"
        },
        {
            nombre: "Tiempo Infinito",
            precio: 10,
            descripcion: "Elimina el límite de tiempo.",
            mejora: "Sin presión",
            tipo: "pregunta",
            rareza: "raro",
            imagen: "./resources/assets/infinito.png"
        },
        {
            nombre: "Ticket Dorado",
            precio: 10,
            descripcion: "Respuesta correcta automática.",
            mejora: "Victoria garantizada",
            tipo: "pregunta",
            rareza: "legendario",
            imagen: "./resources/assets/dorado.png"
        }
];

const itemsBoosts = [
  {
            nombre: "Seguro Parcial",
            precio: 40,
            descripcion: "Reduce la pérdida si fallas.",
            mejora: "Mitiga riesgo",
            tipo: "juego",
            rareza: "raro",
            imagen: "./resources/assets/parcial.png"
        },
        {
            nombre: "Escudo",
            precio: 100,
            descripcion: "No pierdes tu apuesta si fallas.",
            mejora: "Protección total",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/escudo.png"
        },
        {
            nombre: "Duplicar Comodin",
            precio: 80,
            descripcion: "Duplica el efecto del último comodín.",
            mejora: "Combo",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/x2.png"
        },
        {
            nombre: "Ajuste Fino",
            precio: 30,
            descripcion: "Mejora ligeramente las probabilidades en minijuegos.",
            mejora: "Ventaja oculta",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/ajuste.png"
        },
        {
            nombre: "Multiplicador X4",
            precio: 140,
            descripcion: "Multiplica ganancias x4.",
            mejora: "Alto riesgo",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/x4.png"
        },
        {
            nombre: "Credito Temporal",
            precio: 150,
            descripcion: "Permite jugar sin saldo actual.",
            mejora: "Deuda estratégica",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/credito.png"
        },
        {
            nombre: "¡Jackpot!",
            precio: 280,
            descripcion: "Multiplicador x8 si aciertas.",
            mejora: "Recompensa máxima",
            tipo: "juego",
            rareza: "legendario",
            imagen: "./resources/assets/jackpot.png"
        }
];

const itemsAccesorios = [
   {
            nombre: "Guantes de Precisión",
            precio: 200,
            descripcion: "Reduce ligeramente el tiempo de respuesta requerido.",
            mejora: "+5% velocidad",
            tipo: "pasivo",
            rareza: "raro",
            imagen: "./resources/assets/guantes.png"
        },
        {
            nombre: "Gafas Analíticas",
            precio: 250,
            descripcion: "Aumenta la claridad de las pistas.",
            mejora: "Pistas más útiles",
            tipo: "pasivo",
            rareza: "raro",
            imagen: "./resources/assets/gafas.png"
        },
        {
            nombre: "Amuleto de Suerte",
            precio: 300,
            descripcion: "Aumenta ligeramente la probabilidad en minijuegos.",
            mejora: "+5% suerte",
            tipo: "pasivo",
            rareza: "epico",
            imagen: "./resources/assets/amuleto.png"
        },
        {
            nombre: "Bolsa Expandida",
            precio: 180,
            descripcion: "Permite llevar más comodines.",
            mejora: "+3 espacio",
            tipo: "pasivo",
            rareza: "comun",
            imagen: "./resources/assets/bolsa.png"
        },
        {
            nombre: "Aura Dorada",
            precio: 400,
            descripcion: "Aumenta ligeramente todas las ganancias.",
            mejora: "+10% monedas",
            tipo: "pasivo",
            rareza: "legendario",
            imagen: "./resources/assets/aura.png"
        }
    ];

let items = []; // Se actualiza según la categoría seleccionada

// Función para volver/salir
function volverOAtras() {
    const tienda = document.getElementById('tienda-container');
    if (tienda && tienda.classList.contains('active')) {
        mostrarCategorias();
    } else {
        window.location.href = '../principalpage.html';
    }
    return false;
}

// Función para seleccionar categoría
function seleccionarCategoria(categoria) {
    console.log('seleccionarCategoria llamada con:', categoria);
    
    const container = document.getElementById('categorias-container');
    const tienda = document.getElementById('tienda-container');
    const btnSubir = document.getElementById('btn-subir');
    const btnBajar = document.getElementById('btn-bajar');
    
    if (!container || !tienda) {
        console.error('Error: No se encontraron los elementos necesarios');
        return;
    }
    
    console.log('Elementos encontrados, proceediendo...');
    
    // Ocultar categorías con animación (común para todas las categorías)
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    
    setTimeout(() => {
        container.style.display = 'none';
        document.body.classList.remove('categorias-mode');
        
        // Cargar items según categoría
        if (categoria === 'mejoras') {
            items = [...itemsMejoras];
        } else if (categoria === 'boosts') {
            items = [...itemsBoosts];
        } else if (categoria === 'accesorios') {
            items = [...itemsAccesorios];
            // Mostrar overlay de trabajo en curso para accesorios
            const overlay = document.getElementById('trabajando-overlay');
            if (overlay) overlay.classList.add('active');
        }
        
        // Resetear índice
        indiceInicio = 0;
        itemSeleccionado = 0;
        
        // Renderizar items (solo si no es accesorios)
        if (categoria !== 'accesorios' && items.length > 0) {
            renderItems();
            seleccionarItem(0);
        }
        
        // Mostrar tienda
        tienda.classList.add('active');
        
        // Mostrar botones de navegación (solo si no es accesorios)
        if (categoria !== 'accesorios') {
            if (btnSubir) btnSubir.style.display = 'flex';
            if (btnBajar) btnBajar.style.display = 'flex';
        }
        
        console.log('Tienda mostrada');
    }, 300);
}

// Función para volver a categorías
function mostrarCategorias() {
    const container = document.getElementById('categorias-container');
    const tienda = document.getElementById('tienda-container');
    const btnSubir = document.getElementById('btn-subir');
    const btnBajar = document.getElementById('btn-bajar');
    const overlay = document.getElementById('trabajando-overlay');
    
    // Ocultar tienda
    tienda.classList.remove('active');
    
    // Ocultar overlay de trabajo
    if (overlay) overlay.classList.remove('active');
    
    // Ocultar botones de navegación
    if (btnSubir) btnSubir.style.display = 'none';
    if (btnBajar) btnBajar.style.display = 'none';
    
    document.body.classList.add('categorias-mode');
    
    // Restaurar categorías
    container.style.display = 'flex';
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
}

// INICIALIZAR - mostrar categorías al cargar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando tienda...');
    
    const container = document.getElementById('categorias-container');
    const btnSubir = document.getElementById('btn-subir');
    const btnBajar = document.getElementById('btn-bajar');
    const tienda = document.getElementById('tienda-container');
    
    if (container) {
        container.style.display = 'flex';
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        console.log('Categorías inicializadas');
    }
    
    // Asegurar que la tienda esté oculta
    if (tienda) {
        tienda.classList.remove('active');
    }
    
    // Ocultar flechas de navegación al inicio
    if (btnSubir) btnSubir.style.display = 'none';
    if (btnBajar) btnBajar.style.display = 'none';
    
    // Fondo de pantalla principal
    document.body.classList.add('categorias-mode');
    
    console.log('Inicialización completa');
});

// ITEMS DE LA TIENDA (17 ITEMS TOTAL)
const itemsAll = [
    {
        nombre: "Pista Breve",
        precio: 25,
        descripcion: "Obtén una palabra clave que te acerque a la respuesta correcta.",
        mejora: "Ayuda rápida",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/pista.png"
    },
    {
        nombre: "Eliminar Opcion",
        precio: 30,
        descripcion: "Elimina 1 opción incorrecta.",
        mejora: "Reduce dificultad",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/eliminar.png"
    },
    {
        nombre: "Congelar Tiempo",
        precio: 25,
        descripcion: "Detiene el contador durante 3 segundos.",
        mejora: "Control del tiempo",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/congelar.png" 
    },
    {
        nombre: "Cambiar Pregunta",
        precio: 35,
        descripcion: "Cambia la pregunta actual por una nueva.",
        mejora: "Evita preguntas difíciles",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/cambiar.png"
    },
    {
        nombre: "Respuesta Popular",
        precio: 40,
        descripcion: "Muestra la opción más elegida (puede fallar).",
        mejora: "Ayuda incierta",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/popular.png"
    },

    {
        nombre: "Reintentar",
        precio: 60,
        descripcion: "Permite intentar responder otra vez.",
        mejora: "Segunda oportunidad",
        tipo: "pregunta",
        rareza: "raro",
        imagen: "./resources/assets/retry.png"
    },
    {
        nombre: "Tiempo Infinito",
        precio: 70,
        descripcion: "Elimina el límite de tiempo.",
        mejora: "Sin presión",
        tipo: "pregunta",
        rareza: "raro",
        imagen: "./resources/assets/infinito.png"
    },
    {
        nombre: "Seguro Parcial",
        precio: 80,
        descripcion: "Reduce la pérdida si fallas.",
        mejora: "Mitiga riesgo",
        tipo: "juego",
        rareza: "raro",
        imagen: "./resources/assets/parcial.png"
    },

    {
        nombre: "Escudo",
        precio: 100,
        descripcion: "No pierdes tu apuesta si fallas.",
        mejora: "Protección total",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/escudo.png"
    },
    {
        nombre: "Guardar Ganancias",
        precio: 110,
        descripcion: "Protege tus ganancias actuales.",
        mejora: "Seguridad total",
        tipo: "estrategia",
        rareza: "epico",
        imagen: "./resources/assets/ganancias.png"
    },
    {
        nombre: "Duplicar Comodin",
        precio: 120,
        descripcion: "Duplica el efecto del último comodín.",
        mejora: "Combo",
        tipo: "estrategia",
        rareza: "epico",
        imagen: "./resources/assets/x2.png"
    },
    {
        nombre: "Ajuste Fino",
        precio: 120,
        descripcion: "Mejora ligeramente las probabilidades en minijuegos.",
        mejora: "Ventaja oculta",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/ajuste.png"
    },
    {
        nombre: "Racha",
        precio: 130,
        descripcion: "Bonus por aciertos consecutivos.",
        mejora: "Escalado de ganancias",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/racha.png"
    },
    {
        nombre: "Multiplicador X4",
        precio: 140,
        descripcion: "Multiplica ganancias x4.",
        mejora: "Alto riesgo",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/x4.png"
    },
    {
        nombre: "Credito Temporal",
        precio: 150,
        descripcion: "Permite jugar sin saldo actual.",
        mejora: "Deuda estratégica",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/credito.png"
    },

    {
        nombre: "¡Jackpot!",
        precio: 180,
        descripcion: "Multiplicador x8 si aciertas.",
        mejora: "Recompensa máxima",
        tipo: "juego",
        rareza: "legendario",
        imagen: "./resources/assets/jackpot.png"
    },
    {
        nombre: "Ticket Dorado",
        precio: 200,
        descripcion: "Respuesta correcta automática.",
        mejora: "Victoria garantizada",
        tipo: "pregunta",
        rareza: "legendario",
        imagen: "./resources/assets/dorado.png"
    }
];

const ITEMS_VISIBLES = 5;
let indiceInicio = 0;
let itemSeleccionado = 0;
let ultimaDireccion = 0; // 1 = abajo, -1 = arriba

function renderItems() {
    const lista = document.getElementById('items-list');
    if (!lista) return;
    lista.innerHTML = '';
    
    // Guardar el contenedor original
    const containerOriginal = lista;
    
    for (let i = indiceInicio; i < indiceInicio + ITEMS_VISIBLES && i < items.length; i++) {
        const item = items[i];
        const itemEl = document.createElement('div');
        itemEl.className = 'item';
        if (i === itemSeleccionado) {
            itemEl.classList.add('seleccionado');
        }
        // Agregar clase de animación basada en la dirección
        if (ultimaDireccion > 0) {
            itemEl.classList.add('slide-arriba');
        } else if (ultimaDireccion < 0) {
            itemEl.classList.add('slide-abajo');
        }
        itemEl.onclick = () => seleccionarItem(i);
        itemEl.innerHTML = `
            <span class="item-nombre">${item.nombre}</span>
            <div class="item-img-container">
                <img src="${item.imagen}" alt="${item.nombre}">
            </div>
        `;
        
        // Agregar con pequeño retraso escalonado para efecto más suave
        itemEl.style.animationDelay = (i - indiceInicio) * 0.05 + 's';
        
        lista.appendChild(itemEl);
    }
    
    actualizarBotonesNavegacion();
}

function moverItems(direccion) {
    const maxInicio = items.length - ITEMS_VISIBLES;
    const nuevoInicio = indiceInicio + direccion;
    
    if (nuevoInicio >= 0 && nuevoInicio <= maxInicio) {
        ultimaDireccion = direccion;
        indiceInicio = nuevoInicio;
        
        if (itemSeleccionado < indiceInicio || itemSeleccionado >= indiceInicio + ITEMS_VISIBLES) {
            itemSeleccionado = indiceInicio;
        }
        
        renderItems();
        seleccionarItem(itemSeleccionado);
    }
}

function actualizarBotonesNavegacion() {
    const btnSubir = document.getElementById('btn-subir');
    const btnBajar = document.getElementById('btn-bajar');
    const maxInicio = items.length - ITEMS_VISIBLES;
    
    if (btnSubir) {
        btnSubir.style.display = indiceInicio <= 0 ? 'none' : 'flex';
    }
    if (btnBajar) {
        btnBajar.style.display = indiceInicio >= maxInicio ? 'none' : 'flex';
    }
}

function seleccionarItem(index) {
    itemSeleccionado = index;
    
    document.querySelectorAll('.item').forEach((item, i) => {
        item.classList.toggle('seleccionado', (indiceInicio + i) === index);
    });
    
    const itemData = items[index];
    document.getElementById('nombre-item').textContent = itemData.nombre;
    document.getElementById('descripcion-item').textContent = itemData.descripcion;
    document.getElementById('mejora-item').textContent = itemData.mejora;
    document.getElementById('precio-item').textContent = 'Monedas necesarias: ' + itemData.precio;
    document.getElementById('imagen-item-seleccionado').src = itemData.imagen;
}

function comprarItem() {
    if (typeof invitadoPuedeComprar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeComprar()) {
        requerirAutenticacion();
        return;
    }
    const itemData = items[itemSeleccionado];
    const monedas = getMonedas();
    
    if (monedas >= itemData.precio) {
        // Verificar espacio en inventario primero
        if (typeof window.tieneEspacioInventario === 'function' && !window.tieneEspacioInventario()) {
            if (typeof window.mostrarInventarioLleno === 'function') {
                window.mostrarInventarioLleno();
            }
            return;
        }
        
        // Compra exitosa
        descontarMonedas(itemData.precio);
        
        // Agregar al inventario global (normalizando path para uso cross-page)
        if (typeof window.agregarItemInventario === 'function') {
            const itemToStore = Object.assign({}, itemData);
            itemToStore.imagen = './tienda/' + itemData.imagen.replace('./', '');
            window.agregarItemInventario(itemToStore);
        }
        
        mostrarCompraExitosa(itemData);
    } else {
        // No tiene suficientes monedas
        const deficit = itemData.precio - monedas;
        mostrarOverlayTienda(deficit);
    }
}

function mostrarOverlayTienda(cantidadNecesaria) {
    // Crear overlay personalizado para la tienda
    let overlay = document.getElementById('tienda-no-monedass-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tienda-no-monedass-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 900;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h2 style="
                    font-family: 'Press Start 2P', cursive;
                    font-size: 28px;
                    color: #ff4444;
                    margin: 0 0 15px 0;
                    text-shadow: 0 0 20px rgba(255, 68, 68, 1), 0 0 40px rgba(255, 68, 68, 0.6);
                ">¡Sin monedas!</h2>
                <p style="
                    font-family: 'Pixelify Sans', sans-serif;
                    font-size: 20px;
                    color: white;
                    margin: 8px 0;
                    text-shadow: 0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.4);
                ">No tienes suficientes monedas para comprarlo.</p>
                <p class="monedas-necesarias" style="
                    color: #ffd700 !important;
                    margin-top: 15px !important;
                    font-family: 'Pixelify Sans', sans-serif;
                    font-size: 20px;
                    text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.6);
                ">Monedas necesarias: <span id="tienda-overlay-monedass-necesarias">0</span></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Mostrar overlay
    document.getElementById('tienda-overlay-monedass-necesarias').textContent = cantidadNecesaria;
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }, 3000);
}

function mostrarCompraExitosa(itemData) {
    // Crear overlay de compra exitosa
    let overlay = document.getElementById('compra-exitosa-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'compra-exitosa-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: background 0.5s ease, opacity 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <div class="compra-exitosa-content" style="
                text-align: center;
                transform: translateY(-100px);
                opacity: 0;
                transition: transform 0.5s ease, opacity 0.5s ease;
            ">
                <img id="compra-item-img" src="" style="
                    width: 150px;
                    height: 150px;
                    object-fit: contain;
                    margin-bottom: 20px;
                    filter: drop-shadow(0 0 20px rgba(0, 255, 0, 0.8));
                ">
                <p id="compra-item-nombre" style="
                    font-family: 'Press Start 2P', cursive;
                    font-size: 24px;
                    color: #ffd700;
                    margin: 0 0 20px 0;
                    text-shadow: 0 0 20px rgba(255, 215, 0, 1);
                "></p>
                <p style="
                    font-family: 'Pixelify Sans', sans-serif;
                    font-size: 24px;
                    color: #00ff00;
                    margin: 0;
                    text-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
                ">¡Guardado en tu inventario!</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Configurar contenido
    document.getElementById('compra-item-img').src = itemData.imagen;
    document.getElementById('compra-item-nombre').textContent = itemData.nombre;
    
    // Mostrar overlay con animación
    const content = overlay.querySelector('.compra-exitosa-content');
    overlay.style.pointerEvents = 'auto';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)';
    overlay.style.opacity = '1';
    
    // Animar contenido hacia abajo
    setTimeout(() => {
        content.style.transform = 'translateY(0)';
        content.style.opacity = '1';
    }, 50);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        overlay.style.background = 'rgba(0, 0, 0, 0)';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        content.style.transform = 'translateY(-100px)';
        content.style.opacity = '0';
    }, 3000);
}

// Llamar renderItems cuando el DOM esté listo (se ejecuta después de los scripts globales)
document.addEventListener('DOMContentLoaded', function() {
    // Pequeña demora para asegurar que todo esté cargado
    setTimeout(function() {
        renderItems();
        if (items.length > 0) {
            seleccionarItem(0);
        }
    }, 100);
    
    // Función para actualizar UI de monedas
    function actualizarUIMonedass() {
        const elem = document.getElementById('cantidad-monedasm');
        const icono = document.getElementById('icono-monedasm');
        const monedas = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas')) || 0;
        
        if (elem) {
            elem.textContent = monedas;
        }
        
        // Actualizar imagen de las monedas solo si cambia el estado
        if (icono) {
            const tieneMonedas = monedas > 0;
            const tieneSrcData = icono.hasAttribute('data-src-vacio');
            
            if (tieneSrcData) {
                if (tieneMonedas) {
                    icono.src = icono.dataset.srcLleno;
                } else {
                    icono.src = icono.dataset.srcVacio;
                }
            } else {
                // Fallback si no hay data attributes
                icono.src = tieneMonedas ? '../resources/assets/yukocoins.png' : '../resources/assets/yukonocoins.png';
            }
        }
    }
    
    // Sincronizar monedas cada 500ms
    setInterval(actualizarUIMonedass, 500);
    
    // Actualizar inmediatamente al cargar
    actualizarUIMonedass();
    
    if (typeof tutorialInit === 'function') tutorialInit();
});

// Control con teclado (W=arriba, S=abajo, flechas)
document.addEventListener('keydown', function(e) {
    const maxInicio = items.length - ITEMS_VISIBLES;
    
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        // Si hay item arriba en la vista actual, seleccionarlo
        if (itemSeleccionado > indiceInicio) {
            seleccionarItem(itemSeleccionado - 1);
        } 
        // Si no hay item arriba pero se puede subir la cinta, subirla
        else if (indiceInicio > 0) {
            moverItems(-1);
        }
    }
    
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        
        // Si hay item abajo en la vista actual, seleccionarlo
        if (itemSeleccionado < indiceInicio + ITEMS_VISIBLES - 1 && itemSeleccionado < items.length - 1) {
            seleccionarItem(itemSeleccionado + 1);
        } 
        // Si no hay item abajo pero se puede bajar la cinta, bajarla
        else if (indiceInicio < maxInicio) {
            moverItems(1);
        }
    }
});

// Animación del botón volver/salir
document.addEventListener('DOMContentLoaded', function() {
    const volverImg = document.getElementById('btn-volver-img');
    const volverBtn = document.getElementById('btn-volver-tienda');
    let timeout1, timeout2;
    
    if (volverBtn && volverImg) {
        volverBtn.addEventListener('mouseenter', () => {
            clearTimeout(timeout1); clearTimeout(timeout2);
            timeout1 = setTimeout(() => { volverImg.src = '../preguntas/assets/salida2.png'; }, 100);
            timeout2 = setTimeout(() => { volverImg.src = '../preguntas/assets/salida3.png'; }, 300);
        });
        volverBtn.addEventListener('mouseleave', () => {
            clearTimeout(timeout1); clearTimeout(timeout2);
            volverImg.src = '../preguntas/assets/salida3.png';
            timeout1 = setTimeout(() => { volverImg.src = '../preguntas/assets/salida2.png'; }, 100);
            timeout2 = setTimeout(() => { volverImg.src = '../preguntas/assets/salida1.png'; }, 300);
        });
    }
});

// Sincronizar monedas cuando cambie el storage
window.addEventListener('storage', function() {
    actualizarUIMonedass();
});
