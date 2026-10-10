-- 013_storage_documentos.sql
--
-- Bucket PRIVADO para conservar el documento ORIGINAL de cada sesión de examen
-- personalizado. (Una cosa es conservar metadatos, otra el texto extraído y otra
-- el archivo original: aquí sólo el archivo original; los otros dos viven en
-- public.documento_sesiones.)
--
-- Ruta: <user_id>/<sesion_id>.<pdf|docx|txt>  — la decide el servidor en
-- doc_crear_sesion (nunca el nombre del archivo del usuario).
--
-- Requiere haber aplicado 012_preguntas_personalizadas.sql.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentos-catbling', 'documentos-catbling', false, 10485760,
    ARRAY['application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Sólo se puede subir a la ruta de una sesión PROPIA recién creada ('cargando').
-- SECURITY DEFINER: la política no necesita (ni debe tener) acceso directo a la tabla.
CREATE OR REPLACE FUNCTION public.doc_puede_subir(p_name TEXT)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.documento_sesiones s
        WHERE s.user_id = auth.uid() AND s.storage_path = p_name AND s.estado = 'cargando'
    )
$$;
REVOKE ALL ON FUNCTION public.doc_puede_subir(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doc_puede_subir(text) TO authenticated, service_role;

DROP POLICY IF EXISTS doc_storage_insert_own ON storage.objects;
CREATE POLICY doc_storage_insert_own ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documentos-catbling'
                AND (storage.foldername(name))[1] = auth.uid()::text
                AND public.doc_puede_subir(name));

DROP POLICY IF EXISTS doc_storage_select_own ON storage.objects;
CREATE POLICY doc_storage_select_own ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documentos-catbling' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS doc_storage_delete_own ON storage.objects;
CREATE POLICY doc_storage_delete_own ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documentos-catbling' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Sin política de UPDATE: no se puede sobrescribir un archivo ya subido.
