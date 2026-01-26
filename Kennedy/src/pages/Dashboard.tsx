import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Users, GraduationCap, MessageSquare, Search, LogOut, 
  CheckCircle2, AlertCircle, Send, ChevronRight, UserPlus, 
  Bot, Sparkles, Pencil, Save, X, Phone, Mail, MapPin, Hash, Calendar, BookOpen,
  Shield, Power, Activity, Loader2 // Agregué Loader2 para el icono de carga
} from 'lucide-react';

// Si te sigue marcando error aquí, asegúrate de tener el archivo src/vite-env.d.ts
const API_URL = 'https://webs-de-vintex-kennedy.1kh9sk.easypanel.host';

const STUDENT_STATUSES = [
  "Sólo preguntó", "Documentación", "En Proceso", 
  "Inscripto", "Deudor", "Reconocimiento", "Alumno Regular"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [user, setUser] = useState<any>(null);
  
  // Datos
  const [students, setStudents] = useState<any[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Estado UI
  // CORRECCIÓN: Ahora usamos esta variable en el renderizado (ver línea 336 aprox)
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');
  
  // Estado Admin (Control Global del Bot)
  const [globalBotActive, setGlobalBotActive] = useState(true); 

  // Estado Edición de Alumno
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // IA
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- CARGA INICIAL Y POLLING ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user-data');
    const token = localStorage.getItem('sb-token');
    
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }
    
    if (!user) setUser(JSON.parse(storedUser));
    
    // Carga inicial de datos
    fetchData();
    fetchCareers();
    fetchStaff();
    fetchGlobalBotStatus(); 

    const intervalId = setInterval(() => {
        if (activeTab === 'students') fetchData(); 
        if (activeTab === 'chat' && selectedStudent) refreshChatForStudent(selectedStudent.id);
    }, 300000); 

    return () => clearInterval(intervalId);
  }, [activeTab, selectedStudent]);

  
  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [chatHistory, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- FUNCIONES DE DATOS ---

  const fetchData = async () => {
    // Solo activamos loading si no hay alumnos cargados previamente para evitar parpadeos
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

  const refreshChatForStudent = async (studentId: any) => {
      try {
        const token = localStorage.getItem('sb-token');
        const res = await fetch(`${API_URL}/api/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.chatHistory && data.chatHistory.length !== chatHistory.length) {
            setChatHistory(data.chatHistory); 
        }
      } catch (e) { console.error(e); }
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

  // --- LÓGICA ADMIN (BOT TOGGLE) ---

  const fetchGlobalBotStatus = async () => {
    try {
        const token = localStorage.getItem('sb-token');
        const res = await fetch(`${API_URL}/api/admin/bot-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (typeof data.is_active === 'boolean') {
                setGlobalBotActive(data.is_active);
            } else if (typeof data.active === 'boolean') {
                setGlobalBotActive(data.active);
            }
        }
    } catch (e) { console.error("Error fetching bot status", e); }
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
    } catch (e) {
        console.error("Error cambiando estado del bot", e);
        setGlobalBotActive(!newState); 
        alert("Error al conectar con el servidor");
    }
  };

  // --- INTERACCIÓN ALUMNO ---

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setActiveTab('chat');
    setIsEditing(false); 
    setAiAnswer(''); setAiQuestion('');
    
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${API_URL}/api/students/${student.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.student) setSelectedStudent(data.student);
    if (data.chatHistory) setChatHistory(data.chatHistory);
  };

  const startEditing = () => {
    setEditForm({
      full_name: selectedStudent.full_name || '',
      dni: selectedStudent['numero Identificacion'] || '',
      legdef: selectedStudent.legdef || '',
      telefono1: selectedStudent.telefono1 || '',
      telefono2: selectedStudent.telefono2 || '',
      email_personal: selectedStudent['correo Personal'] || '',
      email_corporativo: selectedStudent['correo Corporativo'] || '',
      carrera: selectedStudent['nombrePrograma'] || '',
      tipo_programa: selectedStudent['codTipoPrograma'] || '',
      sede: selectedStudent['codPuntoKennedy'] || '',
      anio_egreso: selectedStudent['anio De Egreso'] || '',
      status: selectedStudent.status || ''
    });
    setIsEditing(true);
  };

  const saveEditing = async () => {
    const token = localStorage.getItem('sb-token');
    try {
      await fetch(`${API_URL}/api/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      
      setSelectedStudent({ 
        ...selectedStudent, 
        full_name: editForm.full_name,
        'numero Identificacion': editForm.dni,
        legdef: editForm.legdef,
        telefono1: editForm.telefono1,
        telefono2: editForm.telefono2,
        'correo Personal': editForm.email_personal,
        'correo Corporativo': editForm.email_corporativo,
        'nombrePrograma': editForm.carrera,
        'codTipoPrograma': editForm.tipo_programa,
        'codPuntoKennedy': editForm.sede,
        'anio De Egreso': editForm.anio_egreso,
        status: editForm.status
      });

      setIsEditing(false);
      fetchData(); 
      alert("✅ Datos guardados correctamente");
    } catch (e) {
      alert("Error al guardar cambios");
    }
  };

  const handleQuickUpdate = async (field: string, value: any) => {
      if (!selectedStudent) return;
      const token = localStorage.getItem('sb-token');
      const prevValue = selectedStudent[field]; 
      
      let dbField = field;
      if (field === 'bot_active') dbField = 'bot_active'; 
      if (field === 'solicita_secretaria') dbField = 'solicita_secretaria';
      if (field === 'status') dbField = 'status';
      
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

  const handleApproveStaff = async (id: number, role: string, sede: string) => {
      const token = localStorage.getItem('sb-token');
      await fetch(`${API_URL}/api/staff/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ newRole: role, newSede: sede })
      });
      fetchStaff();
  };

  // --- LÓGICA DE PARSEO AVANZADO (MULTIPLE IMG + LIMPIEZA) ---
  const renderMessageContent = (text: string) => {
    let cleanText = text;

    // 1. INTENTAR PARSEAR JSON (Maneja string sucio o string JSON limpio)
    if (typeof text === 'string') {
        // Buscar patrón {"output":
        const jsonStartIndex = text.indexOf('{"output":');
        
        if (jsonStartIndex !== -1) {
            const potentialJson = text.substring(jsonStartIndex);
            try {
                const parsed = JSON.parse(potentialJson);
                if (parsed.output?.message) {
                    cleanText = parsed.output.message;
                }
            } catch (e) { /* Error silencioso, usamos texto original */ }
        } else {
            // Intento parse directo por si es JSON puro sin logs
            try {
                const parsed = JSON.parse(text);
                if (parsed.output?.message) cleanText = parsed.output.message;
                else if (parsed.message) cleanText = parsed.message;
            } catch (e) { /* No es JSON, es texto plano */ }
        }
    }

    if (typeof cleanText !== 'string') return null;

    // 2. BUSCAR TODAS LAS IMÁGENES (MATCH ALL)
    // Regex con flag 'g' para encontrar todas las coincidencias
    const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g;
    const matches = [...cleanText.matchAll(driveRegex)];
    const imageIds = matches.map(m => m[1]);

    // 3. LIMPIEZA DE TEXTO
    // A. Quitar los links del texto para que no se vean duplicados
    let displayText = cleanText.replace(driveRegex, '').trim();

    // B. Quitar texto técnico del sistema ("Descripción de la imagen...")
    // Cortamos el texto antes de que empiece la descripción técnica
    const technicalSplitters = [
        "Descripción de la imagen", 
        "Description of the image",
        "Image description"
    ];
    
    technicalSplitters.forEach(splitter => {
        const splitIndex = displayText.indexOf(splitter);
        if (splitIndex !== -1) {
            displayText = displayText.substring(0, splitIndex).trim();
        }
    });
    
    // Quitar comas o puntos sueltos que quedan tras borrar links
    displayText = displayText.replace(/^[,.\s]+|[,.\s]+$/g, '');

    // 4. RENDERIZADO FINAL
    return (
        <div className="flex flex-col gap-2">
            {/* Texto limpio del usuario (si queda algo) */}
            {displayText && (
                <div className="whitespace-pre-wrap">{displayText}</div>
            )}

            {/* Galería de imágenes (Si hay matches) */}
            {imageIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                    {imageIds.map((fileId, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-black/20">
                            <a 
                                href={`https://drive.google.com/file/d/${fileId}/view`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="block"
                            >
                                <img 
                                    // Usamos lh3.googleusercontent para thumbnails rápidos o fallback a la lógica anterior
                                    src={`https://lh3.googleusercontent.com/d/${fileId}=s400`} 
                                    alt={`Adjunto ${idx + 1}`} 
                                    className="max-w-[200px] h-auto max-h-[200px] object-cover hover:opacity-90 transition-opacity" 
                                    onError={(e) => {
                                        // Fallback si falla la carga directa
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://cdn-icons-png.flaticon.com/512/337/337946.png"; 
                                        target.className = "w-16 h-16 p-2 bg-white object-contain mx-auto";
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">Ver</span>
                                </div>
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  // --- RENDERIZADO ---
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className="hidden md:flex w-20 lg:w-64 bg-slate-900/50 border-r border-slate-800 flex-col justify-between p-4 sticky top-0 h-screen z-50">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <span className="font-black text-white text-xl italic">K</span>
            </div>
            <span className="font-bold text-lg hidden lg:block tracking-tight text-white">Kennedy<span className="text-blue-500">Sys</span></span>
          </div>

          <nav className="space-y-2">
            <NavItem icon={<Users />} label="Alumnos" active={activeTab === 'students'} onClick={() => {setActiveTab('students'); setSelectedStudent(null); fetchData();}} />
            <NavItem icon={<GraduationCap />} label="Carreras" active={activeTab === 'careers'} onClick={() => setActiveTab('careers')} />
            {(user?.rol === 'admin' || user?.rol === 'asesor') && (
                <NavItem icon={<UserPlus />} label="Equipo" active={activeTab === 'staff'} onClick={() => { setActiveTab('staff'); fetchStaff(); }} />
            )}
            {/* NUEVO ITEM ADMIN */}
            {user?.rol === 'admin' && (
                <NavItem icon={<Shield className="text-red-400" />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            )}
          </nav>
        </div>

        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group">
          <LogOut size={20} />
          <span className="hidden lg:block font-medium text-sm group-hover:translate-x-1 transition-transform">Salir</span>
        </button>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 relative mb-24 md:mb-0">
        <div className="w-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {activeTab === 'students' ? 'Panel de Alumnos' : 
                 activeTab === 'chat' ? 'Expediente' : 
                 activeTab === 'staff' ? 'Equipo' : 
                 activeTab === 'admin' ? 'Administración' : 'Carreras'}
              </h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${user?.sede ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {user?.nombre} | {user?.sede || 'Global'}
              </p>
            </div>
            
            {activeTab === 'students' && (
                <div className="relative group w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                    type="text" 
                    placeholder="Buscar por nombre o DNI..." 
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64 lg:w-96 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    />
                </div>
            )}
          </header>

          {/* VISTAS */}
          
          {/* A. LISTA ALUMNOS */}
          {activeTab === 'students' && (
            <div className="grid gap-3">
                {/* CORRECCIÓN: IMPLEMENTACIÓN DE LOADING */}
                {loading && (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Cargando alumnos...</p>
                    </div>
                )}

                {!loading && students.map((s) => (
                    <GlassCard key={s.id} className={`p-4 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-all border-l-4 ${s.solicita_secretaria ? 'border-l-red-500 bg-red-500/5' : 'border-l-transparent'}`} onClick={() => handleStudentClick(s)}>
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <div className={`h-10 w-10 rounded-full flex shrink-0 items-center justify-center font-bold text-xs ${s.solicita_secretaria ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {s.full_name?.substring(0,2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-white text-sm truncate">{s.full_name}</h3>
                                <p className="text-xs text-slate-500 truncate">{s['numero Identificacion']} | {s.status}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-6 shrink-0">
                            <div className={`hidden md:block px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                s.mood?.toLowerCase().includes('enojado') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {s.mood}
                            </div>
                            {s.solicita_secretaria && (
                                <div className="text-red-400 animate-pulse">
                                    <AlertCircle size={20} />
                                </div>
                            )}
                            <ChevronRight size={16} className="text-slate-600" />
                        </div>
                    </GlassCard>
                ))}
            </div>
          )}

          {/* B. DETALLE (CHAT + IA + EDICIÓN COMPLETA) */}
          {activeTab === 'chat' && selectedStudent && (
              <div className="grid lg:grid-cols-3 gap-6">
                  
                  {/* PANEL IZQUIERDO: INFO Y EDICIÓN */}
                  <div className="flex flex-col gap-6">
                    <GlassCard className="p-6 relative">
                        {/* Botón Editar/Cancelar */}
                        <div className="absolute top-4 right-4 z-10">
                            {!isEditing ? (
                                <button onClick={startEditing} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full hover:bg-slate-700 transition-all" title="Editar Alumno">
                                    <Pencil size={14} />
                                </button>
                            ) : (
                                <button onClick={() => setIsEditing(false)} className="p-2 text-red-400 hover:text-white bg-red-900/20 rounded-full hover:bg-red-600 transition-all">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="text-center pb-6 border-b border-slate-800">
                             <div className="h-20 w-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-500">
                                  {selectedStudent.full_name?.substring(0,1)}
                             </div>
                             
                             {isEditing ? (
                                  <input 
                                    type="text" 
                                    placeholder="Nombre Completo"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-white font-bold"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                  />
                             ) : (
                                  <h2 className="text-lg md:text-xl font-bold text-white leading-tight">{selectedStudent.full_name}</h2>
                             )}
                             
                             <p className="text-sm text-slate-500 mt-1">{selectedStudent['numero Identificacion']}</p>
                        </div>

                      {/* --- FORMULARIO EDICIÓN --- */}
                      {isEditing ? (
                          <div className="pt-4 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                              
                              {/* Sección 1: Identificación */}
                              <div className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Hash size={10}/> Identificación</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                      <input className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="DNI" value={editForm.dni} onChange={(e) => setEditForm({...editForm, dni: e.target.value})} />
                                      <input className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Legajo" value={editForm.legdef} onChange={(e) => setEditForm({...editForm, legdef: e.target.value})} />
                                  </div>
                              </div>

                              {/* Sección 2: Contacto */}
                              <div className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={10}/> Contacto</h4>
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Teléfono 1" value={editForm.telefono1} onChange={(e) => setEditForm({...editForm, telefono1: e.target.value})} />
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Teléfono 2" value={editForm.telefono2} onChange={(e) => setEditForm({...editForm, telefono2: e.target.value})} />
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Email Personal" value={editForm.email_personal} onChange={(e) => setEditForm({...editForm, email_personal: e.target.value})} />
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Email Corporativo" value={editForm.email_corporativo} onChange={(e) => setEditForm({...editForm, email_corporativo: e.target.value})} />
                              </div>

                              {/* Sección 3: Académico */}
                              <div className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><BookOpen size={10}/> Académico</h4>
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Carrera" value={editForm.carrera} onChange={(e) => setEditForm({...editForm, carrera: e.target.value})} />
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Tipo Programa" value={editForm.tipo_programa} onChange={(e) => setEditForm({...editForm, tipo_programa: e.target.value})} />
                                  <div className="grid grid-cols-2 gap-2">
                                      <input className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Sede" value={editForm.sede} onChange={(e) => setEditForm({...editForm, sede: e.target.value})} />
                                      <input className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Año Egreso" value={editForm.anio_egreso} onChange={(e) => setEditForm({...editForm, anio_egreso: e.target.value})} />
                                  </div>
                              </div>

                              {/* Sección 4: Estado */}
                              <div className="space-y-2">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={10}/> Estado</h4>
                                  <select 
                                      value={editForm.status} 
                                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded p-2"
                                  >
                                      {STUDENT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                                  </select>
                              </div>

                              <button onClick={saveEditing} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center justify-center gap-2 mt-4 transition-colors">
                                  <Save size={14} /> GUARDAR CAMBIOS
                              </button>
                          </div>
                      ) : (
                          // --- VISTA SOLO LECTURA ---
                          <div className="space-y-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase block">Estado Actual</label>
                                  <select 
                                      value={selectedStudent.status || "Sólo preguntó"} 
                                      onChange={(e) => handleQuickUpdate('status', e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:border-blue-500 outline-none"
                                  >
                                      {STUDENT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                                  </select>
                              </div>

                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                      <Bot size={16} /> IA Activa
                                  </span>
                                  <button 
                                      onClick={() => handleQuickUpdate('bot_active', !selectedStudent['bot active'])}
                                      className={`w-10 h-5 rounded-full p-1 flex items-center transition-colors ${selectedStudent['bot active'] ? 'bg-green-600 justify-end' : 'bg-slate-700 justify-start'}`}
                                  >
                                      <div className="w-3 h-3 bg-white rounded-full shadow-md"></div>
                                  </button>
                              </div>

                              <div className="space-y-4 pt-2">
                                  {/* Contacto */}
                                  <div className="space-y-2">
                                      <h4 className="text-[10px] uppercase text-slate-600 font-bold border-b border-slate-800 pb-1">Contacto</h4>
                                      <div className="flex items-start gap-3">
                                          <Phone size={14} className="text-slate-500 mt-1"/>
                                          <div className="text-sm">
                                              <p className="text-white">{selectedStudent.telefono1 || '-'}</p>
                                              {selectedStudent.telefono2 && <p className="text-slate-400 text-xs">{selectedStudent.telefono2}</p>}
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-3">
                                          <Mail size={14} className="text-slate-500 mt-1"/>
                                          <div className="text-sm break-all">
                                              <p className="text-white">{selectedStudent['correo Personal'] || '-'}</p>
                                              {selectedStudent['correo Corporativo'] && <p className="text-blue-400 text-xs">{selectedStudent['correo Corporativo']}</p>}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Académico */}
                                  <div className="space-y-2">
                                      <h4 className="text-[10px] uppercase text-slate-600 font-bold border-b border-slate-800 pb-1">Académico</h4>
                                      <InfoItem label="Carrera" value={selectedStudent['nombrePrograma']} icon={<BookOpen size={12}/>}/>
                                      <InfoItem label="Sede" value={selectedStudent['codPuntoKennedy']} icon={<MapPin size={12}/>}/>
                                      <div className="grid grid-cols-2 gap-2">
                                          <InfoItem label="Legajo" value={selectedStudent.legdef} icon={<Hash size={12}/>}/>
                                          <InfoItem label="Egreso" value={selectedStudent['anio De Egreso']} icon={<Calendar size={12}/>}/>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {selectedStudent['solicita secretaria'] && !isEditing && (
                          <div className="mt-6 pt-6 border-t border-slate-800">
                              <button onClick={() => handleQuickUpdate('solicita_secretaria', false)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
                                  <CheckCircle2 size={16} /> Marcar Atendido
                              </button>
                          </div>
                      )}
                    </GlassCard>
                  </div>

                  {/* PANEL DERECHO: CHAT + IA */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                      
                      {/* 1. CHAT HISTORY */}
                      <GlassCard className="flex flex-col border-slate-800 overflow-hidden h-[500px] md:h-auto md:min-h-[500px]">
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 custom-scrollbar">
                              {chatHistory.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                                      <MessageSquare size={48} className="mb-4" />
                                      <p>Sin historial</p>
                                  </div>
                              ) : (
                                  chatHistory.map((msg) => (
                                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                          <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 text-sm leading-relaxed shadow-md ${
                                              msg.role === 'user' 
                                              ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' 
                                              : 'bg-blue-600 text-white rounded-tr-none'
                                          }`}>
                                              {renderMessageContent(msg.content)}
                                          </div>
                                      </div>
                                  ))
                              )}
                              <div ref={messagesEndRef} />
                          </div>
                          
                          <div className="p-3 bg-slate-900 border-t border-slate-800">
                              <form onSubmit={handleSendMessage} className="flex gap-2">
                                  <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" placeholder="Escribir..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} />
                                  <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl"><Send size={20} /></button>
                              </form>
                          </div>
                      </GlassCard>

                      {/* 2. ASISTENTE IA */}
                      <GlassCard className="flex flex-col border-blue-500/20 bg-blue-900/5">
                            <div className="px-4 py-3 border-b border-blue-500/20 flex items-center gap-2 text-blue-400 bg-blue-900/20">
                                <Sparkles size={16} />
                                <h3 className="font-bold text-xs uppercase tracking-widest">Asistente IA</h3>
                            </div>
                            <div className="p-4 bg-slate-950/40 text-sm text-slate-300 leading-relaxed min-h-[80px]">
                                {analyzing ? <div className="text-blue-400 animate-pulse text-center">Analizando...</div> : aiAnswer || <div className="text-slate-600 text-center italic text-xs">"Pregúntame sobre el alumno. Puedo leer su historial y documentos."</div>}
                            </div>
                            <div className="p-3 bg-slate-900/80 border-t border-blue-500/20">
                                <form onSubmit={handleAskAI} className="flex gap-2">
                                    <input type="text" placeholder="Ej: ¿Debe documentos?" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} />
                                    <button disabled={analyzing} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50">Preguntar</button>
                                </form>
                            </div>
                      </GlassCard>
                  </div>
              </div>
          )}

          {/* C. STAFF */}
          {activeTab === 'staff' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.map((staff) => (
                      <GlassCard key={staff.id} className="p-6 relative">
                          {!staff.rol && <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-1 uppercase">Pendiente</div>}
                          <div className="flex items-center gap-3 mb-4">
                              <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">{staff.nombre?.substring(0,1)}</div>
                              <div><h3 className="text-white font-bold text-sm">{staff.nombre}</h3><p className="text-xs text-slate-500">{staff.email}</p></div>
                          </div>
                          <div className="space-y-2 mb-4 text-xs">
                              <div className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Rol</span><span className="text-white">{staff.rol || '-'}</span></div>
                              <div className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Sede</span><span className="text-white">{staff.sede || '-'}</span></div>
                          </div>
                          {user.rol === 'admin' && (
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => handleApproveStaff(staff.id, 'asesor', 'Catamarca')} className="bg-slate-800 text-xs py-2 rounded text-white border border-slate-700">Asesor</button>
                                  <button onClick={() => handleApproveStaff(staff.id, 'secretaria', 'Catamarca')} className="bg-slate-800 text-xs py-2 rounded text-white border border-slate-700">Secretaria</button>
                              </div>
                          )}
                           {user.rol === 'asesor' && !staff.rol && (
                              <button onClick={() => handleApproveStaff(staff.id, 'secretaria', user.sede)} className="w-full bg-green-600/20 text-green-400 text-xs py-2 rounded border border-green-500/30 font-bold uppercase">Aprobar Secretaria</button>
                          )}
                      </GlassCard>
                  ))}
              </div>
          )}

          {/* D. ADMIN (NUEVA SECCIÓN) */}
          {activeTab === 'admin' && user?.rol === 'admin' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-8 flex flex-col items-center justify-center text-center space-y-6 border-red-900/30 bg-red-950/10">
                    <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                        <Bot size={40} className={globalBotActive ? "text-green-500" : "text-slate-600"} />
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-white">Estado Global del Bot</h2>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                            Este interruptor controla la disponibilidad del Bot de IA para <b>todos</b> los alumnos del sistema.
                        </p>
                    </div>

                    <button 
                        onClick={toggleSystemBot}
                        className={`group relative px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-4 ${
                            globalBotActive 
                            ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                    >
                        <Power size={24} className={globalBotActive ? "text-white" : "text-slate-500"} />
                        {globalBotActive ? "SISTEMA ACTIVO" : "SISTEMA APAGADO"}
                        
                        {/* Indicador visual de estado */}
                        <span className={`absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${globalBotActive ? 'bg-green-400' : 'hidden'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${globalBotActive ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                        </span>
                    </button>
                    
                    <div className="pt-6 border-t border-slate-800/50 w-full">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Registro de Actividad</p>
                        <div className="mt-2 text-xs text-slate-400 font-mono bg-slate-900 p-2 rounded">
                            [LOG] Bot status check: {globalBotActive ? 'ONLINE' : 'OFFLINE'}
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-blue-400"/> Información de Admin
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <span className="text-xs text-slate-500 uppercase block mb-1">Tu ID de Sesión</span>
                            <code className="text-blue-400 text-xs">{user.id}</code>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <span className="text-xs text-slate-500 uppercase block mb-1">Permisos</span>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">Lectura Total</span>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">Edición Total</span>
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Control Bot</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
             </div>
          )}

          {/* D. CARRERAS */}
          {activeTab === 'careers' && (
              <GlassCard className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-400 min-w-[600px]">
                          <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs font-bold">
                              <tr><th className="p-4">Carrera</th><th className="p-4">Duración</th><th className="p-4">Arancel</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {careers.map((c) => (
                                  <tr key={c.id} className="hover:bg-slate-800/30">
                                      <td className="p-4 font-medium text-white">{c.CARRERA}</td>
                                      <td className="p-4">{c['DURACIÓN']}</td>
                                      <td className="p-4 font-mono text-blue-400">${c['ARANCEL CUATRIMESTRAL']}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </GlassCard>
          )}

        </div>
      </main>

      {/* 3. MOBILE NAVBAR */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-50 pb-safe">
        <MobileNavItem icon={<Users size={20} />} label="Alumnos" active={activeTab === 'students'} onClick={() => {setActiveTab('students'); setSelectedStudent(null); fetchData();}} />
        <MobileNavItem icon={<GraduationCap size={20} />} label="Carreras" active={activeTab === 'careers'} onClick={() => setActiveTab('careers')} />
        {(user?.rol === 'admin' || user?.rol === 'asesor') && (
            <MobileNavItem icon={<UserPlus size={20} />} label="Equipo" active={activeTab === 'staff'} onClick={() => { setActiveTab('staff'); fetchStaff(); }} />
        )}
        {user?.rol === 'admin' && (
            <MobileNavItem icon={<Shield size={20} className="text-red-400" />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
        )}
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="flex flex-col items-center gap-1 p-2 text-red-400">
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Salir</span>
        </button>
      </nav>

    </div>
  );
}

// Componentes Helper
function NavItem({ icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {icon} <span className="hidden lg:block font-medium text-sm">{label}</span>
        </button>
    );
}

function MobileNavItem({ icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${active ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500'}`}>
            {icon} <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}

function InfoItem({ label, value, icon }: any) {
    return (
        <div className="mb-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                {icon} {label}
            </span>
            <p className="text-slate-200 text-sm font-medium mt-0.5 break-words pl-0.5">{value || 'Sin dato'}</p>
        </div>
    );
}