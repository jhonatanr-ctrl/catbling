-- ============================================================
-- 003_add_carreras_juego.sql
-- Agrega el nuevo juego "Carreras de Caballos" al enum casino_juego
-- usado por registrar_sesion_casino() y por la tabla sesiones_casino.
--
-- ALTER TYPE ... ADD VALUE no puede ejecutarse dentro del mismo bloque
-- transaccional en el que luego se USA ese valor, por eso esta
-- migración sólo agrega el valor del enum y nada más. No hace falta
-- ninguna otra función/RPC nueva: registrar_sesion_casino() ya acepta
-- cualquier valor de casino_juego de forma genérica.
-- ============================================================

ALTER TYPE casino_juego ADD VALUE IF NOT EXISTS 'carreras';
