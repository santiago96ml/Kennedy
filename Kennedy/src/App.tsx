import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import { MainLayout } from './components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js'; 
import './App.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  // Inicializamos loading en true para esperar el chequeo inicial
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Función asíncrona para chequear sesión
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Si ocurre un cambio de estado, nos aseguramos de quitar el loading
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           {/* Un spinner simple */}
           <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <div className="text-blue-500 font-bold text-sm tracking-widest">CARGANDO SISTEMA...</div>
        </div>
      </div>
    );
  }
  
  if (!session) {
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
        
        {/* Rutas adicionales protegidas si las tuvieras */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}