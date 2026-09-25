-- 010_google_oauth_perfiles_inventario.sql
-- Segunda auditoría (sept 2026).
--
-- H8. Cuentas de Auth sin fila en profiles (caso real: un usuario confirmado que
--     inició sesión y no tenía perfil, pese al backfill de la 009). Se añade
--     ensure_profile(): RPC idempotente que crea el perfil del usuario autenticado
--     si falta (cubre Google, email y cualquier alta que el trigger no haya cubierto)
--     y se repite el backfill.
-- H9. handle_new_user: Google entrega full_name/name; se añade full_name como
--     alternativa. El trigger ya cubre altas por Google (OAuth inserta en auth.users).
-- H10. Funciones de trigger ejecutables por anon/authenticated/PUBLIC: se revoca.
--      (PostgreSQL no comprueba EXECUTE al disparar un trigger.)
-- H11. Objetos 19-23 (Bolsa, Guantes, Gafas, Amuleto, Aura) no tienen efecto
--      implementado y su categoría de tienda está "en construcción": se desactivan
--      para que no puedan comprarse por RPC directa. Reversible con activo = TRUE.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_nombre VARCHAR(60);
BEGIN
    v_nombre := COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
        'Jugador'
    );
    v_nombre := LEFT(v_nombre, 60);

    INSERT INTO public.profiles (id, nombre, email)
    VALUES (NEW.id, v_nombre, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS TABLE(ok boolean, creado boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_n   INT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE; RETURN;
    END IF;

    INSERT INTO public.profiles (id, nombre, email)
    SELECT u.id,
           LEFT(COALESCE(NULLIF(u.raw_user_meta_data ->> 'nombre', ''),
                         NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
                         NULLIF(u.raw_user_meta_data ->> 'name', ''),
                         NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
                         'Jugador'), 60),
           u.email
    FROM auth.users u
    WHERE u.id = v_uid
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RETURN QUERY SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid), (v_n > 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated, service_role;

-- Backfill (idempotente)
INSERT INTO public.profiles (id, nombre, email)
SELECT u.id,
       LEFT(COALESCE(NULLIF(u.raw_user_meta_data ->> 'nombre', ''),
                     NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
                     NULLIF(u.raw_user_meta_data ->> 'name', ''),
                     NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
                     'Jugador'), 60),
       u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON FUNCTION public.handle_new_user()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_monedas_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_ultimo_acceso()   FROM PUBLIC, anon, authenticated;

UPDATE public.tienda_items SET activo = FALSE WHERE id IN (19, 20, 21, 22, 23);
