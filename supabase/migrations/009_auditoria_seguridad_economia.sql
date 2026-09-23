-- 009_auditoria_seguridad_economia.sql
-- Auditoría integral (sept 2026). Cada bloque indica el hallazgo que corrige.
-- Todas las mutaciones de saldo/inventario/historial pasan a ser exclusivamente
-- server-side (RPC SECURITY DEFINER); el cliente conserva sólo lecturas y la
-- actualización de sus preferencias (idioma, volúmenes, animaciones).

-- ─────────────────────────────────────────────────────────────────────────────
-- H1. Cuentas de Auth sin fila en profiles.
--     Efecto observado: comprar_item devolvía 'Saldo insuficiente' con saldo 0
--     y el frontend mostraba "faltan -175" (saldo local 200 - precio 25).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, nombre, email)
SELECT u.id,
       LEFT(COALESCE(NULLIF(u.raw_user_meta_data ->> 'nombre', ''),
                     NULLIF(u.raw_user_meta_data ->> 'name', ''),
                     NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
                     'Jugador'), 60),
       u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- H2. protect_monedas_column NO protegía nada: comprobaba pg_trigger_depth() = 0
--     dentro del propio trigger, donde la profundidad siempre es >= 1. Cualquier
--     usuario autenticado podía hacer UPDATE profiles SET monedas = <lo que sea>.
--     Se distingue por el rol efectivo: las RPC SECURITY DEFINER corren como su
--     propietario; un UPDATE directo desde la API corre como anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_monedas_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.monedas IS DISTINCT FROM NEW.monedas
       AND current_user IN ('anon', 'authenticated') THEN
        RAISE EXCEPTION 'Direct UPDATE of monedas column is not allowed. Use RPC functions.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- H3. Políticas RLS que permitían al cliente escribir directamente en tablas
--     económicas/de historial (inventario gratis, partidas falsas, perfil con
--     saldo arbitrario). El frontend sólo escribe 4 columnas de profiles.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS inv_items_insert_own ON public.inventario_items;
DROP POLICY IF EXISTS inv_items_update_own ON public.inventario_items;
DROP POLICY IF EXISTS inv_acc_insert_own   ON public.inventario_accesorios;
DROP POLICY IF EXISTS inv_acc_update_own   ON public.inventario_accesorios;
DROP POLICY IF EXISTS casino_insert_own    ON public.sesiones_casino;
DROP POLICY IF EXISTS rondas_insert_own    ON public.rondas_preguntas;
DROP POLICY IF EXISTS profiles_insert_own  ON public.profiles;

-- Defensa en profundidad a nivel de privilegios (no sólo RLS).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
    public.inventario_items, public.inventario_accesorios, public.sesiones_casino,
    public.rondas_preguntas, public.monedas_historial, public.carreras_resultados,
    public.dominio_usuario, public.recompensas_nivel, public.tienda_items,
    public.accesorios_catalogo
FROM anon, authenticated;
REVOKE ALL ON public.respuestas_correctas FROM anon, authenticated;

REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (idioma, vol_musica, vol_efectos, animaciones) ON public.profiles TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- H4. transaccion_monedas('recarga_gratis', +10) no validaba saldo 0 ni la
--     espera de 2 h: 10 monedas ilimitadas por llamada. El frontend no la usa
--     (existen reclamar_recarga_gratis, comprar_item, etc.), por lo que se retira
--     del acceso de clientes en lugar de duplicar sus validaciones.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- H5. Las RPC eran ejecutables por anon/PUBLIC. Todas verifican auth.uid(), pero
--     no deben ser invocables sin sesión.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.prorettype <> 'trigger'::regtype
          AND p.proname <> '_aplicar_monedas'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
        IF r.proname = 'transaccion_monedas' THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
        ELSE
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
        END IF;
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- H6. comprar_item: distingue el motivo del rechazo con un código estable
--     (antes "perfil inexistente" y "saldo insuficiente" eran indistinguibles).
--     Se añade la columna `codigo`; las existentes (ok, mensaje, nuevo_saldo)
--     conservan nombre y orden, por lo que el frontend actual sigue funcionando.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.comprar_item(bigint, integer);
CREATE FUNCTION public.comprar_item(p_item_id bigint, p_cantidad integer DEFAULT 1)
RETURNS TABLE(ok boolean, mensaje character varying, nuevo_saldo bigint, codigo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_precio  BIGINT;
    v_total   BIGINT;
    v_saldo   BIGINT;
    v_ok      BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No autenticado'::VARCHAR(100), 0::BIGINT, 'no_autenticado'::TEXT;
        RETURN;
    END IF;

    IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > 100 THEN
        RETURN QUERY SELECT FALSE, 'Cantidad inválida'::VARCHAR(100), 0::BIGINT, 'cantidad_invalida'::TEXT;
        RETURN;
    END IF;

    SELECT t.precio_monedas INTO v_precio
    FROM tienda_items t
    WHERE t.id = p_item_id AND t.activo = TRUE;

    IF v_precio IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Item no encontrado o inactivo'::VARCHAR(100), 0::BIGINT, 'item_no_encontrado'::TEXT;
        RETURN;
    END IF;

    SELECT pr.monedas INTO v_saldo FROM profiles pr WHERE pr.id = v_user_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Perfil no encontrado'::VARCHAR(100), 0::BIGINT, 'perfil_no_encontrado'::TEXT;
        RETURN;
    END IF;

    v_total := v_precio * p_cantidad;

    SELECT am.nuevo_saldo, am.ok
    INTO v_saldo, v_ok
    FROM _aplicar_monedas(v_user_id, -v_total, 'compra_tienda', p_item_id::TEXT) AS am;

    IF NOT v_ok THEN
        SELECT pr.monedas INTO v_saldo FROM profiles pr WHERE pr.id = v_user_id;
        RETURN QUERY SELECT FALSE, 'Saldo insuficiente'::VARCHAR(100), COALESCE(v_saldo, 0), 'saldo_insuficiente'::TEXT;
        RETURN;
    END IF;

    INSERT INTO inventario_items (user_id, item_id, cantidad)
    VALUES (v_user_id, p_item_id, p_cantidad)
    ON CONFLICT (user_id, item_id)
    DO UPDATE SET cantidad = inventario_items.cantidad + EXCLUDED.cantidad;

    RETURN QUERY SELECT TRUE, 'Compra exitosa'::VARCHAR(100), v_saldo, 'ok'::TEXT;
END;
$function$;
REVOKE ALL ON FUNCTION public.comprar_item(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_item(bigint, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- H7. registrar_sesion_casino:
--     (a) con p_apuesta = 0 fallaba con "column reference id is ambiguous"
--         (el parámetro de salida `id` chocaba con profiles.id);
--     (b) un premio > 0 sin apuesta (>0) se aceptaba: ahora se rechaza.
--     NOTA: el resultado del juego sigue siendo declarado por el cliente
--     (RNG en el navegador); ver informe, sección de riesgos pendientes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.registrar_sesion_casino(
    p_juego casino_juego, p_apuesta bigint, p_resultado_monedas bigint, p_gano boolean)
RETURNS TABLE(ok boolean, id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_id BIGINT;
    v_saldo BIGINT;
    v_ok BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    IF p_apuesta IS NULL OR p_apuesta < 0 OR p_apuesta > 10000 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    IF p_resultado_monedas IS NULL OR p_resultado_monedas < 0 OR p_resultado_monedas > 100000 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    IF p_gano = FALSE AND p_resultado_monedas <> 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    IF p_gano = TRUE AND p_apuesta > 0 AND p_resultado_monedas <= 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    -- No existe premio sin apuesta.
    IF p_resultado_monedas > 0 AND p_apuesta = 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
    END IF;

    IF p_apuesta > 0 THEN
        SELECT a.nuevo_saldo, a.ok INTO v_saldo, v_ok
        FROM _aplicar_monedas(v_user_id, -p_apuesta, 'apuesta_casino', p_juego::TEXT) AS a;
        IF NOT v_ok THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
        END IF;
    END IF;

    IF p_resultado_monedas > 0 THEN
        SELECT a.nuevo_saldo, a.ok INTO v_saldo, v_ok
        FROM _aplicar_monedas(v_user_id, p_resultado_monedas, 'premio_casino', p_juego::TEXT) AS a;
        IF NOT v_ok THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT; RETURN;
        END IF;
    END IF;

    INSERT INTO sesiones_casino (user_id, juego, apuesta, resultado_monedas, gano)
    VALUES (v_user_id, p_juego, p_apuesta, p_resultado_monedas, p_gano)
    RETURNING sesiones_casino.id INTO v_id;

    RETURN QUERY SELECT TRUE, v_id;
END;
$function$;
