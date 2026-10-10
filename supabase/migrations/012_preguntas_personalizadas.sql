-- 012_preguntas_personalizadas.sql
--
-- Preguntas personalizadas generadas con IA a partir de documentos del usuario.
--
-- PRINCIPIOS (ver informe):
--   * El servidor es la única autoridad sobre el saldo: el cliente NUNCA envía
--     cuánto gana o pierde. Sólo envía "qué opción elegí" (0..2).
--   * Todas las mutaciones pasan por RPC SECURITY DEFINER que reutilizan
--     _aplicar_monedas() (atómica, rechaza saldos negativos, deja rastro en
--     monedas_historial). No se modifica ninguna función existente.
--   * La entrada se cobra UNA vez (doc_iniciar_examen, con la fila de la sesión
--     bloqueada FOR UPDATE: dos pestañas / doble clic no pueden cobrar dos veces).
--   * Cada respuesta se procesa UNA vez (PK (sesion_id, pregunta_id) + bloqueo).
--   * Las respuestas correctas viven en una tabla sin acceso para el cliente
--     (como respuestas_correctas) y sólo se revelan DESPUÉS de contestar.
--   * Las tablas nuevas tienen RLS, sin privilegios de escritura para el cliente.
--
-- DECISIÓN DE ECONOMÍA (documentada): profiles.monedas tiene CHECK (>= 0) y el
-- proyecto no admite saldos negativos. Si el jugador falla con menos de 10
-- monedas, la penalización aplicada es LEAST(10, saldo) (nunca negativa) y el
-- examen continúa; la penalización nominal (10) y la aplicada se registran por
-- separado para que el resumen sea honesto.
--
-- Tarifas (spec): fácil 15/+5, normal 25/+10, difícil 30/+15, fallo −10.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tablas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.documento_sesiones (
    id                    UUID PRIMARY KEY,   -- lo genera el cliente: creación idempotente
    user_id               UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    nombre_original       TEXT NOT NULL CHECK (char_length(nombre_original) BETWEEN 1 AND 200),
    formato               TEXT NOT NULL CHECK (formato IN ('pdf', 'docx', 'txt')),
    tamano_bytes          INTEGER NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 10485760),
    -- Documento ORIGINAL en Storage (bucket privado). NULL si no se conserva.
    storage_path          TEXT,
    -- Texto EXTRAÍDO (lo que recibe la IA). Sólo accesible vía RPC.
    texto_extraido        TEXT,
    texto_chars           INTEGER,
    paginas               INTEGER,
    estado                TEXT NOT NULL DEFAULT 'cargando'
                          CHECK (estado IN ('cargando', 'procesando', 'listo', 'en_curso', 'finalizado', 'error')),
    error_codigo          TEXT,
    intentos_proc         SMALLINT NOT NULL DEFAULT 0,
    -- Dificultad elegida al iniciar el examen.
    dificultad            public.dificultad_nivel,
    -- Generación de preguntas (puede repetirse mientras estado = 'listo').
    gen_dificultad        public.dificultad_nivel,
    gen_modelo            TEXT,
    gen_desde             TIMESTAMPTZ,        -- generación en curso desde...
    gen_intentos          SMALLINT NOT NULL DEFAULT 0,
    gen_ultimo_en         TIMESTAMPTZ,
    gen_error_codigo      TEXT,
    num_preguntas         SMALLINT NOT NULL DEFAULT 0 CHECK (num_preguntas IN (0, 15)),
    -- Economía (instantánea al iniciar el examen).
    coste_entrada         INTEGER,
    recompensa_acierto    INTEGER,
    penalizacion_fallo    INTEGER,
    entrada_cobrada_en    TIMESTAMPTZ,
    -- Progreso y resultados.
    respondidas           SMALLINT NOT NULL DEFAULT 0 CHECK (respondidas BETWEEN 0 AND 15),
    correctas             SMALLINT NOT NULL DEFAULT 0,
    incorrectas           SMALLINT NOT NULL DEFAULT 0,
    recompensas_total     BIGINT NOT NULL DEFAULT 0,
    penalizaciones_total  BIGINT NOT NULL DEFAULT 0,   -- realmente aplicadas (>= 0)
    neto                  BIGINT,
    saldo_final           BIGINT,
    iniciada_en           TIMESTAMPTZ,
    finalizada_en         TIMESTAMPTZ,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT doc_ses_progreso_coherente CHECK (correctas + incorrectas = respondidas),
    -- Un examen sólo existe si su entrada fue cobrada y tiene 15 preguntas.
    CONSTRAINT doc_ses_en_curso_pagado CHECK (
        estado NOT IN ('en_curso', 'finalizado')
        OR (coste_entrada IS NOT NULL AND entrada_cobrada_en IS NOT NULL
            AND dificultad IS NOT NULL AND num_preguntas = 15)
    ),
    CONSTRAINT doc_ses_finalizado_completo CHECK (
        estado <> 'finalizado' OR (respondidas = 15 AND finalizada_en IS NOT NULL)
    ),
    CONSTRAINT doc_ses_listo_con_texto CHECK (
        estado NOT IN ('listo', 'en_curso', 'finalizado') OR texto_extraido IS NOT NULL
    )
);

CREATE INDEX idx_doc_ses_user_creado ON public.documento_sesiones (user_id, creado_en DESC);

CREATE TABLE public.documento_preguntas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id        UUID NOT NULL REFERENCES public.documento_sesiones (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    orden            SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 15),
    enunciado        TEXT NOT NULL CHECK (char_length(enunciado) BETWEEN 5 AND 600),
    opciones         JSONB NOT NULL CHECK (jsonb_typeof(opciones) = 'array' AND jsonb_array_length(opciones) = 3),
    indice_correcto  SMALLINT NOT NULL CHECK (indice_correcto BETWEEN 0 AND 2),
    explicacion      TEXT NOT NULL CHECK (char_length(explicacion) BETWEEN 1 AND 1200),
    referencia       TEXT CHECK (referencia IS NULL OR char_length(referencia) <= 400),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sesion_id, orden)
);

CREATE TABLE public.documento_respuestas (
    sesion_id        UUID NOT NULL REFERENCES public.documento_sesiones (id) ON DELETE CASCADE,
    pregunta_id      UUID NOT NULL REFERENCES public.documento_preguntas (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    indice_elegido   SMALLINT NOT NULL CHECK (indice_elegido BETWEEN 0 AND 2),
    es_correcta      BOOLEAN NOT NULL,
    delta_nominal    INTEGER NOT NULL,   -- +recompensa / −10
    delta_aplicado   INTEGER NOT NULL,   -- lo que realmente se movió en el saldo
    saldo_nuevo      BIGINT NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sesion_id, pregunta_id)  -- una respuesta por pregunta, una sola vez
);

-- Registro de reservas de generación (límite por usuario y hora).
CREATE TABLE public.documento_generaciones (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    sesion_id  UUID,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_doc_gen_user_creado ON public.documento_generaciones (user_id, creado_en DESC);

CREATE OR REPLACE FUNCTION public._doc_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_doc_ses_touch BEFORE UPDATE ON public.documento_sesiones
    FOR EACH ROW EXECUTE FUNCTION public._doc_touch();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS y privilegios: el cliente no escribe NADA directamente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.documento_sesiones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_preguntas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_respuestas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_generaciones ENABLE ROW LEVEL SECURITY;

-- Defensa en profundidad: sin privilegios de tabla para anon/authenticated.
-- (El cliente accede únicamente mediante las RPC de abajo.)
REVOKE ALL ON public.documento_sesiones, public.documento_preguntas,
              public.documento_respuestas, public.documento_generaciones
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.documento_generaciones_id_seq FROM PUBLIC, anon, authenticated;

-- Políticas (propietario). Sin políticas de escritura. documento_preguntas y
-- documento_generaciones: deny-all a propósito (contienen la clave de respuestas
-- / datos internos).
CREATE POLICY doc_ses_select_own ON public.documento_sesiones
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY doc_resp_select_own ON public.documento_respuestas
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Utilidades internas (no expuestas)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._doc_coste(p_dif public.dificultad_nivel)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_dif WHEN 'facil' THEN 15 WHEN 'normal' THEN 25 WHEN 'dificil' THEN 30 END
$$;

CREATE OR REPLACE FUNCTION public._doc_recompensa(p_dif public.dificultad_nivel)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_dif WHEN 'facil' THEN 5 WHEN 'normal' THEN 10 WHEN 'dificil' THEN 15 END
$$;

CREATE OR REPLACE FUNCTION public._doc_penalizacion()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 10 $$;

-- Representación JSON de una sesión (nunca incluye texto ni preguntas).
CREATE OR REPLACE FUNCTION public._doc_sesion_json(s public.documento_sesiones)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT jsonb_build_object(
        'id', s.id,
        'nombre', s.nombre_original,
        'formato', s.formato,
        'tamano_bytes', s.tamano_bytes,
        -- 'procesando' sin actividad >3 min = proceso caído: se muestra como error reintentable.
        'estado', CASE WHEN s.estado = 'procesando' AND s.actualizado_en < NOW() - INTERVAL '3 minutes'
                       THEN 'error' ELSE s.estado END,
        'error_codigo', CASE WHEN s.estado = 'procesando' AND s.actualizado_en < NOW() - INTERVAL '3 minutes'
                             THEN 'tiempo_agotado' ELSE s.error_codigo END,
        'puede_reintentar',
            (s.intentos_proc < 5 AND COALESCE(s.error_codigo, '') <> 'archivo_no_encontrado'
             AND (s.estado = 'error'
                  OR (s.estado = 'procesando' AND s.actualizado_en < NOW() - INTERVAL '3 minutes')
                  OR (s.estado = 'cargando' AND s.creado_en < NOW() - INTERVAL '2 minutes'))),
        'tiene_archivo', (s.storage_path IS NOT NULL AND COALESCE(s.error_codigo, '') <> 'archivo_no_encontrado'
                          AND s.estado <> 'cargando'),
        'dificultad', s.dificultad,
        'gen_dificultad', s.gen_dificultad,
        'num_preguntas', s.num_preguntas,
        'preguntas_listas', (s.num_preguntas = 15),
        'generando', (s.gen_desde IS NOT NULL AND NOW() - s.gen_desde < INTERVAL '90 seconds'),
        'gen_error_codigo', s.gen_error_codigo,
        'respondidas', s.respondidas,
        'correctas', s.correctas,
        'incorrectas', s.incorrectas,
        'texto_chars', s.texto_chars,
        'paginas', s.paginas,
        'creado_en', s.creado_en,
        'iniciada_en', s.iniciada_en,
        'finalizada_en', s.finalizada_en,
        'resumen', CASE WHEN s.estado = 'finalizado' THEN jsonb_build_object(
            'correctas', s.correctas,
            'incorrectas', s.incorrectas,
            'total', s.num_preguntas,
            'porcentaje', ROUND(100.0 * s.correctas / NULLIF(s.num_preguntas, 0)),
            'recompensas', s.recompensas_total,
            'penalizaciones', s.penalizaciones_total,
            'penalizaciones_nominales', s.incorrectas * COALESCE(s.penalizacion_fallo, 0),
            'coste_entrada', s.coste_entrada,
            'neto', s.neto,
            'saldo_final', s.saldo_final,
            'dificultad', s.dificultad,
            'fecha', s.finalizada_en
        ) ELSE NULL END
    )
$$;

REVOKE ALL ON FUNCTION public._doc_coste(public.dificultad_nivel), public._doc_recompensa(public.dificultad_nivel),
    public._doc_penalizacion(), public._doc_sesion_json(public.documento_sesiones), public._doc_touch()
    FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC de CLIENTE (authenticated). Todas devuelven jsonb {ok, codigo, ...}
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 Crear sesión (idempotente por id). p_origen: "nuevo examen con este documento".
CREATE OR REPLACE FUNCTION public.doc_crear_sesion(
    p_id UUID, p_nombre TEXT, p_formato TEXT, p_tamano INTEGER, p_origen UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid      UUID := auth.uid();
    v_nombre   TEXT;
    v_path     TEXT;
    v_origen   public.documento_sesiones;
    v_existente public.documento_sesiones;
    v_filas    INTEGER;
    v_formato  TEXT := lower(COALESCE(p_formato, ''));
    v_tamano   INTEGER := p_tamano;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    IF p_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'datos_invalidos');
    END IF;

    -- Serializa por usuario: los límites de abajo no se saltan con peticiones paralelas.
    PERFORM pg_advisory_xact_lock(hashtextextended('doc_crear:' || v_uid::text, 0));

    -- Idempotencia: misma id del mismo usuario => devuelve la existente.
    SELECT * INTO v_existente FROM public.documento_sesiones d WHERE d.id = p_id;
    IF FOUND THEN
        IF v_existente.user_id <> v_uid THEN
            RETURN jsonb_build_object('ok', false, 'codigo', 'id_en_uso');
        END IF;
        RETURN jsonb_build_object('ok', true, 'codigo', 'existente',
            'storage_path', v_existente.storage_path, 'sesion', public._doc_sesion_json(v_existente));
    END IF;

    v_nombre := btrim(regexp_replace(COALESCE(p_nombre, ''), '[[:cntrl:]/\\]+', ' ', 'g'));
    IF p_origen IS NOT NULL THEN
        SELECT * INTO v_origen FROM public.documento_sesiones d
        WHERE d.id = p_origen AND d.user_id = v_uid;
        IF NOT FOUND OR v_origen.storage_path IS NULL
           OR v_origen.estado = 'cargando' OR COALESCE(v_origen.error_codigo, '') = 'archivo_no_encontrado' THEN
            RETURN jsonb_build_object('ok', false, 'codigo', 'origen_no_encontrado');
        END IF;
        v_nombre  := v_origen.nombre_original;
        v_formato := v_origen.formato;
        v_tamano  := v_origen.tamano_bytes;
    END IF;

    IF v_formato NOT IN ('pdf', 'docx', 'txt') THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'formato_no_soportado');
    END IF;
    IF v_tamano IS NULL OR v_tamano <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'archivo_vacio');
    END IF;
    IF v_tamano > 10485760 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'archivo_demasiado_grande');
    END IF;
    IF char_length(v_nombre) < 1 THEN
        v_nombre := 'documento.' || v_formato;
    END IF;
    v_nombre := left(v_nombre, 200);

    IF (SELECT count(*) FROM public.documento_sesiones d WHERE d.user_id = v_uid) >= 50 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'limite_sesiones');
    END IF;
    IF (SELECT count(*) FROM public.documento_sesiones d
        WHERE d.user_id = v_uid AND d.creado_en > NOW() - INTERVAL '1 hour') >= 10 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'limite_creacion');
    END IF;

    -- La ruta la decide el servidor (nunca el nombre del archivo del usuario).
    v_path := v_uid::text || '/' || p_id::text || '.' || v_formato;

    INSERT INTO public.documento_sesiones (id, user_id, nombre_original, formato, tamano_bytes, storage_path, estado)
    VALUES (p_id, v_uid, v_nombre, v_formato, v_tamano, v_path, 'cargando')
    ON CONFLICT (id) DO NOTHING;
    GET DIAGNOSTICS v_filas = ROW_COUNT;

    SELECT * INTO v_existente FROM public.documento_sesiones d WHERE d.id = p_id AND d.user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'id_en_uso');
    END IF;

    RETURN jsonb_build_object('ok', true,
        'codigo', CASE WHEN v_filas = 1 THEN 'creada' ELSE 'existente' END,
        'storage_path', v_existente.storage_path,
        'origen_storage_path', v_origen.storage_path,
        'sesion', public._doc_sesion_json(v_existente));
END;
$$;

-- 4.2 Historial
CREATE OR REPLACE FUNCTION public.doc_listar_sesiones()
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    RETURN jsonb_build_object('ok', true, 'sesiones', COALESCE((
        SELECT jsonb_agg(t.j ORDER BY t.ce DESC)
        FROM (SELECT public._doc_sesion_json(d) AS j, d.creado_en AS ce
              FROM public.documento_sesiones d WHERE d.user_id = v_uid
              ORDER BY d.creado_en DESC LIMIT 100) t
    ), '[]'::jsonb));
END;
$$;

-- 4.3 Una sesión
CREATE OR REPLACE FUNCTION public.doc_obtener_sesion(p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_s   public.documento_sesiones;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d WHERE d.id = p_id AND d.user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    RETURN jsonb_build_object('ok', true, 'sesion', public._doc_sesion_json(v_s));
END;
$$;

-- 4.4 Texto extraído (vista previa de DOCX/TXT)
CREATE OR REPLACE FUNCTION public.doc_obtener_texto(p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_s   public.documento_sesiones;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d WHERE d.id = p_id AND d.user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.texto_extraido IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'sin_texto');
    END IF;
    RETURN jsonb_build_object('ok', true, 'texto', v_s.texto_extraido, 'formato', v_s.formato,
                              'paginas', v_s.paginas);
END;
$$;

-- 4.5 INICIAR EXAMEN: cobra la entrada una sola vez.
CREATE OR REPLACE FUNCTION public.doc_iniciar_examen(p_id UUID, p_dificultad public.dificultad_nivel)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_s      public.documento_sesiones;
    v_coste  INTEGER;
    v_saldo  BIGINT;
    v_nuevo  BIGINT;
    v_ok     BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    IF p_dificultad IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'dificultad_invalida');
    END IF;

    -- Bloqueo de la sesión: serializa doble clic / varias pestañas.
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;

    -- Reanudar / recargar: NO vuelve a cobrar.
    IF v_s.estado IN ('en_curso', 'finalizado') THEN
        SELECT monedas INTO v_saldo FROM public.profiles pr WHERE pr.id = v_uid;
        RETURN jsonb_build_object('ok', true, 'codigo', 'ya_iniciada', 'cobrado', false,
            'saldo', COALESCE(v_saldo, 0), 'sesion', public._doc_sesion_json(v_s));
    END IF;
    IF v_s.estado <> 'listo' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'estado_invalido', 'estado', v_s.estado);
    END IF;
    IF v_s.num_preguntas <> 15 OR v_s.gen_dificultad IS DISTINCT FROM p_dificultad THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'preguntas_no_listas');
    END IF;

    IF (SELECT count(*) FROM public.documento_sesiones d
        WHERE d.user_id = v_uid AND d.entrada_cobrada_en > NOW() - INTERVAL '24 hours') >= 10 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'limite_diario');
    END IF;

    v_coste := public._doc_coste(p_dificultad);

    -- Bloquea el perfil: el saldo leído es el saldo contra el que se cobra.
    SELECT pr.monedas INTO v_saldo FROM public.profiles pr WHERE pr.id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'perfil_no_encontrado');
    END IF;
    IF v_saldo < v_coste THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'saldo_insuficiente',
            'saldo', v_saldo, 'coste', v_coste, 'faltan', v_coste - v_saldo);
    END IF;

    SELECT am.nuevo_saldo, am.ok INTO v_nuevo, v_ok
    FROM public._aplicar_monedas(v_uid, -v_coste, 'entrada_examen_personalizado', p_id::text) AS am;
    IF NOT v_ok THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'saldo_insuficiente',
            'saldo', v_saldo, 'coste', v_coste, 'faltan', GREATEST(v_coste - v_saldo, 0));
    END IF;

    UPDATE public.documento_sesiones d
    SET estado = 'en_curso',
        dificultad = p_dificultad,
        coste_entrada = v_coste,
        recompensa_acierto = public._doc_recompensa(p_dificultad),
        penalizacion_fallo = public._doc_penalizacion(),
        entrada_cobrada_en = NOW(),
        iniciada_en = NOW()
    WHERE d.id = p_id
    RETURNING * INTO v_s;

    RETURN jsonb_build_object('ok', true, 'codigo', 'iniciada', 'cobrado', true,
        'coste', v_coste, 'saldo', v_nuevo, 'sesion', public._doc_sesion_json(v_s));
END;
$$;

-- 4.6 Obtener el examen (preguntas SIN la clave de respuesta; las ya contestadas
--     incluyen resultado, para recuperar el progreso tras recargar).
CREATE OR REPLACE FUNCTION public.doc_obtener_examen(p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_s     public.documento_sesiones;
    v_saldo BIGINT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d WHERE d.id = p_id AND d.user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado NOT IN ('en_curso', 'finalizado') THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'examen_no_iniciado');
    END IF;
    SELECT monedas INTO v_saldo FROM public.profiles pr WHERE pr.id = v_uid;

    RETURN jsonb_build_object('ok', true,
        'sesion', public._doc_sesion_json(v_s),
        'saldo', COALESCE(v_saldo, 0),
        'recompensa_acierto', v_s.recompensa_acierto,
        'penalizacion_fallo', v_s.penalizacion_fallo,
        'coste_entrada', v_s.coste_entrada,
        'preguntas', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', q.id, 'orden', q.orden, 'enunciado', q.enunciado, 'opciones', q.opciones,
                    'respondida', (r.pregunta_id IS NOT NULL),
                    'elegido', r.indice_elegido,
                    'es_correcta', r.es_correcta,
                    'delta_aplicado', r.delta_aplicado,
                    -- La clave y la explicación SOLO existen si ya contestó.
                    'indice_correcto', CASE WHEN r.pregunta_id IS NOT NULL THEN q.indice_correcto END,
                    'explicacion', CASE WHEN r.pregunta_id IS NOT NULL THEN q.explicacion END,
                    'referencia', CASE WHEN r.pregunta_id IS NOT NULL THEN q.referencia END
                ) ORDER BY q.orden)
            FROM public.documento_preguntas q
            LEFT JOIN public.documento_respuestas r
                   ON r.pregunta_id = q.id AND r.sesion_id = q.sesion_id
            WHERE q.sesion_id = v_s.id AND q.user_id = v_uid
        ), '[]'::jsonb));
END;
$$;

-- 4.7 RESPONDER: cada pregunta se procesa una sola vez.
CREATE OR REPLACE FUNCTION public.doc_responder(p_id UUID, p_pregunta_id UUID, p_indice SMALLINT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_s       public.documento_sesiones;
    v_q       public.documento_preguntas;
    v_r       public.documento_respuestas;
    v_saldo   BIGINT;
    v_nuevo   BIGINT;
    v_ok      BOOLEAN;
    v_correcta BOOLEAN;
    v_nominal INTEGER;
    v_aplicado INTEGER;
    v_pen     BIGINT;
    v_fin     BOOLEAN := false;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;

    -- Bloqueo de la sesión: respuestas rápidas / varias pestañas se serializan.
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;

    -- La pregunta debe pertenecer a ESTA sesión y a ESTE usuario.
    SELECT * INTO v_q FROM public.documento_preguntas q
    WHERE q.id = p_pregunta_id AND q.sesion_id = p_id AND q.user_id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'pregunta_invalida');
    END IF;

    -- Ya respondida: devuelve el resultado guardado SIN mover monedas.
    SELECT * INTO v_r FROM public.documento_respuestas r
    WHERE r.sesion_id = p_id AND r.pregunta_id = p_pregunta_id;
    IF FOUND THEN
        RETURN jsonb_build_object('ok', true, 'codigo', 'repetida', 'repetida', true,
            'es_correcta', v_r.es_correcta, 'elegido', v_r.indice_elegido,
            'indice_correcto', v_q.indice_correcto, 'explicacion', v_q.explicacion,
            'referencia', v_q.referencia, 'delta_aplicado', v_r.delta_aplicado,
            'delta_nominal', v_r.delta_nominal, 'saldo', (SELECT monedas FROM public.profiles WHERE id = v_uid),
            'sesion', public._doc_sesion_json(v_s));
    END IF;

    IF v_s.estado <> 'en_curso' THEN
        RETURN jsonb_build_object('ok', false,
            'codigo', CASE WHEN v_s.estado = 'finalizado' THEN 'examen_finalizado' ELSE 'estado_invalido' END);
    END IF;
    IF p_indice IS NULL OR p_indice NOT BETWEEN 0 AND 2 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'indice_invalido');
    END IF;

    SELECT pr.monedas INTO v_saldo FROM public.profiles pr WHERE pr.id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'perfil_no_encontrado');
    END IF;

    v_correcta := (p_indice = v_q.indice_correcto);
    v_nuevo := v_saldo;

    IF v_correcta THEN
        v_nominal := v_s.recompensa_acierto;
        v_aplicado := v_nominal;
        SELECT am.nuevo_saldo, am.ok INTO v_nuevo, v_ok
        FROM public._aplicar_monedas(v_uid, v_aplicado, 'recompensa_examen_personalizado', p_id::text) AS am;
        IF NOT v_ok THEN
            RETURN jsonb_build_object('ok', false, 'codigo', 'error_economia');
        END IF;
    ELSE
        v_nominal := -v_s.penalizacion_fallo;
        -- Nunca saldo negativo: se aplica LEAST(penalización, saldo).
        v_pen := LEAST(v_s.penalizacion_fallo::bigint, v_saldo);
        v_aplicado := -v_pen;
        IF v_pen > 0 THEN
            SELECT am.nuevo_saldo, am.ok INTO v_nuevo, v_ok
            FROM public._aplicar_monedas(v_uid, -v_pen, 'penalizacion_examen_personalizado', p_id::text) AS am;
            IF NOT v_ok THEN
                RETURN jsonb_build_object('ok', false, 'codigo', 'error_economia');
            END IF;
        END IF;
    END IF;

    INSERT INTO public.documento_respuestas
        (sesion_id, pregunta_id, user_id, indice_elegido, es_correcta, delta_nominal, delta_aplicado, saldo_nuevo)
    VALUES (p_id, p_pregunta_id, v_uid, p_indice, v_correcta, v_nominal, v_aplicado, v_nuevo);

    v_fin := (v_s.respondidas + 1 >= v_s.num_preguntas);

    UPDATE public.documento_sesiones d
    SET respondidas = d.respondidas + 1,
        correctas = d.correctas + CASE WHEN v_correcta THEN 1 ELSE 0 END,
        incorrectas = d.incorrectas + CASE WHEN v_correcta THEN 0 ELSE 1 END,
        recompensas_total = d.recompensas_total + CASE WHEN v_correcta THEN v_aplicado ELSE 0 END,
        penalizaciones_total = d.penalizaciones_total + CASE WHEN v_correcta THEN 0 ELSE -v_aplicado END,
        estado = CASE WHEN v_fin THEN 'finalizado' ELSE d.estado END,
        finalizada_en = CASE WHEN v_fin THEN NOW() ELSE d.finalizada_en END,
        saldo_final = CASE WHEN v_fin THEN v_nuevo ELSE d.saldo_final END,
        neto = CASE WHEN v_fin
                    THEN (d.recompensas_total + CASE WHEN v_correcta THEN v_aplicado ELSE 0 END)
                       - (d.penalizaciones_total + CASE WHEN v_correcta THEN 0 ELSE -v_aplicado END)
                       - d.coste_entrada
                    ELSE d.neto END
    WHERE d.id = p_id
    RETURNING * INTO v_s;

    RETURN jsonb_build_object('ok', true, 'codigo', 'registrada', 'repetida', false,
        'es_correcta', v_correcta, 'elegido', p_indice,
        'indice_correcto', v_q.indice_correcto, 'explicacion', v_q.explicacion,
        'referencia', v_q.referencia,
        'delta_nominal', v_nominal, 'delta_aplicado', v_aplicado,
        'saldo', v_nuevo, 'finalizado', v_fin, 'sesion', public._doc_sesion_json(v_s));
END;
$$;

-- 4.8 Eliminar sesión (propiedad verificada). Devuelve la ruta del archivo para
--     que el cliente lo borre de Storage (política de borrado propia).
CREATE OR REPLACE FUNCTION public.doc_eliminar_sesion(p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_s   public.documento_sesiones;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado = 'en_curso' THEN
        -- La entrada ya se cobró: el examen debe terminarse (evita pérdidas accidentales).
        RETURN jsonb_build_object('ok', false, 'codigo', 'examen_en_curso');
    END IF;
    IF v_s.estado = 'procesando' AND v_s.actualizado_en > NOW() - INTERVAL '3 minutes' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'procesando');
    END IF;
    DELETE FROM public.documento_sesiones d WHERE d.id = p_id AND d.user_id = v_uid;
    RETURN jsonb_build_object('ok', true, 'codigo', 'eliminada', 'storage_path', v_s.storage_path);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC de SERVIDOR (sólo service_role; las llama la función serverless tras
--    verificar el JWT del usuario). Reciben p_user explícito.
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 Tomar la sesión para procesarla (evita procesamientos simultáneos).
CREATE OR REPLACE FUNCTION public.doc_svc_comenzar_procesamiento(p_user UUID, p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s public.documento_sesiones;
BEGIN
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = p_user FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado IN ('listo', 'en_curso', 'finalizado') THEN
        RETURN jsonb_build_object('ok', true, 'codigo', 'ya_procesada', 'sesion', public._doc_sesion_json(v_s));
    END IF;
    IF v_s.estado = 'procesando' AND v_s.actualizado_en > NOW() - INTERVAL '3 minutes' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'en_proceso');
    END IF;
    IF v_s.intentos_proc >= 5 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'demasiados_intentos');
    END IF;
    IF v_s.storage_path IS NULL OR COALESCE(v_s.error_codigo, '') = 'archivo_no_encontrado' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'archivo_no_encontrado');
    END IF;
    UPDATE public.documento_sesiones d
    SET estado = 'procesando', intentos_proc = d.intentos_proc + 1, error_codigo = NULL
    WHERE d.id = p_id;
    RETURN jsonb_build_object('ok', true, 'codigo', 'tomada', 'storage_path', v_s.storage_path,
        'formato', v_s.formato, 'tamano_bytes', v_s.tamano_bytes, 'nombre', v_s.nombre_original);
END;
$$;

-- 5.2 Guardar texto extraído => 'listo'.
CREATE OR REPLACE FUNCTION public.doc_svc_guardar_texto(p_user UUID, p_id UUID, p_texto TEXT, p_paginas INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s public.documento_sesiones;
BEGIN
    IF p_texto IS NULL OR char_length(btrim(p_texto)) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'sin_texto_extraible');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = p_user FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado <> 'procesando' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'estado_invalido');
    END IF;
    UPDATE public.documento_sesiones d
    SET estado = 'listo', texto_extraido = p_texto, texto_chars = char_length(p_texto),
        paginas = p_paginas, error_codigo = NULL
    WHERE d.id = p_id
    RETURNING * INTO v_s;
    RETURN jsonb_build_object('ok', true, 'codigo', 'lista', 'sesion', public._doc_sesion_json(v_s));
END;
$$;

-- 5.3 Marcar error de procesamiento (sólo desde 'procesando'/'cargando').
CREATE OR REPLACE FUNCTION public.doc_svc_marcar_error(p_user UUID, p_id UUID, p_codigo TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s public.documento_sesiones;
BEGIN
    UPDATE public.documento_sesiones d
    SET estado = 'error', error_codigo = left(COALESCE(p_codigo, 'error_interno'), 60)
    WHERE d.id = p_id AND d.user_id = p_user AND d.estado IN ('procesando', 'cargando')
    RETURNING * INTO v_s;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'estado_invalido');
    END IF;
    RETURN jsonb_build_object('ok', true, 'sesion', public._doc_sesion_json(v_s));
END;
$$;

-- 5.4 Reservar una generación de preguntas (límites + saldo ANTES de gastar cuota de IA).
CREATE OR REPLACE FUNCTION public.doc_svc_reservar_generacion(p_user UUID, p_id UUID, p_dificultad public.dificultad_nivel)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s     public.documento_sesiones;
    v_saldo BIGINT;
    v_coste INTEGER;
BEGIN
    IF p_dificultad IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'dificultad_invalida');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = p_user FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado IN ('en_curso', 'finalizado') THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'ya_iniciada');
    END IF;
    IF v_s.estado <> 'listo' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'estado_invalido', 'estado', v_s.estado);
    END IF;

    v_coste := public._doc_coste(p_dificultad);
    SELECT pr.monedas INTO v_saldo FROM public.profiles pr WHERE pr.id = p_user;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'perfil_no_encontrado');
    END IF;
    IF v_saldo < v_coste THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'saldo_insuficiente',
            'saldo', v_saldo, 'coste', v_coste, 'faltan', v_coste - v_saldo);
    END IF;

    -- Ya generadas con esta dificultad: no se vuelve a llamar a la IA.
    IF v_s.num_preguntas = 15 AND v_s.gen_dificultad = p_dificultad THEN
        RETURN jsonb_build_object('ok', true, 'codigo', 'ya_generadas', 'coste', v_coste, 'saldo', v_saldo,
            'sesion', public._doc_sesion_json(v_s));
    END IF;

    IF v_s.gen_desde IS NOT NULL AND NOW() - v_s.gen_desde < INTERVAL '90 seconds' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'generacion_en_curso');
    END IF;
    IF v_s.gen_ultimo_en IS NOT NULL AND NOW() - v_s.gen_ultimo_en < INTERVAL '5 seconds' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'demasiado_rapido');
    END IF;
    IF v_s.gen_intentos >= 8 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'demasiados_intentos');
    END IF;
    IF (SELECT count(*) FROM public.documento_generaciones g
        WHERE g.user_id = p_user AND g.creado_en > NOW() - INTERVAL '1 hour') >= 20 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'limite_generaciones');
    END IF;

    UPDATE public.documento_sesiones d
    SET gen_desde = NOW(), gen_ultimo_en = NOW(), gen_intentos = d.gen_intentos + 1, gen_error_codigo = NULL
    WHERE d.id = p_id;
    INSERT INTO public.documento_generaciones (user_id, sesion_id) VALUES (p_user, p_id);

    RETURN jsonb_build_object('ok', true, 'codigo', 'reservada', 'texto', v_s.texto_extraido,
        'nombre', v_s.nombre_original, 'coste', v_coste, 'saldo', v_saldo);
END;
$$;

-- 5.5 Guardar EXACTAMENTE 15 preguntas válidas (reemplaza las anteriores de la sesión).
CREATE OR REPLACE FUNCTION public.doc_svc_guardar_preguntas(
    p_user UUID, p_id UUID, p_dificultad public.dificultad_nivel, p_modelo TEXT, p_preguntas jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s   public.documento_sesiones;
    v_el  jsonb;
    v_i   INTEGER := 0;
    v_op  jsonb;
BEGIN
    IF p_preguntas IS NULL OR jsonb_typeof(p_preguntas) <> 'array' OR jsonb_array_length(p_preguntas) <> 15 THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'numero_preguntas_invalido');
    END IF;
    SELECT * INTO v_s FROM public.documento_sesiones d
    WHERE d.id = p_id AND d.user_id = p_user FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrada');
    END IF;
    IF v_s.estado <> 'listo' THEN
        RETURN jsonb_build_object('ok', false, 'codigo', 'estado_invalido');
    END IF;

    DELETE FROM public.documento_preguntas q WHERE q.sesion_id = p_id;
    FOR v_el IN SELECT * FROM jsonb_array_elements(p_preguntas) LOOP
        v_i := v_i + 1;
        v_op := v_el -> 'opciones';
        IF v_op IS NULL OR jsonb_typeof(v_op) <> 'array' OR jsonb_array_length(v_op) <> 3
           OR (v_el ->> 'indice_correcto') IS NULL
           OR (v_el ->> 'indice_correcto')::int NOT BETWEEN 0 AND 2 THEN
            RAISE EXCEPTION 'pregunta_invalida_%', v_i USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO public.documento_preguntas
            (sesion_id, user_id, orden, enunciado, opciones, indice_correcto, explicacion, referencia)
        VALUES (p_id, p_user, v_i, v_el ->> 'enunciado', v_op,
                (v_el ->> 'indice_correcto')::smallint, v_el ->> 'explicacion',
                NULLIF(v_el ->> 'referencia', ''));
    END LOOP;

    UPDATE public.documento_sesiones d
    SET num_preguntas = 15, gen_dificultad = p_dificultad, gen_modelo = left(p_modelo, 80),
        gen_desde = NULL, gen_error_codigo = NULL
    WHERE d.id = p_id
    RETURNING * INTO v_s;
    RETURN jsonb_build_object('ok', true, 'codigo', 'guardadas', 'sesion', public._doc_sesion_json(v_s));
EXCEPTION WHEN SQLSTATE 'P0001' OR check_violation OR not_null_violation THEN
    -- El bloque entero (incluido el DELETE) se revierte: no quedan preguntas a medias.
    RETURN jsonb_build_object('ok', false, 'codigo', 'pregunta_invalida');
END;
$$;

-- 5.6 Liberar la reserva si la generación falló (la sesión sigue en 'listo').
CREATE OR REPLACE FUNCTION public.doc_svc_liberar_generacion(p_user UUID, p_id UUID, p_codigo TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.documento_sesiones d
    SET gen_desde = NULL, gen_error_codigo = left(COALESCE(p_codigo, 'error_ia'), 60)
    WHERE d.id = p_id AND d.user_id = p_user AND d.estado = 'listo';
    RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permisos de ejecución
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION
    public.doc_crear_sesion(uuid, text, text, integer, uuid),
    public.doc_listar_sesiones(),
    public.doc_obtener_sesion(uuid),
    public.doc_obtener_texto(uuid),
    public.doc_iniciar_examen(uuid, public.dificultad_nivel),
    public.doc_obtener_examen(uuid),
    public.doc_responder(uuid, uuid, smallint),
    public.doc_eliminar_sesion(uuid),
    public.doc_svc_comenzar_procesamiento(uuid, uuid),
    public.doc_svc_guardar_texto(uuid, uuid, text, integer),
    public.doc_svc_marcar_error(uuid, uuid, text),
    public.doc_svc_reservar_generacion(uuid, uuid, public.dificultad_nivel),
    public.doc_svc_guardar_preguntas(uuid, uuid, public.dificultad_nivel, text, jsonb),
    public.doc_svc_liberar_generacion(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.doc_crear_sesion(uuid, text, text, integer, uuid),
    public.doc_listar_sesiones(),
    public.doc_obtener_sesion(uuid),
    public.doc_obtener_texto(uuid),
    public.doc_iniciar_examen(uuid, public.dificultad_nivel),
    public.doc_obtener_examen(uuid),
    public.doc_responder(uuid, uuid, smallint),
    public.doc_eliminar_sesion(uuid)
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION
    public.doc_svc_comenzar_procesamiento(uuid, uuid),
    public.doc_svc_guardar_texto(uuid, uuid, text, integer),
    public.doc_svc_marcar_error(uuid, uuid, text),
    public.doc_svc_reservar_generacion(uuid, uuid, public.dificultad_nivel),
    public.doc_svc_guardar_preguntas(uuid, uuid, public.dificultad_nivel, text, jsonb),
    public.doc_svc_liberar_generacion(uuid, uuid, text)
TO service_role;

COMMENT ON TABLE public.documento_sesiones IS
'Sesiones de examen personalizado (una por documento procesado). Sin acceso directo del cliente: usar RPC doc_*.';
COMMENT ON TABLE public.documento_preguntas IS
'Preguntas generadas por IA con su clave de respuesta. Deny-all para el cliente; se revelan sólo tras contestar (doc_responder / doc_obtener_examen).';
COMMENT ON FUNCTION public.doc_iniciar_examen(uuid, public.dificultad_nivel) IS
'Cobra la entrada del examen personalizado UNA sola vez (15/25/30) con la sesión bloqueada; idempotente al reanudar.';
COMMENT ON FUNCTION public.doc_responder(uuid, uuid, smallint) IS
'Única función que mueve monedas del examen personalizado: +5/+10/+15 por acierto, −10 (limitado al saldo) por fallo; cada pregunta una sola vez.';

NOTIFY pgrst, 'reload schema';
