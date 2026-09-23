-- ============================================================
-- 008_fix_profiles_idioma_check_6_idiomas.sql
--
-- BUG REAL encontrado en la consola del navegador real de este proyecto:
--   PATCH /rest/v1/profiles?id=eq.<uuid>  ->  400
--
-- Causa: profiles_idioma_check sólo permitía 'es'/'en', pero el sistema
-- central de i18n (resources/config.js, IDIOMAS_DISPONIBLES) soporta 6
-- idiomas: es, en, ru, ja, zh, de. Cualquier usuario autenticado que
-- cambiara a ru/ja/zh/de recibía un 400 al guardar su configuración
-- (apiSetConfig -> PATCH profiles).
--
-- No es un problema de la economía de Carreras, pero se corrige aquí por
-- ser un hallazgo real de esta auditoría y por tocar directamente el
-- requisito de 6 idiomas del proyecto. Cambio mínimo: ampliar la lista
-- permitida, sin tocar ninguna otra columna, política ni tabla.
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT profiles_idioma_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_idioma_check
  CHECK (idioma::text = ANY (ARRAY['es','en','ru','ja','zh','de']::text[]));
