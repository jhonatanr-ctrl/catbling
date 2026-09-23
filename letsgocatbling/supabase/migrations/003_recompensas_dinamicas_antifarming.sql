-- ============================================================
-- 003_recompensas_dinamicas_antifarming.sql
--
-- PROBLEMA QUE RESUELVE:
-- El costo/recompensa de cada pregunta dependía ÚNICAMENTE del selector
-- de dificultad "facil/normal/dificil" (5/10/15 monedas), independiente
-- del "nivel académico" (primariaBasica..universitario) que determina el
-- banco de preguntas real. Un usuario podía elegir "Primaria básica" +
-- "DIFÍCIL" y cobrar las mismas 15 monedas por acierto que alguien
-- respondiendo preguntas universitarias genuinamente difíciles, con
-- precisión ~100% y de forma indefinida.
--
-- SOLUCIÓN (revisada tras auditoría crítica — ver nota de diseño):
-- 1) Recompensa base server-side por combinación real
--    (nivel_academico, dificultad) -> tabla recompensas_nivel.
-- 2) "Dominio" (rendimientos decrecientes) por combinación
--    nivel+dificultad, compartido entre TODAS las materias, evaluado
--    POR CADA RESPUESTA (no al completar la ronda — ver nota de diseño).
--    Reduce gradualmente (mínimo 50%) la recompensa por acierto tras
--    bloques sostenidos de alta precisión, y se recupera sola con
--    inactividad o bajo rendimiento. Nunca bloquea el acceso.
-- 3) Throttle mínimo entre respuestas cobradas, para dificultar el
--    farming por script/RPC directo sin pasar por la interfaz.
--
-- NOTA DE DISEÑO IMPORTANTE (por qué el dominio se evalúa por respuesta
-- y no por ronda):
-- Una primera versión de este diseño actualizaba dominio_usuario dentro
-- de registrar_ronda_preguntas (solo al completar la ronda de 15
-- preguntas). Al auditarla se detectó que era evadible: si el usuario
-- nunca completa la ronda (recarga la página / abandona antes de la
-- última pregunta), registrar_ronda_preguntas nunca se llama y la racha
-- de dominio JAMÁS se actualiza, permitiendo cobrar el 100% de la
-- recompensa para siempre. Por eso el dominio se rastrea con un bloque
-- deslizante de 15 respuestas ACUMULADAS por combinación
-- (nivel_academico, dificultad), evaluado dentro de la propia
-- registrar_respuesta_pregunta -- la única función que el cliente debe
-- llamar para cobrar cada respuesta, y que por tanto no puede evitar sin
-- dejar de cobrar también. Esto reduce registrar_ronda_preguntas a un
-- registro de estadísticas SIN efecto económico: la única fuente de
-- verdad de las monedas del juego de preguntas son
-- registrar_respuesta_pregunta y cobrar_entrada_pregunta_ronda.
--
-- Además corrige dos bugs preexistentes directamente relacionados:
--  a) transaccion_monedas nunca aceptaba el motivo 'entrada_pregunta'
--     que preguntas/resources/script.js ya intentaba usar, por lo que
--     el cobro de entrada de ronda fallaba siempre. Se sustituye por una
--     RPC dedicada (cobrar_entrada_pregunta_ronda).
--  b) rondas_preguntas.monedas_ganadas tenía CHECK (>= 0), pero rondas
--     con más fallos que aciertos deben poder registrar un neto
--     negativo. Se amplía el rango permitido.
--
-- LIMITACIÓN CONOCIDA (documentada, no oculta):
-- p_es_correcta lo determina el cliente porque el banco de preguntas y
-- sus respuestas correctas viven enteramente en JS de cliente
-- (preguntas/resources/questions.js), no en Supabase. Ninguna migración
-- de esta escala puede validar server-side si una respuesta concreta es
-- realmente correcta sin mover todo el banco de preguntas al backend
-- (fuera del alcance de esta tarea). El throttle de esta migración limita
-- el ritmo al que se puede abusar de eso vía llamadas directas a la RPC,
-- pero no lo elimina. Se documenta explícitamente en el informe final.
-- ============================================================

-- ============================================================
-- 1. NUEVO ENUM: NIVEL ACADÉMICO
-- Debe coincidir exactamente (mismo casing) con los identificadores
-- usados en preguntas/resources/script.js y questions.js:
-- window.nivelAcademicoSeleccionado.
-- ============================================================

CREATE TYPE nivel_academico_tipo AS ENUM (
    'primariaBasica',
    'primariaAvanzada',
    'bachilleratoBasico',
    'bachilleratoAvanzado',
    'universitario'
);

-- ============================================================
-- 2. TABLA DE RECOMPENSAS POR NIVEL x DIFICULTAD
-- Fuente de verdad server-side del costo/recompensa por pregunta.
-- Solo lectura pública (igual que accesorios_catalogo/tienda_items);
-- las mutaciones de monedas siguen ocurriendo únicamente vía RPC.
--
-- "bachilleratoAvanzado" conserva los valores originales (5/10/15)
-- para no alterar la economía del nivel que ya funcionaba como valor
-- por defecto. Los niveles más fáciles valen menos; el universitario
-- vale más.
-- ============================================================

CREATE TABLE recompensas_nivel (
    nivel_academico nivel_academico_tipo NOT NULL,
    dificultad dificultad_nivel NOT NULL,
    costo_pregunta SMALLINT NOT NULL CHECK (costo_pregunta > 0),
    PRIMARY KEY (nivel_academico, dificultad)
);

ALTER TABLE recompensas_nivel ENABLE ROW LEVEL SECURITY;

CREATE POLICY recompensas_nivel_select_all ON recompensas_nivel
FOR SELECT USING (TRUE);

INSERT INTO recompensas_nivel (nivel_academico, dificultad, costo_pregunta)
VALUES
    ('primariaBasica',       'facil',   2),
    ('primariaBasica',       'normal',  4),
    ('primariaBasica',       'dificil', 6),
    ('primariaAvanzada',     'facil',   3),
    ('primariaAvanzada',     'normal',  6),
    ('primariaAvanzada',     'dificil', 9),
    ('bachilleratoBasico',   'facil',   4),
    ('bachilleratoBasico',   'normal',  8),
    ('bachilleratoBasico',   'dificil', 12),
    ('bachilleratoAvanzado', 'facil',   5),
    ('bachilleratoAvanzado', 'normal',  10),
    ('bachilleratoAvanzado', 'dificil', 15),
    ('universitario',        'facil',   7),
    ('universitario',        'normal',  13),
    ('universitario',        'dificil', 20);

COMMENT ON TABLE recompensas_nivel IS
'Costo/recompensa server-side por pregunta según nivel académico real x dificultad. Única fuente de verdad económica; el cliente solo la refleja para mostrar una vista previa.';

-- ============================================================
-- 3. TABLA DE DOMINIO (RENDIMIENTOS DECRECIENTES)
--
-- Rastrea, por usuario y por combinación (nivel_academico, dificultad)
-- —agregando TODAS las materias—, un bloque deslizante de las últimas
-- respuestas para calcular una racha de dominio (0-10) que reduce
-- gradualmente (mínimo 50%) la recompensa por acierto. Se evalúa cada
-- vez que se acumulan BLOQUE_TAM=15 respuestas de esa combinación,
-- dentro de registrar_respuesta_pregunta, sin depender de si el usuario
-- completa o abandona la ronda del lado del cliente.
-- ============================================================

CREATE TABLE dominio_usuario (
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    nivel_academico nivel_academico_tipo NOT NULL,
    dificultad dificultad_nivel NOT NULL,
    racha_dominio SMALLINT NOT NULL DEFAULT 0 CHECK (racha_dominio BETWEEN 0 AND 10),
    bloque_aciertos SMALLINT NOT NULL DEFAULT 0 CHECK (bloque_aciertos BETWEEN 0 AND 15),
    bloque_total SMALLINT NOT NULL DEFAULT 0 CHECK (bloque_total BETWEEN 0 AND 15),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, nivel_academico, dificultad)
);

CREATE INDEX idx_dominio_usuario_user ON dominio_usuario (user_id);

ALTER TABLE dominio_usuario ENABLE ROW LEVEL SECURITY;

-- Solo lectura del propio progreso. Las escrituras solo ocurren dentro
-- de registrar_respuesta_pregunta (SECURITY DEFINER).
CREATE POLICY dominio_usuario_select_own ON dominio_usuario
FOR SELECT USING (auth.uid () = user_id);

COMMENT ON TABLE dominio_usuario IS
'Racha de dominio (0-10) y bloque deslizante de 15 respuestas por usuario y combinación nivel_academico+dificultad, compartida entre materias. Reduce gradualmente la recompensa por acierto en combinaciones farmeadas de forma sostenida; se recupera con inactividad o bajo rendimiento. Se actualiza en cada respuesta, no al completar la ronda, para no ser evadible abandonando rondas.';

-- ============================================================
-- 4. AJUSTES A RONDAS_PREGUNTAS
--    a) Nueva columna nivel_academico (auditoría de qué combinación se
--       jugó realmente en cada ronda histórica).
--    b) Corrección del CHECK que impedía registrar rondas con saldo
--       neto negativo (más fallos que aciertos).
-- ============================================================

ALTER TABLE rondas_preguntas
ADD COLUMN nivel_academico nivel_academico_tipo NOT NULL DEFAULT 'bachilleratoAvanzado';

CREATE INDEX idx_rondas_nivel_dificultad ON rondas_preguntas (user_id, nivel_academico, dificultad);

ALTER TABLE rondas_preguntas
DROP CONSTRAINT IF EXISTS rondas_preguntas_monedas_ganadas_check;

ALTER TABLE rondas_preguntas
ADD CONSTRAINT rondas_preguntas_monedas_ganadas_check
CHECK (monedas_ganadas BETWEEN -1000 AND 1000);

COMMENT ON COLUMN rondas_preguntas.nivel_academico IS
'Nivel académico (banco de preguntas) real jugado en la ronda. Valor por defecto bachilleratoAvanzado aplicado retroactivamente a rondas históricas previas a esta migración.';

COMMENT ON COLUMN rondas_preguntas.monedas_ganadas IS
'Estimación de saldo neto de la ronda, SOLO para estadísticas/historial. No es la fuente de verdad económica: las monedas ya fueron aplicadas pregunta a pregunta por registrar_respuesta_pregunta antes de que esta fila se inserte.';

-- ============================================================
-- 5. THROTTLE ANTI-SCRIPT: MARCA DE TIEMPO DE ÚLTIMA RESPUESTA COBRADA
--
-- Mitigación de defensa en profundidad contra llamadas directas a la
-- RPC (bypaseando la interfaz) a un ritmo humanamente imposible. No
-- sustituye la validación real de respuestas (ver limitación conocida
-- en la cabecera de este archivo), pero encarece notablemente farmear
-- por script.
-- ============================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ultima_respuesta_pregunta_en TIMESTAMPTZ;

COMMENT ON COLUMN profiles.ultima_respuesta_pregunta_en IS
'Marca de tiempo de la última respuesta de preguntas cobrada (cualquier combinación). Usada por registrar_respuesta_pregunta para rechazar llamadas más rápidas que el mínimo humano plausible (600ms).';

-- ============================================================
-- 6. NUEVA RPC: COBRAR ENTRADA DE RONDA DE PREGUNTAS
-- Reemplaza el uso indebido de transaccion_monedas con el motivo
-- 'entrada_pregunta' (nunca soportado por esa función). El costo de
-- entrada se calcula en servidor a partir de la dificultad, igual que
-- antes de esta migración (no depende del nivel académico: es un costo
-- de entrada fijo por dificultad, separado de la recompensa por
-- pregunta que sí depende de nivel_academico).
-- ============================================================

CREATE OR REPLACE FUNCTION cobrar_entrada_pregunta_ronda(
    p_dificultad dificultad_nivel
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

    SELECT nuevo_saldo, ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        -v_costo,
        'entrada_pregunta',
        p_dificultad::TEXT
    );

    IF NOT v_ok THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_saldo;

END;
$$;

GRANT
EXECUTE ON FUNCTION cobrar_entrada_pregunta_ronda (dificultad_nivel) TO authenticated;

COMMENT ON FUNCTION cobrar_entrada_pregunta_ronda (dificultad_nivel) IS
'Cobra el costo de entrada de una ronda de preguntas según la dificultad (5/10/15), validado en servidor. Sustituye al uso previamente roto de transaccion_monedas con motivo entrada_pregunta.';

-- ============================================================
-- 7. REGISTRAR RESPUESTA INDIVIDUAL (NIVEL ACADÉMICO + DOMINIO POR
--    BLOQUE + THROTTLE)
--
-- Firma nueva: (nivel_academico, dificultad, es_correcta). Es la ÚNICA
-- función que mueve monedas del juego de Preguntas (junto con
-- cobrar_entrada_pregunta_ronda para la entrada). Todo el cálculo ocurre
-- en servidor:
--   1. Throttle: rechaza (ok=false, sin cobrar) si la última respuesta
--      cobrada de este usuario fue hace menos de 600ms.
--   2. Costo base real = recompensas_nivel(nivel_academico, dificultad).
--   3. Recompensa por acierto = costo_base * factor_dominio (mínimo
--      50%), usando la racha VIGENTE (antes de contabilizar esta
--      respuesta). El fallo siempre cuesta el costo base completo (no
--      se reduce nunca), para que farmear una combinación dominada deje
--      de ser rentable de forma gradual.
--   4. Actualiza el bloque deslizante de 15 respuestas de esa
--      combinación; al completarse, ajusta la racha de dominio
--      (+1 si precisión>=80%, -2 si no, con recuperación pasiva por
--      inactividad de 24h+).
-- ============================================================

-- IMPORTANTE: la función REALMENTE existente en producción antes de esta
-- migración es registrar_respuesta_pregunta(TEXT, BOOLEAN) -- p_dificultad
-- quedó como TEXT (no como el enum dificultad_nivel) por un hotfix previo
-- (fix_registrar_respuesta_pregunta_param_type_text), y sigue confiando
-- por completo en p_es_correcta enviado por el cliente, siendo ejecutable
-- incluso por el rol "anon". Se elimina explícitamente aquí para que NO
-- quede coexistiendo tras aplicar esta migración: si no se elimina,
-- seguiría siendo invocable y dejaría abierto exactamente el fallo de
-- seguridad que esta migración (y 004/005) buscan cerrar.
DROP FUNCTION IF EXISTS registrar_respuesta_pregunta (TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS registrar_respuesta_pregunta (dificultad_nivel, BOOLEAN);
DROP FUNCTION IF EXISTS registrar_respuesta_pregunta (
    nivel_academico_tipo, dificultad_nivel, BOOLEAN
);

CREATE OR REPLACE FUNCTION registrar_respuesta_pregunta(
    p_nivel_academico nivel_academico_tipo,
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
    v_ultima_respuesta TIMESTAMPTZ;
    v_costo_base SMALLINT;
    v_racha SMALLINT;
    v_bloque_aciertos SMALLINT;
    v_bloque_total SMALLINT;
    v_actualizado_en TIMESTAMPTZ;
    v_horas_inactivo NUMERIC;
    v_factor NUMERIC;
    v_delta BIGINT;
    v_saldo BIGINT;
    v_ok BOOLEAN;
    v_precision NUMERIC;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    -- ── Throttle anti-script (defensa en profundidad, ver limitación
    -- conocida en cabecera del archivo) ──
    SELECT ultima_respuesta_pregunta_en INTO v_ultima_respuesta
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_ultima_respuesta IS NOT NULL
       AND NOW() - v_ultima_respuesta < INTERVAL '600 milliseconds' THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    UPDATE profiles
    SET ultima_respuesta_pregunta_en = NOW()
    WHERE id = v_user_id;

    -- ── Costo base real de la combinación jugada ──
    SELECT costo_pregunta
    INTO v_costo_base
    FROM recompensas_nivel
    WHERE nivel_academico = p_nivel_academico
      AND dificultad = p_dificultad;

    IF v_costo_base IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

    -- ── Estado de dominio vigente para esta combinación ──
    SELECT racha_dominio, bloque_aciertos, bloque_total, actualizado_en
    INTO v_racha, v_bloque_aciertos, v_bloque_total, v_actualizado_en
    FROM dominio_usuario
    WHERE user_id = v_user_id
      AND nivel_academico = p_nivel_academico
      AND dificultad = p_dificultad
    FOR UPDATE;

    v_racha := COALESCE(v_racha, 0);
    v_bloque_aciertos := COALESCE(v_bloque_aciertos, 0);
    v_bloque_total := COALESCE(v_bloque_total, 0);

    -- Recuperación pasiva: cada 24h sin responder este combo perdona
    -- 2 puntos de racha (no afecta el bloque en curso).
    IF v_actualizado_en IS NOT NULL THEN
        v_horas_inactivo := EXTRACT(EPOCH FROM (NOW() - v_actualizado_en)) / 3600.0;
        IF v_horas_inactivo >= 24 THEN
            v_racha := GREATEST(0, v_racha - (FLOOR(v_horas_inactivo / 24) * 2)::SMALLINT);
        END IF;
    END IF;

    -- ── Recompensa/costo, usando la racha VIGENTE (antes de esta respuesta) ──
    IF p_es_correcta THEN
        v_factor := GREATEST(0.5, 1 - 0.05 * v_racha);
        v_delta := GREATEST(1, ROUND(v_costo_base * v_factor));
    ELSE
        v_delta := -v_costo_base;
    END IF;

    SELECT nuevo_saldo, ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        v_delta,
        'respuesta_pregunta',
        p_nivel_academico::TEXT || ':' || p_dificultad::TEXT
    );

    IF NOT v_ok THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    -- ── Actualizar bloque deslizante y, si corresponde, la racha ──
    v_bloque_total := v_bloque_total + 1;
    IF p_es_correcta THEN
        v_bloque_aciertos := v_bloque_aciertos + 1;
    END IF;

    IF v_bloque_total >= 15 THEN
        v_precision := v_bloque_aciertos::NUMERIC / v_bloque_total::NUMERIC;
        IF v_precision >= 0.8 THEN
            v_racha := LEAST(10, v_racha + 1);
        ELSE
            v_racha := GREATEST(0, v_racha - 2);
        END IF;
        v_bloque_aciertos := 0;
        v_bloque_total := 0;
    END IF;

    INSERT INTO dominio_usuario (
        user_id, nivel_academico, dificultad,
        racha_dominio, bloque_aciertos, bloque_total, actualizado_en
    )
    VALUES (
        v_user_id, p_nivel_academico, p_dificultad,
        v_racha, v_bloque_aciertos, v_bloque_total, NOW()
    )
    ON CONFLICT (user_id, nivel_academico, dificultad)
    DO UPDATE SET
        racha_dominio = EXCLUDED.racha_dominio,
        bloque_aciertos = EXCLUDED.bloque_aciertos,
        bloque_total = EXCLUDED.bloque_total,
        actualizado_en = NOW();

    RETURN QUERY SELECT TRUE, v_saldo;

END;
$$;

GRANT
EXECUTE ON FUNCTION registrar_respuesta_pregunta (
    nivel_academico_tipo,
    dificultad_nivel,
    BOOLEAN
) TO authenticated;

COMMENT ON FUNCTION registrar_respuesta_pregunta (
    nivel_academico_tipo,
    dificultad_nivel,
    BOOLEAN
) IS
'Única función (junto con cobrar_entrada_pregunta_ronda) que mueve monedas del juego de Preguntas. Calcula el costo base desde recompensas_nivel, aplica el factor de dominio (mínimo 50%) SOLO a la recompensa por acierto, y actualiza el bloque deslizante de dominio en cada llamada -- por eso no es evadible abandonando la ronda. Incluye throttle de 600ms contra scripts.';

-- ============================================================
-- 8. REGISTRAR RONDA DE PREGUNTAS (SOLO ESTADÍSTICAS, SIN EFECTO
--    ECONÓMICO)
--
-- Tras el rediseño del punto 7, esta función YA NO mueve monedas ni
-- actualiza el dominio: ambos ya se resolvieron pregunta a pregunta en
-- registrar_respuesta_pregunta. Se limita a validar y registrar el
-- historial de la ronda (nivel_academico, dificultad, área, aciertos).
--
-- monedas_ganadas se reconstruye de forma EXACTA (no estimada) sumando
-- los últimos p_preguntas_total movimientos de monedas_historial con
-- motivo='respuesta_pregunta' y ref=nivel:dificultad para este usuario.
-- Esto es necesario porque, al coincidir el tamaño del bloque de dominio
-- (15) con el de la ronda (15), la racha de dominio puede haber
-- cambiado durante la propia ronda (justo en la última respuesta), por
-- lo que "correctas*recompensa_actual - incorrectas*costo_base" NO
-- siempre reproduce el neto real ya aplicado. El historial de
-- transacciones (monedas_historial) es la única fuente 100% fiel,
-- porque ya registra el delta real aplicado en cada respuesta.
-- ============================================================

DROP FUNCTION IF EXISTS registrar_ronda_preguntas (
    dificultad_nivel, VARCHAR(80), SMALLINT, SMALLINT, BIGINT
);
DROP FUNCTION IF EXISTS registrar_ronda_preguntas (
    nivel_academico_tipo, dificultad_nivel, VARCHAR(80), SMALLINT, SMALLINT, BIGINT
);

CREATE OR REPLACE FUNCTION registrar_ronda_preguntas(
    p_nivel_academico nivel_academico_tipo,
    p_dificultad dificultad_nivel,
    p_area VARCHAR(80),
    p_preguntas_total SMALLINT,
    p_correctas SMALLINT,
    p_monedas_ganadas BIGINT DEFAULT NULL
)
RETURNS TABLE (
    ok BOOLEAN,
    id BIGINT,
    monedas_ganadas BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_id BIGINT;
    v_neto_real BIGINT;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF p_area IS NULL OR LENGTH(TRIM(p_area)) = 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF p_preguntas_total IS NULL
       OR p_preguntas_total <= 0
       OR p_preguntas_total > 100 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF p_correctas IS NULL
       OR p_correctas < 0
       OR p_correctas > p_preguntas_total THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    -- Validar que la combinación exista (evita registrar basura si el
    -- cliente manda un enum inválido a otro nivel de la pila).
    IF NOT EXISTS (
        SELECT 1 FROM recompensas_nivel
        WHERE nivel_academico = p_nivel_academico AND dificultad = p_dificultad
    ) THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    -- Reconstrucción EXACTA del neto real ya aplicado por
    -- registrar_respuesta_pregunta, a partir del historial de
    -- transacciones (fuente de verdad económica).
    SELECT COALESCE(SUM(delta), 0)
    INTO v_neto_real
    FROM (
        SELECT delta
        FROM monedas_historial
        WHERE user_id = v_user_id
          AND motivo = 'respuesta_pregunta'
          AND ref = p_nivel_academico::TEXT || ':' || p_dificultad::TEXT
        ORDER BY creado_en DESC
        LIMIT p_preguntas_total
    ) ultimas_respuestas;

    INSERT INTO rondas_preguntas (
        user_id, dificultad, area, preguntas_total, correctas,
        monedas_ganadas, nivel_academico
    )
    VALUES (
        v_user_id, p_dificultad, TRIM(p_area), p_preguntas_total, p_correctas,
        GREATEST(-1000, LEAST(1000, v_neto_real)), p_nivel_academico
    )
    RETURNING rondas_preguntas.id INTO v_id;

    RETURN QUERY SELECT TRUE, v_id, v_neto_real;

END;
$$;

GRANT
EXECUTE ON FUNCTION registrar_ronda_preguntas (
    nivel_academico_tipo,
    dificultad_nivel,
    VARCHAR(80),
    SMALLINT,
    SMALLINT,
    BIGINT
) TO authenticated;

COMMENT ON FUNCTION registrar_ronda_preguntas (
    nivel_academico_tipo,
    dificultad_nivel,
    VARCHAR(80),
    SMALLINT,
    SMALLINT,
    BIGINT
) IS
'Registra el historial de una ronda (estadística pura, sin mover monedas ni tocar el dominio: ambos ya se resolvieron en registrar_respuesta_pregunta). monedas_ganadas se reconstruye de forma exacta sumando los últimos preguntas_total movimientos de monedas_historial para esa combinación, no se recalcula de forma aproximada.';

-- ============================================================
-- 9. LECTURA DE DOMINIO PARA LA UI (mensaje "dominas este nivel")
-- Envuelve la lectura de dominio_usuario para el combo actual, evitando
-- que el cliente tenga que construir la consulta a mano y quedando
-- protegida por la misma política de solo-lectura-propia.
-- ============================================================

CREATE OR REPLACE FUNCTION obtener_dominio_actual(
    p_nivel_academico nivel_academico_tipo,
    p_dificultad dificultad_nivel
)
RETURNS TABLE (
    racha_dominio SMALLINT,
    factor NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_racha SMALLINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT 0::SMALLINT, 1.0::NUMERIC;
        RETURN;
    END IF;

    SELECT d.racha_dominio INTO v_racha
    FROM dominio_usuario d
    WHERE d.user_id = v_user_id
      AND d.nivel_academico = p_nivel_academico
      AND d.dificultad = p_dificultad;

    v_racha := COALESCE(v_racha, 0);

    RETURN QUERY SELECT v_racha, GREATEST(0.5, 1 - 0.05 * v_racha)::NUMERIC;
END;
$$;

GRANT
EXECUTE ON FUNCTION obtener_dominio_actual (nivel_academico_tipo, dificultad_nivel) TO authenticated;

COMMENT ON FUNCTION obtener_dominio_actual (nivel_academico_tipo, dificultad_nivel) IS
'Lectura de conveniencia del dominio vigente del usuario autenticado para una combinación, usada por la UI para mostrar la vista previa de recompensa real y el mensaje de "dominas este nivel".';
