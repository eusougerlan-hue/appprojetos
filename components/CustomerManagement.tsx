
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, User, Contact, Client } from '../types';
import { getStoredCustomers, saveCustomer, deleteCustomer, updateCustomer, getStoredClients } from '../storage';

interface CustomerManagementProps {
  user: User;
  onComplete: () => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ user, onComplete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]); 
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    razãoSocial: '',
    cnpj: '',
    refMovidesk: '',
    contacts: [] as Contact[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custData, clientData] = await Promise.all([
        getStoredCustomers(),
        getStoredClients()
      ]);
      setCustomers(custData);
      setAllClients(clientData);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchData();
    }
  }, [viewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.razãoSocial.trim() || !formData.cnpj.trim()) {
      alert('Por favor, preencha a Razão Social e o CNPJ.');
      return;
    }

    setLoading(true);
    
    try {
      const customerData: Customer = {
        id: editingCustomer ? editingCustomer.id : '',
        razãoSocial: formData.razãoSocial.trim(),
        cnpj: formData.cnpj.trim(),
        refMovidesk: formData.refMovidesk.trim(),
        contacts: formData.contacts
      };

      if (editingCustomer) {
        await updateCustomer(customerData);
      } else {
        await saveCustomer(customerData);
      }
      
      resetForm();
      setViewMode('list');
      onComplete();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      const errorDetail = err.message || JSON.stringify(err);
      alert(`Erro ao salvar cliente: ${errorDetail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      razãoSocial: customer.razãoSocial,
      cnpj: customer.cnpj,
      refMovidesk: customer.refMovidesk || '',
      contacts: customer.contacts || []
    });
    setViewMode('form');
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setConfirmDeleteId(null);
    setFormData({ razãoSocial: '', cnpj: '', refMovidesk: '', contacts: [] });
  };

  const performDelete = async (id: string) => {
    if (!id) return;

    const hasLinkedPurchases = allClients.some(client => client.customerId === id);
    
    if (hasLinkedPurchases) {
      alert('BLOQUEIO: Existem contratos vinculados a este cliente.');
      setConfirmDeleteId(null);
      return;
    }
    
    setActionLoadingId(id);
    try {
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
      alert('Cliente removido!');
    } catch (err: any) {
      console.error('Erro na exclusão:', err);
      alert(`Erro: ${err.message || 'Falha na conexão.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', phone: '', email: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => {
      const newContacts = [...prev.contacts];
      newContacts.splice(index, 1);
      return { ...prev, contacts: newContacts };
    });
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    setFormData(prev => {
      const newContacts = [...prev.contacts];
      newContacts[index] = { ...newContacts[index], [field]: value };
      return { ...prev, contacts: newContacts };
    });
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Base de Clientes</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronizado via Supabase Cloud</p>
          </div>
          <button 
            onClick={() => { resetForm(); setViewMode('form'); }} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading && customers.length === 0 ? (
            <div className="flex justify-center items-center p-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Razão Social</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contatos</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <p className="text-gray-400 font-bold text-sm">Nenhum cliente cadastrado.</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const linkedPurchasesCount = allClients.filter(c => c.customerId === customer.id).length;
                    
                    return (
                      <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 text-sm">{customer.razãoSocial}</p>
                          {linkedPurchasesCount > 0 && (
                            <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                              {linkedPurchasesCount} Contratos Ativos
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{customer.cnpj}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black border border-blue-100">
                            {customer.contacts?.length || 0} CONTATOS
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            {actionLoadingId === customer.id ? (
                              <div className="p-2 animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            ) : confirmDeleteId === customer.id ? (
                              <div className="flex items-center gap-1 animate-fadeIn">
                                 <button onClick={() => performDelete(customer.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-red-700 transition-all shadow-sm">Confirmar?</button>
                                 <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-gray-200 transition-all">Sair</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar cliente">
                                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => setConfirmDeleteId(customer.id)} className={`p-2 rounded-lg transition-all ${linkedPurchasesCount > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`} title={linkedPurchasesCount > 0 ? "Bloqueado" : "Excluir"}>
                                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-slideIn max-w-3xl mx-auto overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Dados da entidade básica</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Razão Social</label>
            <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/10" value={formData.razãoSocial} onChange={e => setFormData({...formData, razãoSocial: e.target.value})} placeholder="Ex: Empresa de Software LTDA" required disabled={loading} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">CNPJ</label>
            <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/10" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0000-00" required disabled={loading} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-blue-500">Ref. Movidesk</label>
            <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-blue-600 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/10" value={formData.refMovidesk} onChange={e => setFormData({...formData, refMovidesk: e.target.value})} placeholder="ID Movidesk" disabled={loading} />
          </div>
        </div>

        {/* Seção de Contatos Restaurada */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Contatos do Cliente</label>
              </div>
              <button type="button" onClick={addContact} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                 Adicionar Contato
              </button>
           </div>

           {formData.contacts.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                 <p className="text-xs text-gray-400 font-bold italic">Nenhum contato adicionado ainda.</p>
              </div>
           ) : (
              <div className="space-y-4">
                 {formData.contacts.map((contact, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 relative group animate-fadeIn">
                       <button type="button" onClick={() => removeContact(index)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md border border-red-50 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                       <div>
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome</label>
                          <input type="text" className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:border-blue-400 outline-none font-bold" value={contact.name} onChange={e => updateContact(index, 'name', e.target.value)} placeholder="Nome do contato" required disabled={loading} />
                       </div>
                       <div>
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Telefone</label>
                          <input type="text" className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:border-blue-400 outline-none font-bold" value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)} placeholder="(00) 00000-0000" disabled={loading} />
                       </div>
                       <div>
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                          <input type="email" className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:border-blue-400 outline-none font-bold" value={contact.email} onChange={e => updateContact(index, 'email', e.target.value)} placeholder="contato@email.com" disabled={loading} />
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>

        <div className="pt-6 border-t border-gray-100 text-right">
           <button type="button" onClick={() => setViewMode('list')} className="px-8 py-3.5 text-gray-400 hover:text-gray-600 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl" disabled={loading}>Cancelar</button>
           <button type="submit" disabled={loading} className="px-12 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]">
             {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div> : (editingCustomer ? 'Salvar Alterações' : 'Salvar Cliente')}
           </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerManagement;