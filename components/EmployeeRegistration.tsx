
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getStoredUsers, saveUser, updateUser } from '../storage';

interface EmployeeRegistrationProps {
  onComplete: () => void;
}

const EmployeeRegistration: React.FC<EmployeeRegistrationProps> = ({ onComplete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    role: UserRole.EMPLOYEE,
    active: true
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getStoredUsers();
      setUsers(data);
    } catch (err) {
      alert('Erro ao carregar funcionários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchUsers();
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
      active: user.active !== false
    });
    setViewMode('form');
  };

  const handleToggleStatus = async (user: User) => {
    const updated: User = {
      ...user,
      active: !user.active
    };
    await updateUser(updated);
    fetchUsers();
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
      active: true
    });
    setViewMode('form');
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
          id: Math.random().toString(36).substr(2, 9), // Supabase gera UUID, mas mantemos o ID enviado se necessário
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Equipe de Funcionários</h2>
            <p className="text-sm text-gray-500">Gestão centralizada no Supabase.</p>
          </div>
          <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Novo Funcionário
          </button>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nome / Cargo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">CPF (Login)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">E-mail / Telefone</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Ativo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.active === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className={`font-bold ${user.active === false ? 'text-gray-400' : 'text-gray-800'}`}>{user.name}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        user.role === UserRole.MANAGER 
                          ? (user.active === false ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100')
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {user.role === UserRole.MANAGER ? 'Administrador' : 'Funcionário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {user.cpf}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">{user.email}</p>
                      <p className="text-xs text-gray-400">{user.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={user.active !== false}
                        onChange={() => handleToggleStatus(user)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-black transition-all border border-blue-100 uppercase"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
           <button
            onClick={onComplete}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            Fechar Gestão
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-slideIn max-w-2xl mx-auto">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {editingUser ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
          </h2>
          <p className="text-sm text-gray-500">Sincronizado com Supabase.</p>
        </div>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 01-8 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail Corporativo</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="exemplo@empresa.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(00) 00000-0000"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">CPF (Login)</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha {editingUser ? '(Opcional)' : 'Provisória'}</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required={!editingUser}
              placeholder={editingUser ? "Deixe em branco para não alterar" : "••••••••"}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cargo</label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
              disabled={loading}
            >
              <option value={UserRole.EMPLOYEE}>Funcionário / Instrutor</option>
              <option value={UserRole.MANAGER}>Gestor / Administrador</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="user-active"
            checked={formData.active}
            onChange={(e) => setFormData({...formData, active: e.target.checked})}
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            disabled={loading}
          />
          <label htmlFor="user-active" className="text-sm font-semibold text-gray-700 cursor-pointer">
            Usuário Ativo
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            disabled={loading}
          >
            Voltar para Lista
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-2.5 rounded-lg shadow-md transition-all font-bold text-white flex items-center justify-center min-w-[160px] ${
              editingUser ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (editingUser ? 'Salvar Alterações' : 'Cadastrar Funcionário')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeRegistration;
