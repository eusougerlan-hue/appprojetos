
import React, { useState } from 'react';
import { Customer, User } from '../types';
import { saveCustomer } from '../storage';

interface ClientRegistrationProps {
  user: User;
  onComplete: () => void;
}

const ClientRegistration: React.FC<ClientRegistrationProps> = ({ user, onComplete }) => {
  const [formData, setFormData] = useState({
    razãoSocial: '',
    cnpj: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const customerData: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      razãoSocial: formData.razãoSocial,
      cnpj: formData.cnpj
    };

    saveCustomer(customerData);
    onComplete();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-slideIn max-w-2xl mx-auto">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Cadastrar Novo Cliente</h2>
          <p className="text-sm text-gray-500">Cadastre a entidade básica do cliente no sistema.</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Responsável</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
            {user.name}
          </span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Razão Social</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={formData.razãoSocial}
            onChange={(e) => setFormData({...formData, razãoSocial: e.target.value})}
            placeholder="Nome da Empresa"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">CNPJ</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={formData.cnpj}
            onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
            placeholder="00.000.000/0000-00"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onComplete}
            className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            Salvar Cliente
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientRegistration;
