import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'pending_approval'>('idle');
  const [userEmail, setUserEmail] = useState('');

  // 1. Verificar sesión al cargar
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setStatus('checking');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.email) {
      await verifyStaffAccess(session.user.email);
    } else {
      setStatus('idle');
    }
  };

  // 2. Lógica central de verificación de Roles
  const verifyStaffAccess = async (email: string) => {
    setUserEmail(email);
    
    try {
      // A. Buscamos al usuario en la tabla de staff
      const { data: staff, error } = await supabase
        .from('perfil_staff')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Error real de base de datos
        console.error("Error verificando staff:", error);
        return; 
      }

      // B. ESCENARIO 1: El usuario NO existe en la tabla -> Lo creamos como "Solicitante"
      if (!staff) {
        console.log("Usuario nuevo, registrando solicitud...");
        await supabase.from('perfil_staff').insert([
          { 
            email: email, 
            rol: null, // Sin rol = Sin acceso
            sede: null // Sin sede asignada
          }
        ]);
        setStatus('pending_approval');
        return;
      }

      // C. ESCENARIO 2: Existe pero NO tiene rol asignado (Sigue pendiente)
      if (!staff.rol) {
        setStatus('pending_approval');
        return;
      }

      // D. ESCENARIO 3: Tiene rol -> Acceso Permitido
      navigate('/');
      
    } catch (err) {
      console.error("Error inesperado:", err);
      setStatus('idle'); // En caso de fallo grave, volver al login
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin 
      }
    });
    if (error) {
        alert("Error al conectar con Google");
        setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStatus('idle');
    setUserEmail('');
  };

  // --- RENDERIZADO DE ESTADOS ---

  // VISTA 1: CARGANDO / VERIFICANDO
  if (status === 'checking' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="h-16 w-16 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Verificando Credenciales...</p>
        </div>
      </div>
    );
  }

  // VISTA 2: SOLICITUD EN PROCESO (Sin Rol)
  if (status === 'pending_approval') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <GlassCard className="max-w-md w-full p-8 border-yellow-500/30 text-center relative z-10">
          <div className="mx-auto h-20 w-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
            <ShieldAlert className="h-10 w-10 text-yellow-500" />
          </div>
          
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Solicitud en Proceso</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Hola <span className="text-white font-bold">{userEmail}</span>, hemos registrado tu solicitud de acceso correctamente.
          </p>
          
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 mb-8 text-left">
            <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-slate-300 uppercase mb-1">Datos Registrados</p>
                    <p className="text-xs text-slate-500">Tu perfil ha sido creado en la base de datos del Instituto Kennedy.</p>
                </div>
            </div>
            <div className="w-px h-6 bg-slate-800 ml-2.5 my-1"></div>
             <div className="flex items-start gap-3 opacity-50">
                <Loader2 className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0 animate-spin" />
                <div>
                    <p className="text-xs font-bold text-slate-300 uppercase mb-1">Esperando Aprobación</p>
                    <p className="text-xs text-slate-500">Un administrador debe asignarte un rol y una sede para continuar.</p>
                </div>
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </GlassCard>
      </div>
    );
  }

  // VISTA 3: FORMULARIO DE LOGIN (Idle)
  return (
    <div className="min-h-screen w-full bg-slate-950 flex relative overflow-hidden animate-enter">
      
      {/* Lado Izquierdo - Decorativo */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
         <div className="absolute inset-0 bg-blue-600/5 z-0"></div>
         <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
         
         <div className="relative z-10 max-w-lg">
            <h1 className="text-6xl font-black text-white italic tracking-tighter mb-6">
              KENNEDY<span className="text-blue-500">SYSTEM</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Plataforma integral de gestión académica y automatización con Inteligencia Artificial.
            </p>
            <div className="mt-12 flex gap-4">
                <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs font-mono text-slate-500">v2.4.0 Stable</div>
                <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs font-mono text-blue-500">Secure Access</div>
            </div>
         </div>
      </div>

      {/* Lado Derecho - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-950 lg:bg-slate-900/30 lg:backdrop-blur-sm border-l border-slate-800">
        <GlassCard className="w-full max-w-md p-10 border-slate-800 shadow-2xl">
            <div className="text-center mb-10">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
                    <span className="text-2xl font-black text-white italic">K</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Bienvenido al Portal</h2>
                <p className="text-slate-500 text-sm">Inicia sesión o solicita acceso con tu cuenta institucional.</p>
            </div>

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {/* Icono de Google SVG */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {loading ? 'Redirigiendo...' : 'Continuar con Google'}
            </button>

            <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                    Sistema protegido por Vintex AI
                </p>
            </div>
        </GlassCard>
      </div>
    </div>
  );
}