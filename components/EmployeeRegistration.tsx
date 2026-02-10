
import React, { useState, useEffect } from 'react';
import { User, UserRole, Client } from '../types';
import { getStoredUsers, saveUser, updateUser, deleteUser, getStoredClients, normalizeString } from '../storage';

interface EmployeeRegistrationProps {
  onComplete: () => void;
}

const EmployeeRegistration: React.FC<EmployeeRegistrationProps> = ({ onComplete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const currentUserJson = localStorage.getItem('TM_SESSION_USER');
  const currentUserId = currentUserJson ? JSON.parse(currentUserJson).id : null;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    role: UserRole.EMPLOYEE,
    active: true,
    usuarioMovidesk: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, clientsData] = await Promise.all([
        getStoredUsers(),
        getStoredClients()
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchData();
    }
  }, [viewMode]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      cpf: user.cpf,
      password: user.password || '',
      role: user.role,
      active: user.active !== false,
      usuarioMovidesk: user.usuarioMovidesk || ''
    });
    setViewMode('form');
  };

  const handleToggleStatus = async (user: User) => {
    const updated: User = { ...user, active: !user.active };
    await updateUser(updated);
    fetchData();
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      name: '', email: '', phone: '', cpf: '', password: '', role: UserRole.EMPLOYEE, active: true, usuarioMovidesk: ''
    });
    setViewMode('form');
  };

  const handleDelete = async (userToDelete: User) => {
    if (userToDelete.id === currentUserId) {
      alert('AÇÃO BLOQUEADA: Você não pode excluir sua própria conta.');
      setConfirmDeleteId(null);
      return;
    }
    const hasLinkedSales = clients.some(client => normalizeString(client.responsavelTecnico) === normalizeString(userToDelete.name));
    if (hasLinkedSales) {
      alert(`BLOQUEIO: Não é possível excluir "${userToDelete.name}" pois existem contratos vinculados.`);
      setConfirmDeleteId(null);
      return;
    }
    setLoading(true);
    try {
      await deleteUser(userToDelete.id);
      setConfirmDeleteId(null);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir funcionário.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await updateUser({ ...editingUser, ...formData });
      } else {
        await saveUser({ ...formData, id: Math.random().toString(36).substr(2, 9) });
      }
      setViewMode('list');
    } catch (err) {
      alert('Erro ao salvar funcionário.');
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="animate-fadeIn pb-10">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Equipe de Funcionários</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Gestão centralizada de instrutores e administradores.</p>
            </div>
            <button 
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-widest leading-none"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
              Novo Funcionário
            </button>
          </div>

          <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <span className="w-1/3">Nome / Cargo</span>
            <span className="w-1/4 text-center">CPF (Login)</span>
            <span className="w-1/3 text-right">Contato</span>
          </div>

          <div className="divide-y divide-slate-50 min-h-[400px]">
            {loading && users.length === 0 ? (
              <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>
            ) : users.map((u) => (
              <div key={u.id} className={`p-6 flex items-start justify-between hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                <div className="w-1/3 min-w-0 pr-2">
                  <p className="text-[11px] font-black text-slate-800 leading-tight mb-1 truncate">{u.name}</p>
                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    u.role === UserRole.MANAGER ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {u.role === UserRole.MANAGER ? 'Administrador' : 'Instrutor'}
                  </span>
                </div>
                
                <div className="w-1/4 text-center">
                   <p className="text-[9px] font-bold text-slate-600 mt-1">{u.cpf}</p>
                </div>

                <div className="w-1/3 text-right min-w-0 flex flex-col items-end">
                   <p className="text-[9px] font-black text-slate-700 truncate w-full">{u.email}</p>
                   <p className="text-[8px] text-slate-400 font-bold mt-0.5">{u.phone}</p>
                   
                   <div className="flex gap-1 mt-3">
                      <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => setConfirmDeleteId(u.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                   </div>

                   {confirmDeleteId === u.id && (
                     <div className="mt-2 flex gap-1 animate-fadeIn">
                       <button onClick={() => handleDelete(u)} className="bg-red-600 text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tighter">Confirmar</button>
                       <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tighter">Sair</button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-8 border-t border-slate-50 bg-slate-50/20 flex justify-end">
             <button onClick={onComplete} className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all">FECHAR GESTÃO</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 animate-slideUp max-w-2xl mx-auto overflow-hidden">
      <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Cadastro Sincronizado</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 01-8 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6 pb-20">
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
            <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/30 text-xs" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required disabled={loading} placeholder="Nome do colaborador" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Corporativo</label>
            <input type="email" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/30 text-xs" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="exemplo@empresa.com" required disabled={loading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / Whats</label>
              <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/30 text-xs" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" required disabled={loading} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CPF (Login)</label>
              <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/30 text-xs" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" required disabled={loading} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
              <input type="password" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/30 text-xs" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingUser} placeholder={editingUser ? "Manter atual" : "Crie uma senha"} disabled={loading} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 ml-1">Usuário Movidesk</label>
              <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-blue-50 focus:border-blue-500 outline-none font-bold text-blue-600 bg-blue-50/20 text-xs" value={formData.usuarioMovidesk} onChange={(e) => setFormData({...formData, usuarioMovidesk: e.target.value})} placeholder="Ex: joao.tecnico" disabled={loading} />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4 items-center">
             <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                <input type="checkbox" id="user-active" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="w-5 h-5 text-blue-600 rounded-lg border-slate-300" disabled={loading} />
                <label htmlFor="user-active" className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Habilitado</label>
             </div>
             <div>
                <select className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-bold text-[10px] uppercase tracking-widest text-slate-700 bg-white" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})} disabled={loading}>
                  <option value={UserRole.EMPLOYEE}>Instrutor</option>
                  <option value={UserRole.MANAGER}>Administrador</option>
                </select>
             </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeRegistration;
