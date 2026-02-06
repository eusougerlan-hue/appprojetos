
import React, { useState, useMemo, useEffect } from 'react';
import { Client, TrainingLog, User, UserRole, Contact, Customer } from '../types';
import { updateClientStatus, getStoredIntegrations, getStoredUsers, getStoredCustomers } from '../storage';

interface HoursManagementProps {
  clients: Client[];
  logs: TrainingLog[];
  user: User;
  refreshData: () => void;
}

type ModalAction = 'idle' | 'finalize_confirm' | 'finalize_message' | 'revert_confirm' | 'revert_blocked';
type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED';

const HoursManagement: React.FC<HoursManagementProps> = ({ clients, logs, user, refreshData }) => {
  const isManager = user.role === UserRole.MANAGER;
  
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allTechnicians, setAllTechnicians] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [modalAction, setModalAction] = useState<ModalAction>('idle');
  const [finalizeMessage, setFinalizeMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [storedUsers, storedCustomers] = await Promise.all([
        getStoredUsers(),
        getStoredCustomers()
      ]);
      
      setAllUsers(storedUsers);
      setCustomers(storedCustomers);

      if (!isManager) {
        setSelectedTechs([user.name]);
      } else {
        const techNames = Array.from(new Set([
          ...storedUsers.map(u => u.name),
          ...clients.map(c => c.responsavelTecnico)
        ])).filter(Boolean).sort();
        setAllTechnicians(techNames);
      }
    };
    fetchData();
  }, [clients, isManager, user.name]);

  const getUsedHours = (clientId: string) => {
    return logs
      .filter(log => log.clientId === clientId)
      .reduce((acc, log) => acc + (log.horasCalculadas || 0), 0);
  };

  const getResponsibleTechnician = (client: Client) => {
    const clientLogs = logs.filter(l => l.clientId === client.id);
    if (clientLogs.length > 0) {
      return clientLogs[clientLogs.length - 1].employeeName;
    }
    return client.responsavelTecnico || 'Não identificado';
  };

  const triggerFinalizeWebhook = async (client: Client, usedHours: number, balance: number, technicianName: string, message: string) => {
    const settings = await getStoredIntegrations();
    if (!settings.webhookUrl) return;

    const clientLogs = logs.filter(l => l.clientId === client.id);
    const participantsMap = new Map<string, Contact>();
    clientLogs.forEach(log => {
      if (log.receivedBy) {
        log.receivedBy.forEach(contact => {
          participantsMap.set(contact.name, contact);
        });
      }
    });
    const participantes = Array.from(participantsMap.values());
    const customer = customers.find(c => c.id === client.customerId);
    const solicitanteDados = customer?.contacts?.find(c => c.name === client.solicitante);
    const technicianUser = allUsers.find(u => u.name === technicianName);

    try {
      const payload = {
        event: 'training_finalized',
        apiKey: settings.apiKey,
        protocolo: client.protocolo,
        razao_social: client.razãoSocial,
        ref_movidesk: customer?.refMovidesk || '', 
        usuario_movidesk: technicianUser?.usuarioMovidesk || '',
        tipo_treinamento: client.tipoTreinamento,
        modulos: client.modulos,
        solicitante_nome: client.solicitante || '',
        solicitante_telefone: solicitanteDados?.phone || '',
        solicitante_email: solicitanteDados?.email || '',
        horas_contratadas: client.duracaoHoras,
        horas_utilizadas: Number(usedHours.toFixed(1)),
        saldo_restante: Number(balance.toFixed(1)),
        responsavel_tecnico: technicianName,
        finalizado_por: user.name,
        mensagem_finalizacao: message,
        participantes: participantes.map(p => ({
          nome: p.name,
          telefone: p.phone,
          email: p.email
        })),
        timestamp: new Date().toISOString()
      };

      fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(e => console.error('Erro silencioso no webhook:', e));
    } catch (error) {
      console.error('Erro ao preparar webhook de finalização:', error);
    }
  };

  const handleStartFinalize = (client: Client) => {
    setActiveClient(client);
    setModalAction('finalize_confirm');
  };

  const handleStartRevert = (client: Client) => {
    setActiveClient(client);
    if (client.commissionPaid) {
      setModalAction('revert_blocked');
    } else {
      setModalAction('revert_confirm');
    }
  };

  const executeFinalize = async () => {
    if (!activeClient) return;
    const used = getUsedHours(activeClient.id);
    const balance = activeClient.duracaoHoras - used;
    const technician = getResponsibleTechnician(activeClient);
    const dataAtual = new Date().toISOString().split('T')[0];
    await triggerFinalizeWebhook(activeClient, used, balance, technician, finalizeMessage);
    const success = await updateClientStatus(activeClient.id, 'completed', dataAtual, Number(balance.toFixed(1)));
    if (success) {
      refreshData();
      closeModal();
    }
  };

  const executeRevert = async () => {
    if (!activeClient) return;
    const success = await updateClientStatus(activeClient.id, 'pending', null, 0);
    if (success) {
      refreshData();
      closeModal();
    }
  };

  const closeModal = () => {
    setModalAction('idle');
    setActiveClient(null);
    setFinalizeMessage('');
  };

  const toggleTechFilter = (tech: string) => {
    if (!isManager) return;
    setSelectedTechs(prev => 
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const filteredClients = useMemo(() => {
    let list = [...clients];
    if (selectedTechs.length > 0) {
      list = list.filter(client => {
        const currentTech = getResponsibleTechnician(client);
        return selectedTechs.includes(currentTech);
      });
    }
    if (statusFilter !== 'ALL') {
      const targetStatus = statusFilter === 'PENDING' ? 'pending' : 'completed';
      list = list.filter(c => c.status === targetStatus);
    }
    return list.sort((a, b) => {
      if (a.status === b.status) return a.razãoSocial.localeCompare(b.razãoSocial);
      return a.status === 'pending' ? -1 : 1;
    });
  }, [clients, selectedTechs, statusFilter, logs]);

  return (
    <div className="animate-fadeIn">
      {/* Modais Customizados */}
      {modalAction !== 'idle' && activeClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp border border-slate-100">
            <div className="p-8">
              {modalAction === 'finalize_confirm' && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Finalizar Projeto?</h3>
                  <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed px-4">
                    Confirmar encerramento de <strong className="text-blue-600">{activeClient.razãoSocial}</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl">Voltar</button>
                    <button onClick={() => setModalAction('finalize_message')} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">Próximo</button>
                  </div>
                </div>
              )}

              {modalAction === 'finalize_message' && (
                <div className="animate-fadeIn">
                  <h3 className="text-lg font-black text-slate-800 text-center mb-4 tracking-tight">Nota de Encerramento</h3>
                  <textarea
                    autoFocus
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-xs bg-slate-50/50 min-h-[120px] transition-all resize-none mb-6"
                    placeholder="Descreva brevemente como foi o projeto..."
                    value={finalizeMessage}
                    onChange={(e) => setFinalizeMessage(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setModalAction('finalize_confirm')} className="px-4 py-4 text-slate-400 font-black text-[9px] uppercase tracking-widest">Voltar</button>
                    <button onClick={executeFinalize} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-100">Finalizar</button>
                  </div>
                </div>
              )}

              {modalAction === 'revert_confirm' && (
                <div className="text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Reverter Status?</h3>
                  <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed px-4">
                    O projeto voltará para o status <strong>Pendente</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl">Cancelar</button>
                    <button onClick={executeRevert} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-100">Sim, Reverter</button>
                  </div>
                </div>
              )}

              {modalAction === 'revert_blocked' && (
                <div className="text-center animate-fadeIn">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-3 tracking-tight">Ação Bloqueada</h3>
                  <p className="text-[10px] text-red-500 font-bold leading-relaxed mb-8 px-4 uppercase tracking-widest">
                    A comissão deste projeto já foi paga. Procure o setor financeiro para estorno.
                  </p>
                  <button onClick={closeModal} className="w-full py-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl">Entendido</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho e Filtros */}
      <div className="mb-6 space-y-4">
        <div className="px-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Gestão de Horas</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Acompanhamento e Finalização</p>
        </div>

        <div className="flex flex-col gap-3 px-2">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button onClick={() => setStatusFilter('ALL')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Todos</button>
            <button onClick={() => setStatusFilter('PENDING')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'PENDING' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'}`}>Em Curso</button>
            <button onClick={() => setStatusFilter('COMPLETED')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'COMPLETED' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>Finalizados</button>
          </div>

          {isManager && (
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-[11px] font-black text-slate-700 uppercase tracking-widest transition-all active:scale-[0.98]"
              >
                <span className="truncate">
                  {selectedTechs.length === 0 ? 'Todos os Técnicos' : selectedTechs.length === 1 ? selectedTechs[0] : `${selectedTechs.length} Selecionados`}
                </span>
                <svg className={`w-4 h-4 text-blue-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[70] p-4 animate-slideDown max-h-64 overflow-y-auto custom-scrollbar">
                    {allTechnicians.map(tech => (
                      <label key={tech} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${selectedTechs.includes(tech) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" checked={selectedTechs.includes(tech)} onChange={() => toggleTechFilter(tech)} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTechs.includes(tech) ? 'text-blue-700' : 'text-slate-600'}`}>{tech}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Cards 9:16 */}
      <div className="space-y-4 px-1 pb-10">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-50 shadow-sm">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] italic">Nenhum projeto encontrado</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const used = getUsedHours(client.id);
            const balance = client.duracaoHoras - used;
            const percent = Math.min(100, (used / client.duracaoHoras) * 100);
            const isCompleted = client.status === 'completed';
            const technician = getResponsibleTechnician(client);

            return (
              <div key={client.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-all ${isCompleted ? 'border-slate-50 opacity-80' : 'border-slate-100 shadow-slate-200/50 hover:shadow-md'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 truncate">{client.protocolo}</p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight truncate">{client.razãoSocial}</h3>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${isCompleted ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'}`}>
                    {isCompleted ? 'Finalizado' : 'Em Curso'}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-5">
                   <div className="flex justify-between items-end mb-2 px-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Execução</span>
                      <span className="text-[12px] font-black text-blue-600">{percent.toFixed(0)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                   </div>
                </div>

                {/* Hours Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                   <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-col items-center">
                      <span className="text-[7px] font-black text-slate-400 uppercase mb-1">Contratado</span>
                      <span className="text-[10px] font-black text-slate-800">{client.duracaoHoras.toFixed(1)}h</span>
                   </div>
                   <div className="bg-blue-50/30 p-2.5 rounded-2xl border border-blue-100 flex flex-col items-center">
                      <span className="text-[7px] font-black text-blue-400 uppercase mb-1">Realizado</span>
                      <span className="text-[10px] font-black text-blue-600">{used.toFixed(1)}h</span>
                   </div>
                   <div className={`${balance <= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'} p-2.5 rounded-2xl border flex flex-col items-center`}>
                      <span className={`text-[7px] font-black uppercase mb-1 ${balance <= 0 ? 'text-green-400' : 'text-orange-400'}`}>Saldo</span>
                      <span className={`text-[10px] font-black ${balance <= 0 ? 'text-green-600' : 'text-orange-600'}`}>{balance.toFixed(1)}h</span>
                   </div>
                </div>

                {/* Footer / Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                      {technician.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 leading-none">{technician.split(' ')[0]}</span>
                      <span className="text-[7px] font-black text-slate-300 uppercase mt-0.5 tracking-tighter">Analista Responsável</span>
                    </div>
                  </div>

                  {isCompleted ? (
                    <button 
                      onClick={() => handleStartRevert(client)}
                      className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline px-2 py-1"
                    >
                      Reverter
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartFinalize(client)}
                      className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 active:scale-90 transition-all"
                    >
                      Finalizar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HoursManagement;
