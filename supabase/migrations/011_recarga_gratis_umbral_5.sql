-- 011_recarga_gratis_umbral_5.sql
-- Alinea el umbral de elegibilidad de reclamar_recarga_gratis() con el umbral
-- de 5 monedas que ya usa el frontend (coins.js: actualizarTimerUI /
-- verificarTimerCoins) para mostrar y disparar el contador de 2h.
--
-- Antes: solo se podía reclamar con saldo EXACTAMENTE 0 (v_saldo > 0 → rechazo).
-- Ahora: se puede reclamar con saldo MENOR A 5 (v_saldo >= 5 → rechazo).
-- Sin este cambio, un usuario logueado con 1-4 monedas ve el contador llegar
-- a cero pero el servidor sigue rechazando la entrega (ok = FALSE), porque su
-- saldo no era exactamente 0.
--
-- No se modifica: la duración de 2h (INTERVAL '2 hours'), la cantidad
-- entregada (10 monedas vía _aplicar_monedas), ni ninguna otra RPC, tabla,
-- política RLS o grant. Los GRANT/REVOKE de esta función ya quedaron
-- correctamente establecidos por 009_auditoria_seguridad_economia.sql
-- (EXECUTE para authenticated/service_role, revocado para anon/PUBLIC) y
-- CREATE OR REPLACE FUNCTION conserva esos privilegios al no cambiar la firma.

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

    -- Umbral alineado con el frontend (era: IF v_saldo > 0).
    IF v_saldo >= 5 THEN
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
