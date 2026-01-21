
import React, { useState, useMemo, useEffect } from 'react';
import { SystemModule, Client, User, Customer, TrainingLog, UserRole, TrainingTypeEntity } from '../types';
import { saveClient, getStoredModules, getStoredCustomers, getStoredClients, getStoredLogs, deleteClient, getStoredUsers, updateClient, getStoredTrainingTypes } from '../storage';

interface TrainingPurchaseProps {
  user: User;
  onComplete: () => void;
}

const TrainingPurchase: React.FC<TrainingPurchaseProps> = ({ user, onComplete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [availableModules, setAvailableModules] = useState<SystemModule[]>([]);
  const [availableTypes, setAvailableTypes] = useState<TrainingTypeEntity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allLogs, setAllLogs] = useState<TrainingLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    protocolo: '',
    modulos: [] as string[],
    tipoTreinamento: '',
    duracaoHoras: 0,
    dataInicio: new Date().toISOString().split('T')[0],
    valorImplantacao: 0,
    comissaoPercent: 0,
    responsavelTecnico: user.name,
    observacao: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [modules, types, custs, cls, logs, users] = await Promise.all([
        getStoredModules(),
        getStoredTrainingTypes(),
        getStoredCustomers(),
        getStoredClients(),
        getStoredLogs(),
        getStoredUsers()
      ]);
      setAvailableModules(modules);
      setAvailableTypes(types);
      setCustomers(custs);
      setAllClients(cls);
      setAllLogs(logs);
      setAllUsers(users);
      
      if (types.length > 0 && !formData.tipoTreinamento) {
        setFormData(prev => ({ ...prev, tipoTreinamento: types[0].name }));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const activeUsers = useMemo(() => {
    return allUsers.filter(u => u.active !== false);
  }, [allUsers]);

  const visibleClients = useMemo(() => {
    let list = [...allClients];
    if (user.role !== UserRole.MANAGER) {
      list = list.filter(client => client.responsavelTecnico === user.name);
    }
    if (searchTerm.trim()) {
      list = list.filter(c => c.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [allClients, user, searchTerm]);

  const handleCustomerChange = (cid: string) => {
    setFormData(prev => ({ ...prev, customerId: cid }));
    
    // Só verifica saldo se for uma nova venda (não estiver editando)
    if (!editingId && cid) {
      // Busca contratos finalizados deste cliente que possuem saldo residual
      const completedWithBalance = allClients.filter(c => 
        c.customerId === cid && 
        c.status === 'completed' && 
        (c.residualHoursAdded || 0) > 0
      );

      // Soma o saldo total disponível
      const totalBalance = completedWithBalance.reduce((acc, curr) => acc + (curr.residualHoursAdded || 0), 0);

      if (totalBalance > 0) {
        alert(`IDENTIFICADO SALDO POSITIVO!\n\nO cliente selecionado possui um saldo acumulado de ${totalBalance.toFixed(1)}h de treinamentos anteriores finalizados.\n\nEste saldo foi importado automaticamente para o campo de Carga Horária.`);
        setFormData(prev => ({ ...prev, duracaoHoras: totalBalance }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isViewOnly) return;

    if (!formData.customerId) {
      alert('Por favor, selecione um cliente beneficiário.');
      return;
    }
    if (!formData.protocolo.trim()) {
      alert('O número do protocolo é obrigatório.');
      return;
    }

    setLoading(true);

    try {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      const clientData: Client = {
        id: editingId || '', 
        customerId: formData.customerId,
        razãoSocial: selectedCustomer?.razãoSocial || '',
        protocolo: formData.protocolo.trim(),
        modulos: formData.modulos,
        tipoTreinamento: formData.tipoTreinamento,
        duracaoHoras: Number(formData.duracaoHoras),
        dataInicio: formData.dataInicio,
        valorImplantacao: Number(formData.valorImplantacao),
        comissaoPercent: Number(formData.comissaoPercent),
        status: editingId ? (allClients.find(c => c.id === editingId)?.status || 'pending') : 'pending',
        responsavelTecnico: formData.responsavelTecnico,
        observacao: formData.observacao.trim()
      };

      if (editingId) {
        await updateClient(clientData);
      } else {
        await saveClient(clientData);
      }
      
      alert('Registro salvo com sucesso!');
      resetForm();
      setViewMode('list');
      onComplete(); 
    } catch (err: any) {
      console.error('ERRO DETALHADO NO SALVAMENTO:', err);
      let msg = err.message || JSON.stringify(err);
      alert(`ERRO AO CONFIRMAR VENDA:\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setIsViewOnly(false);
    setFormData({
      customerId: '',
      protocolo: '',
      modulos: [],
      tipoTreinamento: availableTypes[0]?.name || '',
      duracaoHoras: 0,
      dataInicio: new Date().toISOString().split('T')[0],
      valorImplantacao: 0,
      comissaoPercent: 0,
      responsavelTecnico: user.name,
      observacao: ''
    });
  };

  const handleEdit = (client: Client) => {
    if (client.status === 'completed') {
      alert('BLOQUEIO: Esta compra não pode ser editada porque o treinamento já foi FINALIZADO.');
      return;
    }
    setEditingId(client.id);
    setIsViewOnly(false);
    populateFormData(client);
    setViewMode('form');
  };

  const handleView = (client: Client) => {
    setEditingId(client.id);
    setIsViewOnly(true);
    populateFormData(client);
    setViewMode('form');
  };

  const populateFormData = (client: Client) => {
    setFormData({
      customerId: client.customerId,
      protocolo: client.protocolo,
      modulos: client.modulos,
      tipoTreinamento: client.tipoTreinamento,
      duracaoHoras: client.duracaoHoras,
      dataInicio: client.dataInicio,
      valorImplantacao: client.valorImplantacao,
      comissaoPercent: client.comissaoPercent,
      responsavelTecnico: client.responsavelTecnico,
      observacao: client.observacao || ''
    });
  };

  const handleAttemptDelete = (client: Client) => {
    if (client.status === 'completed') {
      alert('BLOQUEIO: Esta compra não pode ser excluída porque o treinamento já foi FINALIZADO na tela de Gestão de Horas. Existe um vínculo de faturamento e comissão ativo.');
      return;
    }
    setConfirmDeleteId(client.id);
  };

  const performDelete = async (id: string) => {
    if (!id) return;
    
    const client = allClients.find(c => c.id === id);
    if (client && client.status === 'completed') {
      alert('BLOQUEIO: Esta compra não pode ser excluída porque o treinamento já foi FINALIZADO.');
      setConfirmDeleteId(null);
      return;
    }

    setActionLoadingId(id);
    try {
      await deleteClient(id);
      setAllClients(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
      alert('Registro removido com sucesso!');
    } catch (err: any) {
      console.error('Erro na exclusão:', err);
      alert(`Erro ao excluir: ${err.message || 'Falha na conexão.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleModule = (moduleName: string) => {
    if (isViewOnly) return;
    setFormData(prev => {
      const isSelected = prev.modulos.includes(moduleName);
      return {
        ...prev,
        modulos: isSelected ? prev.modulos.filter(m => m !== moduleName) : [...prev.modulos, moduleName]
      };
    });
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Vendas de Treinamento</h2>
            <p className="text-sm text-gray-500 font-medium">Controle e gestão dos contratos em nuvem.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <button onClick={() => { resetForm(); setViewMode('form'); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-wide flex-shrink-0">
                <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Nova Venda
             </button>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {loading && allClients.length === 0 ? (
             <div className="flex justify-center items-center p-20">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente / Protocolo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Horas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">Nenhuma venda encontrada no banco de dados.</td>
                  </tr>
                ) : (
                  visibleClients.map(client => {
                    const isCompleted = client.status === 'completed';
                    return (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 text-sm">{client.razãoSocial}</p>
                          <button 
                            onClick={() => handleView(client)}
                            className="text-[10px] text-gray-400 font-black uppercase tracking-tighter hover:text-blue-500 hover:underline transition-all block text-left"
                            title="Visualizar detalhes"
                          >
                            {client.protocolo}
                          </button>
                          {isCompleted && (
                            <span className="text-[8px] bg-green-50 text-green-600 px-1 py-0.5 rounded-md font-black uppercase tracking-tighter border border-green-100 mt-1 inline-block">Finalizado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-600">{client.responsavelTecnico}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-blue-600">{client.duracaoHoras}h</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 items-center">
                            {actionLoadingId === client.id ? (
                              <div className="p-2 animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            ) : confirmDeleteId === client.id ? (
                              <div className="flex items-center gap-1 animate-fadeIn">
                                 <button onClick={() => performDelete(client.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-red-700 transition-all">Confirmar?</button>
                                 <button onClick={() => setConfirmDeleteId(null)} className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-gray-200 transition-all">Sair</button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => !isCompleted && handleEdit(client)} 
                                  className={`p-2.5 rounded-xl transition-all ${isCompleted ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`} 
                                  title={isCompleted ? "Bloqueado: Treinamento já finalizado" : "Editar venda"}
                                  disabled={isCompleted}
                                >
                                   <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button 
                                  onClick={() => handleAttemptDelete(client)} 
                                  className={`p-2.5 rounded-xl transition-all ${isCompleted ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`} 
                                  title={isCompleted ? "Bloqueado: Treinamento já finalizado" : "Excluir venda"}
                                >
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-slideIn max-w-4xl mx-auto overflow-hidden">
       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              {isViewOnly ? 'Detalhes da Venda' : editingId ? 'Editar Venda' : 'Nova Venda de Treinamento'}
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {isViewOnly ? 'Modo Visualização' : 'Sincronização em tempo real'}
            </p>
          </div>
          <div className={`w-10 h-10 ${isViewOnly ? 'bg-blue-500' : 'bg-emerald-500'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
            {isViewOnly ? (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            ) : (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            )}
          </div>
       </div>

       <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cliente Beneficiário</label>
                <select 
                  className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/10 disabled:opacity-75 disabled:cursor-not-allowed" 
                  value={formData.customerId} 
                  onChange={e => handleCustomerChange(e.target.value)} 
                  required 
                  disabled={loading || isViewOnly}
                >
                   <option value="">Selecione um cliente da base...</option>
                   {customers.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
                </select>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Número do Protocolo</label>
                   <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.protocolo} onChange={e => setFormData({...formData, protocolo: e.target.value})} required disabled={loading || isViewOnly} placeholder="Ex: 2024.12345" />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipo de Treinamento</label>
                   <select className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.tipoTreinamento} onChange={e => setFormData({...formData, tipoTreinamento: e.target.value})} required disabled={loading || isViewOnly}>
                      {availableTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                   </select>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Data de Início Prevista</label>
                   <input type="date" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.dataInicio} onChange={e => setFormData({...formData, dataInicio: e.target.value})} required disabled={loading || isViewOnly} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Responsável Técnico</label>
                   <select className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.responsavelTecnico} onChange={e => setFormData({...formData, responsavelTecnico: e.target.value})} required disabled={loading || isViewOnly}>
                      {activeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                   </select>
                </div>
             </div>

             <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Observação do Contrato</label>
                <textarea className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-medium text-gray-700 bg-gray-50/30 transition-all resize-none min-h-[80px] disabled:opacity-75 disabled:cursor-not-allowed" value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} placeholder="Descreva detalhes importantes sobre esta venda..." disabled={loading || isViewOnly} />
             </div>

             <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Carga Horária (h)</label>
                   <input type="number" step="0.5" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-black text-blue-600 bg-blue-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.duracaoHoras} onChange={e => setFormData({...formData, duracaoHoras: Number(e.target.value)})} required disabled={loading || isViewOnly} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor do Contrato (R$)</label>
                   <input type="number" step="0.01" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.valorImplantacao} onChange={e => setFormData({...formData, valorImplantacao: Number(e.target.value)})} required disabled={loading || isViewOnly} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Comissão (%)</label>
                   <input type="number" step="0.1" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed" value={formData.comissaoPercent} onChange={e => setFormData({...formData, comissaoPercent: Number(e.target.value)})} required disabled={loading || isViewOnly} />
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-100">
             <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest">Módulos Inclusos nesta Venda</label>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableModules.map(mod => (
                  <button key={mod.id} type="button" onClick={() => toggleModule(mod.name)} className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all text-center ${formData.modulos.includes(mod.name) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'} disabled:cursor-not-allowed`} disabled={loading || isViewOnly}>{mod.name}</button>
                ))}
             </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-gray-100">
             <button type="button" onClick={() => setViewMode('list')} className="px-8 py-3.5 text-gray-400 hover:text-gray-600 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl" disabled={loading}>
                {isViewOnly ? 'Fechar Visualização' : 'Cancelar'}
             </button>
             {!isViewOnly && (
               <button type="submit" className="px-12 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]" disabled={loading}>
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (editingId ? 'Salvar Alterações' : 'Confirmar Venda')}
               </button>
             )}
          </div>
       </form>
    </div>
  );
};

export default TrainingPurchase;
