
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setNewModuleName('');
  };

  const handleDeleteModule = async (id: string, name: string) => {
    const isLinked = clients.some(client => client.modulos && client.modulos.includes(name));

    if (isLinked) {
      alert(`BLOQUEIO: O módulo "${name}" não pode ser excluído porque está vinculado a uma ou mais compras de treinamento ativas.`);
      setConfirmDeleteId(null);
      return;
    }

    setLoading(true);
    try {
      await deleteModule(id);
      await fetchData();
      setConfirmDeleteId(null);
      if (editingModule?.id === id) {
        handleCancelEdit();
      }
    } catch (err) {
      alert('Erro ao excluir módulo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header Section */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
          Módulos do Sistema
        </h2>
        <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
          Adicione, edite ou remova módulos disponíveis para treinamento.
        </p>
      </div>

      {/* Add/Edit Form Card */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleAddOrUpdateModule} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              className={`w-full px-6 py-4 rounded-2xl border-2 focus:ring-4 outline-none transition-all font-bold text-xs text-slate-700 bg-slate-50/50 ${
                editingModule 
                  ? 'border-orange-200 focus:ring-orange-500/5 focus:border-orange-500' 
                  : 'border-slate-100 focus:ring-blue-500/5 focus:border-blue-500'
              }`}
              placeholder={editingModule ? "Editando módulo..." : "Nome do novo módulo"}
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              required
              disabled={loading}
            />
            {editingModule && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1"
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
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center ${
              editingModule 
                ? 'bg-orange-500 shadow-orange-100' 
                : 'bg-blue-600 shadow-blue-200 shadow-blue-600/30'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              editingModule ? 'SALVAR MÓDULO' : 'ADICIONAR'
            )}
          </button>
        </form>
      </div>

      {/* Modules List Area */}
      <div className="px-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Módulos Cadastrados</h3>
        
        <div className="space-y-3">
          {modules.length === 0 && !loading ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200">
               <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Nenhum módulo cadastrado</p>
            </div>
          ) : (
            modules.map((mod) => (
              <div key={mod.id} className={`flex items-center justify-between p-4 bg-white rounded-[1.5rem] border transition-all ${
                editingModule?.id === mod.id 
                  ? 'border-orange-200 ring-4 ring-orange-500/5' 
                  : 'border-slate-50 shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-tighter ${
                    editingModule?.id === mod.id ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {mod.name.substring(0, 2)}
                  </div>
                  <span className={`font-black text-sm tracking-tight ${editingModule?.id === mod.id ? 'text-orange-900' : 'text-slate-700'}`}>
                    {mod.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {confirmDeleteId === mod.id ? (
                    <div className="flex items-center gap-1 animate-fadeIn">
                      <button
                        onClick={() => handleDeleteModule(mod.id, mod.name)}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-tighter shadow-md"
                      >
                        SIM
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-tighter"
                      >
                        NÃO
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(mod)}
                        className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        disabled={loading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(mod.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        disabled={loading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Close Button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onComplete}
          className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-all"
        >
          FECHAR GESTÃO
        </button>
      </div>
    </div>
  );
};

export default ModuleManagement;
