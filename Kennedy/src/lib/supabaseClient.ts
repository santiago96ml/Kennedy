/// <reference types="vite/client" />
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
    // 1. Mantiene al usuario logueado en el navegador
    persistSession: true,   
    
    // 2. Renueva el token automáticamente antes de que expire
    autoRefreshToken: true, 
    
    // 3. ¡CRÍTICO! Detecta el hash (#access_token=...) que envía Google al volver
    // Sin esto, la web ignora el login exitoso y da el error 401
    detectSessionInUrl: true 
  },
  // Mantenemos tu configuración de Realtime (útil para el chat)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});