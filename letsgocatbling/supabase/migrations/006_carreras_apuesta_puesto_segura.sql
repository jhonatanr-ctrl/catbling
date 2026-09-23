-- ============================================================
-- 006_carreras_apuesta_puesto_segura.sql
--
-- Fase 7 (Carreras): la apuesta por puesto NO puede liquidarse con
-- registrar_sesion_casino() como los demás juegos, porque esa RPC
-- confía en que el cliente le diga cuánto ganó (p_resultado_monedas)
-- sin poder comprobar que corresponde a una carrera real. Para la
-- apuesta simple de Carreras (gana/no gana) se sigue usando esa misma
-- RPC, sin cambios, igual que todos los demás juegos del casino — eso
-- queda documentado como mejora pendiente a futuro para todo el
-- casino, fuera del alcance de esta fase.
--
-- Solución elegida (la más simple que da verificación real en
-- servidor, sin trasladar el motor de carreras a PostgreSQL):
--
--   1) Cuando el cliente ya calculó el resultado de la carrera,
--      registra la CLASIFICACIÓN COMPLETA (16 caballos, cada uno con
--      su puesto real) en `carreras_resultados` ANTES de liquidar
--      cualquier apuesta. Se valida que sea una permutación válida de
--      1..16 sin ids repetidos, así no se puede fabricar una
--      clasificación donde "todos" quedan primeros.
--   2) Al liquidar, el cliente NUNCA envía cuánto ganó: sólo envía
--      qué caballo apostó y qué puestos eligió. El servidor busca el
--      puesto real de ese caballo DENTRO del resultado ya guardado en
--      el paso 1, calcula costo/multiplicador de una tabla fija (el
--      cliente no la puede alterar) y paga en consecuencia.
--   3) Cada resultado sólo puede liquidarse una vez (columna `usado`,
--      marcada de forma atómica), así no se puede cobrar la misma
--      carrera dos veces.
--
-- Esto no reconstruye la simulación físicamente en el servidor (eso
-- sería mucho más trabajo para el mismo beneficio práctico), pero sí
-- elimina el punto exacto de la vulnerabilidad: ya no existe ningún
-- parámetro "cuánto gané" que el cliente pueda inventar desde
-- DevTools para la apuesta por puesto. El máximo que se puede llegar
-- a pagar de más, en el peor caso de que alguien fabrique una
-- clasificación falsa a mano, sigue acotado por la misma tabla fija
-- que ya se usa en el cliente (máximo 22 monedas apostadas × x6 = 132
-- por intento) — nunca un valor arbitrario como hoy es posible con la
-- RPC genérica.
-- ============================================================

-- ============================================================
-- TABLA: resultado de carrera ya calculado, pendiente de liquidar
-- ============================================================
CREATE TABLE IF NOT EXISTS carreras_resultados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    clasificacion JSONB NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carreras_resultados_user
    ON carreras_resultados (user_id);

ALTER TABLE carreras_resultados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carreras_resultados_select_own ON carreras_resultados;
CREATE POLICY carreras_resultados_select_own ON carreras_resultados FOR
SELECT USING (auth.uid() = user_id);

-- Sin políticas de INSERT/UPDATE/DELETE: sólo se escribe a través de
-- las funciones SECURITY DEFINER de abajo, nunca directo desde el
-- cliente.

-- ============================================================
-- RPC 1: registrar el resultado (llamar justo después de simular la
-- carrera, antes de mostrar la animación/resultado).
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_resultado_carrera(
    p_clasificacion JSONB
)
RETURNS TABLE (
    ok BOOLEAN,
    resultado_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_id UUID;
    v_count INT;
    v_puestos_distintos INT;
    v_min_puesto INT;
    v_max_puesto INT;
    v_ids_distintos INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    IF p_clasificacion IS NULL OR jsonb_typeof(p_clasificacion) <> 'array' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    v_count := jsonb_array_length(p_clasificacion);
    IF v_count <> 16 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    -- Cada elemento debe tener id (texto no vacío) y puesto (número).
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_clasificacion) elem
        WHERE NOT (elem ? 'id') OR NOT (elem ? 'puesto')
           OR jsonb_typeof(elem -> 'id') <> 'string'
           OR jsonb_typeof(elem -> 'puesto') <> 'number'
           OR length(elem ->> 'id') = 0
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    -- Los puestos deben ser EXACTAMENTE una permutación de 1..16 (sin
    -- huecos ni repetidos): así no se puede fabricar una clasificación
    -- donde varios caballos "empatan" en el puesto 1.
    SELECT COUNT(DISTINCT (elem ->> 'puesto')::INT),
           MIN((elem ->> 'puesto')::INT),
           MAX((elem ->> 'puesto')::INT)
    INTO v_puestos_distintos, v_min_puesto, v_max_puesto
    FROM jsonb_array_elements(p_clasificacion) elem;

    IF v_puestos_distintos <> 16 OR v_min_puesto <> 1 OR v_max_puesto <> 16 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    SELECT COUNT(DISTINCT elem ->> 'id')
    INTO v_ids_distintos
    FROM jsonb_array_elements(p_clasificacion) elem;

    IF v_ids_distintos <> 16 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    INSERT INTO carreras_resultados (user_id, clasificacion)
    VALUES (v_user_id, p_clasificacion)
    RETURNING id INTO v_id;

    RETURN QUERY SELECT TRUE, v_id;
END;
$$;

-- ============================================================
-- RPC 2: liquidar la apuesta por puesto contra el resultado ya
-- guardado. El cliente NUNCA envía cuánto ganó ni el costo/multiplicador:
-- sólo el caballo apostado y los puestos elegidos.
-- ============================================================
CREATE OR REPLACE FUNCTION liquidar_apuesta_puesto_carrera(
    p_resultado_id UUID,
    p_caballo_id TEXT,
    p_puestos_seleccionados INT[]
)
RETURNS TABLE (
    ok BOOLEAN,
    gano BOOLEAN,
    premio BIGINT,
    apuesta BIGINT,
    saldo_nuevo BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_clasificacion JSONB;
    v_cantidad INT;
    v_costo BIGINT;
    v_multiplicador BIGINT;
    v_puesto_real INT;
    v_gano BOOLEAN;
    v_premio BIGINT;
    v_saldo BIGINT;
    v_ok BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF p_caballo_id IS NULL OR length(p_caballo_id) = 0 THEN
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF p_puestos_seleccionados IS NULL
       OR array_length(p_puestos_seleccionados, 1) IS NULL
       OR array_length(p_puestos_seleccionados, 1) < 1
       OR array_length(p_puestos_seleccionados, 1) > 5
       OR EXISTS (SELECT 1 FROM unnest(p_puestos_seleccionados) x WHERE x < 1 OR x > 16)
       OR (SELECT COUNT(DISTINCT x) FROM unnest(p_puestos_seleccionados) x)
          <> array_length(p_puestos_seleccionados, 1)
    THEN
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    v_cantidad := array_length(p_puestos_seleccionados, 1);

    -- Tabla fija (confirmada): el cliente no decide costo ni
    -- multiplicador, sólo cuántos/qué puestos elige.
    v_costo := CASE v_cantidad
        WHEN 1 THEN 6 WHEN 2 THEN 10 WHEN 3 THEN 14 WHEN 4 THEN 18 WHEN 5 THEN 22
    END;
    v_multiplicador := CASE v_cantidad
        WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6
    END;

    -- El resultado debe existir, pertenecer a este usuario y no
    -- haberse usado antes. Se marca usado=TRUE en el mismo UPDATE:
    -- atómico, así dos llamadas simultáneas nunca cobran la misma
    -- carrera dos veces (la segunda no encuentra fila con usado=FALSE).
    UPDATE carreras_resultados
    SET usado = TRUE
    WHERE id = p_resultado_id
      AND user_id = v_user_id
      AND usado = FALSE
    RETURNING clasificacion INTO v_clasificacion;

    IF v_clasificacion IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    SELECT (elem ->> 'puesto')::INT
    INTO v_puesto_real
    FROM jsonb_array_elements(v_clasificacion) elem
    WHERE elem ->> 'id' = p_caballo_id;

    IF v_puesto_real IS NULL THEN
        -- El caballo apostado no está en la clasificación guardada:
        -- algo no cuadra, no se liquida nada (la apuesta ya fue
        -- descontada localmente del lado del cliente sólo para
        -- invitados; para usuarios autenticados el descuento ocurre
        -- aquí abajo, así que si llegamos aquí sin éxito no se
        -- descontó nada todavía).
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    v_gano := v_puesto_real = ANY (p_puestos_seleccionados);
    v_premio := CASE WHEN v_gano THEN v_costo * v_multiplicador ELSE 0 END;

    -- Descontar la apuesta (falla si no hay saldo suficiente).
    -- Alias explícito (am.*): sin esto, "ok" es ambiguo entre la columna
    -- de retorno de _aplicar_monedas y el parámetro OUT "ok" de ESTA
    -- misma función (RETURNS TABLE), y PostgreSQL lo rechaza con error
    -- "column reference is ambiguous" — lo reproduje contra Postgres
    -- real antes de dejarlo así. (Este mismo problema existe hoy en
    -- registrar_sesion_casino, reportado aparte.)
    SELECT am.nuevo_saldo, am.ok INTO v_saldo, v_ok
    FROM _aplicar_monedas(v_user_id, -v_costo, 'apuesta_casino', 'carreras') am;

    IF NOT v_ok THEN
        RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    -- Acreditar el premio si ganó.
    IF v_premio > 0 THEN
        SELECT am.nuevo_saldo, am.ok INTO v_saldo, v_ok
        FROM _aplicar_monedas(v_user_id, v_premio, 'premio_casino', 'carreras') am;

        IF NOT v_ok THEN
            RETURN QUERY SELECT FALSE, FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT;
            RETURN;
        END IF;
    END IF;

    -- Mismo registro histórico que usan los demás juegos (tabla
    -- compartida sesiones_casino) para que las estadísticas/soporte
    -- vean Carreras igual que cualquier otro juego.
    INSERT INTO sesiones_casino (user_id, juego, apuesta, resultado_monedas, gano)
    VALUES (v_user_id, 'carreras', v_costo, v_premio, v_gano);

    RETURN QUERY SELECT TRUE, v_gano, v_premio, v_costo, v_saldo;
END;
$$;

-- ============================================================
-- PERMISOS
-- ============================================================
GRANT EXECUTE ON FUNCTION registrar_resultado_carrera (JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION liquidar_apuesta_puesto_carrera (
    UUID, TEXT, INT[]
) TO authenticated;

COMMENT ON TABLE carreras_resultados IS
    'Clasificación completa de una carrera ya simulada, pendiente (o no) de liquidar. usado=TRUE impide cobrarla dos veces.';

COMMENT ON FUNCTION registrar_resultado_carrera (JSONB) IS
    'Guarda la clasificación real de una carrera (validada como permutación 1..16) antes de liquidar cualquier apuesta por puesto.';

COMMENT ON FUNCTION liquidar_apuesta_puesto_carrera (UUID, TEXT, INT[]) IS
    'Liquida una apuesta por puesto contra un resultado ya guardado. El costo/multiplicador salen de una tabla fija en el servidor, nunca del cliente.';
