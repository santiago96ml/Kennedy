import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import { MainLayout } from './components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js'; 
import './App.css';

// ⚠️ Asegúrate que esta clave sea IDÉNTICA a la de Login.tsx y server.js
const GHOST_TOKEN = "ROXANA_MASTER_KEY_2026_BYPASS_SECURE";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  
  // Leemos el token actual del almacenamiento local
  const localTokenStr = localStorage.getItem('sb-token');
  const hasLocalToken = !!localTokenStr;
  
  const [loading, setLoading] = useState(!hasLocalToken);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 👻 BYPASS DE EMERGENCIA (MODO ROXANA)
        // Si el token es la clave maestra, SALTAMOS la validación de Supabase.
        // Esto evita que el sistema borre el token por considerarlo "inválido".
        if (localTokenStr === GHOST_TOKEN) {
            console.log("👻 Modo Fantasma detectado: Omitiendo validación estricta.");
            setLoading(false);
            return; 
        }

        // Validación Normal (Para usuarios reales como tú con Google)
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        // Si no hay sesión válida y NO es el token fantasma, limpiamos.
        if (!session && hasLocalToken) {
           console.log("Token inválido o expirado. Cerrando sesión.");
           localStorage.removeItem('sb-token');
           localStorage.removeItem('user-data');
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        // Quitamos la pantalla de carga
        setLoading(false);
      }
    };

    checkSession();

    // Listener para cambios de sesión en vivo
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Solo actualizamos loading si NO estamos en modo fantasma
      if (localStorage.getItem('sb-token') !== GHOST_TOKEN) {
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasLocalToken, localTokenStr]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <div className="text-blue-500 font-bold text-sm tracking-widest">VALIDANDO ACCESO...</div>
        </div>
      </div>
    );
  }
  
  // LÓGICA FINAL DE ACCESO:
  // Pasa si: Hay sesión real O el token es el fantasma.
  // Si no hay sesión Y el token no es el fantasma -> Login.
  if (!session && localTokenStr !== GHOST_TOKEN) {
    return <Navigate to="/login" replace />;
  }

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