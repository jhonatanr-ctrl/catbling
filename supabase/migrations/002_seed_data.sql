-- ============================================================
-- 002_seed_data.sql
-- Datos semilla para catálogos
-- Sincronizado exactamente con tienda/resources/script.js (arrays de categorías)
-- ============================================================

-- ------------------------------------------------------------
-- ACCESORIOS_CATALOGO
-- ------------------------------------------------------------
INSERT INTO
    accesorios_catalogo (
        nombre,
        categoria,
        imagen_url,
        precio_monedas
    )
VALUES (
        'Sombrero de copa',
        'sombrero',
        '/assets/items/hat_top.png',
        150
    ),
    (
        'Camiseta básica',
        'camisa',
        '/assets/items/shirt_basic.png',
        50
    ),
    (
        'Jeans clásicos',
        'pantalon',
        '/assets/items/pants_jeans.png',
        80
    ),
    (
        'Zapatillas blancas',
        'zapatos',
        '/assets/items/shoes_white.png',
        60
    ),
    (
        'Gafas de sol',
        'accesorio',
        '/assets/items/glasses_sun.png',
        100
    );

-- ------------------------------------------------------------
-- TIENDA_ITEMS (20 items - IDs exactos a dbId del frontend)
-- Tipos válidos: 'comodin_pregunta', 'potenciador_casino'
-- ------------------------------------------------------------
INSERT INTO
    tienda_items (
        id,
        nombre,
        tipo,
        descripcion,
        precio_monedas
    )
VALUES
    -- Pregunta - Comunes (itemsMejoras)
    (
        1,
        'Pista',
        'comodin_pregunta',
        'Obtén una palabra clave que te acerque a la respuesta correcta.',
        25
    ),
    (
        2,
        'Eliminar',
        'comodin_pregunta',
        'Elimina 1 opción incorrecta.',
        30
    ),
    (
        3,
        'Congelar',
        'comodin_pregunta',
        'Detiene el contador durante 3 segundos.',
        25
    ),
    (
        4,
        'Cambiar',
        'comodin_pregunta',
        'Cambia la pregunta actual por una nueva.',
        35
    ),
    (
        5,
        'Popular',
        'comodin_pregunta',
        'Muestra la opción más elegida (puede fallar).',
        40
    ),
    (
        6,
        'Reintentar',
        'comodin_pregunta',
        'Permite intentar responder otra vez.',
        60
    ),
    (
        7,
        'Infinito',
        'comodin_pregunta',
        'Elimina el límite de tiempo.',
        70
    ),
    (
        24,
        'Dorado',
        'comodin_pregunta',
        'Respuesta correcta automática.',
        200
    ),
    -- Juego - Raros/Epicos/Legendarios (itemsBoosts)
    (
        10,
        'Seguro',
        'potenciador_casino',
        'Reduce la pérdida si fallas.',
        80
    ),
    (
        11,
        'Escudo',
        'potenciador_casino',
        'No pierdes tu apuesta si fallas.',
        100
    ),
    (
        12,
        'Duplicar',
        'potenciador_casino',
        'Duplica el efecto del último comodín.',
        80
    ),
    (
        13,
        'Ajuste',
        'potenciador_casino',
        'Mejora ligeramente las probabilidades en minijuegos.',
        30
    ),
    (
        14,
        'X4',
        'potenciador_casino',
        'Multiplica ganancias x4.',
        140
    ),
    (
        15,
        'Credito',
        'potenciador_casino',
        'Permite jugar sin saldo actual.',
        150
    ),
    (
        16,
        'Jackpot',
        'potenciador_casino',
        'Multiplicador x8 si aciertas.',
        280
    ),
    -- Pasivos - Accesorios (itemsAccesorios)
    (
        19,
        'Bolsa',
        'potenciador_casino',
        'Permite llevar más comodines.',
        180
    ),
    (
        20,
        'Guantes',
        'potenciador_casino',
        'Reduce ligeramente el tiempo de respuesta requerido.',
        200
    ),
    (
        21,
        'Gafas',
        'potenciador_casino',
        'Aumenta la claridad de las pistas.',
        250
    ),
    (
        22,
        'Amuleto',
        'potenciador_casino',
        'Aumenta ligeramente la probabilidad en minijuegos.',
        300
    ),
    (
        23,
        'Aura',
        'potenciador_casino',
        'Aumenta ligeramente todas las ganancias.',
        400
    );