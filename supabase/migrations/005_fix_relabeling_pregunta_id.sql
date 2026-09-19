-- ============================================================
-- 005_fix_relabeling_pregunta_id.sql
--
-- VULNERABILIDAD CRÍTICA DETECTADA EN AUDITORÍA ADVERSARIAL:
--
-- marcar_pregunta_servida(p_nivel_academico, p_dificultad, p_pregunta_id)
-- solo comprobaba que p_pregunta_id EXISTIERA en respuestas_correctas,
-- pero NUNCA verificaba que el nivel/dificultad incrustados en ese
-- mismo pregunta_id (formato "nivel:AREA:DIFICULTAD:posición")
-- coincidieran con los parámetros p_nivel_academico/p_dificultad
-- declarados en la MISMA llamada.
--
-- Esto permitía "blanquear" cualquier pregunta trivial de primaria a
-- través de la tarifa más cara del juego:
--
--   marcar_pregunta_servida('universitario', 'dificil',
--                            'primariaBasica:SOCIALES:FACIL:0')
--   -- se acepta: el ID EXISTE, aunque pertenece a otro nivel/dificultad
--   espera 1.2s
--   registrar_respuesta_pregunta('universitario', 'dificil',
--                                 'primariaBasica:SOCIALES:FACIL:0', 0)
--   -- costo_base se calcula con (universitario, dificil) = 20 (la
--   -- tarifa MÁS CARA), pero la corrección se decide sobre una
--   -- pregunta de primaria trivial que el atacante conoce con
--   -- certeza absoluta.
--
-- Impacto medido: ~30.825 monedas/hora respondiendo preguntas de
-- primaria básica trivial, frente a 3.090 monedas/hora cobrando esas
-- mismas preguntas honestamente como primaria+fácil -- es decir, 10x
-- más rentable EXPLOTAR el mismo contenido trivial que jugarlo
-- honestamente, y más rentable incluso que responder contenido
-- universitario genuino. Esto anulaba por completo el objetivo de
-- 003/004 (que la recompensa refleje la dificultad real).
--
-- CORRECCIÓN:
-- marcar_pregunta_servida ahora valida que el nivel académico y la
-- dificultad incrustados en p_pregunta_id (primer y tercer segmento,
-- separados por ':') coincidan EXACTAMENTE con p_nivel_academico y
-- p_dificultad. Como el formato del ID es determinista y ya lo genera
-- el propio cliente (preguntas/resources/script.js), esta validación no
-- requiere ningún dato nuevo: solo interpreta el ID que ya existía.
-- ============================================================

CREATE OR REPLACE FUNCTION marcar_pregunta_servida(
    p_nivel_academico nivel_academico_tipo,
    p_dificultad dificultad_nivel,
    p_pregunta_id TEXT
)
RETURNS TABLE (
    ok BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_nivel_en_id TEXT;
    v_dificultad_en_id TEXT;
BEGIN

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    IF p_pregunta_id IS NULL
       OR LENGTH(p_pregunta_id) = 0
       OR LENGTH(p_pregunta_id) > 120 THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM respuestas_correctas WHERE pregunta_id = p_pregunta_id
    ) THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    -- ── Verificación anti-relabeling: el nivel/dificultad incrustados en
    -- el propio pregunta_id (formato nivel:AREA:DIFICULTAD:posición,
    -- generado de forma determinista por el cliente) deben coincidir
    -- EXACTAMENTE con los parámetros declarados. Sin esto, cualquier
    -- pregunta trivial podía "cobrarse" a la tarifa de la combinación
    -- más cara del juego. ──
    v_nivel_en_id := SPLIT_PART(p_pregunta_id, ':', 1);
    v_dificultad_en_id := SPLIT_PART(p_pregunta_id, ':', 3);

    IF v_nivel_en_id IS NULL
       OR v_dificultad_en_id IS NULL
       OR v_nivel_en_id = ''
       OR v_dificultad_en_id = ''
       OR v_nivel_en_id != p_nivel_academico::TEXT
       OR v_dificultad_en_id != UPPER(p_dificultad::TEXT) THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    UPDATE profiles
    SET pregunta_pendiente_id = p_pregunta_id,
        pregunta_pendiente_en = NOW(),
        pregunta_pendiente_nivel = p_nivel_academico,
        pregunta_pendiente_dificultad = p_dificultad
    WHERE id = v_user_id;

    RETURN QUERY SELECT TRUE;

END;
$$;

GRANT
EXECUTE ON FUNCTION marcar_pregunta_servida (
    nivel_academico_tipo, dificultad_nivel, TEXT
) TO authenticated;

COMMENT ON FUNCTION marcar_pregunta_servida (nivel_academico_tipo, dificultad_nivel, TEXT) IS
'Registra qué pregunta se mostró al usuario y cuándo. Valida que el nivel/dificultad incrustados en pregunta_id coincidan con los parámetros declarados (evita cobrar preguntas fáciles a la tarifa de una combinación más cara). No mueve monedas.';

-- ============================================================
-- NOTA: registrar_respuesta_pregunta (004) no necesita cambios. Su gate
-- ya exige que pregunta_pendiente_nivel/dificultad coincidan con los
-- parámetros de la llamada, y esos valores ahora solo pueden haberse
-- guardado si ya pasaron la verificación anti-relabeling de arriba.
-- ============================================================
