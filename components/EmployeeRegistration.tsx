
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
  
  // Identificação do usuário atual para impedir que ele se exclua
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
      alert('Erro ao carregar dados dos funcionários e projetos.');
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
    const updated: User = {
      ...user,
      active: !user.active
    };
    await updateUser(updated);
    fetchData();
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      password: '',
      role: UserRole.EMPLOYEE,
      active: true,
      usuarioMovidesk: ''
    });
    setViewMode('form');
  };

  const handleDelete = async (userToDelete: User) => {
    if (userToDelete.id === currentUserId) {
      alert('AÇÃO BLOQUEADA: Você não pode excluir sua própria conta administrativa enquanto estiver logado.');
      setConfirmDeleteId(null);
      return;
    }

    // Validação de vínculo: Verifica se o nome do funcionário consta como responsável em algum contrato
    const hasLinkedSales = clients.some(client => 
      normalizeString(client.responsavelTecnico) === normalizeString(userToDelete.name)
    );

    if (hasLinkedSales) {
      alert(`BLOQUEIO DE SEGURANÇA: Não é possível excluir "${userToDelete.name}" porque existem vendas/contratos de treinamento vinculados a este Responsável Técnico.\n\nSugestão: Altere o responsável nos contratos ou apenas desative este funcionário.`);
      setConfirmDeleteId(null);
      return;
    }

    setLoading(true);
    try {
      await deleteUser(userToDelete.id);
      setConfirmDeleteId(null);
      fetchData();
    } catch (err: any) {
      // Fallback para erro de banco (FK no Supabase se existir)
      if (err.message && err.message.includes('foreign key')) {
        alert('Erro de integridade: este funcionário possui registros históricos no banco de dados. Recomendamos apenas desativar o cadastro.');
      } else {
        alert('Erro ao excluir funcionário. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUser) {
        const updated: User = {
          ...editingUser,
          ...formData
        };
        await updateUser(updated);
      } else {
        const newUser: User = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
        };
        await saveUser(newUser);
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Equipe de Funcionários</h2>
            <p className="text-sm text-gray-500 font-medium">Gestão centralizada de instrutores e administradores.</p>
          </div>
          <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Novo Funcionário
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading && users.length === 0 ? (
            <div className="flex justify-center items-center p-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome / Cargo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF (Login)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ativo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-blue-50/20 transition-colors ${u.active === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className={`font-black text-sm ${u.active === false ? 'text-gray-400' : 'text-gray-800'}`}>{u.name}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-1 inline-block ${
                        u.role === UserRole.MANAGER 
                          ? (u.active === false ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100')
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {u.role === UserRole.MANAGER ? 'Administrador' : 'Instrutor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">
                      {u.cpf}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-700">{u.email}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{u.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.active !== false}
                        onChange={() => handleToggleStatus(u)}
                        className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {confirmDeleteId === u.id ? (
                           <div className="flex items-center gap-1 animate-fadeIn">
                             <button 
                               onClick={() => handleDelete(u)} 
                               className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                             >
                               Apagar?
                             </button>
                             <button 
                               onClick={() => setConfirmDeleteId(null)} 
                               className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-slate-200 transition-all"
                             >
                               Sair
                             </button>
                           </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEdit(u)}
                              className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl text-xs font-black transition-all uppercase"
                              title="Editar funcionário"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(u.id)}
                              className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-all"
                              title="Excluir cadastro"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-end">
           <button
            onClick={onComplete}
            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-[0.2em] transition-all"
          >
            FECHAR GESTÃO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 animate-slideUp max-w-2xl mx-auto overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Sincronizado via Supabase Cloud</p>
        </div>
        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 01-8 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              type="text"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/30 transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={loading}
              placeholder="Nome do colaborador"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <input
              type="email"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/30 transition-all"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="exemplo@empresa.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
            <input
              type="text"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/30 transition-all"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(00) 00000-0000"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF (Login do Sistema)</label>
            <input
              type="text"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/30 transition-all"
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <input
              type="password"
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/30 transition-all"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required={!editingUser}
              placeholder={editingUser ? "Manter senha atual" : "Crie uma senha"}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Usuário Movidesk</label>
            <input
              type="text"
              className="w-full px-6 py-4 rounded-2xl border-2 border-blue-50 focus:border-blue-500 outline-none font-bold text-blue-600 bg-blue-50/20 transition-all"
              value={formData.usuarioMovidesk}
              onChange={(e) => setFormData({...formData, usuarioMovidesk: e.target.value})}
              placeholder="Ex: joao.tecnico"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4 border-t border-slate-50">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
            <input
              type="checkbox"
              id="user-active"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
              className="w-6 h-6 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer transition-all"
              disabled={loading}
            />
            <label htmlFor="user-active" className="text-sm font-black text-gray-700 cursor-pointer select-none">
              Acesso Habilitado
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
            <select
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-gray-700 bg-white transition-all appearance-none"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
              disabled={loading}
            >
              <option value={UserRole.EMPLOYEE}>Instrutor / Consultor Técnico</option>
              <option value={UserRole.MANAGER}>Gestor / Administrador Master</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-8 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all rounded-2xl"
            disabled={loading}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-16 py-4 rounded-[1.5rem] shadow-2xl transition-all font-black text-[10px] uppercase tracking-widest text-white flex items-center justify-center min-w-[220px] active:scale-95 ${
              editingUser ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (editingUser ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeRegistration;
