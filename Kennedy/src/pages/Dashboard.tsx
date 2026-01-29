import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient'; 
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Users, GraduationCap, MessageSquare, LogOut, 
  CheckCircle2, AlertCircle, Send, ChevronRight, UserPlus, 
  Bot, Sparkles, Pencil, X, Phone, Mail, MapPin, BookOpen,
  Shield, Power, Activity, Trash2, Plus, Loader2, Eye, Map, Lock, StickyNote, Save
} from 'lucide-react';

const API_URL = 'https://webs-de-vintex-kennedy.1kh9sk.easypanel.host';

// 🔒 CONSTANTE PARA LA CUENTA PROTEGIDA (Super Admin)
const SUPER_ADMIN_EMAIL = 'kennedy.vintex@gmail.com';

const STUDENT_STATUSES = [
  "Sólo preguntó", "Documentación", "En Proceso", 
  "Inscripto", "Deudor", "Reconocimiento", "Alumno Regular"
];

const SEDES_KENNEDY = [
    "CATAMARCA", "PILAR", "SANTIAGO DEL ESTERO", "SAN NICOLAS"
];

// Objeto vacío para estudiantes
const EMPTY_STUDENT = {
  legdef: '', full_name: '', "numero Identificacion": '', 
  telefono1: '', telefono2: '', "correo Personal": '', "correo Corporativo": '', 
  "nombrePrograma": '', "codTipoPrograma": '', "codPuntoKennedy": 'CATAMARCA', 
  "anio De Egreso": '', status: 'Sólo preguntó', mood: 'Neutro',
  "solicita secretaria": false, "bot active": true, nota_del_estudiante: ''
};

// Objeto vacío para carreras (Basado en la estructura SQL)
const EMPTY_CAREER = {
  "CARRERA": '',
  "DURACIÓN": '',
  "ARANCEL CUATRIMESTRAL": 0,
  "TOTAL DE MATERIAS": 0,
  "MODALIDAD DE CURSADO": '',
  "DIAGRAMACIÓN DE MATERIAS": '',
  "CLASES": '',
  "EVALUACIONES": '',
  "PERIODOS DE INGRESO": '',
  "TF O TESIS": '',
  "PRACTICAS PROFESIONALES": '',
  "TITULO INTERMEDIO (TI)": '',
  "NOMBRE TI": '',
  "DURACIÓN TI": '',
  "TRAMITE DE RECONOCIMIENTOS": '',
  "IDIOMAS": ''
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [user, setUser] = useState<any>(null);
  
  // Datos
  const [students, setStudents] = useState<any[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Estado UI
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [globalBotActive, setGlobalBotActive] = useState(true); 

  // --- ESTADOS PARA MODALES Y PANELES ---
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [studentNote, setStudentNote] = useState('');
  
  // Modales Alumnos
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<any>(EMPTY_STUDENT);
  const [editStudentForm, setEditStudentForm] = useState<any>({});

  // Modales Carreras (NUEVO)
  const [showCreateCareerModal, setShowCreateCareerModal] = useState(false);
  const [newCareerForm, setNewCareerForm] = useState<any>(EMPTY_CAREER);
  const [selectedCareer, setSelectedCareer] = useState<any>(null);
  const [isEditingCareer, setIsEditingCareer] = useState(false);
  const [editCareerForm, setEditCareerForm] = useState<any>({});

  // IA
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- CARGA INICIAL ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user-data');
    const token = localStorage.getItem('sb-token');
    
    if (!storedUser || !token) { navigate('/login'); return; }
    if (!user) setUser(JSON.parse(storedUser));
    
    fetchData();
    fetchCareers();
    fetchStaff();
    fetchGlobalBotStatus();

    // Realtime subscriptions
    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student' }, () => {
          fetchData(); 
          if(selectedStudent) refreshChatForStudent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfil_staff' }, () => fetchStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resumen_carreras' }, () => fetchCareers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Mensaje_de_secretaria' }, () => {
          if(selectedStudent) refreshChatForStudent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_settings' }, () => fetchGlobalBotStatus())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedStudent]); 

  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [chatHistory, activeTab]);

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };

  // --- API HELPER FUNCTIONS ---

  const fetchData = async () => {
    if (students.length === 0) setLoading(true);
    try {
      const token = localStorage.getItem('sb-token');
      const res = await fetch(`${API_URL}/api/students?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data) setStudents(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCareers = async () => {
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${API_URL}/api/careers`, { headers: { 'Authorization': `Bearer ${token}` }});
    const data = await res.json();
    setCareers(data);
  };

  const fetchStaff = async () => {
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${API_URL}/api/staff`, { headers: { 'Authorization': `Bearer ${token}` }});
    const data = await res.json();
    setStaffList(data);
  };

  // --- ADAPTADORES DE CHAT ---
  const adaptChatHistory = (rawHistory: any[]) => {
    if (!Array.isArray(rawHistory)) return [];
    return rawHistory.map(row => {
      if (row.role && row.content) return row;
      try {
        let parsedMessage = row.message;
        if (typeof parsedMessage === 'string') {
            try { parsedMessage = JSON.parse(parsedMessage); } catch(e) { return { id: row.id, role: 'user', content: row.message }; }
        }
        if (parsedMessage && typeof parsedMessage === 'object') {
          return {
            id: row.id,
            role: parsedMessage.type === 'human' ? 'user' : 'assistant', 
            content: parsedMessage.content 
          };
        }
        return row;
      } catch (e) { return row; }
    });
  };

  const fetchDirectChat = async (studentData: any) => {
      if(!studentData) return [];
      const p1 = studentData.telefono1 ? studentData.telefono1.replace(/\D/g, '') : 'X';
      const p2 = studentData.telefono2 ? studentData.telefono2.replace(/\D/g, '') : 'X';
      let queryFilter = [];
      if (p1.length > 5) queryFilter.push(`session_id.ilike.%${p1}%`);
      if (p2.length > 5) queryFilter.push(`session_id.ilike.%${p2}%`);

      if (queryFilter.length > 0) {
          const { data } = await supabase.from('n8n_chat_histories').select('*').or(queryFilter.join(',')).order('id', { ascending: true });
          if (data) return adaptChatHistory(data);
      }
      return [];
  };

  // ✅ CORRECCIÓN TS: Eliminado el parámetro studentId que no se usaba
  const refreshChatForStudent = async () => {
      if(!selectedStudent) return;
      const chats = await fetchDirectChat(selectedStudent);
      setChatHistory(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(chats)) return chats;
          return prev;
      });
  };

  // --- GESTIÓN ALUMNOS ---
  const handleCreateStudent = async () => {
      const token = localStorage.getItem('sb-token');
      try {
          const res = await fetch(`${API_URL}/api/students`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newStudentForm)
          });
          if(res.ok) {
              alert("✅ Alumno creado exitosamente");
              setShowCreateStudentModal(false);
              setNewStudentForm(EMPTY_STUDENT);
              fetchData();
          } else {
              const err = await res.json();
              alert("❌ Error: " + err.error);
          }
      } catch (e) { alert("Error de conexión"); }
  };

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setStudentNote(student.nota_del_estudiante || ''); 
    setActiveTab('chat');
    setAiAnswer(''); setAiQuestion('');
    
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${API_URL}/api/students/${student.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.student) {
        setSelectedStudent(data.student);
        setStudentNote(data.student.nota_del_estudiante || '');
    }
    const directChats = await fetchDirectChat(data.student || student);
    setChatHistory(directChats);
  };

  const openEditStudentModal = () => { setEditStudentForm(selectedStudent); setShowEditStudentModal(true); };

  const saveStudentChanges = async () => {
    const token = localStorage.getItem('sb-token');
    try {
        await fetch(`${API_URL}/api/students/${selectedStudent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(editStudentForm)
        });
        setSelectedStudent(editStudentForm);
        setShowEditStudentModal(false);
        fetchData(); 
        alert("✅ Datos actualizados");
    } catch (e) { alert("Error guardando cambios"); }
  };

  const saveStudentNote = async () => {
      if(!selectedStudent) return;
      const token = localStorage.getItem('sb-token');
      try {
          await fetch(`${API_URL}/api/students/${selectedStudent.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ nota_del_estudiante: studentNote })
          });
          setSelectedStudent({...selectedStudent, nota_del_estudiante: studentNote});
          alert("✅ Nota guardada");
      } catch (e) { alert("Error al guardar la nota"); }
  };

  const handleQuickUpdate = async (field: string, value: any) => {
      if (!selectedStudent) return;
      const token = localStorage.getItem('sb-token');
      const prevValue = selectedStudent[field]; 
      let dbField = field;
      if (field === 'bot active') dbField = 'bot active'; 
      if (field === 'solicita_secretaria') dbField = 'solicita_secretaria';
      setSelectedStudent({ ...selectedStudent, [field]: value }); 
      try {
          await fetch(`${API_URL}/api/students/${selectedStudent.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ [dbField]: value })
          });
          if (field === 'solicita_secretaria' && value === false) fetchData();
      } catch (err) {
          alert("Error actualizando datos.");
          setSelectedStudent({ ...selectedStudent, [field]: prevValue }); 
      }
  };

  // --- GESTIÓN CARRERAS (NUEVO) ---

  const handleCreateCareer = async () => {
      const token = localStorage.getItem('sb-token');
      try {
          const res = await fetch(`${API_URL}/api/careers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newCareerForm)
          });
          if(res.ok) {
              alert("✅ Carrera creada exitosamente");
              setShowCreateCareerModal(false);
              setNewCareerForm(EMPTY_CAREER);
              fetchCareers();
          } else {
              const err = await res.json();
              alert("❌ Error: " + err.error);
          }
      } catch (e) { alert("Error de conexión al crear carrera"); }
  };

  const handleDeleteCareer = async (id: number) => {
      if(!confirm("⚠️ ¿Seguro que quieres borrar esta carrera? Esta acción es irreversible.")) return;
      const token = localStorage.getItem('sb-token');
      try {
          const res = await fetch(`${API_URL}/api/careers/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) {
              alert("✅ Carrera eliminada");
              fetchCareers();
              if(selectedCareer?.id === id) setSelectedCareer(null);
          } else {
              const err = await res.json();
              alert("❌ Error: " + err.error);
          }
      } catch (e) { alert("Error eliminando carrera"); }
  };

  const handleCareerClick = (career: any) => {
      setSelectedCareer(career);
      setEditCareerForm(career);
      setIsEditingCareer(false); 
  };

  const saveCareerChanges = async () => {
      const token = localStorage.getItem('sb-token');
      const res = await fetch(`${API_URL}/api/careers/${selectedCareer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(editCareerForm)
      });
      if(res.ok) {
          alert("✅ Carrera actualizada correctamente");
          setSelectedCareer(editCareerForm);
          setIsEditingCareer(false);
          fetchCareers();
      } else {
          const err = await res.json();
          alert("❌ Error: " + err.error);
      }
  };

  // --- GESTIÓN STAFF, BOT, CHAT ---
  const handleUpdateStaff = async (id: number, role: any, sede: string) => {
    const finalRole = role === "null" ? null : role;
    const token = localStorage.getItem('sb-token');
    await fetch(`${API_URL}/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newRole: finalRole, newSede: sede })
    });
    fetchStaff();
  };

  const handleDeleteStaff = async (id: number) => {
      if(!confirm("⚠️ ¿Estás seguro de eliminar este usuario?")) return;
      const token = localStorage.getItem('sb-token');
      const res = await fetch(`${API_URL}/api/staff/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if(res.ok) { alert("Usuario eliminado."); fetchStaff(); } else { alert("Error eliminando usuario."); }
  };

  const fetchGlobalBotStatus = async () => {
    try {
        const token = localStorage.getItem('sb-token');
        const res = await fetch(`${API_URL}/api/admin/bot-status`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            if (typeof data.is_active === 'boolean') setGlobalBotActive(data.is_active);
        }
    } catch (e) { }
  };

  const toggleSystemBot = async () => {
    const newState = !globalBotActive;
    setGlobalBotActive(newState); 
    try {
        const token = localStorage.getItem('sb-token');
        await fetch(`${API_URL}/api/admin/bot-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_active: newState }) 
        });
    } catch (e) { setGlobalBotActive(!newState); alert("Error al conectar con el servidor"); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedStudent) return;
    const token = localStorage.getItem('sb-token');
    const phone = selectedStudent.telefono1 || selectedStudent.telefono2;
    if (!phone) return alert("El alumno no tiene teléfono registrado.");
    const tempMsg = { role: 'assistant', content: messageInput, id: Date.now() };
    setChatHistory(prev => [...prev, tempMsg]);
    setMessageInput('');
    await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ studentId: selectedStudent.id, phone, messageText: tempMsg.content })
    });
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedStudent) return;
    setAnalyzing(true);
    setAiAnswer('');
    try {
        const token = localStorage.getItem('sb-token');
        const res = await fetch(`${API_URL}/api/bot/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ studentId: selectedStudent.id, question: aiQuestion })
        });
        const data = await res.json();
        setAiAnswer(data.answer);
    } catch (err) { alert("Error IA"); } finally { setAnalyzing(false); }
  };

  const parseMessageBody = (content: any): string => {
    if (content === null || content === undefined) return '';
    if (typeof content === 'object') {
      if (content.output?.message) return content.output.message;
      if (content.message) return content.message;
      if (content.content && typeof content.content === 'string') return parseMessageBody(content.content); 
      return JSON.stringify(content);
    }
    if (typeof content === 'string') {
      const cleanContent = content.trim();
      if (cleanContent.startsWith("Mensaje de la persona:")) return cleanContent.replace("Mensaje de la persona:", "").replace(/null/g, "").trim();
      if (cleanContent.includes("[Used tools:") || cleanContent.includes("Tool:")) {
         const jsonMatch = cleanContent.match(/{\s*"output":\s*{[\s\S]*?}\s*}/);
         if (jsonMatch) { try { const parsed = JSON.parse(jsonMatch[0]); if (parsed.output?.message) return parsed.output.message; } catch(e){} }
         return ""; 
      }
      if (cleanContent.startsWith('{') || cleanContent.startsWith('[')) { try { const parsed = JSON.parse(cleanContent); return parseMessageBody(parsed); } catch (e) { return cleanContent; } }
      return cleanContent;
    }
    return String(content);
  };

  const renderMessageContent = (rawContent: any) => {
    let textToDisplay = parseMessageBody(rawContent);
    if (typeof textToDisplay !== 'string') textToDisplay = "";
    if (!textToDisplay || textToDisplay.trim() === "") return null;
    const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g;
    const images: string[] = [];
    let match;
    while ((match = driveRegex.exec(textToDisplay)) !== null) { images.push(match[1]); }
    const cleanText = textToDisplay.replace(driveRegex, '').trim();
    return (
      <div className="flex flex-col gap-3">
        {cleanText && (<p className="whitespace-pre-wrap break-words">{cleanText}</p>)}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {images.map((fileId, idx) => (
              <a key={idx} href={`https://drive.google.com/file/d/${fileId}/view?usp=sharing`} target="_blank" rel="noreferrer" className="block relative group rounded-xl overflow-hidden border border-slate-700 aspect-square">
                <img src={`https://drive.google.com/thumbnail?id=${fileId}&sz=w400`} alt="Adjunto" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/337/337946.png"; (e.target as HTMLImageElement).className = "w-12 h-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50"; }} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm"><Eye size={12} className="inline mr-1"/> Ver</span></div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- RENDER UI ---
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-20 lg:w-64 bg-slate-900/50 border-r border-slate-800 flex-col p-4 sticky top-0 h-screen z-50">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <span className="font-black text-white text-xl italic">K</span>
            </div>
            <span className="font-bold text-lg hidden lg:block tracking-tight text-white">Kennedy<span className="text-blue-500">Sys</span></span>
          </div>
          <nav className="space-y-2">
            <NavItem icon={<Users />} label="Alumnos" active={activeTab === 'students' || activeTab === 'chat'} onClick={() => {setActiveTab('students'); setSelectedStudent(null);}} />
            <NavItem icon={<GraduationCap />} label="Carreras" active={activeTab === 'careers'} onClick={() => setActiveTab('careers')} />
            {user?.rol === 'admin' && <NavItem icon={<UserPlus />} label="Equipo" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />}
            {user?.rol === 'admin' && <NavItem icon={<Shield className="text-red-400" />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
          </nav>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group">
          <LogOut size={20} />
          <span className="hidden lg:block font-medium text-sm group-hover:translate-x-1 transition-transform">Salir</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 max-w-7xl mx-auto mb-20 h-screen overflow-hidden flex flex-col">
         <header className="flex justify-between items-center mb-8 shrink-0">
            <h1 className="text-2xl font-bold text-white capitalize">{activeTab === 'chat' ? 'Expediente' : activeTab === 'students' ? 'Panel de Alumnos' : activeTab}</h1>
            
            {/* BOTONES DE ACCIÓN PRINCIPAL */}
            <div className="flex gap-2">
                {activeTab === 'students' && (user?.rol === 'admin' || user?.rol === 'asesor') && (
                    <>
                        <input className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()}/>
                        <button onClick={() => setShowCreateStudentModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl flex items-center gap-2 px-4 text-sm font-bold shadow-lg active:scale-95 transition-all">
                            <Plus size={16}/> Nuevo
                        </button>
                    </>
                )}
                
                {/* BOTÓN NUEVA CARRERA (Solo Admin) */}
                {activeTab === 'careers' && user?.rol === 'admin' && (
                    <button onClick={() => setShowCreateCareerModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl flex items-center gap-2 px-4 text-sm font-bold shadow-lg active:scale-95 transition-all">
                        <Plus size={16}/> Nueva Carrera
                    </button>
                )}
            </div>
         </header>

         {/* CONTENEDOR CON SCROLL */}
         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">

         {/* 1. LISTA ALUMNOS */}
         {activeTab === 'students' && (
            <div className="grid gap-3 pb-20">
                {loading && <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>}
                {!loading && students.map(s => (
                      <GlassCard key={s.id} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 border-l-4 ${s["solicita secretaria"] ? 'border-l-red-500 bg-red-500/5' : 'border-l-transparent'}`} onClick={() => handleStudentClick(s)}>
                          <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${s["solicita secretaria"] ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {s.full_name?.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                  <h3 className="font-bold text-white text-sm">{s.full_name}</h3>
                                  <p className="text-xs text-slate-500">{s.dni} | {s.status}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${s.mood?.includes('enojado') ? 'border-red-500/30 text-red-400' : 'border-slate-700 text-slate-400'}`}>{s.mood}</span>
                             {s["solicita secretaria"] && <AlertCircle className="text-red-500 animate-pulse" size={18}/>}
                             <ChevronRight size={16} className="text-slate-600"/>
                          </div>
                      </GlassCard>
                  ))}
            </div>
         )}

         {/* 2. CHAT ALUMNO */}
         {activeTab === 'chat' && selectedStudent && (
             <div className="grid lg:grid-cols-3 gap-6 pb-20">
                 <div className="flex flex-col gap-4">
                     <GlassCard className="p-6 relative">
                         <div className="absolute top-4 right-4 z-10 flex gap-2">
                             <button onClick={openEditStudentModal} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="Editar Información"><Pencil size={14}/></button>
                         </div>
                         <div className="mt-4 space-y-6">
                             <div className="text-center">
                                 <div className="h-20 w-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-slate-500">{selectedStudent.full_name?.substring(0,1)}</div>
                                 <h2 className="text-xl font-bold text-white leading-tight">{selectedStudent.full_name}</h2>
                                 <p className="text-sm text-slate-500 mt-1">{selectedStudent["numero Identificacion"]}</p>
                             </div>
                             <div className="space-y-4">
                                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                     <span className="text-xs font-bold text-slate-400 flex gap-2"><Bot size={16}/> IA Activa</span>
                                     <button onClick={() => handleQuickUpdate('bot active', !selectedStudent['bot active'])} className={`w-12 h-6 rounded-full p-1 flex items-center transition-all duration-300 ease-in-out active:scale-90 ${selectedStudent['bot active'] ? 'bg-green-500' : 'bg-slate-700'}`}>
                                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${selectedStudent['bot active'] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                     </button>
                                 </div>
                                 <div className="space-y-3">
                                     <InfoItem icon={<Phone size={12}/>} label="Teléfono" value={selectedStudent.telefono1}/>
                                     <InfoItem icon={<Mail size={12}/>} label="Email" value={selectedStudent["correo Personal"]}/>
                                     <InfoItem icon={<BookOpen size={12}/>} label="Carrera" value={selectedStudent["nombrePrograma"]}/>
                                     <InfoItem icon={<MapPin size={12}/>} label="Sede" value={selectedStudent["codPuntoKennedy"]}/>
                                     <InfoItem icon={<Activity size={12}/>} label="Estado" value={selectedStudent.status}/>
                                 </div>
                             </div>
                             {selectedStudent["solicita secretaria"] && (
                                 <div className="border-t border-slate-800 pt-6">
                                     <button onClick={() => handleQuickUpdate('solicita_secretaria', false)} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Marcar Atendido</button>
                                 </div>
                             )}
                             <div className="border-t border-slate-800 pt-4">
                                 <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-2 mb-2"><StickyNote size={12} className="text-yellow-500"/> Notas Internas</label>
                                 <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:border-yellow-500/50 focus:bg-slate-900 outline-none resize-none h-24 mb-2" placeholder="Escribe recordatorios o tareas pendientes sobre este alumno..." value={studentNote} onChange={(e) => setStudentNote(e.target.value)} />
                                 <button onClick={saveStudentNote} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"><Save size={14}/> Guardar Nota</button>
                             </div>
                         </div>
                     </GlassCard>
                 </div>
                 <div className="lg:col-span-2 flex flex-col gap-6">
                      <GlassCard className="flex flex-col border-slate-800 overflow-hidden h-[600px]">
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 custom-scrollbar">
                              {chatHistory.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50"><MessageSquare size={48} className="mb-4"/><p>Sin historial reciente</p></div>
                              ) : (
                                  chatHistory.map((msg) => (
                                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                          <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-blue-600 text-white rounded-tr-none'}`}>{renderMessageContent(msg.content)}</div>
                                      </div>
                                  ))
                              )}
                              <div ref={messagesEndRef}/>
                          </div>
                          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
                              <form onSubmit={handleSendMessage} className="flex gap-2">
                                  <input className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" placeholder="Escribir mensaje..." value={messageInput} onChange={e=>setMessageInput(e.target.value)}/>
                                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors"><Send size={20}/></button>
                              </form>
                          </div>
                      </GlassCard>
                      <GlassCard className="flex flex-col border-blue-500/20 bg-blue-900/5">
                            <div className="px-4 py-3 border-b border-blue-500/20 flex items-center gap-2 text-blue-400 bg-blue-900/20 shrink-0"><Sparkles size={16} /> <h3 className="font-bold text-xs uppercase tracking-widest">Asistente IA</h3></div>
                            <div className="p-4 bg-slate-950/40 text-sm text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">{analyzing ? <div className="text-blue-400 animate-pulse">Analizando...</div> : aiAnswer || <span className="text-slate-600 italic text-xs">Consulta sobre el alumno o sus documentos.</span>}</div>
                            <div className="p-3 bg-slate-900/80 border-t border-blue-500/20 shrink-0">
                                <form onSubmit={handleAskAI} className="flex gap-2">
                                    <input className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Ej: ¿Debe documentos?" value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)}/>
                                    <button disabled={analyzing} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50">Preguntar</button>
                                </form>
                            </div>
                      </GlassCard>
                 </div>
             </div>
         )}

         {/* 3. VISTA STAFF */}
         {activeTab === 'staff' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                 {staffList.map((staff) => {
                     const isSuperAdmin = staff.email === SUPER_ADMIN_EMAIL;
                     return (
                         <GlassCard key={staff.id} className={`p-6 relative group border-slate-800 hover:border-slate-700 transition-all ${!staff.rol ? 'opacity-50 grayscale' : ''}`}>
                             {user.rol === 'admin' && !isSuperAdmin && (
                                 <button onClick={() => handleDeleteStaff(staff.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-full" title="Eliminar Usuario"><Trash2 size={16}/></button>
                             )}
                             {isSuperAdmin && <div className="absolute top-4 right-4 text-blue-500" title="Cuenta Protegida"><Lock size={16}/></div>}
                             <div className="mb-4 flex items-center gap-3">
                                 <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-white">{staff.nombre?.substring(0,1)}</div>
                                 <div><h3 className="text-white font-bold text-sm">{staff.nombre}</h3><p className="text-xs text-slate-500">{staff.email}</p></div>
                             </div>
                             <div className="space-y-4">
                                 <div className="space-y-1">
                                     <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1"><Shield size={10}/> Rol Asignado</label>
                                     <select value={staff.rol || 'null'} onChange={(e) => handleUpdateStaff(staff.id, e.target.value, staff.sede)} className={`w-full bg-slate-950 border border-slate-800 text-white text-xs rounded p-2 focus:border-blue-500 outline-none ${!staff.rol ? 'text-red-400 border-red-900/30' : ''}`} disabled={user.rol !== 'admin' || isSuperAdmin}>
                                         <option value="null">🚫 Inactivo / Sin Acceso</option><option value="asesor">👔 Asesor</option>{user.rol === 'admin' && <option value="admin">🛡️ Admin</option>}
                                     </select>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1"><Map size={10}/> Sede Operativa</label>
                                     <select value={staff.sede || ''} onChange={(e) => handleUpdateStaff(staff.id, staff.rol, e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded p-2 focus:border-blue-500 outline-none" disabled={user.rol !== 'admin' || isSuperAdmin}>
                                         <option value="">-- Sin Sede --</option>{SEDES_KENNEDY.map(sede => (<option key={sede} value={sede}>{sede}</option>))}
                                     </select>
                                 </div>
                             </div>
                         </GlassCard>
                     );
                 })}
             </div>
         )}

         {/* 4. VISTA CARRERAS (Lista con opción de borrar para Admin) */}
         {activeTab === 'careers' && (
             <div className="space-y-4 pb-20">
                 <div className="grid gap-3">
                     {careers.map((c) => (
                         <GlassCard key={c.id} className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition-all group" onClick={() => handleCareerClick(c)}>
                             <div>
                                 <h3 className="font-bold text-white text-sm">{c.CARRERA}</h3>
                                 <p className="text-xs text-slate-500 mt-1">{c["DURACIÓN"]} | {c["MODALIDAD DE CURSADO"]}</p>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-blue-400 font-mono text-sm font-bold bg-blue-500/10 px-3 py-1 rounded-lg">${c["ARANCEL CUATRIMESTRAL"]}</span>
                                <Eye size={16} className="text-slate-600"/>
                                
                                {/* BOTÓN ELIMINAR CARRERA (Solo Admin) */}
                                {user?.rol === 'admin' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCareer(c.id); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                             </div>
                         </GlassCard>
                     ))}
                 </div>
             </div>
         )}
         
         {/* 5. VISTA ADMIN (Global Bot) */}
         {activeTab === 'admin' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-6 border-red-900/30 bg-red-950/10">
                    <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 shadow-xl">
                        <Bot size={40} className={globalBotActive ? "text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "text-slate-600"} />
                    </div>
                    <div><h2 className="text-2xl font-bold text-white">Estado Global del Bot</h2><p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm">Este interruptor apaga la IA para todos los alumnos en caso de emergencia.</p></div>
                    <button onClick={toggleSystemBot} className={`group relative px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-4 ${globalBotActive ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}>
                        <Power size={24}/> {globalBotActive ? "SISTEMA ONLINE" : "SISTEMA OFFLINE"}
                    </button>
                </GlassCard>
             </div>
         )}

         </div>
      </main>

      {/* --- MODALES --- */}

      {/* MODAL CREAR CARRERA (NUEVO) */}
      {showCreateCareerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Plus size={24} className="text-indigo-500"/> Nueva Carrera</h2>
                      <button onClick={() => setShowCreateCareerModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.keys(EMPTY_CAREER).map((key) => (
                          <div key={key} className={`space-y-1 ${['DIAGRAMACIÓN DE MATERIAS', 'PERFIL DEL EGRESADO', 'ALCANCE DEL TÍTULO'].some(long => key.includes(long)) ? 'md:col-span-2' : ''}`}>
                              <label className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">{key}</label>
                              {key.includes("DIAGRAMACIÓN") || key.includes("TESIS") || key.includes("CLASES") ? (
                                  <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none h-24" value={newCareerForm[key]} onChange={e => setNewCareerForm({...newCareerForm, [key]: e.target.value})} />
                              ) : (
                                  <input className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" type={key.includes("ARANCEL") || key.includes("TOTAL") ? "number" : "text"} value={newCareerForm[key]} onChange={e => setNewCareerForm({...newCareerForm, [key]: e.target.value})} />
                              )}
                          </div>
                      ))}
                  </div>
                  <button onClick={handleCreateCareer} className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all">CREAR CARRERA</button>
              </GlassCard>
          </div>
      )}

      {/* MODAL CREAR ALUMNO */}
      {showCreateStudentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Plus size={24} className="text-blue-500"/> Nuevo Alumno</h2>
                      <button onClick={() => setShowCreateStudentModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.keys(EMPTY_STUDENT).filter(k => k !== 'id' && k !== 'created_at' && k !== 'solicita secretaria' && k !== 'bot active' && k !== 'nota_del_estudiante').map((key) => (
                          <div key={key} className="space-y-1">
                              <label className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">{key.replace(/_/g, ' ')}</label>
                              {key === 'status' ? (
                                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={newStudentForm[key]} onChange={e => setNewStudentForm({...newStudentForm, [key]: e.target.value})}>
                                      {STUDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              ) : (
                                  <input className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={newStudentForm[key]} onChange={(e) => setNewStudentForm({...newStudentForm, [key]: e.target.value})}/>
                              )}
                          </div>
                      ))}
                  </div>
                  <button onClick={handleCreateStudent} className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all">CREAR FICHA</button>
              </GlassCard>
          </div>
      )}

      {/* MODAL EDITAR ALUMNO */}
      {showEditStudentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Pencil size={24} className="text-blue-500"/> Editar Alumno</h2>
                      <button onClick={() => setShowEditStudentModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.keys(EMPTY_STUDENT).filter(k => k !== 'id' && k !== 'created_at' && k !== 'solicita secretaria' && k !== 'bot active' && k !== 'nota_del_estudiante').map((key) => (
                          <div key={key} className="space-y-1">
                              <label className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">{key.replace(/_/g, ' ')}</label>
                              {key === 'status' ? (
                                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={editStudentForm[key]} onChange={e => setEditStudentForm({...editStudentForm, [key]: e.target.value})}>
                                      {STUDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              ) : (
                                  <input className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={editStudentForm[key] || ''} onChange={(e) => setEditStudentForm({...editStudentForm, [key]: e.target.value})}/>
                              )}
                          </div>
                      ))}
                  </div>
                  <button onClick={saveStudentChanges} className="w-full mt-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all">GUARDAR CAMBIOS</button>
              </GlassCard>
          </div>
      )}

      {/* MODAL DETALLE/EDICIÓN CARRERA */}
      {selectedCareer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                      <div className="w-full pr-4">
                          <label className="text-[10px] text-blue-500 uppercase font-bold tracking-wider block mb-1">Nombre de la Carrera</label>
                          <input className="bg-transparent border-b border-slate-700 w-full text-2xl font-bold text-white focus:border-blue-500 outline-none pb-1" value={isEditingCareer ? editCareerForm.CARRERA : selectedCareer.CARRERA} readOnly={!isEditingCareer} onChange={e=>setEditCareerForm({...editCareerForm, CARRERA: e.target.value})} />
                      </div>
                      <div className="flex gap-2 shrink-0 items-center">
                          {(user?.rol === 'admin') && (
                              <button onClick={() => setIsEditingCareer(!isEditingCareer)} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all ${isEditingCareer ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                  <Pencil size={14}/> {isEditingCareer ? 'Editando' : 'Editar'}
                              </button>
                          )}
                          <button onClick={() => setSelectedCareer(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700"><X size={20}/></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(selectedCareer).filter(k => k !== 'id' && k !== 'created_at' && k !== 'CARRERA').map(key => (
                            <div key={key} className={`space-y-1 ${['DIAGRAMACIÓN DE MATERIAS', 'PERFIL DEL EGRESADO', 'ALCANCE DEL TÍTULO'].some(long => key.includes(long)) ? 'md:col-span-2' : ''}`}>
                                <label className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">{key}</label>
                                {isEditingCareer ? (
                                    <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 min-h-[80px] focus:border-blue-500 outline-none custom-scrollbar focus:bg-slate-900 transition-colors" value={editCareerForm[key] || ''} onChange={e => setEditCareerForm({...editCareerForm, [key]: e.target.value})} />
                                ) : (
                                    <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/30 p-4 rounded-lg border border-slate-800/50 min-h-[50px]">{selectedCareer[key] || <span className="text-slate-600 italic">No especificado</span>}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    {isEditingCareer && (
                        <div className="sticky bottom-0 bg-slate-950/80 backdrop-blur-md pt-4 mt-8 border-t border-slate-800 flex justify-end gap-4">
                            <button onClick={() => setIsEditingCareer(false)} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={saveCareerChanges} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg transform active:scale-[0.98] transition-all flex items-center gap-2"><CheckCircle2 size={18}/> Guardar Cambios</button>
                        </div>
                    )}
              </GlassCard>
          </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {icon} <span className="hidden lg:block font-medium text-sm">{label}</span>
        </button>
    );
}

function InfoItem({ label, value, icon }: any) {
    return (
        <div className="mb-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">{icon} {label}</span>
            <p className="text-slate-200 text-sm font-medium mt-0.5 break-words pl-0.5">{value || 'Sin dato'}</p>
        </div>
    );
}