import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Tu KennedyView renombrado
import { MainLayout } from './components/layout/MainLayout'; // <--- IMPORTANTE
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import './App.css'

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-bold">Cargando Sistema...</div>;
  
  if (!session) return <Navigate to="/login" replace />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            {/* Aquí usamos el Layout para dar el fondo oscuro y márgenes */}
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