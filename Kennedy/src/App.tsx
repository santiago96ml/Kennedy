import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import { MainLayout } from './components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js'; 
import './App.css';

// Componente para proteger rutas (Versión Optimista)
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  
  // 🚀 TRUCO: Si ya hay un token en localStorage, NO mostramos pantalla de carga.
  // Asumimos que el usuario está logueado y dejamos pasar ("Pase Optimista").
  // Si luego Supabase dice que el token es falso, lo sacamos.
  const hasLocalToken = !!localStorage.getItem('sb-token');
  const [loading, setLoading] = useState(!hasLocalToken);

  useEffect(() => {
    // 1. Verificación real en segundo plano
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (!session && hasLocalToken) {
           // Si teníamos token local pero Supabase dice que no es válido, limpiamos.
           localStorage.removeItem('sb-token');
           localStorage.removeItem('user-data');
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        // Solo quitamos el loading si estaba activo
        setLoading(false);
      }
    };

    checkSession();

    // 2. Escuchar cambios en vivo (por si se desloguea en otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [hasLocalToken]);

  // Pantalla de carga (Solo se muestra si NO hay rastro de sesión previa)
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <div className="text-blue-500 font-bold text-sm tracking-widest">INICIANDO...</div>
        </div>
      </div>
    );
  }
  
  // Si terminó de verificar y definitivamente no hay sesión ni token local -> Login
  // Nota: 'hasLocalToken' ayuda a evitar el parpadeo inicial, pero 'session' es la verdad final.
  if (!session && !hasLocalToken) {
    return <Navigate to="/login" replace />;
  }

  // Si llegamos aquí, mostramos el Dashboard (ya sea porque está verificado o porque confiamos en el token local)
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard /> 
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}