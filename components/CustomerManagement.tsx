
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
      // Determine if there is any key user marked in the contacts list
      const hasKeyUser = formData.contacts.some(c => !!c.isKeyUser);

      const customerData: Customer = {
        id: editingCustomer ? editingCustomer.id : '',
        razãoSocial: formData.razãoSocial.trim(),
        cnpj: formData.cnpj.trim(),
        refMovidesk: formData.refMovidesk.trim(),
        contacts: formData.contacts,
        usuarioChave: hasKeyUser
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
      contacts: [...prev.contacts, { name: '', phone: '', email: '', isKeyUser: false }]
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
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 animate-fadeIn overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Base de Clientes</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sincronizado via Supabase Cloud</p>
          </div>
          
          <div className="flex flex-1 items-center justify-end gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-sm:hidden max-w-sm">
              <input 
                type="text" 
                placeholder="Buscar Cliente" 
                className="w-full px-5 py-3 rounded-2xl border border-blue-200 outline-none font-bold text-blue-600 bg-gray-50/50 transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:text-blue-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-5 h-5 text-blue-300 absolute right-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[11px] font-black transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-widest flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
              Novo Cliente
            </button>
          </div>
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
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Razão Social</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Usuário Chave</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <p className="text-gray-400 font-bold text-sm italic">Nenhum cliente encontrado.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const linkedPurchasesCount = allClients.filter(c => c.customerId === customer.id).length;
                    
                    return (
                      <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="font-black text-slate-700 text-sm leading-tight">{customer.razãoSocial}</p>
                          {linkedPurchasesCount > 0 && (
                            <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md uppercase tracking-tighter mt-1 inline-block">
                              {linkedPurchasesCount} {linkedPurchasesCount === 1 ? 'Contrato Ativo' : 'Contratos Ativos'}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-xs text-gray-500 font-medium">{customer.cnpj}</td>
                        <td className="px-8 py-5 text-center">
                          {customer.usuarioChave ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black border border-blue-200 uppercase flex items-center justify-center gap-1.5 mx-auto w-fit shadow-sm">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              Definido
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-bold uppercase">Não definido</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-1 items-center">
                            {actionLoadingId === customer.id ? (
                              <div className="p-2 animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            ) : confirmDeleteId === customer.id ? (
                              <div className="flex items-center gap-1 animate-fadeIn">
                                 <button onClick={() => performDelete(customer.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-red-700 transition-all shadow-sm">Confirmar?</button>
                                 <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-gray-200 transition-all">Sair</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar cliente">
                                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => setConfirmDeleteId(customer.id)} className={`p-2 rounded-xl transition-all ${linkedPurchasesCount > 0 ? 'text-gray-200 cursor-not-allowed' : 'text-red-400 hover:bg-red-50'}`} title={linkedPurchasesCount > 0 ? "Bloqueado" : "Excluir"}>
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
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 animate-slideIn max-w-5xl mx-auto overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">RAZÃO SOCIAL</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Cadastro e Edição de Cliente</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">RAZÃO SOCIAL</label>
            <input type="text" className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all uppercase placeholder:text-gray-300" value={formData.razãoSocial} onChange={e => setFormData({...formData, razãoSocial: e.target.value})} placeholder="Ex: Empresa de Software LTDA" required disabled={loading} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">CNPJ</label>
            <input type="text" className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all placeholder:text-gray-300" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0000-00" required disabled={loading} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 ml-1">REF. MOVIDESK</label>
            <input type="text" className="w-full px-5 py-4 rounded-xl border border-blue-200 focus:border-blue-500 outline-none font-bold text-blue-600 bg-blue-50/10 transition-all placeholder:text-blue-300" value={formData.refMovidesk} onChange={e => setFormData({...formData, refMovidesk: e.target.value})} placeholder="ID Movidesk" disabled={loading} />
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-100">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 </div>
                 <label className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">CONTATOS DO CLIENTE</label>
              </div>
              <button type="button" onClick={addContact} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100 shadow-sm active:scale-95">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                 ADICIONAR CONTATO
              </button>
           </div>

           {formData.contacts.length === 0 ? (
              <div className="p-12 text-center bg-gray-50/50 rounded-[1.5rem] border border-dashed border-gray-200">
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest italic">Nenhum contato adicionado ainda.</p>
              </div>
           ) : (
              <div className="space-y-4">
                 {formData.contacts.map((contact, index) => (
                    <div key={index} className="flex flex-col lg:flex-row gap-4 p-6 bg-gray-50/50 rounded-[1.5rem] border border-gray-100 relative group animate-fadeIn lg:items-end">
                       <button type="button" onClick={() => removeContact(index)} className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-xl shadow-xl border border-red-50 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 active:scale-90 z-20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                       <div className="flex-[2]">
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">NOME</label>
                          <input type="text" className="w-full px-4 py-3 text-xs rounded-xl border border-gray-200 focus:border-blue-400 outline-none font-bold uppercase" value={contact.name} onChange={e => updateContact(index, 'name', e.target.value)} placeholder="NOME DO CONTATO" required disabled={loading} />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">TELEFONE</label>
                          <input type="text" className="w-full px-4 py-3 text-xs rounded-xl border border-gray-200 focus:border-blue-400 outline-none font-bold" value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)} placeholder="(00) 00000-0000" disabled={loading} />
                       </div>
                       <div className="flex-[1.5]">
                          <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-MAIL</label>
                          <input type="email" className="w-full px-4 py-3 text-xs rounded-xl border border-gray-200 focus:border-blue-400 outline-none font-bold lowercase" value={contact.email} onChange={e => updateContact(index, 'email', e.target.value)} placeholder="contato@email.com" disabled={loading} />
                       </div>
                       
                       {/* UI Block as per Screenshot */}
                       <div className="lg:w-32 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-blue-600 bg-white shadow-sm self-center lg:self-end">
                          <label className="block text-[8px] font-black text-blue-600 uppercase tracking-widest mb-2 text-center whitespace-nowrap">USUÁRIO CHAVE</label>
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              className="w-7 h-7 rounded-md border-2 border-gray-200 text-blue-600 focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all appearance-none checked:bg-blue-600 checked:border-blue-600 relative overflow-hidden"
                              checked={!!contact.isKeyUser}
                              onChange={(e) => updateContact(index, 'isKeyUser', e.target.checked)}
                              disabled={loading}
                            />
                            {contact.isKeyUser && (
                              <svg className="w-4 h-4 text-white absolute pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                            )}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>

        <div className="pt-8 border-t border-gray-100 flex justify-end items-center gap-4">
           <button type="button" onClick={() => setViewMode('list')} className="px-8 py-4 text-gray-400 hover:text-gray-600 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl" disabled={loading}>CANCELAR</button>
           <button type="submit" disabled={loading} className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[11px] flex items-center justify-center min-w-[200px]">
             {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (editingCustomer ? 'SALVAR ALTERAÇÕES' : 'SALVAR CLIENTE')}
           </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerManagement;
