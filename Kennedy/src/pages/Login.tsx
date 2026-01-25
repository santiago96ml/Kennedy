import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // Iniciamos en 'checking' para dar tiempo a que Supabase procese el token de la URL
  const [status, setStatus] = useState<'idle' | 'checking' | 'pending_approval'>('checking');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    console.log("🔄 [LOGIN] Iniciando listener de autenticación...");

    // 1. ESCUCHA ACTIVA: Esto se dispara automáticamente cuando Supabase procesa el login de Google
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`📣 [AUTH EVENT] Evento recibido: ${event}`);
      
      if (session) {
        console.log("✅ [AUTH] Sesión detectada:", {
            email: session.user.email,
            id: session.user.id,
            expires_at: session.expires_at
        });
      } else {
        console.log("❌ [AUTH] No hay sesión activa en este evento.");
      }

      if (session?.user?.email) {
        // ¡Login exitoso detectado! Verificamos rol.
        console.log("🚀 [FLOW] Iniciando verificación de staff...");
        await verifyStaffAccess(session.user.email);
      } else {
        // No hay sesión, mostramos el login
        console.log("⏸️ [FLOW] Estado establecido a IDLE (Esperando login)");
        setStatus('idle');
      }
    });

    // Limpieza al desmontar
    return () => {
        console.log("🧹 [LOGIN] Limpiando listener...");
        subscription.unsubscribe();
    };
  }, []);

  // 2. Lógica de Seguridad (Sin cambios mayores, solo robustez)
  const verifyStaffAccess = async (email: string) => {
    console.log(`🔎 [DB CHECK] Buscando usuario en 'perfil_staff' con email: ${email}`);
    setStatus('checking');
    setUserEmail(email);
    
    try {
      const { data: staff, error } = await supabase
        .from('perfil_staff')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error("⚠️ [DB ERROR] Respuesta de Supabase:", error);
        
        // Si el error NO es que no encontró resultados (PGRST116), es un error real
        if (error.code !== 'PGRST116') {
            setStatus('idle'); // En error, volvemos al login para reintentar
            return; 
        }
        console.log("ℹ️ [DB] El usuario no existe en la tabla (Error PGRST116 esperado para nuevos)");
      } else {
        console.log("✅ [DB] Usuario encontrado:", staff);
      }

      // Caso: Usuario Nuevo
      if (!staff) {
        console.log("🆕 [REGISTRO] Usuario nuevo detectado. Intentando auto-registro...");
        const { error: insertError } = await supabase.from('perfil_staff').insert([{ email, rol: null, sede: null }]);
        
        if (insertError) {
            console.error("❌ [REGISTRO FALLIDO] Error al crear usuario:", insertError);
        } else {
            console.log("✅ [REGISTRO EXITOSO] Usuario creado sin rol.");
        }
        
        setStatus('pending_approval');
        return;
      }

      // Caso: Usuario sin rol
      if (!staff.rol) {
        console.log("⛔ [ACCESO DENEGADO] El usuario existe pero no tiene ROL asignado.");
        setStatus('pending_approval');
        return;
      }

      // Caso: Acceso concedido
      console.log(`🎉 [ACCESO CONCEDIDO] Bienvenido ${email}. Redirigiendo al Dashboard...`);
      navigate('/');
      
    } catch (err) {
      console.error("💥 [CRITICAL ERROR] Excepción no controlada:", err);
      setStatus('idle');
    }
  };

  const handleGoogleLogin = async () => {
    console.log("👆 [CLICK] Botón de Login presionado.");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin 
      }
    });

    if (error) {
        console.error("❌ [OAUTH ERROR] Falló el inicio con Google:", error.message);
        alert("Error: " + error.message);
        setLoading(false);
    } else {
        console.log("✈️ [OAUTH] Redirigiendo a Google...");
    }
  };

  const handleSignOut = async () => {
    console.log("👋 [LOGOUT] Cerrando sesión...");
    await supabase.auth.signOut();
    setStatus('idle');
    setUserEmail('');
    console.log("🔄 [RELOAD] Recargando página para limpiar estado...");
    window.location.reload(); // Recarga forzada para limpiar caché
  };

  // --- RENDERIZADO (Igual que antes) ---

  if (status === 'checking' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="h-16 w-16 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Validando Credenciales...</p>
        </div>
      </div>
    );
  }

  if (status === 'pending_approval') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden animate-enter">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <GlassCard className="max-w-md w-full p-8 border-yellow-500/30 text-center relative z-10">
          <div className="mx-auto h-20 w-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
            <ShieldAlert className="h-10 w-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Solicitud en Revisión</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            La cuenta <span className="text-white font-bold">{userEmail}</span> ha sido registrada.
          </p>
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 mb-8 text-left">
            <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-slate-300 uppercase mb-1">Identidad Verificada</p>
                    <p className="text-xs text-slate-500">Google ha confirmado tu identidad.</p>
                </div>
            </div>
            <div className="w-px h-6 bg-slate-800 ml-2.5 my-1"></div>
             <div className="flex items-start gap-3 opacity-80">
                <Loader2 className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0 animate-spin" />
                <div>
                    <p className="text-xs font-bold text-slate-300 uppercase mb-1">Esperando Permisos</p>
                    <p className="text-xs text-slate-500">Un administrador debe asignarte un ROL.</p>
                </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700">
            <LogOut size={16} /> Cancelar / Cerrar Sesión
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex relative overflow-hidden animate-enter">
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
         <div className="absolute inset-0 bg-blue-600/5 z-0"></div>
         <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
         <div className="relative z-10 max-w-lg">
            <h1 className="text-6xl font-black text-white italic tracking-tighter mb-6">
              KENNEDY<span className="text-blue-500">SYSTEM</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Gestión académica inteligente y automatización para sedes VINTEX.
            </p>
         </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-950 lg:bg-slate-900/30 lg:backdrop-blur-sm border-l border-slate-800">
        <GlassCard className="w-full max-w-md p-12 border-slate-800 shadow-2xl">
            <div className="text-center mb-12">
                <div className="h-20 w-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
                    <span className="text-4xl font-black text-white italic">K</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Acceso Staff</h2>
                <p className="text-slate-500 text-sm">Utiliza tu cuenta institucional Google.</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {loading ? 'Redirigiendo...' : 'Iniciar con Google'}
            </button>
            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                    <ShieldAlert size={12}/> Acceso restringido - Vintex AI
                </p>
            </div>
        </GlassCard>
      </div>
    </div>
  );
}