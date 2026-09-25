// Cliente Supabase - configuración única para todo el frontend
// Lee SUPABASE_URL y SUPABASE_ANON_KEY desde window.__ENV__ (inyectado en HTML) o desde .env.local en dev

(function () {
  'use strict';

  // CAUSA RAÍZ de la intermitencia en la recuperación de contraseña: supabase-js, con
  // detectSessionInUrl:true, empieza a procesar y LIMPIA (history.replaceState) el hash de
  // la URL (#access_token=...&type=recovery...) en cuanto se llama a createClient(), más
  // abajo en este mismo script — que es el PRIMERO en cargar. config.js (que decide si
  // mostrar el formulario de nueva contraseña) se carga después y a veces alcanza a leer
  // window.location.hash antes de que se limpie y a veces no: de ahí que el formulario
  // apareciera solo en algunos intentos. Se captura el hash y la query AQUÍ, antes de
  // createClient(), en variables que no cambian, para que el resto del sitio deje de
  // depender de esa carrera.
  window.CATBLING_URL_HASH_INICIAL = window.location.hash || '';
  window.CATBLING_URL_SEARCH_INICIAL = window.location.search || '';

  // En producción (Vercel): las vars vienen inyectadas en el HTML via <script>window.__ENV__ = {...}</script>
  // En desarrollo local: se pueden definir en un archivo .env.local.js o aquí mismo como fallback
  const env = (typeof window !== 'undefined' && window.__ENV__) || {
    SUPABASE_URL: 'https://yshcdygawfxpkjifmkjn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaGNkeWdhd2Z4cGtqaWZta2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTkyNTcsImV4cCI6MjEwMjk3NTI1N30.Wk3HOL3i5wm7xYyzwnH50ICpCbG5BZrqCpr1vI6M9Z4'
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY.includes('EJEMPLO')) {
    console.warn('[Supabase] Configuración incompleta. Define SUPABASE_URL y SUPABASE_ANON_KEY en window.__ENV__ o en .env.local.js');
  }

  window.supabase = supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
      storageKey: 'catbling-auth'
    }
  });

  // Helper para obtener sesión actual
  window.getSupabaseSession = async function () {
    const { data: { session } } = await window.supabase.auth.getSession();
    return session;
  };

  // Helper para obtener usuario actual
  window.getSupabaseUser = async function () {
    const { data: { user } } = await window.supabase.auth.getUser();
    return user;
  };
})();