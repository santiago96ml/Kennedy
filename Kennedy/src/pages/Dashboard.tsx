import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  LayoutDashboard, Users, GraduationCap, MessageSquare, 
  Search, Bell, Settings, LogOut, CheckCircle2, AlertCircle, 
  Send, FileText, ChevronRight, UserPlus, Shield
} from 'lucide-react';

const API_URL = import.meta.env.VITE_KENNEDY_API_URL || 'http://localhost:4001';

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
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');

  // Carga inicial
  useEffect(() => {
    const storedUser = localStorage.getItem('user-data');
    const token = localStorage.getItem('sb-token');
    
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchData();
    fetchCareers();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb-token');
      const res = await fetch(`${API_URL}/api/students?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data) setStudents(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  // --- LÓGICA DE DETALLE Y CHAT ---
  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setActiveTab('chat'); // Cambia a vista de detalle
    
    // Cargar historial real
    const token = localStorage.getItem('sb-token');
    const res = await fetch(`${API_URL}/api/students/${student.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.student) setSelectedStudent(data.student); // Detalle completo
    if (data.chatHistory) setChatHistory(data.chatHistory);
  };

  // --- LÓGICA DE "ATENDIDO" ---
  const handleMarkAsDone = async () => {
    if (!selectedStudent) return;
    const token = localStorage.getItem('sb-token');
    await fetch(`${API_URL}/api/students/${selectedStudent.id}/toggle-help`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    // Recargar dato local
    setSelectedStudent({ ...selectedStudent, 'solicita secretaria': false });
    alert("✅ Alumno marcado como atendido. Bot reactivado.");
    fetchData(); // Refrescar lista
  };

  // --- ENVIAR MENSAJE ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedStudent) return;

    const token = localStorage.getItem('sb-token');
    const phone = selectedStudent.telefono1 || selectedStudent.telefono2;

    if (!phone) return alert("El alumno no tiene teléfono registrado.");

    await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            studentId: selectedStudent.id,
            phone: phone,
            messageText: messageInput
        })
    });

    // Agregar mensaje falso a la UI temporalmente
    setChatHistory([...chatHistory, { role: 'user', content: messageInput, id: Date.now() }]); // User role temporal para mostrarlo
    setMessageInput('');
  };

  // --- GESTIÓN DE EQUIPO ---
  const handleApproveStaff = async (id: number, role: string, sede: string) => {
      const token = localStorage.getItem('sb-token');
      await fetch(`${API_URL}/api/staff/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ newRole: role, newSede: sede })
      });
      fetchStaff(); // Recargar tabla
  };

  // --- RENDERIZADO ---

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col justify-between p-4 transition-all">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
              <span className="font-black text-white text-xl italic">K</span>
            </div>
            <span className="font-bold text-lg hidden lg:block tracking-tight text-white">Kennedy<span className="text-blue-500">Sys</span></span>
          </div>

          <nav className="space-y-2">
            <NavItem icon={<Users />} label="Alumnos" active={activeTab === 'students'} onClick={() => {setActiveTab('students'); setSelectedStudent(null);}} />
            <NavItem icon={<GraduationCap />} label="Carreras" active={activeTab === 'careers'} onClick={() => setActiveTab('careers')} />
            {(user?.rol === 'admin' || user?.rol === 'asesor') && (
                <NavItem icon={<UserPlus />} label="Equipo" active={activeTab === 'staff'} onClick={() => { setActiveTab('staff'); fetchStaff(); }} />
            )}
          </nav>
        </div>

        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group">
          <LogOut size={20} />
          <span className="hidden lg:block font-medium text-sm group-hover:translate-x-1 transition-transform">Salir</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-8 max-w-7xl mx-auto">
          
          {/* HEADER */}
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {activeTab === 'students' ? 'Panel de Alumnos' : 
                 activeTab === 'chat' ? 'Expediente del Alumno' : 
                 activeTab === 'staff' ? 'Gestión de Equipo' : 'Carreras'}
              </h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${user?.sede ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                {user?.nombre} | {user?.rol?.toUpperCase()} | {user?.sede || 'Sin Sede'}
              </p>
            </div>
            
            {activeTab === 'students' && (
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                    type="text" 
                    placeholder="Buscar por DNI, Nombre..." 
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 w-64 lg:w-96 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    />
                </div>
            )}
          </header>

          {/* VISTAS */}
          
          {/* 1. LISTA DE ALUMNOS */}
          {activeTab === 'students' && (
            <div className="grid gap-4">
                {students.map((s) => (
                    <GlassCard key={s.id} className={`p-4 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-all border-l-4 ${s.solicita_secretaria ? 'border-l-red-500 bg-red-500/5' : 'border-l-transparent'}`} onClick={() => handleStudentClick(s)}>
                        <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${s.solicita_secretaria ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {s.full_name?.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{s.full_name}</h3>
                                <p className="text-xs text-slate-500">{s.dni} | {s.career_name}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            {/* Mood Badge */}
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                s.mood === 'Enojado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                s.mood === 'Feliz' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                s.mood === 'Interesado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {s.mood}
                            </div>

                            {/* Alerta Secretaria */}
                            {s.solicita_secretaria && (
                                <div className="flex items-center gap-2 text-red-400 animate-pulse">
                                    <AlertCircle size={16} />
                                    <span className="text-xs font-bold">SOLICITA AYUDA</span>
                                </div>
                            )}
                            
                            <ChevronRight size={16} className="text-slate-600" />
                        </div>
                    </GlassCard>
                ))}
            </div>
          )}

          {/* 2. VISTA DE DETALLE / CHAT */}
          {activeTab === 'chat' && selectedStudent && (
              <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
                  
                  {/* Columna Izquierda: Info */}
                  <GlassCard className="p-6 flex flex-col gap-6 overflow-y-auto">
                      <div className="text-center">
                          <div className="h-20 w-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-500">
                              {selectedStudent.full_name?.substring(0,1)}
                          </div>
                          <h2 className="text-xl font-bold text-white leading-tight">{selectedStudent.full_name}</h2>
                          <p className="text-sm text-slate-500 mt-1">{selectedStudent.dni}</p>
                      </div>

                      <div className="space-y-4">
                          <InfoItem label="Teléfono" value={selectedStudent.telefono1 || 'No registrado'} />
                          <InfoItem label="Correo" value={selectedStudent['correo Personal'] || '-'} />
                          <InfoItem label="Sede" value={selectedStudent.codPuntoKennedy || 'Sin asignar'} />
                          
                          <div className="pt-4 border-t border-slate-800">
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Carrera</label>
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm text-white">
                                  {selectedStudent['nombrePrograma'] || 'Sin Carrera'}
                              </div>
                          </div>
                      </div>

                      {selectedStudent['solicita secretaria'] && (
                          <div className="mt-auto pt-6">
                              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-4">
                                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
                                      <AlertCircle size={16} /> Atención Requerida
                                  </div>
                                  <p className="text-xs text-red-300/80 leading-relaxed">
                                      El bot ha sido pausado. Este alumno requiere asistencia manual.
                                  </p>
                              </div>
                              <button onClick={handleMarkAsDone} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                  <CheckCircle2 size={16} /> Marcar como Atendido
                              </button>
                          </div>
                      )}
                  </GlassCard>

                  {/* Columna Derecha: Chat */}
                  <GlassCard className="lg:col-span-2 flex flex-col overflow-hidden relative">
                      {/* Área de Mensajes */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30">
                          {chatHistory.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                                  <MessageSquare size={48} className="mb-4" />
                                  <p>No hay historial disponible</p>
                              </div>
                          ) : (
                              chatHistory.map((msg) => (
                                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                                          msg.role === 'user' 
                                          ? 'bg-blue-600 text-white rounded-tr-none' 
                                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                      }`}>
                                          {msg.content}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>

                      {/* Input */}
                      <div className="p-4 bg-slate-900 border-t border-slate-800">
                          <form onSubmit={handleSendMessage} className="flex gap-2">
                              <input 
                                  type="text" 
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                                  placeholder="Escribe un mensaje para WhatsApp..."
                                  value={messageInput}
                                  onChange={(e) => setMessageInput(e.target.value)}
                              />
                              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                  <Send size={20} />
                              </button>
                          </form>
                      </div>
                  </GlassCard>
              </div>
          )}

          {/* 3. VISTA EQUIPO */}
          {activeTab === 'staff' && (
              <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {staffList.map((staff) => (
                          <GlassCard key={staff.id} className="p-6 relative overflow-hidden group">
                              {!staff.rol && <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-1 uppercase">Pendiente</div>}
                              
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">
                                      {staff.nombre?.substring(0,1)}
                                  </div>
                                  <div>
                                      <h3 className="text-white font-bold text-sm">{staff.nombre}</h3>
                                      <p className="text-xs text-slate-500">{staff.email}</p>
                                  </div>
                              </div>

                              <div className="space-y-2 mb-4">
                                  <div className="flex justify-between text-xs border-b border-slate-800/50 pb-2">
                                      <span className="text-slate-500">Rol Actual</span>
                                      <span className="text-white font-medium">{staff.rol || 'Sin Rol'}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-b border-slate-800/50 pb-2">
                                      <span className="text-slate-500">Sede</span>
                                      <span className="text-white font-medium">{staff.sede || 'Sin Sede'}</span>
                                  </div>
                              </div>

                              {/* Acciones para Admin */}
                              {user.rol === 'admin' && (
                                  <div className="grid grid-cols-2 gap-2 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleApproveStaff(staff.id, 'asesor', 'Catamarca')} className="bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded text-white border border-slate-700">Hacer Asesor</button>
                                      <button onClick={() => handleApproveStaff(staff.id, 'secretaria', 'Catamarca')} className="bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded text-white border border-slate-700">Hacer Secretaria</button>
                                  </div>
                              )}
                              
                              {/* Acciones para Asesor (Solo aprobar secretarias de SU sede) */}
                              {user.rol === 'asesor' && !staff.rol && (
                                  <button onClick={() => handleApproveStaff(staff.id, 'secretaria', user.sede)} className="w-full bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs py-2 rounded border border-green-500/30 font-bold uppercase mt-2">
                                      Aprobar Secretaria
                                  </button>
                              )}
                          </GlassCard>
                      ))}
                  </div>
              </div>
          )}

          {/* 4. VISTA CARRERAS (Simple Table) */}
          {activeTab === 'careers' && (
              <GlassCard className="p-0 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs font-bold">
                          <tr>
                              <th className="p-4">Carrera</th>
                              <th className="p-4">Duración</th>
                              <th className="p-4">Arancel</th>
                              <th className="p-4">Materias</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {careers.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-800/30">
                                  <td className="p-4 font-medium text-white">{c.CARRERA}</td>
                                  <td className="p-4">{c['DURACIÓN']}</td>
                                  <td className="p-4 font-mono text-blue-400">${c['ARANCEL CUATRIMESTRAL']}</td>
                                  <td className="p-4">{c['TOTAL DE MATERIAS']}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </GlassCard>
          )}

        </div>
      </main>
    </div>
  );
}

// Componente Helper
function NavItem({ icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
        >
            {icon}
            <span className="hidden lg:block font-medium text-sm">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full hidden lg:block animate-pulse"></div>}
        </button>
    );
}

function InfoItem({ label, value }: any) {
    return (
        <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</span>
            <p className="text-slate-200 text-sm font-medium mt-0.5 break-words">{value}</p>
        </div>
    );
}