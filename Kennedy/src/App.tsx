import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import { MainLayout } from './components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js'; // Importamos el tipo correcto para TypeScript
import './App.css';

// --- CÓDIGO DE LIMPIEZA DE EMERGENCIA ---
// Este bloque se ejecuta antes de que React cargue la aplicación.
// Si NO hay un hash en la URL (significa que no estamos volviendo de Google), limpiamos todo.
if (!window.location.hash) { 
  console.log("🧹 Limpieza nuclear de sesiones viejas activada.");
  localStorage.removeItem('sb-iljpmweuterernqyxvdk-auth-token'); // Borra solo el token de Supabase
  // localStorage.clear(); // Descomenta esto si lo anterior no basta, pero borrará todo.
}
// ----------------------------------------

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtenemos la sesión actual inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Nos suscribimos a cambios (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // Aseguramos dejar de cargar si el evento llega rápido
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pantalla de carga mientras verificamos
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-blue-500 font-bold text-xl">
          Cargando Sistema...
        </div>
      </div>
    );
  }
  
  // Si no hay sesión, redirigir al login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si hay sesión, mostrar el contenido
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública */}
        <Route path="/login" element={<Login />} />

        {/* Ruta Privada */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard /> 
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}