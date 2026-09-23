// Cliente Supabase - configuración única para todo el frontend
// Lee SUPABASE_URL y SUPABASE_ANON_KEY desde window.__ENV__ (inyectado en HTML) o desde .env.local en dev

(function () {
  'use strict';

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