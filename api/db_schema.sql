-- ============================================================
--  Base de datos del juego
--  Motor: MySQL 8.0+
--  Notas:
--    - firebase_uid es VARCHAR(128) para compatibilidad con
--      los UIDs que genera Firebase Authentication.
--    - Todas las tablas usan ENGINE=InnoDB para soporte de
--      llaves foráneas y transacciones.
--    - Los ENUM están documentados con los valores actuales;
--      agregar nuevos valores solo requiere ALTER TABLE.
-- ============================================================

CREATE DATABASE IF NOT EXISTS game_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE game_db;

-- ------------------------------------------------------------
-- 1. JUGADORES
--    Tabla central. Sincroniza con Firebase via firebase_uid.
--    Monedas y configuración viven aquí como fuente de verdad.
-- ------------------------------------------------------------
CREATE TABLE jugadores (
  firebase_uid   VARCHAR(128)  NOT NULL,
  nombre         VARCHAR(60)   NOT NULL,
  email          VARCHAR(254)  NOT NULL,
  monedas        INT           NOT NULL DEFAULT 0,
  idioma         ENUM('es','en') NOT NULL DEFAULT 'es',
  vol_musica     TINYINT       NOT NULL DEFAULT 80
                               CHECK (vol_musica BETWEEN 0 AND 100),
  vol_efectos    TINYINT       NOT NULL DEFAULT 80
                               CHECK (vol_efectos BETWEEN 0 AND 100),
  animaciones    TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (firebase_uid),
  UNIQUE  KEY uq_jugadores_email (email),
  INDEX   idx_jugadores_ultimo_acceso (ultimo_acceso)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 2. ACCESORIOS_CATALOGO
--    Catálogo maestro de ropa / accesorios del personaje.
--    Solo el equipo de desarrollo inserta/actualiza aquí.
-- ------------------------------------------------------------
CREATE TABLE accesorios_catalogo (
  id             INT           NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100)  NOT NULL,
  categoria      ENUM(
                   'sombrero','camisa','pantalon',
                   'zapatos','accesorio'
                 )             NOT NULL,
  imagen_url     VARCHAR(500)  NOT NULL,
  precio_monedas INT           NOT NULL DEFAULT 0
                               CHECK (precio_monedas >= 0),
  activo         TINYINT(1)    NOT NULL DEFAULT 1,

  PRIMARY KEY (id),
  INDEX   idx_accesorios_categoria (categoria),
  INDEX   idx_accesorios_activo    (activo)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 3. INVENTARIO_ACCESORIOS
--    Qué accesorios tiene cada jugador y cuál lleva puesto.
--    Solo puede haber UN accesorio equipado por categoría
--    (restricción recomendada enforcarla desde la app).
-- ------------------------------------------------------------
CREATE TABLE inventario_accesorios (
  id             INT           NOT NULL AUTO_INCREMENT,
  jugador_uid    VARCHAR(128)  NOT NULL,
  accesorio_id   INT           NOT NULL,
  equipado       TINYINT(1)    NOT NULL DEFAULT 0,
  obtenido_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_inv_acc_jugador_accesorio (jugador_uid, accesorio_id),
  INDEX   idx_inv_acc_jugador   (jugador_uid),
  INDEX   idx_inv_acc_equipado  (jugador_uid, equipado),

  CONSTRAINT fk_inv_acc_jugador
    FOREIGN KEY (jugador_uid)  REFERENCES jugadores (firebase_uid)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_inv_acc_accesorio
    FOREIGN KEY (accesorio_id) REFERENCES accesorios_catalogo (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 4. TIENDA_ITEMS
--    Catálogo de ítems comprables: comodines y potenciadores.
--    El campo `tipo` distingue a cuál sección pertenece.
-- ------------------------------------------------------------
CREATE TABLE tienda_items (
  id             INT           NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100)  NOT NULL,
  tipo           ENUM(
                   'comodin_pregunta',
                   'potenciador_casino'
                 )             NOT NULL,
  descripcion    VARCHAR(300)  NOT NULL DEFAULT '',
  precio_monedas INT           NOT NULL DEFAULT 0
                               CHECK (precio_monedas >= 0),
  activo         TINYINT(1)    NOT NULL DEFAULT 1,

  PRIMARY KEY (id),
  INDEX   idx_tienda_tipo   (tipo),
  INDEX   idx_tienda_activo (activo)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 5. INVENTARIO_ITEMS
--    Ítems que posee cada jugador (comodines + potenciadores).
--    `cantidad` se decrementa al usar el ítem desde la app.
-- ------------------------------------------------------------
CREATE TABLE inventario_items (
  id             INT           NOT NULL AUTO_INCREMENT,
  jugador_uid    VARCHAR(128)  NOT NULL,
  item_id        INT           NOT NULL,
  cantidad       INT           NOT NULL DEFAULT 1
                               CHECK (cantidad >= 0),
  obtenido_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_inv_items_jugador_item (jugador_uid, item_id),
  INDEX   idx_inv_items_jugador (jugador_uid),

  CONSTRAINT fk_inv_items_jugador
    FOREIGN KEY (jugador_uid) REFERENCES jugadores (firebase_uid)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_inv_items_item
    FOREIGN KEY (item_id) REFERENCES tienda_items (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 6. RONDAS_PREGUNTAS
--    Una fila por sesión de preguntas completada.
--    Permite historial, estadísticas y rankings futuros.
-- ------------------------------------------------------------
CREATE TABLE rondas_preguntas (
  id               INT           NOT NULL AUTO_INCREMENT,
  jugador_uid      VARCHAR(128)  NOT NULL,
  dificultad       ENUM('facil','normal','dificil') NOT NULL,
  area             VARCHAR(80)   NOT NULL,
  preguntas_total  TINYINT       NOT NULL DEFAULT 0,
  correctas        TINYINT       NOT NULL DEFAULT 0,
  monedas_ganadas  INT           NOT NULL DEFAULT 0,
  jugado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX   idx_rondas_jugador     (jugador_uid),
  INDEX   idx_rondas_dificultad  (dificultad),
  INDEX   idx_rondas_jugado_en   (jugado_en),

  CONSTRAINT fk_rondas_jugador
    FOREIGN KEY (jugador_uid) REFERENCES jugadores (firebase_uid)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- 7. SESIONES_CASINO
--    Una fila por partida de casino terminada.
--    El resultado_monedas puede ser negativo (pérdida).
-- ------------------------------------------------------------
CREATE TABLE sesiones_casino (
  id                INT           NOT NULL AUTO_INCREMENT,
  jugador_uid       VARCHAR(128)  NOT NULL,
  juego             ENUM(
                      'tragamonedas',
                      'emparejar_pares',
                      'duelo_dados',
                      'ruleta',
                      'jackpot_dados',
                      'cartas'
                    )             NOT NULL,
  apuesta           INT           NOT NULL DEFAULT 0
                                  CHECK (apuesta >= 0),
  resultado_monedas INT           NOT NULL DEFAULT 0,
  gano              TINYINT(1)    NOT NULL DEFAULT 0,
  jugado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX   idx_casino_jugador   (jugador_uid),
  INDEX   idx_casino_juego     (juego),
  INDEX   idx_casino_jugado_en (jugado_en),

  CONSTRAINT fk_casino_jugador
    FOREIGN KEY (jugador_uid) REFERENCES jugadores (firebase_uid)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================
--  DATOS SEMILLA (opcional — ejemplos para arrancar)
-- ============================================================

-- Accesorios de ejemplo
INSERT INTO accesorios_catalogo (nombre, categoria, imagen_url, precio_monedas) VALUES
  ('Sombrero de copa',   'sombrero',   '/assets/items/hat_top.png',    150),
  ('Camiseta básica',    'camisa',     '/assets/items/shirt_basic.png',  50),
  ('Jeans clásicos',     'pantalon',   '/assets/items/pants_jeans.png',  80),
  ('Zapatillas blancas', 'zapatos',    '/assets/items/shoes_white.png',  60),
  ('Gafas de sol',       'accesorio',  '/assets/items/glasses_sun.png', 100);

-- Ítems de tienda de ejemplo
INSERT INTO tienda_items (nombre, tipo, descripcion, precio_monedas) VALUES
  ('Comodín 50/50',        'comodin_pregunta',   'Elimina dos respuestas incorrectas',        80),
  ('Comodín pausa',        'comodin_pregunta',   'Congela el tiempo por 15 segundos',         60),
  ('Comodín pista',        'comodin_pregunta',   'Muestra una pista de la respuesta correcta', 40),
  ('Multiplicador x2',     'potenciador_casino', 'Duplica las monedas ganadas en un juego',  120),
  ('Seguro de apuesta',    'potenciador_casino', 'Devuelve la apuesta si pierdes',            200),
  ('Racha de suerte',      'potenciador_casino', 'Aumenta probabilidad de ganar 10% por 3 rondas', 180);
