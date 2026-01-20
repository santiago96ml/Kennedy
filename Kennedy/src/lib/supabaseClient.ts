import { createClient } from '@supabase/supabase-js';

// Leemos las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificación de seguridad para desarrollo
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env');
}

// Creamos y exportamos la instancia del cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Mantiene al usuario logueado aunque recargue
    autoRefreshToken: true,
  },
  // Configuración para Realtime (importante para tu chat y actualizaciones)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});