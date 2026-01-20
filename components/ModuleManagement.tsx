
import React, { useState, useEffect } from 'react';
import { SystemModule, Client } from '../types';
import { getStoredModules, saveModule, deleteModule, updateModule, getStoredClients } from '../storage';

interface ModuleManagementProps {
  onComplete: () => void;
}

const ModuleManagement: React.FC<ModuleManagementProps> = ({ onComplete }) => {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [newModuleName, setNewModuleName] = useState('');
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega módulos e clientes para verificação de vínculo
  const fetchData = async () => {
    setLoading(true);
    try {
      const [modulesData, clientsData] = await Promise.all([
        getStoredModules(),
        getStoredClients()
      ]);
      setModules(modulesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOrUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    setLoading(true);
    try {
      if (editingModule) {
        const updated: SystemModule = {
          ...editingModule,
          name: newModuleName.trim()
        };
        await updateModule(updated);
        setEditingModule(null);
      } else {
        const newModule: SystemModule = {
          id: Math.random().toString(36).substr(2, 9),
          name: newModuleName.trim()
        };
        await saveModule(newModule);
      }
      setNewModuleName('');
      await fetchData();
    } catch (err) {
      alert('Erro ao salvar módulo.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (mod: SystemModule) => {
    setEditingModule(mod);
    setNewModuleName(mod.name);
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setNewModuleName('');
  };

  const handleDeleteModule = async (id: string, name: string) => {
    // Verificação de vínculo com compras de treinamento
    const isLinked = clients.some(client => client.modulos && client.modulos.includes(name));

    if (isLinked) {
      alert(`BLOQUEIO: O módulo "${name}" não pode ser excluído porque está vinculado a uma ou mais compras de treinamento ativas.`);
      return;
    }

    if (confirm(`Deseja realmente excluir o módulo "${name}"? Esta ação não poderá ser desfeita.`)) {
      setLoading(true);
      try {
        await deleteModule(id);
        await fetchData();
        if (editingModule?.id === id) {
          handleCancelEdit();
        }
      } catch (err) {
        alert('Erro ao excluir módulo.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn max-w-2xl mx-auto overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/30">
        <h2 className="text-xl font-black text-gray-800 tracking-tight">Módulos do Sistema</h2>
        <p className="text-sm text-gray-500 font-medium">Adicione, edite ou remova módulos disponíveis para treinamento.</p>
      </div>

      <div className="p-8">
        <form onSubmit={handleAddOrUpdateModule} className="flex gap-2 mb-10">
          <div className="flex-1 relative">
            <input
              type="text"
              className={`w-full px-5 py-3.5 rounded-xl border focus:ring-4 outline-none transition-all font-bold text-gray-700 bg-gray-50/50 ${
                editingModule 
                  ? 'border-orange-300 focus:ring-orange-500/10 focus:border-orange-500' 
                  : 'border-gray-200 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
              placeholder={editingModule ? "Editando nome do módulo..." : "Nome do novo módulo (ex: CRM, Estoque)"}
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              required
              disabled={loading}
            />
            {editingModule && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 transition-colors"
                title="Cancelar edição"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
              editingModule 
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
            }`}
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingModule ? 'Salvar' : 'Adicionar')}
          </button>
        </form>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Módulos Cadastrados</h3>
          {modules.length === 0 && !loading ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
               <p className="text-sm text-gray-400 font-bold italic">Nenhum módulo cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {modules.map((mod) => (
                <div key={mod.id} className={`flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border transition-all group ${
                  editingModule?.id === mod.id 
                    ? 'border-orange-300 bg-orange-50/50 ring-2 ring-orange-500/5' 
                    : 'border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-md hover:shadow-blue-500/5'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs uppercase shadow-sm ${
                      editingModule?.id === mod.id ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {mod.name.substring(0, 2)}
                    </div>
                    <span className={`font-black text-sm tracking-tight ${editingModule?.id === mod.id ? 'text-orange-900' : 'text-gray-700'}`}>
                      {mod.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(mod)}
                      className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar módulo"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteModule(mod.id, mod.name)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir módulo"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-10 pt-6 border-t border-gray-100">
          <button
            onClick={onComplete}
            className="px-8 py-2.5 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleManagement;
