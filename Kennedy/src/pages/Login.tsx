import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, ShieldAlert, Mail, Lock, Building, User } from 'lucide-react';

const BACKEND_URL = 'https://webs-de-vintex-kennedy.1kh9sk.easypanel.host'; 

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [sede, setSede] = useState('Catamarca');

  // 1. LISTENER DE GOOGLE (Ahora sí se ejecutará al volver)
  useEffect(() => {
    // Escuchar el evento de inicio de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            console.log("🌍 [GOOGLE] Sesión detectada. Sincronizando con Backend...");
            await syncGoogleUserWithBackend(session);
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncGoogleUserWithBackend = async (session: any) => {
      // Evitamos doble carga si ya estamos redirigiendo
      if (localStorage.getItem('sb-token') === session.access_token) {
          navigate('/dashboard');
          return;
      }

      setLoading(true);
      try {
          const response = await fetch(`${BACKEND_URL}/api/auth/google-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  email: session.user.email,
                  uuid: session.user.id 
              })
          });

          if (!response.ok) throw new Error("Error sincronizando perfil");
          
          const data = await response.json();
          
          localStorage.setItem('sb-token', session.access_token);
          localStorage.setItem('user-data', JSON.stringify(data.user));
          
          console.log("✅ [GOOGLE] Sincronización exitosa.");
          // Forzamos navegación directa para asegurar recarga de estado
          window.location.href = '/dashboard'; 

      } catch (err) {
          console.error(err);
          setErrorMsg("Error al validar tu cuenta con el servidor.");
          await supabase.auth.signOut(); 
      } finally {
          setLoading(false);
      }
  };

  // ... (El código de handleEmailAuth se mantiene igual que antes) ...
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const fullUrl = `${BACKEND_URL}${endpoint}`;
    try {
      const bodyData: any = { email, password };
      if (!isLoginMode) { bodyData.nombre = nombre; bodyData.sede = sede; }
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error de conexión');
      if (isLoginMode) {
        localStorage.setItem('sb-token', data.token);
        localStorage.setItem('user-data', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        alert("¡Registro exitoso! Ahora inicia sesión.");
        setIsLoginMode(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. LOGIN CON GOOGLE (CORREGIDO)
  const handleGoogleClick = async () => {
      setLoading(true);
      // 🔥 IMPORTANTE: Forzamos el regreso a /login para que este componente procese el sync
      const redirectUrl = `${window.location.origin}/login`; 
      
      const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { 
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }
      });
      if (error) {
          setErrorMsg(error.message);
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex relative overflow-hidden animate-enter">
      {/* ... (Todo tu JSX visual se mantiene exactamente igual) ... */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
         <div className="absolute inset-0 bg-blue-600/5 z-0"></div>
         <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
         <div className="relative z-10 max-w-lg">
            <h1 className="text-6xl font-black text-white italic tracking-tighter mb-6">
              KENNEDY<span className="text-blue-500">SYSTEM</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              Gestión académica inteligente y automatización.
            </p>
         </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-950 lg:bg-slate-900/30 lg:backdrop-blur-sm border-l border-slate-800">
        <GlassCard className="w-full max-w-md p-10 border-slate-800 shadow-2xl">
            <div className="text-center mb-8">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                    <span className="text-3xl font-black text-white italic">K</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLoginMode ? 'Bienvenido al Staff' : 'Crear Cuenta'}
                </h2>
            </div>
            {errorMsg && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-pulse">
                <ShieldAlert size={16} /> {errorMsg}
              </div>
            )}
            <button onClick={handleGoogleClick} disabled={loading} className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50 mb-6">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>
            <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-800 flex-1"></div>
                <span className="text-slate-600 text-[10px] font-bold uppercase">O con Email</span>
                <div className="h-px bg-slate-800 flex-1"></div>
            </div>
            <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLoginMode && (
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="Nombre" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" value={nombre} onChange={(e) => setNombre(e.target.value)} required={!isLoginMode} />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="email" placeholder="Correo" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="password" placeholder="Contraseña" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {!isLoginMode && (
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500" value={sede} onChange={(e) => setSede(e.target.value)}>
                      <option value="Catamarca">Catamarca</option>
                      <option value="Santiago">Santiago</option>
                    </select>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin mx-auto"/> : (isLoginMode ? 'INGRESAR' : 'REGISTRARSE')}
                </button>
            </form>
            <div className="mt-6 text-center">
                <button onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(null); }} className="text-xs text-slate-500 hover:text-blue-400 font-medium">
                  {isLoginMode ? "¿No tienes cuenta? Regístrate" : "Volver al Login"}
                </button>
            </div>
        </GlassCard>
      </div>
    </div>
  );
}