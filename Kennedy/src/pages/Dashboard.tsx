import { useState, useEffect, useRef } from 'react';
import { 
  Users, MessageCircle, Search, Filter, ChevronDown, 
  Save, FileCheck, Download, 
  Sparkles, Loader2, BookOpen, GraduationCap, 
  CreditCard, SearchX, ChevronRight, MapPin, 
  Phone, AlignLeft, History, X, User, Bot,
  AlertCircle, CheckCircle, Edit3, ListFilter,
  ShieldCheck, UserCog
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard'; 
import { supabase } from '@/lib/supabaseClient';

// --- CONSTANTES DEL SISTEMA ---
const SEDES = ['Catamarca', 'Pilar', 'Santiago del Estero', 'San Nicolás'];
const ESTADOS = ['Sólo preguntó', 'En Proceso', 'Reconocimiento', 'Documentación', 'Inscripto', 'Alumno Regular', 'Deudor'];

// --- TIPOS E INTERFACES (ADAPTADAS A AIRTABLE) ---
interface Career {
  id: string; // Airtable ID es string
  name: string;
  duration: string;
  modality: string;
  fees: number;
  subjects: number;
  evaluations_format?: string;
}

interface Student {
  id: string; // IMPORTANTE: Airtable usa IDs tipo "rec..."
  full_name: string;
  dni: string;
  legajo: string;
  contact_phone: string;
  location: string;
  status: string;
  general_notes: string;
  // El backend híbrido ahora devuelve 'career_name' o 'careers' plano
  career_name?: string; 
  career_id?: string;
  secretaria?: boolean;
  bot_students?: boolean;
  last_interaction_at?: string;
}

interface StaffMember {
    id: number;
    email: string;
    rol: string | null;
    sede: string | null;
    created_at: string;
}

interface SelectedStudentUI {
  id: string; // String para Airtable
  name: string;
  dni: string;
  legajo: string;
  phone: string;
  location: string;
  status: string;
  notes: string;
  career: string;
  careerId?: string;
  secretaria?: boolean;
  bot_students?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// --- CONFIGURACIÓN ---
// CORRECCIÓN APLICADA AQUÍ: (import.meta as any) para evitar el error de TS
const API_URL = (import.meta as any).env.VITE_KENNEDY_API_URL || 'http://localhost:4001/api';

const getAuthHeader = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
};

// --- CLIENTE API IA ---
const callBackendAI = async (payload: any): Promise<string> => {
  try {
    const headers = await getAuthHeader();
    const body = Array.isArray(payload) ? { messages: payload } : { prompt: payload };
    
    const response = await fetch(`${API_URL}/ai/generate`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Error Backend: ${response.status}`);
    const data = await response.json();
    return data.result || "Sin respuesta.";
  } catch (error) {
    console.error("Error AI:", error);
    return "Error de conexión con el cerebro IA.";
  }
};

// --- COMPONENTE BADGE ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Inscripto': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Alumno Regular': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
    'En Proceso': 'bg-blue-500/10 text-blue-400 border-blue-500/20', 
    'Reconocimiento': 'bg-purple-500/10 text-purple-400 border-purple-500/20', 
    'Documentación': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Sólo preguntó': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Deudor': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const activeStyle = styles[status] || styles['Sólo preguntó'];
  
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border tracking-wider uppercase ${activeStyle}`}>
      {status}
    </span>
  );
};

// --- PARSER DE HISTORIAL ---
const parseChatHistory = (rows: any[]) => {
    if (!rows || rows.length === 0) return "No hay historial disponible.";
    return rows.map((row) => {
        const msg = row.message;
        if (!msg) return null;
        const role = msg.type === 'human' ? '👤 ALUMNO' : '🤖 BOT';
        let content = msg.content || '';
        if (msg.type === 'human' && content.includes("Mensaje del paciente en texto:")) {
            content = content.split("Mensaje del paciente en texto:")[1].split("Mensaje del paciente en transcripción")[0].trim();
        }
        return `[${role}]: ${content}`;
    }).filter(Boolean).join("\n");
};

// --- COMPONENTE PRINCIPAL ---
export default function Dashboard() {
  // Estados Generales
  const [userRole, setUserRole] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bot Config
  const [botActive, setBotActive] = useState(true);
  const [welcomeText, setWelcomeText] = useState("");
  const [awayText, setAwayText] = useState("");
  const [isSavingBot, setIsSavingBot] = useState(false);
  const [isGeneratingBotConfig, setIsGeneratingBotConfig] = useState({ welcome: false, away: false });

  // Filtros
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // ID Carrera ahora es string
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Ficha Alumno
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudentUI | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [notesBuffer, setNotesBuffer] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Estados Edición
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SelectedStudentUI>>({});

  // Historial
  const [showHistory, setShowHistory] = useState(false); 
  const [historyData, setHistoryData] = useState<any[]>([]); 
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modales
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false); 
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // IA
  const [analysisChat, setAnalysisChat] = useState<ChatMessage[]>([]);
  const [analysisInput, setAnalysisInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chatContextRef = useRef<ChatMessage[]>([]); 
  
  const selectedStudentIdRef = useRef<string | null>(null);

  // --- EFECTOS ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) setIsFilterMenuOpen(false);
        if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setIsStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { selectedStudentIdRef.current = selectedStudent?.id || null; }, [selectedStudent]);
  
  useEffect(() => { 
      fetchCareers(); 
      fetchStudents();
      
      // POLLING: Reemplazo de Realtime para Airtable
      // Actualiza la lista cada 30 segundos
      const interval = setInterval(() => {
          if (!isEditingProfile && !isModalOpen) {
              console.log("🔄 Sincronizando con Airtable...");
              fetchStudents(true); // true = silent update
          }
      }, 30000);

      return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchStudents(); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeFilter, activeStatusFilter]);

  useEffect(() => {
      if (activeTab === 'staff' && userRole === 'admin') fetchStaffList();
      if (activeTab === 'bot' && userRole === 'admin') fetchBotConfig();
  }, [activeTab, userRole]);

  // --- API CALLS ---
  const fetchCareers = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/careers`, { headers });
      if (res.ok) setCareers(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBotConfig = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/bot`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBotActive(data.is_active);
        setWelcomeText(data.welcome_message);
        setAwayText(data.away_message);
      }
    } catch (err) { console.error("Error config bot"); }
  };

  const fetchStudents = async (silent = false) => {
    if (!silent) setLoadingData(true);
    try {
      const headers = await getAuthHeader();
      let url = `${API_URL}/students?search=${encodeURIComponent(searchTerm)}`;
      if (activeFilter) url += `&career_id=${activeFilter}`; // Ahora envía el ID de Airtable
      if (activeStatusFilter) url += `&status=${encodeURIComponent(activeStatusFilter)}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const result = await res.json();
        setStudents(result.data || []);
        if (result.userRole) setUserRole(result.userRole);
      }
    } catch (err) { console.error(err); } finally { if (!silent) setLoadingData(false); }
  };

  const fetchStudentDetails = async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/students/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const s = data.student;
        // Mapeo seguro de datos híbridos
        const uiStudent: SelectedStudentUI = {
          id: s.id, 
          name: s.full_name, 
          dni: s.dni, 
          legajo: s.legajo, 
          phone: s.contact_phone,
          location: s.location, 
          status: s.status, 
          notes: s.general_notes,
          career: s.career_name || s.careers?.name || 'Sin Carrera', 
          careerId: s.career_id,
          secretaria: s.secretaria, 
          bot_students: s.bot_students,
          // debt no siempre viene de Airtable, lo quitamos o manejamos opcional
        };
        setSelectedStudent(uiStudent);
        setNotesBuffer(uiStudent.notes || '');
        setStudentDocuments(data.documents || []);
        
        if (!isEditingProfile) { setAnalysisChat([]); setShowHistory(false); }
      }
    } catch (err) { console.error(err); }
  };

  const fetchStaffList = async () => {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/admin/staff`, { headers });
        if (res.ok) setStaffList(await res.json());
    } catch (e) { console.error(e); }
  };

  // --- ACTIONS ---
  const updateStaffMember = async (id: number, field: 'rol' | 'sede', value: string) => {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
      try {
          const headers = await getAuthHeader();
          await fetch(`${API_URL}/admin/staff/${id}`, {
              method: 'PATCH',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ [field]: value })
          });
      } catch (e) { alert("Error actualizando staff"); fetchStaffList(); }
  };

  const handleEditClick = () => {
      if (!selectedStudent) return;
      setEditForm({
          name: selectedStudent.name, dni: selectedStudent.dni, legajo: selectedStudent.legajo,
          location: selectedStudent.location, status: selectedStudent.status, careerId: selectedStudent.careerId
      });
      setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
      if (!selectedStudent) return;
      try {
          const headers = await getAuthHeader();
          const res = await fetch(`${API_URL}/students/${selectedStudent.id}/update-profile`, {
              method: 'PATCH',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  full_name: editForm.name, dni: editForm.dni, legajo: editForm.legajo,
                  career_id: editForm.careerId, location: editForm.location, status: editForm.status
              })
          });

          if (res.ok) {
              setIsEditingProfile(false);
              await fetchStudentDetails(selectedStudent.id);
              fetchStudents(true); // Actualizar lista de fondo
              alert("Perfil actualizado en Airtable");
          } else { alert("Error al actualizar"); }
      } catch (e) { alert("Error de conexión"); }
  };

  const toggleHistoryView = async () => {
    if (!showHistory && selectedStudent?.phone) {
        setLoadingHistory(true);
        try {
            const headers = await getAuthHeader();
            // IMPORTANTE: El endpoint de historial usa el teléfono, no el ID
            const res = await fetch(`${API_URL}/chat-history/${selectedStudent.phone}`, { headers });
            if (res.ok) setHistoryData(await res.json());
        } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
    }
    setShowHistory(!showHistory);
  };

  const handleResolveSituation = async () => {
      if (!selectedStudent) return;
      setIsResolving(true);
      try {
          const headers = await getAuthHeader();
          const res = await fetch(`${API_URL}/students/${selectedStudent.id}/resolve`, { method: 'PATCH', headers });
          if (res.ok) setSelectedStudent(prev => prev ? ({ ...prev, secretaria: false, bot_students: true }) : null);
          else alert("Error al resolver.");
      } catch (err) { alert("Error de conexión"); } finally { setIsResolving(false); }
  };

  const toggleBotStatus = async () => {
    const newStatus = !botActive;
    setBotActive(newStatus);
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_URL}/bot`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, welcome_message: welcomeText, away_message: awayText })
      });
    } catch (err) { setBotActive(!newStatus); alert("Error"); }
  };

  const saveBotSettings = async () => {
    setIsSavingBot(true);
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_URL}/bot`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: botActive, welcome_message: welcomeText, away_message: awayText })
      });
      alert("Guardado");
    } catch (err) { alert("Error"); } finally { setIsSavingBot(false); }
  };

  const saveNotes = async () => {
    if (!selectedStudent) return;
    setIsSavingNotes(true);
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/students/${selectedStudent.id}/notes`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: notesBuffer })
        });
        if (res.ok) setSelectedStudent({ ...selectedStudent, notes: notesBuffer });
        else alert("Error guardando notas");
    } catch (err) { alert("Error de conexión"); } finally { setIsSavingNotes(false); }
  };

  const downloadDocument = async (docId: number, fileName: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/documents/${docId}/download`, { headers });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { alert("Error en descarga"); }
  };

  // Lógica IA igual que antes...
  const startAnalysis = async () => {
    if (!selectedStudent) return;
    setIsAnalyzing(true);
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/chat-history/${selectedStudent.phone}`, { headers });
        let chatContextText = res.ok ? parseChatHistory(await res.json()) : "(Sin historial)";
        const systemPrompt = selectedStudent.secretaria 
            ? `El alumno solicitó hablar con secretaria. Resume la conversación y explica qué necesita urgentemente.`
            : `Eres un experto analista académico. Misión: analizar la conversación y perfil del alumno.`;
        const initialContext = [{ role: "system" as const, content: `${systemPrompt} DATOS: Nombre: ${selectedStudent.name} | Carrera: ${selectedStudent.career} | Estado: ${selectedStudent.status} HISTORIAL CHAT: ${chatContextText}` }];
        chatContextRef.current = initialContext;
        const firstMsg = { role: "user" as const, content: selectedStudent.secretaria ? "Sintetiza el caso urgente." : "Analiza el perfil y dime la probabilidad de inscripción/pago." };
        setAnalysisChat([firstMsg]); 
        const response = await callBackendAI([...initialContext, firstMsg]);
        setAnalysisChat(prev => [...prev, { role: "assistant", content: response }]);
    } catch (err) { setAnalysisChat([{ role: "assistant", content: "Error." }]); } finally { setIsAnalyzing(false); }
  };

  const sendAnalysisMessage = async () => {
    if (!analysisInput.trim()) return;
    const newUserMsg = { role: "user" as const, content: analysisInput };
    const newVisualChat = [...analysisChat, newUserMsg];
    setAnalysisChat(newVisualChat); setAnalysisInput(""); setIsAnalyzing(true);
    const response = await callBackendAI([...chatContextRef.current, ...newVisualChat]);
    setAnalysisChat(prev => [...prev, { role: "assistant", content: response }]);
    setIsAnalyzing(false);
  };

  const generateBotMessage = async (type: 'welcome' | 'away') => {
    setIsGeneratingBotConfig(prev => ({ ...prev, [type]: true }));
    const result = await callBackendAI(`Genera mensaje corto de ${type === 'welcome' ? 'bienvenida' : 'ausencia'} WhatsApp instituto. Tono joven.`);
    if (type === 'welcome') setWelcomeText(result); else setAwayText(result);
    setIsGeneratingBotConfig(prev => ({ ...prev, [type]: false }));
  };

  // --- RENDER UI ---
  const handleOpenStudentModal = async (studentPreview: Student) => { 
      setSelectedCareer(null); setIsEditingProfile(false); setIsModalVisible(true); 
      setTimeout(() => setIsModalOpen(true), 10); await fetchStudentDetails(studentPreview.id); 
  };
  
  const handleCloseModal = () => { 
      setIsModalOpen(false); 
      setTimeout(() => { setIsModalVisible(false); setSelectedStudent(null); setSelectedCareer(null); setShowHistory(false); setIsEditingProfile(false); }, 300); 
  };
  
  const handleOpenCareerModal = (c: Career) => { 
      setSelectedStudent(null); setSelectedCareer(c); setIsModalVisible(true); setTimeout(() => setIsModalOpen(true), 10); 
  };
  
  const filteredCareers = careers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 p-1 min-h-screen pb-20 select-none animate-enter">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic">
            <span className="text-blue-500">KENNEDY</span><span className="text-slate-500 text-2xl not-italic ml-1">SYSTEM</span>
          </h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em] mt-1">Gestión Híbrida (Airtable + Supabase)</p>
        </div>
        <div className="flex bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 shadow-2xl">
          {['dashboard', 'careers'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === tab ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab === 'dashboard' && <Users size={14}/>} {tab === 'careers' && <BookOpen size={14}/>}
              <span className="uppercase tracking-widest">{tab === 'dashboard' ? 'Alumnos' : 'Carreras'}</span>
            </button>
          ))}
          {userRole === 'admin' && (
             <button onClick={() => setActiveTab('bot')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === 'bot' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-400 hover:text-slate-200'}`}>
                <MessageCircle size={14} /> <span className="uppercase tracking-widest">Bot AI</span>
             </button>
          )}
          {userRole === 'admin' && (
             <button onClick={() => setActiveTab('staff')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${activeTab === 'staff' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-400 hover:text-slate-200'}`}>
                <UserCog size={14} /> <span className="uppercase tracking-widest">Equipo</span>
             </button>
          )}
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between relative z-30">
            <div className="relative flex-1 w-full md:max-w-xl group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="text" placeholder="Buscar en Airtable..." className="w-full pl-12 pr-4 py-3 bg-slate-900/40 border border-slate-700/50 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex gap-3 relative w-full md:w-auto">
              <div className="relative" ref={statusMenuRef}>
                <button onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)} className={`flex items-center justify-center gap-3 px-6 py-3 border rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${isStatusMenuOpen || activeStatusFilter ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}>
                    <ListFilter size={16} /> <span>{activeStatusFilter ? activeStatusFilter : 'Estado'}</span> <ChevronDown size={14} className={`transition-transform duration-300 ${isStatusMenuOpen ? 'rotate-180' : ''}`}/>
                </button>
                {isStatusMenuOpen && (
                    <div className="absolute top-full right-0 mt-3 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 border-b border-slate-800 bg-slate-800/30"><button onClick={() => { setActiveStatusFilter(null); setIsStatusMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors">Todos</button></div>
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {ESTADOS.map(st => (<button key={st} onClick={() => { setActiveStatusFilter(st); setIsStatusMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-medium rounded-xl transition-all ${activeStatusFilter === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{st}</button>))}
                        </div>
                    </div>
                )}
              </div>
              <div className="relative" ref={filterMenuRef}>
                <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} className={`flex items-center justify-center gap-3 px-6 py-3 border rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${isFilterMenuOpen || activeFilter ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}>
                    <Filter size={16} /> <span>{activeFilter ? careers.find(c => c.id === activeFilter)?.name.substring(0, 10) : 'Carrera'}</span> <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterMenuOpen ? 'rotate-180' : ''}`}/>
                </button>
                {isFilterMenuOpen && (
                    <div className="absolute top-full right-0 mt-3 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 border-b border-slate-800 bg-slate-800/30"><button onClick={() => { setActiveFilter(null); setIsFilterMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors">Todas</button></div>
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {careers.map(career => (<button key={career.id} onClick={() => { setActiveFilter(career.id); setIsFilterMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-medium rounded-xl transition-all ${activeFilter === career.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{career.name}</button>))}
                        </div>
                    </div>
                )}
              </div>
            </div>
          </div>

          <GlassCard className="border-slate-800/50 shadow-2xl !overflow-visible">
            {loadingData ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4 text-blue-500"><Loader2 className="animate-spin" size={40} /><p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Airtable</p></div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <th className="px-8 py-5 border-b border-slate-800">Alumno</th>
                        <th className="px-6 py-5 border-b border-slate-800">Legajo</th>
                        <th className="px-6 py-5 border-b border-slate-800">Carrera</th>
                        <th className="px-6 py-5 border-b border-slate-800">Estado</th>
                        <th className="px-8 py-5 border-b border-slate-800 text-right">Ficha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {students.length > 0 ? students.map((student) => (
                        <tr key={student.id} onClick={() => handleOpenStudentModal(student)} className={`group cursor-pointer transition-all duration-300 ${student.secretaria ? 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500' : 'hover:bg-blue-600/[0.03]'}`}>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-black text-sm border border-slate-600 group-hover:border-blue-500/50 transition-colors shadow-lg">{student.full_name?.charAt(0) || '?'}</div>
                                  {student.secretaria && <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></div>}
                                  {student.secretaria && <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-black"></div>}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{student.full_name || 'Sin Nombre'}</div>
                                <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">DNI {student.dni || '---'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-xs font-mono font-bold text-cyan-400/80 bg-cyan-400/5 px-2 py-1 rounded-md border border-cyan-400/10">#{student.legajo || '000'}</span></td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-400 max-w-[180px] truncate">{student.career_name || 'S/D'}</td>
                          <td className="px-6 py-4 flex items-center gap-2">
                              <StatusBadge status={student.status || 'Sólo preguntó'} />
                              {student.secretaria && <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Ayuda</span>}
                          </td>
                          <td className="px-8 py-4 text-right"><div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-slate-700"><ChevronRight size={18} /></div></td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-20 text-center"><div className="flex flex-col items-center gap-3 opacity-20"><SearchX size={60} /><p className="text-xs font-black uppercase tracking-widest">No hay alumnos en Airtable</p></div></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* --- PESTAÑA EQUIPO Y CARRERAS (IGUALES) --- */}
      {activeTab === 'staff' && userRole === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <GlassCard className="p-8 border-slate-700/50 shadow-2xl">
                  <h3 className="font-black text-white border-b border-slate-800 pb-4 flex items-center gap-3 text-sm uppercase tracking-[0.2em] mb-6">
                      <ShieldCheck size={20} className="text-green-500" /> Gestión de Acceso
                  </h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                                  <th className="py-4">Usuario</th>
                                  <th className="py-4">Rol</th>
                                  <th className="py-4">Sede Asignada</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {staffList.map((staff) => (
                                  <tr key={staff.id} className="group">
                                      <td className="py-4 text-sm font-bold text-slate-300">{staff.email}</td>
                                      <td className="py-4">
                                          <select 
                                              className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-white p-2 focus:border-blue-500 transition-colors"
                                              value={staff.rol || ''}
                                              onChange={(e) => updateStaffMember(staff.id, 'rol', e.target.value)}
                                          >
                                              <option value="" disabled>Sin Rol (Pendiente)</option>
                                              <option value="admin">Administrador Total</option>
                                              <option value="asesor">Asesora de Sede</option>
                                          </select>
                                      </td>
                                      <td className="py-4">
                                          <select 
                                              className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-white p-2 focus:border-blue-500 transition-colors"
                                              value={staff.sede || ''}
                                              onChange={(e) => updateStaffMember(staff.id, 'sede', e.target.value)}
                                          >
                                              <option value="" disabled>Sin Sede</option>
                                              {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                                          </select>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </GlassCard>
          </div>
      )}

      {activeTab === 'careers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
           {filteredCareers.map((career) => (
             <GlassCard key={career.id} className="p-0 overflow-hidden hover:border-blue-500/50 transition-all hover:-translate-y-1 shadow-xl">
               <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20"><GraduationCap size={28} /></div>
                   <span className="bg-slate-800/80 text-slate-300 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter border border-slate-700">{career.duration}</span>
                 </div>
                 <h3 className="font-black text-white text-lg mb-2 leading-tight uppercase">{career.name}</h3>
                 <p className="text-xs text-slate-500 mb-6 line-clamp-2 leading-relaxed">{career.modality}</p>
                 <div className="flex items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-800 pt-5">
                    <div className="flex items-center gap-2"><CreditCard size={14} className="text-blue-500"/><span>{career.fees} Cuotas</span></div>
                    <div className="flex items-center gap-2"><BookOpen size={14} className="text-blue-500"/><span>{career.subjects} Materias</span></div>
                 </div>
               </div>
               <button onClick={() => handleOpenCareerModal(career)} className="w-full py-4 bg-slate-800/30 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all border-t border-slate-800">Ver Plan de Estudios</button>
             </GlassCard>
           ))}
        </div>
      )}

      {/* --- PESTAÑA BOT (IGUAL) --- */}
      {activeTab === 'bot' && userRole === 'admin' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <GlassCard className="p-8 flex items-center justify-between border-slate-700/50 shadow-2xl">
            <div><h2 className="text-xl font-black text-white uppercase tracking-tighter">Status Operativo</h2><p className="text-xs text-slate-500 uppercase tracking-widest mt-1">El asistente responderá automáticamente vía WhatsApp.</p></div>
            <div className="relative inline-block w-14 align-middle select-none transition duration-200 ease-in"><input type="checkbox" id="toggle" checked={botActive} onChange={toggleBotStatus} className="hidden" /><label htmlFor="toggle" className={`block overflow-hidden h-7 rounded-full cursor-pointer transition-colors duration-300 border border-slate-700 ${botActive ? 'bg-green-600' : 'bg-slate-800'}`}><span className={`block w-5 h-5 mt-1 ml-1 rounded-full bg-white transition-transform duration-300 ${botActive ? 'translate-x-7' : 'translate-x-0'} shadow-lg`}></span></label></div>
          </GlassCard>
          <GlassCard className="p-8 space-y-8 border-slate-700/50 shadow-2xl">
            <h3 className="font-black text-white border-b border-slate-800 pb-4 flex items-center gap-3 text-sm uppercase tracking-[0.2em]"><Sparkles size={20} className="text-purple-400" /> Entrenamiento del Asistente</h3>
            {[{ label: "Mensaje de Bienvenida", val: welcomeText, set: setWelcomeText, key: 'welcome' }, { label: "Respuesta en Ausencia", val: awayText, set: setAwayText, key: 'away' }].map((item: any) => (
              <div key={item.key} className="space-y-3">
                <div className="flex justify-between items-end"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.label}</label><button onClick={() => generateBotMessage(item.key)} disabled={isGeneratingBotConfig[item.key as 'welcome' | 'away']} className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-4 py-2 rounded-xl hover:bg-purple-500/20 transition-all flex items-center gap-2 border border-purple-500/20">{isGeneratingBotConfig[item.key as 'welcome' | 'away'] ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Optimizar con IA</button></div>
                <textarea className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm text-slate-300 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 outline-none transition-all placeholder:text-slate-700 min-h-[100px]" value={item.val} onChange={(e) => item.set(e.target.value)} />
              </div>
            ))}
            <div className="pt-4 flex justify-end"><button onClick={saveBotSettings} disabled={isSavingBot} className="px-10 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-50 flex items-center gap-3 shadow-xl transition-all active:scale-95"><Save size={18} />{isSavingBot ? 'Sincronizando' : 'Guardar Entrenamiento'}</button></div>
          </GlassCard>
        </div>
      )}

      {/* --- MODAL FLOTANTE --- */}
      {isModalVisible && (
        <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-500 ${isModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div onClick={handleCloseModal} className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer transition-all"></div>
          
          <div className={`relative bg-slate-900 border-l border-slate-800 h-full shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden transform transition-all duration-500 ease-out flex ${isModalOpen ? 'translate-x-0' : 'translate-x-full'} ${showHistory ? 'w-full max-w-6xl' : 'w-full max-w-lg'}`}>
            <button onClick={handleCloseModal} className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all z-50"><X size={24} /></button>

            {/* --- PANEL IZQUIERDO: HISTORIAL --- */}
            {showHistory && (
                  <div className="h-full w-2/3 flex flex-col bg-slate-950/50 border-r border-slate-800 animate-in fade-in slide-in-from-right-10 duration-500">
                      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10 flex justify-between items-center">
                          <div>
                              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-3"><MessageCircle className="text-green-500"/> Historial de Chat</h3>
                              <p className="text-xs text-slate-500 font-mono mt-1">Sesión: {selectedStudent?.phone || '...'} (n8n Logs)</p>
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">{historyData.length} Mensajes</div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-950">
                          {loadingHistory ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50"><Loader2 size={40} className="animate-spin text-blue-500"/><p className="text-xs font-black uppercase tracking-[0.2em]">Recuperando Logs...</p></div>
                          ) : historyData.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-30"><SearchX size={60}/><p className="text-xs font-black uppercase tracking-[0.2em]">No se encontró historial</p></div>
                          ) : (
                              historyData.map((row, idx) => {
                                  const msg = row.message;
                                  if (!msg) return null;
                                  const isHuman = msg.type === 'human';
                                  let content = msg.content || '';
                                  if (isHuman && content.includes("Mensaje del paciente en texto:")) content = content.split("Mensaje del paciente en texto:")[1].split("Mensaje del paciente en transcripción")[0].trim();
                                  if (msg.type === 'ai' && content.includes("Agent stopped")) return null;

                                  return (
                                      <div key={idx} className={`flex ${isHuman ? 'justify-start' : 'justify-end'}`}>
                                          <div className={`max-w-[80%] ${isHuman ? 'bg-slate-800 text-slate-200 rounded-bl-none' : 'bg-green-600/20 text-green-100 border border-green-500/30 rounded-br-none'} p-4 rounded-2xl shadow-md text-sm leading-relaxed`}>
                                              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-2 opacity-50">
                                                  {isHuman ? <User size={10}/> : <Bot size={10}/>} {isHuman ? 'Alumno' : 'Kennedy Bot'}
                                              </div>
                                              {content}
                                          </div>
                                      </div>
                                  )
                              })
                          )}
                      </div>
                  </div>
            )}

            {/* --- PANEL DERECHO --- */}
            <div className={`h-full overflow-y-auto custom-scrollbar p-10 flex-shrink-0 transition-all duration-500 ${showHistory ? 'w-1/3 bg-slate-900' : 'w-full'}`}>
            
            {/* VISTA DETALLE ALUMNO */}
            {selectedStudent && !selectedCareer && (
              <div className="animate-in fade-in duration-700 space-y-8">
                
                {/* --- MODO EDICIÓN --- */}
                {isEditingProfile ? (
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2"><Edit3 size={18}/> Editar Perfil</h3>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Nombre Completo</label>
                            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">DNI</label>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.dni} onChange={e => setEditForm({...editForm, dni: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Legajo</label>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.legajo || ''} onChange={e => setEditForm({...editForm, legajo: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Carrera</label>
                            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.careerId || ''} onChange={e => setEditForm({...editForm, careerId: e.target.value})}>
                                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Sede</label>
                            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})}>
                                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Estado</label>
                            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                {ESTADOS.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-600">Cancelar</button>
                            <button onClick={handleSaveProfile} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500">Guardar Cambios</button>
                        </div>
                    </div>
                ) : (
                    // --- VISTA NORMAL ---
                    <div className="text-center relative group-header">
                        <button onClick={handleEditClick} className="absolute top-0 left-0 p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-blue-600 hover:text-white transition-all" title="Editar Perfil Manualmente">
                            <Edit3 size={16} />
                        </button>
                        <div className="h-28 w-28 mx-auto rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-4xl font-black mb-6 shadow-2xl border-4 border-slate-900 ring-1 ring-slate-800">{selectedStudent.name.charAt(0)}</div>
                        {selectedStudent.secretaria && (<div className="mt-4 bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex flex-col items-center gap-2 animate-pulse"><div className="flex items-center gap-2 text-red-400 font-black uppercase tracking-widest text-xs"><AlertCircle size={16} /> Requiere Asistencia</div><p className="text-xs text-red-200 text-center">El alumno solicitó hablar con un humano.</p></div>)}
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mt-4">{selectedStudent.name}</h2>
                        <div className="flex flex-col items-center gap-2 mt-3">
                            <p className="text-blue-400 font-bold text-sm tracking-tight">{selectedStudent.career}</p>
                            {selectedStudent.legajo && <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 uppercase">Legajo #{selectedStudent.legajo}</span>}
                        </div>
                        <div className="mt-6 flex justify-center"><StatusBadge status={selectedStudent.status} /></div>
                    </div>
                )}

                {/* OCULTAR ACCIONES SI ESTAMOS EDITANDO */}
                {!isEditingProfile && (
                    <>
                        {selectedStudent.secretaria ? (
                            <button onClick={handleResolveSituation} disabled={isResolving} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3">{isResolving ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} Situación Resuelta</button>
                        ) : (<div className="w-full py-3 bg-slate-800/50 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-center border border-slate-800 flex items-center justify-center gap-2"><Bot size={14} className="text-green-500"/> Bot Activo - Monitoreando</div>)}

                        <div className={`grid ${showHistory ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-xl text-blue-400"><Phone size={16} /></div>
                                <div className="overflow-hidden"><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Teléfono</p><p className="text-sm font-bold text-slate-200 truncate">{selectedStudent.phone || 'S/D'}</p></div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-xl text-red-400"><MapPin size={16} /></div>
                                <div className="overflow-hidden"><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ubicación</p><p className="text-sm font-bold text-slate-200 truncate">{selectedStudent.location || 'S/D'}</p></div>
                            </div>
                        </div>

                        <div className={`grid ${showHistory ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                            <button className="flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all"><MessageCircle size={18} /><span>WhatsApp</span></button>
                            <button onClick={toggleHistoryView} className={`flex items-center justify-center gap-3 py-4 border rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showHistory ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}><History size={18} /><span>{showHistory ? 'Ocultar Chat' : 'Ver Historial'}</span></button>
                        </div>

                        <div className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800 shadow-inner group focus-within:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-[10px] font-black text-slate-500 flex items-center gap-3 uppercase tracking-[0.2em]"><AlignLeft size={16} className="text-blue-500"/> Notas Internas</h3><button onClick={saveNotes} disabled={isSavingNotes || notesBuffer === selectedStudent.notes} className="text-[10px] font-bold text-blue-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">{isSavingNotes ? 'Guardando...' : 'Guardar'}</button></div>
                            <textarea className="w-full bg-transparent text-sm text-slate-300 border-none outline-none resize-none placeholder:text-slate-700 min-h-[100px]" placeholder="Escribe notas..." value={notesBuffer} onChange={(e) => setNotesBuffer(e.target.value)} />
                        </div>

                        <div className="bg-purple-900/10 rounded-3xl p-6 border border-purple-500/20 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100} className="text-blue-500"/></div>
                            <h3 className="text-[10px] font-black text-blue-400 flex items-center gap-3 mb-4 uppercase tracking-[0.2em] relative z-10"><Sparkles size={16} /> Analista Académico IA</h3>
                            {analysisChat.length === 0 && (<div className="text-center py-4"><button onClick={startAnalysis} disabled={isAnalyzing} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2 mx-auto">{isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <Search size={14}/>} {selectedStudent.secretaria ? 'Sintetizar Caso' : 'Iniciar Análisis'}</button></div>)}
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar relative z-10">{analysisChat.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'}`}>{msg.content}</div></div>))}</div>
                            
                            {/* INPUT PARA HABLAR CON LA IA */}
                            {analysisChat.length > 0 && (
                                <div className="relative z-10 flex gap-2 mt-3 pt-3 border-t border-slate-800/50">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                        placeholder="Pregunta algo sobre el alumno..."
                                        value={analysisInput}
                                        onChange={(e) => setAnalysisInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendAnalysisMessage()}
                                    />
                                    <button 
                                        onClick={sendAnalysisMessage}
                                        disabled={isAnalyzing || !analysisInput.trim()}
                                        className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 shadow-lg"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] pl-2 border-l-4 border-blue-600">Legajo Digital</h3>
                            {studentDocuments.length > 0 ? (
                                <ul className="space-y-3">
                                {studentDocuments.map((doc) => (
                                    <li key={doc.id} onClick={() => downloadDocument(doc.id, doc.file_name)} className="flex items-center justify-between text-xs font-bold text-slate-300 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:border-blue-500 hover:bg-blue-600/10 cursor-pointer group transition-all duration-300">
                                    <div className="flex items-center gap-3"><FileCheck size={18} className="text-green-500" /> <span className="uppercase">{doc.document_type}</span></div>
                                    <Download size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                    </li>
                                ))}
                                </ul>
                            ) : <div className="text-xs text-slate-600 font-black uppercase tracking-widest p-10 bg-slate-950/30 rounded-3xl text-center border border-slate-900 border-dashed">Carpeta vacía</div>}
                        </div>
                    </>
                )}
              </div>
            )}

            {/* VISTA DETALLE CARRERA */}
            {selectedCareer && (
              <div className="p-10 w-full animate-in fade-in duration-700 space-y-8 overflow-y-auto">
                <div className="text-center pb-8 border-b border-slate-800">
                  <div className="h-24 w-24 mx-auto rounded-[2rem] bg-blue-900/20 flex items-center justify-center text-blue-500 mb-6 border border-blue-500/20 shadow-inner"><GraduationCap size={48} /></div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{selectedCareer.name}</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3 bg-slate-800 px-4 py-1.5 rounded-full inline-block border border-slate-700">{selectedCareer.duration}</p>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 text-center"><p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">Inversión</p><p className="font-black text-white text-lg">{selectedCareer.fees} <span className="text-[10px] text-slate-500">CUOTAS</span></p></div>
                    <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 text-center"><p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1">Estructura</p><p className="font-black text-white text-lg">{selectedCareer.subjects} <span className="text-[10px] text-slate-500">MATERIAS</span></p></div>
                  </div>
                  <div className="space-y-6 text-slate-300">
                    <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50"><p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mb-3">Modalidad de Cursado</p><p className="text-sm font-bold text-slate-300">{selectedCareer.modality}</p></div>
                    <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/50"><p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mb-3">Esquema de Evaluación</p><p className="text-sm font-bold text-slate-300">{selectedCareer.evaluations_format}</p></div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}