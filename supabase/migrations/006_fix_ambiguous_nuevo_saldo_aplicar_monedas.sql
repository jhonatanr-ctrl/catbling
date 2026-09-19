-- 006_fix_ambiguous_nuevo_saldo_aplicar_monedas.sql
--
-- Bug real detectado en producción tras aplicar 003/004: tanto
-- cobrar_entrada_pregunta_ronda como registrar_respuesta_pregunta
-- declaran RETURNS TABLE(ok boolean, nuevo_saldo bigint). En PL/pgSQL
-- esto crea automáticamente variables OUT llamadas "ok" y "nuevo_saldo"
-- visibles en TODO el cuerpo de la función. Como _aplicar_monedas()
-- también devuelve columnas llamadas "nuevo_saldo" y "ok", la sentencia
--   SELECT nuevo_saldo, ok INTO v_saldo, v_ok FROM _aplicar_monedas(...)
-- queda ambigua entre el parámetro OUT de la propia función y la columna
-- del resultado de _aplicar_monedas(), lo que Postgres rechaza con
-- "column reference \"nuevo_saldo\" is ambiguous" (HTTP 400 vía PostgREST).
--
-- Corrección mínima: calificar las columnas de _aplicar_monedas() con un
-- alias de tabla. No se toca ninguna otra línea, firma ni lógica de
-- negocio de ninguna de las dos funciones.

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

    SELECT am.nuevo_saldo, am.ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        -v_costo,
        'entrada_pregunta',
        p_dificultad::TEXT
    ) AS am;

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
'Cobra el costo de entrada de una ronda de preguntas según la dificultad (5/10/15), validado en servidor. Fix 006: columnas de _aplicar_monedas() calificadas con alias para evitar ambigüedad con los OUT params ok/nuevo_saldo.';

CREATE OR REPLACE FUNCTION registrar_respuesta_pregunta(
    p_nivel_academico nivel_academico_tipo,
    p_dificultad dificultad_nivel,
    p_pregunta_id TEXT,
    p_indice_elegido SMALLINT
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
    v_pend_id TEXT;
    v_pend_en TIMESTAMPTZ;
    v_pend_nivel nivel_academico_tipo;
    v_pend_dificultad dificultad_nivel;
    v_indice_correcto SMALLINT;
    v_es_correcta BOOLEAN;
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

    SELECT ultima_respuesta_pregunta_en,
           pregunta_pendiente_id, pregunta_pendiente_en,
           pregunta_pendiente_nivel, pregunta_pendiente_dificultad
    INTO v_ultima_respuesta,
         v_pend_id, v_pend_en, v_pend_nivel, v_pend_dificultad
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_ultima_respuesta IS NOT NULL
       AND NOW() - v_ultima_respuesta < INTERVAL '600 milliseconds' THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    IF v_pend_id IS NULL
       OR v_pend_id != p_pregunta_id
       OR v_pend_nivel != p_nivel_academico
       OR v_pend_dificultad != p_dificultad THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    IF NOW() - v_pend_en < INTERVAL '1200 milliseconds' THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    SELECT indice_correcto INTO v_indice_correcto
    FROM respuestas_correctas
    WHERE pregunta_id = p_pregunta_id;

    IF v_indice_correcto IS NULL THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    v_es_correcta := (p_indice_elegido = v_indice_correcto);

    UPDATE profiles
    SET pregunta_pendiente_id = NULL,
        pregunta_pendiente_en = NULL,
        pregunta_pendiente_nivel = NULL,
        pregunta_pendiente_dificultad = NULL,
        ultima_respuesta_pregunta_en = NOW()
    WHERE id = v_user_id;

    SELECT costo_pregunta
    INTO v_costo_base
    FROM recompensas_nivel
    WHERE nivel_academico = p_nivel_academico
      AND dificultad = p_dificultad;

    IF v_costo_base IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT;
        RETURN;
    END IF;

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

    IF v_actualizado_en IS NOT NULL THEN
        v_horas_inactivo := EXTRACT(EPOCH FROM (NOW() - v_actualizado_en)) / 3600.0;
        IF v_horas_inactivo >= 24 THEN
            v_racha := GREATEST(0, v_racha - (FLOOR(v_horas_inactivo / 24) * 2)::SMALLINT);
        END IF;
    END IF;

    IF v_es_correcta THEN
        v_factor := GREATEST(0.5, 1 - 0.05 * v_racha);
        v_delta := GREATEST(1, ROUND(v_costo_base * v_factor));
    ELSE
        v_delta := -v_costo_base;
    END IF;

    SELECT am.nuevo_saldo, am.ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(
        v_user_id,
        v_delta,
        'respuesta_pregunta',
        p_nivel_academico::TEXT || ':' || p_dificultad::TEXT
    ) AS am;

    IF NOT v_ok THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    v_bloque_total := v_bloque_total + 1;
    IF v_es_correcta THEN
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
    TEXT,
    SMALLINT
) TO authenticated;

COMMENT ON FUNCTION registrar_respuesta_pregunta (
    nivel_academico_tipo,
    dificultad_nivel,
    TEXT,
    SMALLINT
) IS
'Única función que mueve monedas del juego de Preguntas. Fix 006: columnas de _aplicar_monedas() calificadas con alias para evitar ambigüedad con los OUT params ok/nuevo_saldo.';

NOTIFY pgrst, 'reload schema';
