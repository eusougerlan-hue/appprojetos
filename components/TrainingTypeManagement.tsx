
import React, { useState, useEffect } from 'react';
import { TrainingTypeEntity } from '../types';
import { getStoredTrainingTypes, saveTrainingType, deleteTrainingType, updateTrainingType } from '../storage';

interface TrainingTypeManagementProps {
  onComplete: () => void;
}

const TrainingTypeManagement: React.FC<TrainingTypeManagementProps> = ({ onComplete }) => {
  const [types, setTypes] = useState<TrainingTypeEntity[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<TrainingTypeEntity | null>(null);

  // Define a shared fetch function to avoid repeated async logic
  const fetchTypes = async () => {
    try {
      const data = await getStoredTrainingTypes();
      setTypes(data);
    } catch (error) {
      console.error('Failed to fetch training types:', error);
    }
  };

  // Fixed: Use an async function inside useEffect to await the promise
  useEffect(() => {
    fetchTypes();
  }, []);

  // Fixed: Made the handler async and added await for storage operations and data refresh
  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    if (editingType) {
      const updated: TrainingTypeEntity = {
        ...editingType,
        name: newTypeName.trim()
      };
      await updateTrainingType(updated);
      setEditingType(null);
    } else {
      const newType: TrainingTypeEntity = {
        id: Math.random().toString(36).substr(2, 9),
        name: newTypeName.trim()
      };
      await saveTrainingType(newType);
    }

    await fetchTypes();
    setNewTypeName('');
  };

  const handleEditClick = (type: TrainingTypeEntity) => {
    setEditingType(type);
    setNewTypeName(type.name);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setNewTypeName('');
  };

  // Fixed: Made the handler async and added await for storage operations and data refresh
  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este tipo de treinamento? Compras já vinculadas manterão o nome original, mas novos lançamentos não poderão utilizá-lo.')) {
      await deleteTrainingType(id);
      await fetchTypes();
      if (editingType?.id === id) {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn max-w-2xl mx-auto">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Tipos de Treinamento</h2>
        <p className="text-sm text-gray-500">Defina as categorias de treinamento disponíveis para contratação.</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleAddOrUpdate} className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all ${
                editingType ? 'border-orange-300 focus:ring-orange-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder={editingType ? "Editando tipo..." : "Novo tipo (ex: Workshop, Consultoria)"}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              required
            />
            {editingType && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1"
                title="Cancelar edição"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all shadow-sm active:scale-95 ${
              editingType ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {editingType ? 'Salvar Alteração' : 'Adicionar'}
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipos Cadastrados</h3>
          {types.length === 0 ? (
            <p className="text-center py-8 text-gray-400 italic">Nenhum tipo de treinamento cadastrado.</p>
          ) : (
            types.map((t) => (
              <div key={t.id} className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl border transition-all group ${
                editingType?.id === t.id ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-100 hover:border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs uppercase ${
                    editingType?.id === t.id ? 'bg-orange-200 text-orange-700' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {t.name.substring(0, 2)}
                  </div>
                  <span className={`font-semibold ${editingType?.id === t.id ? 'text-orange-800' : 'text-gray-700'}`}>
                    {t.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditClick(t)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                    title="Editar tipo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir tipo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={onComplete}
            className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingTypeManagement;
