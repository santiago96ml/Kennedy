import { createClient } from '@supabase/supabase-js';

// CLAVES PUESTAS DIRECTAMENTE PARA DESCARTAR ERRORES DEL .ENV
const supabaseUrl = 'https://iljpmweuterernqyxvdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsanBtd2V1dGVyZXJucXl4dmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjgzNDMsImV4cCI6MjA4MjYwNDM0M30.Y06hmWDrhtByhsvDftDkOavvNZ-wmAMsw6wIsTO_K90';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});