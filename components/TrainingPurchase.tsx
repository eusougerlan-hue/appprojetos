
import React, { useState, useMemo, useEffect } from 'react';
import { SystemModule, Client, User, Customer, TrainingLog, UserRole, TrainingTypeEntity } from '../types';
import { saveClient, getStoredModules, getStoredCustomers, getStoredClients, getStoredLogs, deleteClient, getStoredUsers, updateClient, getStoredTrainingTypes, getStoredIntegrations } from '../storage';

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
  const [generatingProtocol, setGeneratingProtocol] = useState(false);
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
    if (!editingId && cid) {
      const completedWithBalance = allClients.filter(c => 
        c.customerId === cid && 
        c.status === 'completed' && 
        (c.residualHoursAdded || 0) > 0
      );
      const totalBalance = completedWithBalance.reduce((acc, curr) => acc + (curr.residualHoursAdded || 0), 0);
      if (totalBalance > 0) {
        alert(`IDENTIFICADO SALDO POSITIVO!\n\nO cliente selecionado possui um saldo acumulado de ${totalBalance.toFixed(1)}h.\n\nEste saldo foi importado automaticamente.`);
        setFormData(prev => ({ ...prev, duracaoHoras: totalBalance }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isViewOnly || generatingProtocol) return;

    if (!formData.customerId) return alert('Selecione um cliente beneficiário.');

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const settings = await getStoredIntegrations();
    
    let finalProtocol = formData.protocolo;

    // Fluxo de geração de protocolo via n8n/Movidesk apenas para novas vendas ou se o protocolo estiver vazio
    if (!editingId || !formData.protocolo) {
      if (!settings.webhookUrl) {
        return alert('Configuração de Integração (Webhook) não encontrada. Configure nas integrações cloud primeiro.');
      }

      setGeneratingProtocol(true);
      try {
        const payload = {
          event: 'generate_movidesk_protocol',
          apiKey: settings.apiKey,
          razao_social: selectedCustomer?.razãoSocial,
          cnpj: selectedCustomer?.cnpj,
          modulos: formData.modulos,
          tipo_treinamento: formData.tipoTreinamento,
          responsavel: formData.responsavelTecnico,
          observacao: formData.observacao
        };

        const response = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Falha na comunicação com o n8n');
        
        const data = await response.json();
        
        if (data && data.protocolo) {
          finalProtocol = data.protocolo;
          setFormData(prev => ({ ...prev, protocolo: data.protocolo }));
        } else {
          throw new Error('O servidor de integração não retornou um número de protocolo válido.');
        }
      } catch (err: any) {
        setGeneratingProtocol(false);
        return alert(`ERRO NA GERAÇÃO DO PROTOCOLO:\n${err.message || 'Verifique se o n8n está online.'}`);
      }
    }

    setLoading(true);
    setGeneratingProtocol(false);

    try {
      const clientData: Client = {
        id: editingId || '', 
        customerId: formData.customerId,
        razãoSocial: selectedCustomer?.razãoSocial || '',
        protocolo: finalProtocol,
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
      
      resetForm();
      setViewMode('list');
      onComplete(); 
    } catch (err: any) {
      alert(`ERRO AO SALVAR VENDA:\n${err.message || 'Falha na conexão.'}`);
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
    setViewMode('form');
  };

  const handleView = (client: Client) => {
    setEditingId(client.id);
    setIsViewOnly(true);
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
    setViewMode('form');
  };

  const performDelete = async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteClient(id);
      setAllClients(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
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
                <input type="text" placeholder="Buscar cliente..." className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <button onClick={() => { resetForm(); setViewMode('form'); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-wide flex-shrink-0 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Nova Venda
             </button>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
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
              {visibleClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800 text-sm">{client.razãoSocial}</p>
                    <button onClick={() => handleView(client)} className="text-[10px] text-gray-400 font-black uppercase tracking-tighter hover:text-blue-500 hover:underline transition-all block text-left">
                      {client.protocolo}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-600">{client.responsavelTecnico}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-blue-600">{client.duracaoHoras}h</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => performDelete(client.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Excluir"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* OVERLAY DE AGUARDO PARA GERAÇÃO DO PROTOCOLO */}
      {(generatingProtocol || loading) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Conectando ao Movidesk</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
                {generatingProtocol ? 'Aguarde enquanto geramos o protocolo no Movidesk...' : 'Sincronizando com a nuvem...'}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 animate-slideUp max-w-4xl mx-auto overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isViewOnly ? 'Detalhes da Venda' : editingId ? 'Editar Venda' : 'Venda de Treinamento'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sincronização em tempo real ativa</p>
              </div>
            </div>
            <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl border border-slate-100`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cliente Beneficiário</label>
                  <select className="w-full px-6 py-4.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-50" value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)} required disabled={isViewOnly}>
                    <option value="">Selecione um cliente da base...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
                  </select>
              </div>
              
              <div className="space-y-8">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Número do Protocolo</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className={`w-full px-6 py-4.5 rounded-2xl border border-slate-200 outline-none font-black text-slate-700 bg-white transition-all shadow-sm ${generatingProtocol ? 'bg-blue-50/50 border-blue-200' : ''}`} 
                        value={generatingProtocol ? 'Gerando...' : formData.protocolo} 
                        readOnly 
                        placeholder="Ex: 2024.12345" 
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                         <svg className={`w-5 h-5 ${formData.protocolo ? 'text-emerald-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tipo de Treinamento</label>
                    <select className="w-full px-6 py-4.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-50" value={formData.tipoTreinamento} onChange={e => setFormData({...formData, tipoTreinamento: e.target.value})} required disabled={isViewOnly}>
                        {availableTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
              </div>

              <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Data de Início Prevista</label>
                    <input type="date" className="w-full px-6 py-4.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-50" value={formData.dataInicio} onChange={e => setFormData({...formData, dataInicio: e.target.value})} required disabled={isViewOnly} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Responsável Técnico</label>
                    <select className="w-full px-6 py-4.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 disabled:bg-slate-50" value={formData.responsavelTecnico} onChange={e => setFormData({...formData, responsavelTecnico: e.target.value})} required disabled={isViewOnly}>
                        {activeUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
              </div>

              <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Observação do Contrato</label>
                  <textarea className="w-full px-6 py-4.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-700 bg-white shadow-sm transition-all resize-none min-h-[120px] disabled:bg-slate-50" value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} placeholder="Descreva detalhes importantes..." disabled={isViewOnly} />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50">
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Carga Horária (h)</label>
                    <input type="number" step="0.5" className="w-full px-5 py-3 rounded-xl border-none focus:ring-0 outline-none font-black text-2xl text-blue-600 bg-transparent disabled:opacity-50" value={formData.duracaoHoras} onChange={e => setFormData({...formData, duracaoHoras: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Valor Contrato (R$)</label>
                    <input type="number" step="0.01" className="w-full px-5 py-3 rounded-xl border-none focus:ring-0 outline-none font-black text-2xl text-slate-800 bg-transparent disabled:opacity-50" value={formData.valorImplantacao} onChange={e => setFormData({...formData, valorImplantacao: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Comissão (%)</label>
                    <input type="number" step="0.1" className="w-full px-5 py-3 rounded-xl border-none focus:ring-0 outline-none font-black text-2xl text-slate-800 bg-transparent disabled:opacity-50" value={formData.comissaoPercent} onChange={e => setFormData({...formData, comissaoPercent: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-10 border-t border-slate-100">
              <button type="button" onClick={() => setViewMode('list')} className="px-10 py-5 text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest transition-all rounded-2xl">
                  {isViewOnly ? 'Fechar Detalhes' : 'Cancelar Venda'}
              </button>
              {!isViewOnly && (
                <button type="submit" className="px-16 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]" disabled={loading || generatingProtocol}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    Confirmar Venda
                </button>
              )}
            </div>
        </form>
      </div>
    </div>
  );
};

export default TrainingPurchase;
