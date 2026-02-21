
import React, { useState, useMemo, useEffect } from 'react';
import { SystemModule, Client, User, Customer, TrainingLog, UserRole, TrainingTypeEntity } from '../types';
import { saveClient, getStoredModules, getStoredCustomers, getStoredClients, getStoredUsers, updateClient, getStoredTrainingTypes, getStoredIntegrations } from '../storage';

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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingProtocol, setGeneratingProtocol] = useState(false);
  
  const isManager = user.role === UserRole.MANAGER;

  const [formData, setFormData] = useState({
    customerId: '',
    protocolo: '',
    modulos: [] as string[],
    tipoTreinamento: '',
    solicitante: '',
    duracaoHoras: 0,
    residualHoursAdded: 0,
    dataInicio: new Date().toISOString().split('T')[0],
    valorImplantacao: 0,
    comissaoPercent: 0,
    responsavelTecnico: user.name,
    observacao: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [modules, types, custs, cls, users] = await Promise.all([
        getStoredModules(),
        getStoredTrainingTypes(),
        getStoredCustomers(),
        getStoredClients(),
        getStoredUsers()
      ]);
      setAvailableModules(modules);
      setAvailableTypes(types);
      setCustomers(custs);
      setAllClients(cls);
      setAllUsers(users);
      
      if (types.length > 0 && !formData.tipoTreinamento && !editingId) {
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
    if (!isManager) {
      list = list.filter(client => client.responsavelTecnico === user.name);
    }
    if (searchTerm.trim()) {
      list = list.filter(c => c.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [allClients, user, searchTerm, isManager]);

  const keyUsers = useMemo(() => {
    if (!formData.customerId) return [];
    const customer = customers.find(c => c.id === formData.customerId);
    return customer?.contacts?.filter(c => c.keyUser) || [];
  }, [formData.customerId, customers]);

  const handleCustomerChange = (cid: string) => {
    // 1. Identifica se o cliente já tem algum projeto PENDENTE
    const hasPending = allClients.some(c => c.customerId === cid && c.status === 'pending' && c.id !== editingId);
    
    let residualHours = 0;
    if (!hasPending) {
      // Busca o saldo residual do projeto concluído mais recente
      const completedProjects = allClients
        .filter(c => c.customerId === cid && c.status === 'completed' && (c.residualHoursAdded || 0) > 0)
        .sort((a, b) => {
          const dateA = a.dataFim ? new Date(a.dataFim).getTime() : 0;
          const dateB = b.dataFim ? new Date(b.dataFim).getTime() : 0;
          return dateB - dateA;
        });
      
      if (completedProjects.length > 0) {
        residualHours = completedProjects[0].residualHoursAdded || 0;
      }
    }

    setFormData(prev => ({ 
      ...prev, 
      customerId: cid, 
      solicitante: '',
      residualHoursAdded: residualHours,
      duracaoHoras: residualHours // Inicia com o saldo residual
    }));
  };

  const toggleModule = (moduleName: string) => {
    setFormData(prev => ({
      ...prev,
      modulos: prev.modulos.includes(moduleName)
        ? prev.modulos.filter(m => m !== moduleName)
        : [...prev.modulos, moduleName]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || generatingProtocol) return;

    if (!formData.customerId) return alert('ERRO: Selecione um cliente para prosseguir.');
    if (!formData.solicitante) return alert('ERRO: Selecione o usuário chave (solicitante).');
    
    const settings = await getStoredIntegrations();
    let finalProtocol = formData.protocolo;

    // BLOCO DE GERAÇÃO AUTOMÁTICA DE PROTOCOLO (Somente para novas vendas)
    if (!editingId) {
      if (!settings.webhookUrl || !settings.apiKey) {
        return alert('CONFIGURAÇÃO PENDENTE: Vá em Integrações Cloud e configure o Webhook e a API Key.');
      }
      
      setGeneratingProtocol(true);
      try {
        const selectedCustomer = customers.find(c => c.id === formData.customerId);
        const selectedTech = allUsers.find(u => u.name === formData.responsavelTecnico);
        const creatorUser = allUsers.find(u => u.id === user.id);
        const selectedContact = selectedCustomer?.contacts?.find(c => c.name === formData.solicitante);
        
        // PAYLOAD COM CAMPO EVENT INCLUÍDO E NOVOS CAMPOS DE USUÁRIO E SOLICITANTE
        const payload = {
          event: 'generate_movidesk_protocol', // Identificador da ação
          apiKey: settings.apiKey,
          razao_social: selectedCustomer?.razãoSocial || '',
          cnpj: selectedCustomer?.cnpj || '',
          ref_movidesk: selectedCustomer?.refMovidesk || '',
          responsavel: formData.responsavelTecnico, // NOVO CAMPO SOLICITADO
          responsavel_tecnico: formData.responsavelTecnico,
          usuario_movidesk_responsavel: selectedTech?.usuarioMovidesk || '',
          usuario_movidesk_criador: creatorUser?.usuarioMovidesk || user.usuarioMovidesk || '',
          tipo_treinamento: formData.tipoTreinamento,
          solicitante: formData.solicitante,
          solicitante_telefone: selectedContact?.phone || '',
          solicitante_email: selectedContact?.email || '',
          modulos: formData.modulos.join(', '), 
          modulos_array: formData.modulos,
          duracao_horas: Number(formData.duracaoHoras),
          data_inicio: formData.dataInicio,
          valor_contrato: Number(formData.valorImplantacao),
          comissao_percent: Number(formData.comissaoPercent),
          observacao: formData.observacao.trim(),
          timestamp: new Date().toISOString()
        };

        console.log('--- ENVIANDO REQUISIÇÃO AO WEBHOOK ---', payload);

        const response = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Captura a resposta como texto primeiro para evitar "Unexpected end of JSON input"
        const responseText = await response.text();
        console.log('--- RESPOSTA BRUTA DO SERVIDOR ---', responseText);

        if (!response.ok) {
          throw new Error(`Falha no Servidor de Automação (${response.status}): ${responseText || 'Sem mensagem de erro.'}`);
        }

        if (!responseText || responseText.trim() === "") {
          throw new Error('O servidor respondeu com sucesso (200 OK), mas o corpo da resposta está vazio. Verifique seu fluxo n8n.');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`O servidor não retornou um JSON válido. Resposta: "${responseText.substring(0, 100)}"`);
        }

        const result = Array.isArray(data) ? data[0] : data;
        
        if (result && result.protocolo) {
          finalProtocol = String(result.protocolo);
          console.log('Protocolo recebido com sucesso:', finalProtocol);
        } else {
          throw new Error('A automação não incluiu o campo "protocolo" no JSON de resposta.');
        }
      } catch (err: any) {
        console.error('Falha crítica na geração do protocolo:', err);
        alert(`ERRO DE INTEGRAÇÃO:\n\n${err.message}\n\nNota: Verifique os logs do seu workflow n8n.`);
        setGeneratingProtocol(false);
        return; 
      } finally {
        setGeneratingProtocol(false);
      }
    }

    // SALVAMENTO NO SUPABASE
    setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      const clientData: Client = {
        id: editingId || Math.random().toString(36).substr(2, 9), 
        customerId: formData.customerId,
        razãoSocial: selectedCustomer?.razãoSocial || '',
        protocolo: finalProtocol, 
        modulos: formData.modulos,
        tipoTreinamento: formData.tipoTreinamento,
        solicitante: formData.solicitante,
        duracaoHoras: Number(formData.duracaoHoras),
        residualHoursAdded: Number(formData.residualHoursAdded),
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
      console.error('Erro ao salvar no banco:', err);
      alert('ERRO AO SALVAR: Protocolo gerado, mas falha ao gravar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      customerId: client.customerId,
      protocolo: client.protocolo,
      modulos: client.modulos || [],
      tipoTreinamento: client.tipoTreinamento,
      solicitante: client.solicitante || '',
      duracaoHoras: client.duracaoHoras,
      residualHoursAdded: client.residualHoursAdded || 0,
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
    setFormData({
      customerId: '',
      protocolo: '',
      modulos: [],
      tipoTreinamento: availableTypes[0]?.name || '',
      solicitante: '',
      duracaoHoras: 0,
      residualHoursAdded: 0,
      dataInicio: new Date().toISOString().split('T')[0],
      valorImplantacao: 0,
      comissaoPercent: 0,
      responsavelTecnico: user.name,
      observacao: ''
    });
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fadeIn">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Vendas Recentes</h2>
            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Gestão de Contratos Ativos</p>
          </div>
          <button onClick={() => { resetForm(); setViewMode('form'); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Nova Venda</button>
        </div>
        
        <div className="p-4 bg-slate-50/30 border-b border-slate-50">
          <input 
            type="text" 
            placeholder="Pesquisar cliente..." 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold text-xs bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pb-10">
          {visibleClients.map(client => (
            <div key={client.id} className="p-4 border border-slate-100 rounded-2xl bg-white flex justify-between items-center shadow-sm hover:shadow-md transition-all">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[9px] font-black text-blue-600 uppercase mb-0.5 truncate">{client.protocolo || 'AGUARDANDO GERAÇÃO'}</p>
                <p className="font-bold text-slate-800 text-xs truncate leading-tight">{client.razãoSocial}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[7px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 font-black uppercase">{client.tipoTreinamento}</span>
                   <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">{client.duracaoHoras}h Contratadas</span>
                </div>
              </div>
              <button onClick={() => handleEdit(client)} className="bg-slate-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-50 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
          ))}
          {visibleClients.length === 0 && (
            <div className="text-center py-20">
               <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] italic">Nenhuma venda encontrada</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 animate-slideUp overflow-hidden relative">
      {(generatingProtocol || loading) && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8 shadow-xl"></div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Sincronizando com n8n</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-3 leading-relaxed max-w-[240px]">
            {generatingProtocol ? 'Aguardando resposta da automação Movidesk...' : 'Salvando dados no sistema...'}
          </p>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
           <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{editingId ? 'Editar Contrato' : 'Nova Venda'}</h2>
           <p className="text-[8px] text-slate-400 font-black uppercase mt-1.5 tracking-widest">Geração de Projeto</p>
        </div>
        <button onClick={() => setViewMode('list')} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[640px] custom-scrollbar">
        <form onSubmit={handleSubmit} className="p-6 space-y-6 pb-20">
          
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cliente Corporativo</label>
              <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 outline-none font-bold text-slate-700 bg-slate-50/50 text-xs appearance-none transition-all focus:border-blue-500 shadow-inner" value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)} required disabled={!!editingId}>
                <option value="">Selecione o cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 ml-1">Protocolo (Obrigatório Automático)</label>
              <div className="w-full px-5 py-4 rounded-2xl border-2 border-blue-50 font-black text-blue-600 bg-blue-50/20 text-[10px] flex items-center shadow-inner">
                {editingId ? formData.protocolo : 'GERAR PROTOCOLO NO CLIQUE ABAIXO'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Usuário Chave (Solicitante)</label>
                <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 outline-none font-bold text-slate-700 bg-slate-50/50 text-xs appearance-none" value={formData.solicitante} onChange={e => setFormData({...formData, solicitante: e.target.value})} required disabled={!formData.customerId}>
                  <option value="">Quem solicitou?</option>
                  {keyUsers.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Treinamento</label>
                <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/50 text-xs appearance-none" value={formData.tipoTreinamento} onChange={e => setFormData({...formData, tipoTreinamento: e.target.value})} required>
                   {availableTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
             </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Módulos Contratados</label>
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
               {availableModules.map(mod => (
                 <button 
                  key={mod.id} 
                  type="button" 
                  onClick={() => toggleModule(mod.name)}
                  className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                    formData.modulos.includes(mod.name) 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                 >
                   {mod.name}
                 </button>
               ))}
            </div>
          </div>

          <div className="bg-emerald-50/30 p-5 rounded-[2rem] border border-emerald-100/50 space-y-5">
             <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Escopo e Valores</h4>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Carga Horária (H)</label>
                  <input type="number" step="0.5" className="w-full px-4 py-3 rounded-xl border border-white font-bold text-emerald-700 bg-white shadow-sm text-xs" value={formData.duracaoHoras} onChange={e => setFormData({...formData, duracaoHoras: Number(e.target.value)})} required />
                  {formData.residualHoursAdded > 0 && (
                    <p className="text-[7px] text-emerald-600 font-black uppercase mt-1 ml-1 animate-pulse">
                      + {formData.residualHoursAdded}h de saldo residual incluído
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[8px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Data Início</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-white font-bold text-emerald-700 bg-white shadow-sm text-[10px]" value={formData.dataInicio} onChange={e => setFormData({...formData, dataInicio: e.target.value})} required />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[8px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Valor Contrato (R$)</label>
                   <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-white font-bold text-emerald-800 bg-white shadow-sm text-xs" 
                    value={formData.valorImplantacao} 
                    onChange={e => setFormData({...formData, valorImplantacao: Number(e.target.value)})} 
                    placeholder="0.00"
                   />
                </div>
                <div>
                   <label className="block text-[8px] font-black text-emerald-600/60 uppercase mb-1.5 ml-1">Comissão (%)</label>
                   <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-white font-bold text-emerald-800 bg-white shadow-sm text-xs" 
                    value={formData.comissaoPercent} 
                    onChange={e => setFormData({...formData, comissaoPercent: Number(e.target.value)})} 
                    placeholder="%"
                   />
                </div>
             </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Técnico Atribuído</label>
            <select 
              className={`w-full px-5 py-4 rounded-2xl border-2 outline-none font-bold text-xs appearance-none transition-all ${
                !isManager ? 'bg-slate-100 border-slate-100 text-slate-400' : 'bg-slate-50/50 border-slate-50 text-blue-600'
              }`}
              value={formData.responsavelTecnico} 
              onChange={e => setFormData({...formData, responsavelTecnico: e.target.value})} 
              required 
              disabled={!isManager}
            >
              {allUsers.filter(u => u.active !== false).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Observações Internas</label>
             <textarea 
               className="w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 font-bold bg-slate-50/50 text-xs resize-none h-24 focus:border-blue-500 outline-none transition-all"
               value={formData.observacao}
               onChange={(e) => setFormData({...formData, observacao: e.target.value})}
               placeholder="Notas sobre a venda ou projeto..."
             ></textarea>
          </div>

          <button type="submit" disabled={generatingProtocol || loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all mt-6">
            {editingId ? 'Salvar Alterações' : 'Confirmar e Gerar Protocolo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TrainingPurchase;
