-- ============================================================
-- 001_initial_schema.sql
-- Esquema inicial PostgreSQL para Supabase
-- Versión corregida y endurecida
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TIPOS ENUM PERSONALIZADOS
-- ============================================================

CREATE TYPE accesorio_categoria AS ENUM (
    'sombrero',
    'camisa',
    'pantalon',
    'zapatos',
    'accesorio'
);

CREATE TYPE tienda_item_tipo AS ENUM (
    'comodin_pregunta',
    'potenciador_casino'
);

CREATE TYPE dificultad_nivel AS ENUM (
    'facil',
    'normal',
    'dificil'
);

CREATE TYPE casino_juego AS ENUM (
    'tragamonedas',
    'emparejar_pares',
    'duelo_dados',
    'ruleta',
    'jackpot_dados',
    'cartas'
);

-- ============================================================
-- 1. PROFILES
-- Vinculado 1:1 con auth.users
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nombre VARCHAR(60) NOT NULL,
    email VARCHAR(254),
    monedas BIGINT NOT NULL DEFAULT 200 CHECK (monedas >= 0),
    idioma VARCHAR(2) NOT NULL DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
    vol_musica SMALLINT NOT NULL DEFAULT 80 CHECK (vol_musica BETWEEN 0 AND 100),
    vol_efectos SMALLINT NOT NULL DEFAULT 80 CHECK (vol_efectos BETWEEN 0 AND 100),
    animaciones BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Trigger para actualizar ultimo_acceso
-- ============================================================

CREATE OR REPLACE FUNCTION update_ultimo_acceso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.ultimo_acceso = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_ultimo_acceso
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_ultimo_acceso();

-- ============================================================
-- Protección de columna monedas: solo modificable vía RPC SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION protect_monedas_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF OLD.monedas IS DISTINCT FROM NEW.monedas THEN
        -- Si current_user = session_user, la llamada viene directo del cliente (no de RPC SECURITY DEFINER)
        IF current_user = session_user THEN
            RAISE EXCEPTION 'Direct UPDATE of monedas column is not allowed. Use RPC functions (transaccion_monedas, reclamar_recarga_gratis, comprar_item, registrar_ronda_preguntas, registrar_sesion_casino).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_protect_monedas
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION protect_monedas_column();

-- ============================================================
-- Crear automáticamente el profile al registrarse en Auth
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nombre VARCHAR(60);
BEGIN
    v_nombre := COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
        'Jugador'
    );

    v_nombre := LEFT(v_nombre, 60);

    INSERT INTO public.profiles (
        id,
        nombre,
        email
    )
    VALUES (
        NEW.id,
        v_nombre,
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_profile ON auth.users;

CREATE TRIGGER trg_auth_user_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. ACCESORIOS_CATALOGO
-- Catálogo público, solo lectura para usuarios
-- ============================================================

CREATE TABLE accesorios_catalogo (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria accesorio_categoria NOT NULL,
    imagen_url VARCHAR(500) NOT NULL,
    precio_monedas BIGINT NOT NULL DEFAULT 0 CHECK (precio_monedas >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accesorios_categoria ON accesorios_catalogo (categoria);

CREATE INDEX idx_accesorios_activo ON accesorios_catalogo (activo);

-- ============================================================
-- 3. INVENTARIO_ACCESORIOS
-- ============================================================

CREATE TABLE inventario_accesorios (
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    accesorio_id BIGINT NOT NULL REFERENCES accesorios_catalogo (id) ON DELETE RESTRICT,
    equipado BOOLEAN NOT NULL DEFAULT FALSE,
    obtenido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, accesorio_id)
);

CREATE INDEX idx_inv_acc_user ON inventario_accesorios (user_id);

CREATE INDEX idx_inv_acc_equipado ON inventario_accesorios (user_id, equipado);

-- ============================================================
-- 4. TIENDA_ITEMS
-- ============================================================

CREATE TABLE tienda_items (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo tienda_item_tipo NOT NULL,
    descripcion VARCHAR(300) NOT NULL DEFAULT '',
    precio_monedas BIGINT NOT NULL DEFAULT 0 CHECK (precio_monedas >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tienda_tipo ON tienda_items (tipo);

CREATE INDEX idx_tienda_activo ON tienda_items (activo);

-- ============================================================
-- 5. INVENTARIO_ITEMS
-- ============================================================

CREATE TABLE inventario_items (
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES tienda_items (id) ON DELETE RESTRICT,
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad >= 0),
    obtenido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

CREATE INDEX idx_inv_items_user ON inventario_items (user_id);

-- ============================================================
-- 6. RONDAS_PREGUNTAS
-- ============================================================

CREATE TABLE rondas_preguntas (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    dificultad dificultad_nivel NOT NULL,
    area VARCHAR(80) NOT NULL,
    preguntas_total SMALLINT NOT NULL DEFAULT 0 CHECK (preguntas_total >= 0),
    correctas SMALLINT NOT NULL DEFAULT 0 CHECK (correctas >= 0),
    monedas_ganadas BIGINT NOT NULL DEFAULT 0 CHECK (monedas_ganadas >= 0),
    jugado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rondas_correctas_validas CHECK (correctas <= preguntas_total)
);

CREATE INDEX idx_rondas_user_creado ON rondas_preguntas (user_id, jugado_en DESC);

CREATE INDEX idx_rondas_dificultad ON rondas_preguntas (dificultad);

-- ============================================================
-- 7. SESIONES_CASINO
-- ============================================================

CREATE TABLE sesiones_casino (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    juego casino_juego NOT NULL,
    apuesta BIGINT NOT NULL DEFAULT 0 CHECK (apuesta >= 0),
    resultado_monedas BIGINT NOT NULL DEFAULT 0,
    gano BOOLEAN NOT NULL DEFAULT FALSE,
    jugado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT casino_resultado_valido CHECK (resultado_monedas >= 0)
);

CREATE INDEX idx_casino_user_creado ON sesiones_casino (user_id, jugado_en DESC);

CREATE INDEX idx_casino_juego ON sesiones_casino (juego);

-- ============================================================
-- 8. MONEDAS_HISTORIAL
-- Auditoría completa
-- ============================================================

CREATE TABLE monedas_historial (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    delta BIGINT NOT NULL,
    motivo VARCHAR(50) NOT NULL,
    ref VARCHAR(100),
    saldo_anterior BIGINT NOT NULL CHECK (saldo_anterior >= 0),
    saldo_nuevo BIGINT NOT NULL CHECK (saldo_nuevo >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monedas_historial_user_creado ON monedas_historial (user_id, creado_en DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE inventario_accesorios ENABLE ROW LEVEL SECURITY;

ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE rondas_preguntas ENABLE ROW LEVEL SECURITY;

ALTER TABLE sesiones_casino ENABLE ROW LEVEL SECURITY;

ALTER TABLE monedas_historial ENABLE ROW LEVEL SECURITY;

ALTER TABLE accesorios_catalogo ENABLE ROW LEVEL SECURITY;

ALTER TABLE tienda_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS PROFILES
-- ============================================================

CREATE POLICY profiles_select_own ON profiles FOR
SELECT USING (auth.uid () = id);

CREATE POLICY profiles_update_own ON profiles FOR
UPDATE USING (auth.uid () = id)
WITH
    CHECK (auth.uid () = id);

CREATE POLICY profiles_insert_own ON profiles FOR
INSERT
WITH
    CHECK (auth.uid () = id);

-- ============================================================
-- POLÍTICAS INVENTARIO_ACCESORIOS
-- ============================================================

CREATE POLICY inv_acc_select_own ON inventario_accesorios FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY inv_acc_insert_own ON inventario_accesorios FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY inv_acc_update_own ON inventario_accesorios FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- ============================================================
-- POLÍTICAS INVENTARIO_ITEMS
-- ============================================================

CREATE POLICY inv_items_select_own ON inventario_items FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY inv_items_insert_own ON inventario_items FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY inv_items_update_own ON inventario_items FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- ============================================================
-- POLÍTICAS RONDAS_PREGUNTAS
-- ============================================================

CREATE POLICY rondas_select_own ON rondas_preguntas FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY rondas_insert_own ON rondas_preguntas FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- ============================================================
-- POLÍTICAS SESIONES_CASINO
-- ============================================================

CREATE POLICY casino_select_own ON sesiones_casino FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY casino_insert_own ON sesiones_casino FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- ============================================================
-- POLÍTICAS MONEDAS_HISTORIAL
-- Solo lectura para el usuario
-- Las escrituras se realizan mediante RPC SECURITY DEFINER
-- ============================================================

CREATE POLICY historial_select_own ON monedas_historial FOR
SELECT USING (auth.uid () = user_id);

-- ============================================================
-- POLÍTICAS CATÁLOGOS
-- Solo elementos activos son visibles
-- ============================================================

CREATE POLICY catalogo_acc_public ON accesorios_catalogo FOR
SELECT USING (activo = TRUE);

CREATE POLICY catalogo_items_public ON tienda_items FOR
SELECT USING (activo = TRUE);

-- ============================================================
-- FUNCIÓN INTERNA DE MONEDAS
-- NO SE EXPONE DIRECTAMENTE AL CLIENTE
-- ============================================================

CREATE OR REPLACE FUNCTION _aplicar_monedas(
    p_user_id UUID,
    p_delta BIGINT,
    p_motivo VARCHAR(50),
    p_ref VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    nuevo_saldo BIGINT,
    ok BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nuevo BIGINT;
    v_anterior BIGINT;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    IF p_delta = 0 THEN
        RETURN QUERY SELECT
            COALESCE(
                (SELECT monedas FROM profiles WHERE id = p_user_id),
                0
            ),
            TRUE;
        RETURN;
    END IF;

    /*
     * UPDATE atómico:
     * Si se trata de una operación negativa, solo se permite
     * si el saldo actual alcanza para cubrirla.
     */
    IF p_delta < 0 THEN

        UPDATE profiles
        SET monedas = monedas + p_delta
        WHERE id = p_user_id
          AND monedas >= ABS(p_delta)
        RETURNING monedas INTO v_nuevo;

    ELSE

        UPDATE profiles
        SET monedas = monedas + p_delta
        WHERE id = p_user_id
        RETURNING monedas INTO v_nuevo;

    END IF;

    IF v_nuevo IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    v_anterior := v_nuevo - p_delta;

    INSERT INTO monedas_historial (
        user_id,
        delta,
        motivo,
        ref,
        saldo_anterior,
        saldo_nuevo
    )
    VALUES (
        p_user_id,
        p_delta,
        p_motivo,
        p_ref,
        v_anterior,
        v_nuevo
    );

    RETURN QUERY SELECT v_nuevo, TRUE;
END;
$$;

-- ============================================================
-- RLS Policies para profiles (permiten SELECT/UPDATE own profile)
-- ============================================================

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR
SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR
UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles FOR
INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 1. TRANSACCIÓN MONETARIA
--
-- Se mantiene por compatibilidad, pero NO permite que el
-- cliente se otorgue monedas libremente.
--
-- Esta función queda restringida a operaciones autorizadas.
-- ============================================================

CREATE OR REPLACE FUNCTION transaccion_monedas(
    p_delta BIGINT,
    p_motivo VARCHAR(50),
    p_ref VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    nuevo_saldo BIGINT,
    ok BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    /*
     * Esta RPC NO permite recompensas ni premios.
     * Esas operaciones se realizan mediante sus funciones
     * específicas, que validan el resultado.
     */

    IF p_motivo = 'recarga_gratis' THEN

        IF p_delta <> 10 THEN
            RETURN QUERY SELECT 0::BIGINT, FALSE;
            RETURN;
        END IF;

    ELSIF p_motivo = 'compra_tienda' THEN

        IF p_delta >= 0 THEN
            RETURN QUERY SELECT 0::BIGINT, FALSE;
            RETURN;
        END IF;

    ELSIF p_motivo = 'apuesta_casino' THEN

        IF p_delta >= 0 OR ABS(p_delta) > 10000 THEN
            RETURN QUERY SELECT 0::BIGINT, FALSE;
            RETURN;
        END IF;

    ELSE

        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;

    END IF;

    RETURN QUERY
    SELECT *
    FROM _aplicar_monedas(
        v_user_id,
        p_delta,
        p_motivo,
        p_ref
    );

END;
$$;

-- ============================================================
-- 2. RECARGA GRATIS
-- 10 monedas cada 2 horas cuando el saldo es 0
-- ============================================================

CREATE OR REPLACE FUNCTION reclamar_recarga_gratis()
RETURNS TABLE (
    nuevo_saldo BIGINT,
    ok BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_saldo BIGINT;
    v_ultima TIMESTAMPTZ;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    SELECT monedas
    INTO v_saldo
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_saldo IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    IF v_saldo > 0 THEN
        RETURN QUERY SELECT v_saldo, FALSE;
        RETURN;
    END IF;

    SELECT MAX(creado_en)
    INTO v_ultima
    FROM monedas_historial
    WHERE user_id = v_user_id
      AND motivo = 'recarga_gratis';

    IF v_ultima IS NOT NULL
       AND NOW() - v_ultima < INTERVAL '2 hours' THEN

        RETURN QUERY SELECT 0::BIGINT, FALSE;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT *
    FROM _aplicar_monedas(
        v_user_id,
        10,
        'recarga_gratis',
        NULL
    );

END;
$$;

-- ============================================================
-- 3. COMPRAR ITEM
-- Operación atómica:
-- monedas + inventario + historial
-- ============================================================

CREATE OR REPLACE FUNCTION comprar_item(
    p_item_id BIGINT,
    p_cantidad INT DEFAULT 1
)
RETURNS TABLE (
    ok BOOLEAN,
    mensaje VARCHAR(100),
    nuevo_saldo BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_precio BIGINT;
    v_total BIGINT;
    v_nuevo_saldo BIGINT;
    v_ok BOOLEAN;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No autenticado'::VARCHAR(100), 0::BIGINT;
        RETURN;
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100 THEN
        RETURN QUERY SELECT FALSE, 'Cantidad inválida'::VARCHAR(100), 0::BIGINT;
        RETURN;
    END IF;

    SELECT precio_monedas
    INTO v_precio
    FROM tienda_items
    WHERE id = p_item_id
      AND activo = TRUE;

    IF v_precio IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            'Item no encontrado o inactivo'::VARCHAR(100),
            0::BIGINT;
        RETURN;
    END IF;

    v_total := v_precio * p_cantidad;

    -- Usar alias explícitos para evitar ambigüedad
    SELECT resultado.nuevo_saldo, resultado.ok
    INTO v_nuevo_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        -v_total,
        'compra_tienda',
        p_item_id::TEXT
    ) AS resultado(nuevo_saldo, ok);

    IF NOT v_ok THEN
        SELECT monedas
        INTO v_nuevo_saldo
        FROM profiles
        WHERE id = v_user_id;

        RETURN QUERY SELECT
            FALSE,
            'Saldo insuficiente'::VARCHAR(100),
            COALESCE(v_nuevo_saldo, 0);
        RETURN;
    END IF;

    INSERT INTO inventario_items (
        user_id,
        item_id,
        cantidad
    )
    VALUES (
        v_user_id,
        p_item_id,
        p_cantidad
    )
    ON CONFLICT (user_id, item_id)
    DO UPDATE
    SET cantidad = inventario_items.cantidad + EXCLUDED.cantidad;

    RETURN QUERY SELECT
        TRUE,
        'Compra exitosa'::VARCHAR(100),
        v_nuevo_saldo;

END;
$$;

-- ============================================================
-- 4. EQUIPAR ACCESORIO
-- Solo puede equipar accesorios que posee.
-- ============================================================

CREATE OR REPLACE FUNCTION equipar_accesorio(
    p_accesorio_id BIGINT
)
RETURNS TABLE (
    ok BOOLEAN,
    mensaje VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_categoria accesorio_categoria;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No autenticado'::VARCHAR(100);
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM inventario_accesorios
        WHERE user_id = v_user_id
          AND accesorio_id = p_accesorio_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'No posees este accesorio'::VARCHAR(100);
        RETURN;
    END IF;

    SELECT categoria
    INTO v_categoria
    FROM accesorios_catalogo
    WHERE id = p_accesorio_id
      AND activo = TRUE;

    IF v_categoria IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Accesorio no encontrado'::VARCHAR(100);
        RETURN;
    END IF;

    /*
     * Primero quitamos el accesorio actualmente equipado
     * de la misma categoría.
     */
    UPDATE inventario_accesorios ia
    SET equipado = FALSE
    FROM accesorios_catalogo ac
    WHERE ia.user_id = v_user_id
      AND ia.accesorio_id = ac.id
      AND ac.categoria = v_categoria
      AND ia.equipado = TRUE;

    UPDATE inventario_accesorios
    SET equipado = TRUE
    WHERE user_id = v_user_id
      AND accesorio_id = p_accesorio_id;

    RETURN QUERY
    SELECT TRUE, 'Equipado correctamente'::VARCHAR(100);

END;
$$;

-- ============================================================
-- 5. USAR ITEM
-- ============================================================

CREATE OR REPLACE FUNCTION usar_item(
    p_item_id BIGINT
)
RETURNS TABLE (
    ok BOOLEAN,
    mensaje VARCHAR(100),
    cantidad_restante INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_cant INT;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No autenticado'::VARCHAR(100), 0;
        RETURN;
    END IF;

    SELECT cantidad
    INTO v_cant
    FROM inventario_items
    WHERE user_id = v_user_id
      AND item_id = p_item_id
    FOR UPDATE;

    IF v_cant IS NULL OR v_cant <= 0 THEN
        RETURN QUERY SELECT FALSE, 'No tienes este item'::VARCHAR(100), 0;
        RETURN;
    END IF;

    IF v_cant = 1 THEN

        DELETE FROM inventario_items
        WHERE user_id = v_user_id
          AND item_id = p_item_id;

        v_cant := 0;

    ELSE

        UPDATE inventario_items
        SET cantidad = cantidad - 1
        WHERE user_id = v_user_id
          AND item_id = p_item_id
        RETURNING cantidad INTO v_cant;

    END IF;

    RETURN QUERY
    SELECT TRUE, 'Item usado'::VARCHAR(100), v_cant;

END;
$$;

-- ============================================================
-- 6b. REGISTRAR RESPUESTA INDIVIDUAL DE PREGUNTA
-- Transacción económica por respuesta (permite delta ±costo)
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_respuesta_pregunta(
    p_dificultad dificultad_nivel,
    p_es_correcta BOOLEAN
)
RETURNS TABLE (
    ok BOOLEAN,
    nuevo_saldo BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_costo BIGINT;
    v_delta BIGINT;
    v_saldo BIGINT;
    v_ok BOOLEAN;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    CASE p_dificultad
        WHEN 'facil' THEN v_costo := 5;
        WHEN 'normal' THEN v_costo := 10;
        WHEN 'dificil' THEN v_costo := 15;
        ELSE
            RETURN QUERY SELECT FALSE, 0::BIGINT;
            RETURN;
    END CASE;

    v_delta := CASE WHEN p_es_correcta THEN v_costo ELSE -v_costo END;

    SELECT nuevo_saldo, ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        v_delta,
        'respuesta_pregunta',
        p_dificultad
    );

    IF NOT v_ok THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_saldo;
END;
$$;

-- ============================================================
-- 6. REGISTRAR RONDA DE PREGUNTAS (versión solo estadísticas)
-- Registra la ronda sin aplicar cambios monetarios (ya hechos por pregunta)
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_ronda_preguntas(
    p_dificultad dificultad_nivel,
    p_area VARCHAR(80),
    p_preguntas_total SMALLINT,
    p_correctas SMALLINT,
    p_monedas_ganadas BIGINT
)
RETURNS TABLE (
    ok BOOLEAN,
    id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_id BIGINT;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_area IS NULL OR LENGTH(TRIM(p_area)) = 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_preguntas_total IS NULL
       OR p_preguntas_total <= 0
       OR p_preguntas_total > 100 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_correctas IS NULL
       OR p_correctas < 0
       OR p_correctas > p_preguntas_total THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    -- p_monedas_ganadas puede ser negativo (para estadísticas netas de la ronda)
    -- NO se aplican cambios monetarios aquí; ya se hicieron via registrar_respuesta_pregunta
    IF p_monedas_ganadas IS NULL
       OR p_monedas_ganadas < -500
       OR p_monedas_ganadas > 500 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    /*
     * Registrar la ronda (solo estadísticas).
     */
    INSERT INTO rondas_preguntas (
        user_id,
        dificultad,
        area,
        preguntas_total,
        correctas,
        monedas_ganadas
    )
    VALUES (
        v_user_id,
        p_dificultad,
        TRIM(p_area),
        p_preguntas_total,
        p_correctas,
        p_monedas_ganadas
    )
    RETURNING rondas_preguntas.id INTO v_id;

    RETURN QUERY SELECT TRUE, v_id;
END;
$$;

-- ============================================================
-- 7. REGISTRAR SESIÓN DE CASINO
--
-- La apuesta se descuenta y el premio se acredita de forma
-- atómica.
--
-- resultado_monedas = premio bruto recibido.
-- Resultado neto = premio - apuesta.
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_sesion_casino(
    p_juego casino_juego,
    p_apuesta BIGINT,
    p_resultado_monedas BIGINT,
    p_gano BOOLEAN
)
RETURNS TABLE (
    ok BOOLEAN,
    id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_id BIGINT;
    v_saldo BIGINT;
    v_neto BIGINT;
    v_ok BOOLEAN;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_apuesta IS NULL
       OR p_apuesta < 0
       OR p_apuesta > 10000 THEN

        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_resultado_monedas IS NULL
       OR p_resultado_monedas < 0
       OR p_resultado_monedas > 100000 THEN

        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    /*
     * Si se marca como ganado, debe existir un premio.
     * Si se marca como perdido, el premio debe ser 0.
     */
    IF p_gano = FALSE AND p_resultado_monedas <> 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    IF p_gano = TRUE AND p_apuesta > 0
       AND p_resultado_monedas <= 0 THEN

        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    /*
     * Primero descontamos la apuesta.
     * Si no hay saldo suficiente, la operación termina.
     */
    IF p_apuesta > 0 THEN

        SELECT nuevo_saldo, ok
        INTO v_saldo, v_ok
        FROM _aplicar_monedas(
            v_user_id,
            -p_apuesta,
            'apuesta_casino',
            p_juego::TEXT
        );

        IF NOT v_ok THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT;
            RETURN;
        END IF;

    ELSE

        SELECT monedas
        INTO v_saldo
        FROM profiles
        WHERE id = v_user_id;

    END IF;

    /*
     * Acreditar premio.
     */
    IF p_resultado_monedas > 0 THEN

        SELECT nuevo_saldo, ok
        INTO v_saldo, v_ok
        FROM _aplicar_monedas(
            v_user_id,
            p_resultado_monedas,
            'premio_casino',
            p_juego::TEXT
        );

        IF NOT v_ok THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT;
            RETURN;
        END IF;

    END IF;

    v_neto := p_resultado_monedas - p_apuesta;

    /*
     * Registrar la partida.
     */
    INSERT INTO sesiones_casino (
        user_id,
        juego,
        apuesta,
        resultado_monedas,
        gano
    )
    VALUES (
        v_user_id,
        p_juego,
        p_apuesta,
        p_resultado_monedas,
        p_gano
    )
    RETURNING sesiones_casino.id INTO v_id;

    RETURN QUERY SELECT TRUE, v_id;

END;
$$;

-- ============================================================
-- PERMISOS
-- ============================================================

-- Función interna: jamás se expone directamente.
REVOKE ALL ON FUNCTION _aplicar_monedas (
    UUID,
    BIGINT,
    VARCHAR(50),
    VARCHAR(100)
)
FROM PUBLIC;

REVOKE ALL ON FUNCTION _aplicar_monedas (
    UUID,
    BIGINT,
    VARCHAR(50),
    VARCHAR(100)
)
FROM authenticated;

-- RPC pública de compatibilidad.
GRANT
EXECUTE ON FUNCTION transaccion_monedas (
    BIGINT,
    VARCHAR(50),
    VARCHAR(100)
) TO authenticated;

GRANT EXECUTE ON FUNCTION reclamar_recarga_gratis () TO authenticated;

GRANT
EXECUTE ON FUNCTION comprar_item (BIGINT, INT) TO authenticated;

GRANT
EXECUTE ON FUNCTION equipar_accesorio (BIGINT) TO authenticated;

GRANT EXECUTE ON FUNCTION usar_item (BIGINT) TO authenticated;

GRANT
EXECUTE ON FUNCTION registrar_ronda_preguntas (
    dificultad_nivel,
    VARCHAR(80),
    SMALLINT,
    SMALLINT,
    BIGINT
) TO authenticated;

GRANT
EXECUTE ON FUNCTION registrar_respuesta_pregunta (
    dificultad_nivel,
    BOOLEAN
) TO authenticated;

GRANT
EXECUTE ON FUNCTION registrar_sesion_casino (
    casino_juego,
    BIGINT,
    BIGINT,
    BOOLEAN
) TO authenticated;

-- ============================================================
-- COMENTARIOS
-- ============================================================

COMMENT ON
TABLE profiles IS 'Perfil de usuario vinculado a auth.users. Fuente de verdad para monedas y configuración.';

COMMENT ON
TABLE accesorios_catalogo IS 'Catálogo maestro de accesorios. Solo administradores deben modificarlo.';

COMMENT ON
TABLE inventario_accesorios IS 'Accesorios que posee cada usuario y cuál tiene equipado.';

COMMENT ON
TABLE tienda_items IS 'Catálogo de items comprables: comodines y potenciadores.';

COMMENT ON
TABLE inventario_items IS 'Items que posee cada usuario con cantidades.';

COMMENT ON
TABLE rondas_preguntas IS 'Historial de rondas de preguntas completadas.';

COMMENT ON
TABLE sesiones_casino IS 'Historial de partidas de casino terminadas.';

COMMENT ON
TABLE monedas_historial IS 'Auditoría completa de todos los cambios de monedas.';

COMMENT ON FUNCTION _aplicar_monedas (
    UUID,
    BIGINT,
    VARCHAR(50),
    VARCHAR(100)
) IS 'Función interna para realizar modificaciones atómicas de monedas y registrar auditoría. No debe exponerse al cliente.';

COMMENT ON FUNCTION transaccion_monedas (
    BIGINT,
    VARCHAR(50),
    VARCHAR(100)
) IS 'RPC de compatibilidad para operaciones monetarias permitidas. Rechaza motivos no autorizados.';

COMMENT ON FUNCTION registrar_ronda_preguntas (
    dificultad_nivel,
    VARCHAR(80),
    SMALLINT,
    SMALLINT,
    BIGINT
) IS 'Registra una ronda y acredita una recompensa validada de hasta 500 monedas.';

COMMENT ON FUNCTION registrar_sesion_casino (
    casino_juego,
    BIGINT,
    BIGINT,
    BOOLEAN
) IS 'Registra una partida de casino, descuenta la apuesta y acredita el premio de forma atómica.';