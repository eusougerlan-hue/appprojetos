
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
        alert(`IDENTIFICADO SALDO POSITIVO!\n\nO cliente possui um saldo acumulado de ${totalBalance.toFixed(1)}h de contratos anteriores.`);
        setFormData(prev => ({ ...prev, duracaoHoras: totalBalance }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isViewOnly || generatingProtocol) return;

    if (!formData.customerId) return alert('Selecione um cliente beneficiário.');

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const selectedTech = allUsers.find(u => u.name === formData.responsavelTecnico);
    const settings = await getStoredIntegrations();
    
    let finalProtocol = formData.protocolo;

    // ETAPA 1: GERAÇÃO DE PROTOCOLO VIA N8N
    if (!editingId || !formData.protocolo) {
      if (!settings.webhookUrl) {
        return alert('ERRO: Configure o Webhook do n8n nas Integrações Cloud para gerar protocolos Movidesk.');
      }

      setGeneratingProtocol(true);
      try {
        const payload = {
          event: 'generate_movidesk_protocol',
          apiKey: settings.apiKey,
          razao_social: selectedCustomer?.razãoSocial,
          cnpj: selectedCustomer?.cnpj,
          ref_movidesk: selectedCustomer?.refMovidesk || '', 
          usuario_movidesk: selectedTech?.usuarioMovidesk || '', // ENVIANDO O USUÁRIO MOVIDESK DO FUNCIONÁRIO
          modulos: formData.modulos,
          tipo_treinamento: formData.tipoTreinamento,
          responsavel: formData.responsavelTecnico,
          valor_implantacao: formData.valorImplantacao,
          carga_horaria: formData.duracaoHoras,
          observacao: formData.observacao,
          timestamp: new Date().toISOString()
        };

        const response = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
           const errorBody = await response.text();
           console.error('Erro n8n:', errorBody);
           throw new Error(`O n8n retornou erro ${response.status}. Certifique-se de que o workflow n8n está apenas devolvendo o protocolo.`);
        }
        
        const rawData = await response.json();
        const data = Array.isArray(rawData) ? rawData[0] : rawData;
        
        if (data && data.protocolo) {
          finalProtocol = data.protocolo;
          setFormData(prev => ({ ...prev, protocolo: data.protocolo }));
        } else {
          throw new Error('O n8n não retornou a chave "protocolo". Verifique o formato de resposta do n8n.');
        }
      } catch (err: any) {
        setGeneratingProtocol(false);
        return alert(`FALHA NA INTEGRAÇÃO MOVIDESK:\n${err.message || 'Erro ao comunicar com n8n.'}`);
      }
    }

    // ETAPA 2: SALVAMENTO NO SUPABASE (Sincronizado)
    setLoading(true);
    setGeneratingProtocol(false);

    try {
      const clientData: Client = {
        id: editingId || Math.random().toString(36).substr(2, 9), 
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
      console.error('Erro ao salvar no Supabase:', err);
      alert(`ERRO AO SALVAR NO SUPABASE:\n${err.message || 'Verifique se a coluna tipo_treinamento existe no banco.'}`);
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async (id: string) => {
    const client = allClients.find(c => c.id === id);
    if (client?.status === 'completed') {
      alert('SEGURANÇA: Projetos FINALIZADOS não podem ser excluídos.');
      setConfirmDeleteId(null);
      return;
    }

    setLoading(true);
    try {
      await deleteClient(id);
      setAllClients(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      alert('Erro ao excluir venda.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    if (client.status === 'completed') {
      alert('Contrato finalizado é imutável.');
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

  const resetForm = () => {
    setEditingId(null);
    setIsViewOnly(false);
    setConfirmDeleteId(null);
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

  const toggleModule = (name: string) => {
    setFormData(prev => ({
      ...prev,
      modulos: prev.modulos.includes(name)
        ? prev.modulos.filter(m => m !== name)
        : [...prev.modulos, name]
    }));
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 animate-fadeIn overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Vendas de Treinamento</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de novos contratos e protocolos</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1">
                <input type="text" placeholder="Buscar cliente..." className="w-full pl-9 pr-4 py-3 text-[11px] border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold bg-slate-50/50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <button onClick={() => { resetForm(); setViewMode('form'); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black shadow-xl shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-widest flex-shrink-0 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Nova Venda
             </button>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo / Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleClients.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold italic">Nenhum registro encontrado.</td>
                </tr>
              ) : visibleClients.map(client => (
                <tr key={client.id} className={`hover:bg-slate-50 transition-colors ${client.status === 'completed' ? 'bg-emerald-50/20' : ''}`}>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-700 text-sm leading-tight">{client.protocolo || 'SEM PROTOCOLO'}</p>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter mt-1">{client.razãoSocial}</p>
                  </td>
                  <td className="px-8 py-5 text-center font-black text-slate-700 text-sm">{client.duracaoHoras}h</td>
                  <td className="px-8 py-5 text-center">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${
                      client.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {client.status === 'pending' ? 'PENDENTE' : 'FINALIZADO'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(client)} className={`p-2 rounded-xl transition-all ${client.status === 'completed' ? 'text-slate-200' : 'text-blue-600 hover:bg-blue-50'}`} disabled={client.status === 'completed'}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDeleteId(client.id)} className={`p-2 rounded-xl transition-all ${client.status === 'completed' ? 'text-slate-200' : 'text-red-400 hover:bg-red-50'}`} disabled={client.status === 'completed'}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    {confirmDeleteId === client.id && (
                       <div className="flex justify-end gap-2 mt-2 animate-fadeIn">
                          <button onClick={() => performDelete(client.id)} className="bg-red-600 text-white px-3 py-1 text-[9px] font-black rounded-lg">Confirmar?</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-500 px-3 py-1 text-[9px] font-black rounded-lg">Sair</button>
                       </div>
                    )}
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
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 animate-slideUp max-w-4xl mx-auto overflow-hidden relative">
        {(generatingProtocol || loading) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <div className="text-center">
               <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                 {generatingProtocol ? 'Sincronizando com Movidesk via n8n...' : 'Persistindo dados no Supabase...'}
               </h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] px-10 leading-relaxed">
                 Aguarde a geração do protocolo e o salvamento automático.
               </p>
            </div>
          </div>
        )}

        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isViewOnly ? 'Visualizar Venda' : editingId ? 'Editar Contrato' : 'Nova Venda de Treinamento'}
              </h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Sincronização Cloud Ativada</p>
            </div>
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cliente Beneficiário</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/50 transition-all disabled:opacity-50" value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)} required disabled={isViewOnly || !!editingId}>
                  <option value="">Selecione o cliente da base...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Número do Protocolo</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black text-blue-600 bg-slate-100 cursor-not-allowed" value={formData.protocolo} readOnly placeholder="Ex: 202601004476 (Auto)" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tipo de Treinamento</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-slate-50/50 transition-all" value={formData.tipoTreinamento} onChange={e => setFormData({...formData, tipoTreinamento: e.target.value})} required disabled={isViewOnly}>
                    {availableTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Módulos do Sistema Contratados</label>
                <div className="flex flex-wrap gap-2">
                   {availableModules.map(mod => {
                     const active = formData.modulos.includes(mod.name);
                     return (
                       <button key={mod.id} type="button" onClick={() => toggleModule(mod.name)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black border transition-all ${active ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`} disabled={isViewOnly}>
                         {mod.name}
                       </button>
                     );
                   })}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Carga Horária (h)</label>
                    <input type="number" step="0.5" className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black text-gray-700 bg-slate-50/50" value={formData.duracaoHoras} onChange={e => setFormData({...formData, duracaoHoras: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Valor Contrato (R$)</label>
                    <input type="number" step="0.01" className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black text-gray-700 bg-slate-50/50" value={formData.valorImplantacao} onChange={e => setFormData({...formData, valorImplantacao: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Comissão (%)</label>
                    <input type="number" step="1" className="w-full px-6 py-4 rounded-2xl border border-slate-200 font-black text-gray-700 bg-slate-50/50" value={formData.comissaoPercent} onChange={e => setFormData({...formData, comissaoPercent: Number(e.target.value)})} required disabled={isViewOnly} />
                  </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Informações Adicionais / Observação</label>
                <textarea className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-medium text-slate-600 bg-slate-50/50 transition-all resize-none min-h-[120px]" value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} placeholder="Insira detalhes sobre a venda ou logística..." disabled={isViewOnly} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-10 border-t border-slate-100">
               <button type="button" onClick={() => setViewMode('list')} className="px-10 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">
                 {isViewOnly ? 'FECHAR' : 'CANCELAR'}
               </button>
               {!isViewOnly && (
                 <button type="submit" disabled={generatingProtocol || loading} className="px-16 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-2xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]">
                   {editingId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR VENDA'}
                 </button>
               )}
            </div>
        </form>
    </div>
  );
};

export default TrainingPurchase;
