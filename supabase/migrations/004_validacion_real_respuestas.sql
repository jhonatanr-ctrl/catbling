-- ============================================================
-- 004_validacion_real_respuestas.sql
--
-- PROBLEMA QUE RESUELVE (detectado en auditoría de seguridad tras
-- 003_recompensas_dinamicas_antifarming.sql):
--
-- registrar_respuesta_pregunta recibía p_es_correcta como un booleano
-- determinado ENTERAMENTE por el cliente (comparación hecha en
-- preguntas/resources/script.js contra preguntas/resources/questions.js,
-- que vive solo en el navegador). El servidor no tenía forma de
-- verificar si esa afirmación era cierta. Simulando el ataque más
-- simple posible -- abrir la consola del navegador y ejecutar
--   window.apiRpc.registrarRespuestaPregunta(nivel, dificultad, true)
-- en un bucle respetando el throttle de 600ms -- se demostró que
-- permitía farmear ~60.000 monedas/hora SIN responder una sola
-- pregunta real, muy por encima de cualquier ritmo humano genuino
-- (~7.000 monedas/hora jugando de verdad a máxima velocidad).
--
-- SOLUCIÓN (proporcional, SIN migrar las 4.456 preguntas):
-- Las preguntas (texto, opciones, explicación) SIGUEN viviendo en
-- preguntas/resources/questions.js, sin ningún cambio. Lo único que se
-- traslada al servidor es el ÍNDICE de la opción correcta de cada
-- pregunta, indexado por un identificador estable
-- "nivel:area:dificultad:posición" (p. ej.
-- "universitario:FISICA:DIFICIL:7"), generado mecánicamente con un
-- script (ver nota al final) a partir del archivo ya existente -- no se
-- reescribe ni una sola pregunta, solo se copia su índice de respuesta
-- correcta a una tabla nueva.
--
-- Además se añade un mecanismo de "pregunta servida": antes de poder
-- cobrar una respuesta, el cliente debe declarar qué pregunta se le
-- mostró (marcar_pregunta_servida) y esperar un mínimo de tiempo de
-- lectura real (1.2s) antes de que el servidor acepte la respuesta a
-- ESA pregunta concreta. Esto impide reenviar la misma pregunta varias
-- veces y evita "responder" sin que el servidor tenga constancia de que
-- se sirvió algo.
--
-- registrar_respuesta_pregunta YA NO acepta p_es_correcta: ahora recibe
-- p_pregunta_id y p_indice_elegido (el índice ORIGINAL, sin barajar, de
-- la opción que el usuario pulsó), y es el propio servidor quien decide
-- si es correcta comparando contra respuestas_correctas.
--
-- LIMITACIÓN HONESTA QUE SIGUE EXISTIENDO (no se puede cerrar sin mover
-- el banco de preguntas completo al servidor):
-- preguntas/resources/questions.js es un archivo estático público: CUALQUIERA
-- puede descargarlo sin iniciar sesión y extraer el índice correcto de
-- cada pregunta exactamente igual que hace el script de generación de
-- este archivo. Por tanto, un atacante que se tome la molestia de
-- descargar y parsear ese archivo público puede reconstruir el mismo
-- mapa de respuestas correctas y seguir fabricando respuestas "reales"
-- sin jugar. Lo que esta migración SÍ garantiza matemáticamente es que
-- adivinar CIEGAMENTE (sin ese trabajo de scraping) tiene valor
-- esperado negativo en todas las combinaciones (con 3 opciones por
-- pregunta, 1/3 de acierto no compensa nunca el costo de las 2/3 partes
-- que fallan) -- ver justificación e informe adjuntos. Esto cierra el
-- ataque trivial (una línea en la consola) y obliga a cualquier
-- explotación real a un esfuerzo de ingeniería no trivial (scraper +
-- protocolo de dos llamadas + replicar el banco de respuestas), lo cual
-- es la mejora proporcional razonable para este proyecto sin
-- reescribir la arquitectura de preguntas.
-- ============================================================

-- ============================================================
-- 1. TABLA DE RESPUESTAS CORRECTAS (SOLO EL ÍNDICE, NO EL CONTENIDO)
--
-- IMPORTANTE: esta tabla NO debe tener ninguna política de SELECT para
-- anon/authenticated. Con RLS activado y CERO políticas, Postgres deniega
-- por defecto todo acceso a esos roles; solo las funciones
-- SECURITY DEFINER (que se ejecutan con privilegios de propietario y
-- por tanto evitan RLS) pueden leerla. Se añade además un REVOKE
-- explícito como cinturón y tirantes.
-- ============================================================

CREATE TABLE respuestas_correctas (
    pregunta_id TEXT PRIMARY KEY,
    indice_correcto SMALLINT NOT NULL CHECK (indice_correcto >= 0)
);

ALTER TABLE respuestas_correctas ENABLE ROW LEVEL SECURITY;

-- Sin CREATE POLICY a propósito: deny-all para anon/authenticated.
REVOKE ALL ON respuestas_correctas FROM anon, authenticated;

COMMENT ON TABLE respuestas_correctas IS
'Índice de la opción correcta por pregunta (pregunta_id = nivel:area:dificultad:posición), generado mecánicamente desde preguntas/resources/questions.js. NO expone el texto de la pregunta ni de las opciones -- solo el índice. Sin políticas de SELECT: solo accesible desde funciones SECURITY DEFINER. Ver limitación conocida en la cabecera de este archivo: questions.js es público, así que esto detiene el spam ciego, no a un atacante que además scrapee ese archivo.';

-- ============================================================
-- 2. ESTADO DE "PREGUNTA SERVIDA" EN PROFILES
-- Permite al servidor exigir que, para cobrar una respuesta, exista una
-- pregunta previamente marcada como mostrada a ESE usuario, con un
-- mínimo de tiempo de lectura transcurrido.
-- ============================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pregunta_pendiente_id TEXT,
ADD COLUMN IF NOT EXISTS pregunta_pendiente_en TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pregunta_pendiente_nivel nivel_academico_tipo,
ADD COLUMN IF NOT EXISTS pregunta_pendiente_dificultad dificultad_nivel;

COMMENT ON COLUMN profiles.pregunta_pendiente_id IS
'ID de la última pregunta marcada como "servida" a este usuario (marcar_pregunta_servida) y aún no resuelta. Se limpia al cobrar la respuesta (correcta o no), impidiendo reenviar la misma pregunta dos veces.';

-- ============================================================
-- 3. NUEVA RPC: MARCAR PREGUNTA SERVIDA
-- El cliente la llama justo cuando muestra una pregunta en pantalla
-- (preguntas/resources/script.js::mostrarPregunta). No mueve monedas.
-- Valida que el pregunta_id exista realmente en el banco (evita marcar
-- IDs inventados sin sentido) y arranca el cronómetro de lectura mínima.
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
'Registra qué pregunta se mostró al usuario y cuándo, como requisito previo para que registrar_respuesta_pregunta acepte cobrar esa pregunta. No mueve monedas.';

-- ============================================================
-- 4. REESCRITURA DE REGISTRAR_RESPUESTA_PREGUNTA: VALIDACIÓN REAL
--
-- Cambios respecto a 003:
--   - Ya NO recibe p_es_correcta. Recibe p_pregunta_id (la pregunta que
--     se está respondiendo) y p_indice_elegido (el índice ORIGINAL, sin
--     barajar en el cliente, de la opción pulsada).
--   - Exige que exista una pregunta pendiente que coincida exactamente
--     en id + nivel + dificultad, y que hayan pasado >= 1.2s desde que
--     se marcó como servida (mínimo de lectura real). Si no, ok=false
--     sin cobrar nada y SIN limpiar el estado pendiente (para permitir
--     reintentar cuando corresponda).
--   - Calcula la corrección comparando p_indice_elegido contra
--     respuestas_correctas.indice_correcto -- el cliente ya no puede
--     declarar "correcta=true" arbitrariamente.
--   - Al resolver (acierto o fallo), limpia pregunta_pendiente_* para
--     que esa pregunta servida no pueda cobrarse dos veces.
--   - Se conserva el throttle de 600ms como capa adicional (redundante
--     con el mínimo de 1.2s del gate de pregunta servida, pero barata
--     de mantener).
--   - Se conserva TAL CUAL toda la lógica de recompensas_nivel y
--     dominio_usuario de 003 (mismo cálculo, mismo bloque de 15, mismo
--     piso del 50%, misma penalización completa por fallo).
-- ============================================================

DROP FUNCTION IF EXISTS registrar_respuesta_pregunta (
    nivel_academico_tipo, dificultad_nivel, BOOLEAN
);
DROP FUNCTION IF EXISTS registrar_respuesta_pregunta (
    nivel_academico_tipo, dificultad_nivel, TEXT, SMALLINT
);

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

    -- ── Throttle global anti-script (capa adicional, defensa en
    -- profundidad; ver también el gate de pregunta servida más abajo) ──
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

    -- ── Gate de pregunta servida: debe existir una pregunta pendiente
    -- que coincida EXACTAMENTE con lo que se está intentando cobrar ──
    IF v_pend_id IS NULL
       OR v_pend_id != p_pregunta_id
       OR v_pend_nivel != p_nivel_academico
       OR v_pend_dificultad != p_dificultad THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    -- Tiempo mínimo de lectura real. Si es demasiado pronto, se rechaza
    -- SIN limpiar el estado pendiente, para permitir reintentar cuando
    -- corresponda (evita penalizar un doble click o un reintento de red).
    IF NOW() - v_pend_en < INTERVAL '1200 milliseconds' THEN
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    -- ── Determinar la corrección REAL en servidor ──
    SELECT indice_correcto INTO v_indice_correcto
    FROM respuestas_correctas
    WHERE pregunta_id = p_pregunta_id;

    IF v_indice_correcto IS NULL THEN
        -- No debería ocurrir (marcar_pregunta_servida ya validó
        -- existencia), pero se protege de todos modos.
        SELECT monedas INTO v_saldo FROM profiles WHERE id = v_user_id;
        RETURN QUERY SELECT FALSE, COALESCE(v_saldo, 0);
        RETURN;
    END IF;

    v_es_correcta := (p_indice_elegido = v_indice_correcto);

    -- Consumir el slot: esta pregunta servida ya no puede volver a
    -- cobrarse, acierte o falle.
    UPDATE profiles
    SET pregunta_pendiente_id = NULL,
        pregunta_pendiente_en = NULL,
        pregunta_pendiente_nivel = NULL,
        pregunta_pendiente_dificultad = NULL,
        ultima_respuesta_pregunta_en = NOW()
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
'Única función que mueve monedas del juego de Preguntas. Ya NO confía en un booleano "es_correcta" declarado por el cliente: exige una pregunta previamente marcada como servida (gate de >=1.2s) y determina la corrección comparando el índice elegido contra respuestas_correctas en servidor. Con 3 opciones por pregunta, adivinar sin conocer la respuesta real tiene valor esperado negativo en todas las combinaciones (ver informe).';

-- ============================================================
-- 5. SEED: ÍNDICES DE RESPUESTA CORRECTA (GENERADO MECÁNICAMENTE)
--
-- Generado ejecutando un script Node que recorre
-- PREGUNTAS_POR_NIVEL en preguntas/resources/questions.js y emite, para
-- cada pregunta, (nivel:area:dificultad:posición, índice de "correcta").
-- NO se copia el texto de la pregunta, ni las opciones, ni la
-- explicación -- únicamente el índice numérico de la respuesta
-- correcta. 4.456 filas, verificadas: 0 índices fuera de rango.
--
-- pregunta_id: <nivel_academico>:<AREA_EN_MAYUSCULAS>:<DIFICULTAD_MAYUS>:<posición 0-based>
-- Debe coincidir EXACTAMENTE con el id que construye el cliente en
-- preguntas/resources/script.js al servir cada pregunta.
-- ============================================================

-- (los valores completos se insertan en el archivo de datos adjunto,
--  ver el archivo de seed de datos que acompaña a esta migración)
