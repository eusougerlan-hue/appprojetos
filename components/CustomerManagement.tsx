
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.razãoSocial.toLowerCase().includes(term) || 
      c.cnpj.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

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
      alert(`Erro ao salvar cliente: ${err.message || 'Verifique a conexão.'}`);
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
      alert('BLOQUEIO: Existem contratos vinculados a este cliente. Remova os contratos antes de excluir o cliente.');
      setConfirmDeleteId(null);
      return;
    }
    
    setActionLoadingId(id);
    try {
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Falha na conexão.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', phone: '', email: '', keyUser: false }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => {
      const newContacts = [...prev.contacts];
      newContacts.splice(index, 1);
      return { ...prev, contacts: newContacts };
    });
  };

  const updateContact = (index: number, field: keyof Contact, value: any) => {
    setFormData(prev => {
      const newContacts = [...prev.contacts];
      newContacts[index] = { ...newContacts[index], [field]: value };
      return { ...prev, contacts: newContacts };
    });
  };

  if (viewMode === 'list') {
    return (
      <div className="animate-fadeIn">
        <div className="mb-6 px-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Base de Clientes</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronizado via Supabase Cloud</p>
        </div>

        <div className="flex flex-col gap-3 px-2 mb-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar Cliente..." 
              className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none font-bold text-slate-700 bg-white transition-all focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-300 text-xs shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-300 absolute right-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <button 
            onClick={() => { resetForm(); setViewMode('form'); }} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>

        <div className="space-y-4 px-1 pb-10">
          {loading && customers.length === 0 ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-400 font-bold uppercase italic">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const linkedPurchasesCount = allClients.filter(c => c.customerId === customer.id).length;
              
              return (
                <div key={customer.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 animate-slideUp">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                      <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">{customer.razãoSocial}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{customer.cnpj}</p>
                    </div>
                    {customer.refMovidesk && (
                      <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100 font-black uppercase tracking-tighter">
                        MD: {customer.refMovidesk}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[8px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 font-black uppercase tracking-widest">
                      {customer.contacts?.length || 0} {customer.contacts?.length === 1 ? 'Contato' : 'Contatos'}
                    </span>
                    {linkedPurchasesCount > 0 && (
                      <span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100 font-black uppercase tracking-widest">
                        {linkedPurchasesCount} {linkedPurchasesCount === 1 ? 'Projeto' : 'Projetos'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      {confirmDeleteId === customer.id ? (
                        <div className="flex items-center gap-2 animate-fadeIn">
                          <button onClick={() => performDelete(customer.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter shadow-sm active:scale-90 transition-all">Apagar?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest">Sair</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(customer.id)} 
                          className={`p-2 rounded-xl transition-all ${linkedPurchasesCount > 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                          disabled={linkedPurchasesCount > 0 || actionLoadingId === customer.id}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => handleEdit(customer)}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-xl border border-slate-100 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] animate-slideUp overflow-hidden pb-10">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Cadastro de Entidade</p>
        </div>
        <button onClick={() => setViewMode('list')} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Razão Social</label>
            <input 
              type="text" 
              className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white transition-all uppercase text-xs" 
              value={formData.razãoSocial} 
              onChange={e => setFormData({...formData, razãoSocial: e.target.value})} 
              placeholder="Ex: Empresa Exemplo LTDA" 
              required 
              disabled={loading} 
            />
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CNPJ</label>
              <input 
                type="text" 
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white transition-all text-xs" 
                value={formData.cnpj} 
                onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                placeholder="00.000.000/0000-00" 
                required 
                disabled={loading} 
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Ref. Movidesk</label>
              <input 
                type="text" 
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-blue-600 bg-slate-50/50 transition-all text-xs" 
                value={formData.refMovidesk} 
                onChange={e => setFormData({...formData, refMovidesk: e.target.value})} 
                placeholder="ID Interno" 
                disabled={loading} 
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
             <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   Contatos ({formData.contacts.length})
                </label>
                <button type="button" onClick={addContact} className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 active:scale-95 transition-all">
                   + Adicionar
                </button>
             </div>

             <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
               {formData.contacts.map((contact, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative animate-fadeIn">
                     <button type="button" onClick={() => removeContact(index)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md z-10 active:scale-75 transition-all">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                     <div className="space-y-3">
                        <input type="text" className="w-full px-4 py-2.5 text-[11px] rounded-xl border border-white outline-none font-bold bg-white" value={contact.name} onChange={e => updateContact(index, 'name', e.target.value)} placeholder="Nome do contato" required />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" className="w-full px-4 py-2.5 text-[11px] rounded-xl border border-white outline-none font-bold bg-white" value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)} placeholder="Telefone" />
                          <div className="flex items-center gap-2 bg-white px-3 rounded-xl border border-white">
                             <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded text-blue-600 border-slate-200"
                              checked={!!contact.keyUser}
                              onChange={e => updateContact(index, 'keyUser', e.target.checked)}
                             />
                             <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Chave</span>
                          </div>
                        </div>
                        <input type="email" className="w-full px-4 py-2.5 text-[11px] rounded-xl border border-white outline-none font-bold bg-white" value={contact.email} onChange={e => updateContact(index, 'email', e.target.value)} placeholder="E-mail" />
                     </div>
                  </div>
               ))}
               {formData.contacts.length === 0 && (
                 <p className="text-center py-6 text-slate-300 text-[9px] font-black uppercase italic tracking-widest">Nenhum contato adicionado</p>
               )}
             </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-[10px] active:scale-95 transition-all mt-4">
          {loading ? 'Salvando...' : (editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente')}
        </button>
      </form>
    </div>
  );
};

export default CustomerManagement;
