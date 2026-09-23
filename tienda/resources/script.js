// ITEMS POR CATEGORÍA
const itemsMejoras = [
  {
            nombre: "Pista",
            precio: 25,
            descripcion: "Obtén una palabra clave que te acerque a la respuesta correcta.",
            mejora: "Ayuda rápida",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/pista.png",
            dbId: 1
        },
        {
            nombre: "Eliminar",
            precio: 30,
            descripcion: "Elimina 1 opción incorrecta.",
            mejora: "Reduce dificultad",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/eliminar.png",
            dbId: 2
        },
        {
            nombre: "Congelar",
            precio: 25,
            descripcion: "Detiene el contador durante 3 segundos.",
            mejora: "Control del tiempo",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/congelar.png",
            dbId: 3
        },
        {
            nombre: "Cambiar",
            precio: 35,
            descripcion: "Cambia la pregunta actual por una nueva.",
            mejora: "Evita preguntas difíciles",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/cambiar.png",
            dbId: 4
        },
        {
            nombre: "Popular",
            precio: 40,
            descripcion: "Muestra la opción más elegida (puede fallar).",
            mejora: "Ayuda incierta",
            tipo: "pregunta",
            rareza: "comun",
            imagen: "./resources/assets/popular.png",
            dbId: 5
        },
        {
            nombre: "Reintentar",
            precio: 60,
            descripcion: "Permite intentar responder otra vez.",
            mejora: "Segunda oportunidad",
            tipo: "pregunta",
            rareza: "raro",
            imagen: "./resources/assets/retry.png",
            dbId: 6
        },
        {
            nombre: "Infinito",
            precio: 70,
            descripcion: "Elimina el límite de tiempo.",
            mejora: "Sin presión",
            tipo: "pregunta",
            rareza: "raro",
            imagen: "./resources/assets/infinito.png",
            dbId: 7
        },
        {
            nombre: "Dorado",
            precio: 200,
            descripcion: "Respuesta correcta automática.",
            mejora: "Victoria garantizada",
            tipo: "pregunta",
            rareza: "legendario",
            imagen: "./resources/assets/dorado.png",
            dbId: 24
        }
];

const itemsBoosts = [
  {
            nombre: "Seguro",
            precio: 80,
            descripcion: "Reduce la pérdida si fallas.",
            mejora: "Mitiga riesgo",
            tipo: "juego",
            rareza: "raro",
            imagen: "./resources/assets/parcial.png",
            dbId: 10
        },
        {
            nombre: "Escudo",
            precio: 100,
            descripcion: "No pierdes tu apuesta si fallas.",
            mejora: "Protección total",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/escudo.png",
            dbId: 11
        },
        {
            nombre: "Duplicar",
            precio: 80,
            descripcion: "Duplica el efecto del último comodín.",
            mejora: "Combo",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/x2.png",
            dbId: 12
        },
        {
            nombre: "Ajuste",
            precio: 30,
            descripcion: "Mejora ligeramente las probabilidades en minijuegos.",
            mejora: "Ventaja oculta",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/ajuste.png",
            dbId: 13
        },
        {
            nombre: "X4",
            precio: 140,
            descripcion: "Multiplica ganancias x4.",
            mejora: "Alto riesgo",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/x4.png",
            dbId: 14
        },
        {
            nombre: "Credito",
            precio: 150,
            descripcion: "Permite jugar sin saldo actual.",
            mejora: "Deuda estratégica",
            tipo: "juego",
            rareza: "epico",
            imagen: "./resources/assets/credito.png",
            dbId: 15
        },
        {
            nombre: "Jackpot",
            precio: 280,
            descripcion: "Multiplicador x8 si aciertas.",
            mejora: "Recompensa máxima",
            tipo: "juego",
            rareza: "legendario",
            imagen: "./resources/assets/jackpot.png",
            dbId: 16
        }
];

const itemsAccesorios = [
   {
            nombre: "Guantes",
            precio: 200,
            descripcion: "Reduce ligeramente el tiempo de respuesta requerido.",
            mejora: "+5% velocidad",
            tipo: "pasivo",
            rareza: "raro",
            imagen: "./resources/assets/guantes.png",
            dbId: 20
        },
        {
            nombre: "Gafas",
            precio: 250,
            descripcion: "Aumenta la claridad de las pistas.",
            mejora: "Pistas más útiles",
            tipo: "pasivo",
            rareza: "raro",
            imagen: "./resources/assets/gafas.png",
            dbId: 21
        },
        {
            nombre: "Amuleto",
            precio: 300,
            descripcion: "Aumenta ligeramente la probabilidad en minijuegos.",
            mejora: "+5% suerte",
            tipo: "pasivo",
            rareza: "epico",
            imagen: "./resources/assets/amuleto.png",
            dbId: 22
        },
        {
            nombre: "Bolsa",
            precio: 180,
            descripcion: "Permite llevar más comodines.",
            mejora: "+3 espacio",
            tipo: "pasivo",
            rareza: "comun",
            imagen: "./resources/assets/bolsa.png",
            dbId: 19
        },
        {
            nombre: "Aura",
            precio: 400,
            descripcion: "Aumenta ligeramente todas las ganancias.",
            mejora: "+10% monedas",
            tipo: "pasivo",
            rareza: "legendario",
            imagen: "./resources/assets/aura.png",
            dbId: 23
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

// ITEMS DE LA TIENDA (24 ITEMS TOTAL)
const itemsAll = [
    {
        nombre: "Pista",
        precio: 25,
        descripcion: "Obtén una palabra clave que te acerque a la respuesta correcta.",
        mejora: "Ayuda rápida",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/pista.png",
        dbId: 1
    },
    {
        nombre: "Eliminar",
        precio: 30,
        descripcion: "Elimina 1 opción incorrecta.",
        mejora: "Reduce dificultad",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/eliminar.png",
        dbId: 2
    },
    {
        nombre: "Congelar",
        precio: 25,
        descripcion: "Detiene el contador durante 3 segundos.",
        mejora: "Control del tiempo",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/congelar.png",
        dbId: 3
    },
    {
        nombre: "Cambiar",
        precio: 35,
        descripcion: "Cambia la pregunta actual por una nueva.",
        mejora: "Evita preguntas difíciles",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/cambiar.png",
        dbId: 4
    },
    {
        nombre: "Popular",
        precio: 40,
        descripcion: "Muestra la opción más elegida (puede fallar).",
        mejora: "Ayuda incierta",
        tipo: "pregunta",
        rareza: "comun",
        imagen: "./resources/assets/popular.png",
        dbId: 5
    },

    {
        nombre: "Reintentar",
        precio: 60,
        descripcion: "Permite intentar responder otra vez.",
        mejora: "Segunda oportunidad",
        tipo: "pregunta",
        rareza: "raro",
        imagen: "./resources/assets/retry.png",
        dbId: 6
    },
    {
        nombre: "Infinito",
        precio: 70,
        descripcion: "Elimina el límite de tiempo.",
        mejora: "Sin presión",
        tipo: "pregunta",
        rareza: "raro",
        imagen: "./resources/assets/infinito.png",
        dbId: 7
    },
    {
        nombre: "Seguro",
        precio: 80,
        descripcion: "Reduce la pérdida si fallas.",
        mejora: "Mitiga riesgo",
        tipo: "juego",
        rareza: "raro",
        imagen: "./resources/assets/parcial.png",
        dbId: 10
    },

    {
        nombre: "Escudo",
        precio: 100,
        descripcion: "No pierdes tu apuesta si fallas.",
        mejora: "Protección total",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/escudo.png",
        dbId: 11
    },
    {
        nombre: "Ganancias",
        precio: 110,
        descripcion: "Protege tus ganancias actuales.",
        mejora: "Seguridad total",
        tipo: "estrategia",
        rareza: "epico",
        imagen: "./resources/assets/ganancias.png",
        dbId: 17
    },
    {
        nombre: "Duplicar",
        precio: 120,
        descripcion: "Duplica el efecto del último comodín.",
        mejora: "Combo",
        tipo: "estrategia",
        rareza: "epico",
        imagen: "./resources/assets/x2.png",
        dbId: 18
    },
    {
        nombre: "Ajuste",
        precio: 120,
        descripcion: "Mejora ligeramente las probabilidades en minijuegos.",
        mejora: "Ventaja oculta",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/ajuste.png",
        dbId: 13
    },
    {
        nombre: "Racha",
        precio: 130,
        descripcion: "Bonus por aciertos consecutivos.",
        mejora: "Escalado de ganancias",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/racha.png",
        dbId: 9
    },
    {
        nombre: "X4",
        precio: 140,
        descripcion: "Multiplica ganancias x4.",
        mejora: "Alto riesgo",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/x4.png",
        dbId: 14
    },
    {
        nombre: "Credito",
        precio: 150,
        descripcion: "Permite jugar sin saldo actual.",
        mejora: "Deuda estratégica",
        tipo: "juego",
        rareza: "epico",
        imagen: "./resources/assets/credito.png",
        dbId: 15
    },

    {
        nombre: "Jackpot",
        precio: 180,
        descripcion: "Multiplicador x8 si aciertas.",
        mejora: "Recompensa máxima",
        tipo: "juego",
        rareza: "legendario",
        imagen: "./resources/assets/jackpot.png",
        dbId: 16
    },
    {
        nombre: "Dorado",
        precio: 200,
        descripcion: "Respuesta correcta automática.",
        mejora: "Victoria garantizada",
        tipo: "pregunta",
        rareza: "legendario",
        imagen: "./resources/assets/dorado.png",
        dbId: 24
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
        const nombreTraducido = window.obtenerNombreItemTraducido ? window.obtenerNombreItemTraducido(item) : item.nombre;
        itemEl.innerHTML = `
            <span class="item-nombre">${nombreTraducido}</span>
            <div class="item-img-container">
                <img src="${item.imagen}" alt="${nombreTraducido}">
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
    const nombreTraducido = window.obtenerNombreItemTraducido ? window.obtenerNombreItemTraducido(itemData) : itemData.nombre;
    const descripcionTraducida = window.obtenerDescripcionItemTraducida ? window.obtenerDescripcionItemTraducida(itemData) : itemData.descripcion;
    const mejoraTraducida = window.obtenerMejoraItemTraducida ? window.obtenerMejoraItemTraducida(itemData) : itemData.mejora;
    document.getElementById('nombre-item').textContent = nombreTraducido;
    document.getElementById('descripcion-item').textContent = descripcionTraducida;
    document.getElementById('mejora-item').textContent = mejoraTraducida;
    document.getElementById('precio-item').textContent = __("monedas_necesarias") + ' ' + itemData.precio;
    document.getElementById('imagen-item-seleccionado').src = itemData.imagen;
}

async function comprarItem() {
    if (typeof invitadoPuedeComprar === 'function' && typeof requerirAutenticacion === 'function' && !invitadoPuedeComprar()) {
        requerirAutenticacion();
        return;
    }
    const itemData = items[itemSeleccionado];
    
    // Verificar espacio en inventario primero
    if (typeof window.tieneEspacioInventario === 'function' && !window.tieneEspacioInventario()) {
        if (typeof window.mostrarInventarioLleno === 'function') {
            window.mostrarInventarioLleno();
        }
        return;
    }

    // ─── COMPRA COMO INVITADO (sin sesión Supabase) ──────────────────
    // CAUSA RAÍZ: antes de este cambio, comprarItem() siempre terminaba
    // llamando a window.comprarItemTienda() (config.js), que exige
    // `await apiIsAuthenticated()` de forma incondicional y, si no hay
    // sesión, redirige a auth de inmediato. Es decir: aunque
    // invitadoPuedeComprar() diera el visto bueno, un invitado NUNCA
    // podía completar una compra real, porque el siguiente paso ya
    // exigía Supabase. No existía ningún camino local equivalente al
    // que sí tienen preguntas/juegos (que descuentan monedas localmente
    // vía coins.js -> cambiarMonedas() cuando no hay sesión).
    // Esta rama reutiliza exactamente esas mismas piezas ya existentes:
    //  - _isAuthenticatedSync() (guest.js) para decidir el camino,
    //  - getMonedas()/cambiarMonedas() (coins.js) para el saldo local,
    //  - window.agregarItemInventario() (config.js) para el inventario
    //    (la MISMA función que usa también la compra autenticada: el
    //    inventario visible siempre vive en sessionStorage, no es
    //    exclusivo de invitados),
    //  - marcarCompraTiendaCompletada() (guest.js) para consumir el
    //    único intento de compra de invitado.
    // No se crea ningún sistema de economía nuevo ni paralelo.
    if (typeof _isAuthenticatedSync === 'function' && !_isAuthenticatedSync()) {
        const saldoActual = typeof getMonedas === 'function'
            ? getMonedas()
            : (parseInt(localStorage.getItem('monedas')) || 0);

        if (saldoActual < itemData.precio) {
            const deficit = itemData.precio - saldoActual;
            if (typeof window.mostrarOverlayTienda === 'function') {
                window.mostrarOverlayTienda(deficit);
            }
            return;
        }

        if (typeof cambiarMonedas === 'function') {
            cambiarMonedas(-itemData.precio);
        } else if (typeof window._setCache === 'function') {
            window._setCache(saldoActual - itemData.precio);
            if (typeof window.actualizarMonedasUI === 'function') {
                window.actualizarMonedasUI(saldoActual - itemData.precio);
            }
        }

        const itemToStoreInvitado = Object.assign({}, itemData);
        itemToStoreInvitado.imagen = './tienda/' + itemData.imagen.replace('./', '');
        await window.agregarItemInventario(itemToStoreInvitado);

        if (typeof marcarCompraTiendaCompletada === 'function') marcarCompraTiendaCompletada();

        mostrarCompraExitosa(itemData);
        return;
    }
    
    // Verificar que el item tenga dbId (existe en BD) — sólo aplica a la
    // compra autenticada vía RPC; el invitado nunca llega hasta aquí.
    if (!itemData.dbId) {
        console.error('[tienda] Item sin dbId válido:', itemData.nombre);
        if (typeof window.mostrarOverlayTienda === 'function') {
            window.mostrarOverlayTienda(itemData.precio);
        }
        return;
    }
    
    // Usar RPC comprarItemTienda (Supabase) para items con dbId
    const r = await window.comprarItemTienda(itemData.dbId, itemData);
    if (r.success) {
        // RPC ya actualizó monedas e inventario en BD
        // Actualizar UI local via coinsAPI.fetch() que consulta Supabase y actualiza caché + UI
        if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
            await window.coinsAPI.fetch();
        } else if (typeof fetchMonedas === 'function') {
            await fetchMonedas();
        } else if (typeof window._setCache === 'function') {
            window._setCache(r.nuevo_saldo);
            if (typeof window.actualizarMonedasUI === 'function') window.actualizarMonedasUI(r.nuevo_saldo);
        }
        mostrarCompraExitosa(itemData);
    } else {
        // CAUSA RAÍZ del "faltan -175": cualquier fallo (RPC caída, sesión
        // vencida, perfil inexistente, inventario lleno…) caía aquí y se
        // presentaba SIEMPRE como saldo insuficiente, calculando
        // `precio - saldo` con un saldo local desactualizado (25 - 200 = -175).
        // Ahora el overlay de saldo insuficiente sólo aparece cuando el
        // servidor lo confirma, y el faltante se calcula con el saldo real que
        // devuelve el propio servidor.
        if (r.codigo === 'saldo_insuficiente') {
            let saldoReal = r.saldo;
            if (window.coinsAPI && typeof window.coinsAPI.fetch === 'function') {
                const fresco = await window.coinsAPI.fetch();
                if (typeof saldoReal !== 'number') saldoReal = fresco;
            }
            const deficit = itemData.precio - (saldoReal || 0);
            if (deficit > 0 && typeof window.mostrarOverlayTienda === 'function') {
                window.mostrarOverlayTienda(deficit);
            }
        } else if (r.codigo === 'inventario_lleno') {
            // Ya se mostró el overlay de inventario lleno (config.js).
        } else if (r.codigo === 'no_autenticado') {
            // requerirAutenticacion() ya se invocó en comprarItemTienda().
        } else {
            const claveMsg = r.codigo === 'perfil_no_encontrado' ? 'perfil_no_encontrado' : 'tienda_error_desc';
            mostrarErrorCompraTienda(__(claveMsg));
        }
        if (r.error) console.error('[tienda] Error compra:', r.codigo, r.error);
    }
}

function mostrarErrorCompraTienda(mensaje) {
    let overlay = document.getElementById('tienda-error-compra-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tienda-error-compra-overlay';
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
            <div style="text-align: center; padding: 20px; max-width: 80vw;">
                <h2 style="font-family: 'Press Start 2P', cursive; font-size: 24px; color: #ff4444; margin: 0 0 15px 0; text-shadow: 0 0 20px rgba(255, 68, 68, 1);">${__("tienda_error_titulo")}</h2>
                <p id="tienda-error-compra-msg" style="font-family: 'Pixelify Sans', sans-serif; font-size: 20px; color: white; margin: 8px 0;"></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    document.getElementById('tienda-error-compra-msg').textContent = mensaje;
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }, 3500);
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
                ">${__("tienda_sin_monedas_titulo")}</h2>
                <p style="
                    font-family: 'Pixelify Sans', sans-serif;
                    font-size: 20px;
                    color: white;
                    margin: 8px 0;
                    text-shadow: 0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.4);
                ">${__("tienda_sin_monedas_desc")}</p>
                <p class="monedas-necesarias" style="
                    color: #ffd700 !important;
                    margin-top: 15px !important;
                    font-family: 'Pixelify Sans', sans-serif;
                    font-size: 20px;
                    text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.6);
                ">${__("monedas_necesarias")} <span id="tienda-overlay-monedass-necesarias">0</span></p>
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
                ">${__("tienda_guardado_inventario")}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Configurar contenido
    document.getElementById('compra-item-img').src = itemData.imagen;
    document.getElementById('compra-item-nombre').textContent = window.obtenerNombreItemTraducido ? window.obtenerNombreItemTraducido(itemData) : itemData.nombre;
    
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
    async function actualizarUIMonedass() {
        const elem = document.getElementById('cantidad-monedasm');
        const icono = document.getElementById('icono-monedasm');
        
        // SIEMPRE obtener saldo real de Supabase para usuarios autenticados
        let monedas = 0;
        if (await apiIsAuthenticated()) {
            const result = await window.coinsAPI.fetch();
            monedas = result ?? 0;
        } else {
            monedas = typeof getMonedas === 'function' ? getMonedas() : parseInt(localStorage.getItem('monedas')) || 0;
        }
        
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
    
    // Sincronizar monedas cada 5s (async)
    setInterval(async () => {
        await actualizarUIMonedass();
    }, 5000);
    
    // Actualizar inmediatamente al cargar (async)
    actualizarUIMonedass().catch(console.error);
    
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
// Refresca los textos ya visibles (lista de ítems + panel de detalle)
// cuando el usuario cambia de idioma, sin necesidad de recargar la página.
window.addEventListener('idiomaAplicado', function () {
    const tienda = document.getElementById('tienda-container');
    if (tienda && tienda.classList.contains('active') && items.length > 0) {
        renderItems();
        seleccionarItem(itemSeleccionado);
    }
});