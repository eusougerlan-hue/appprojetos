
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
  
  // Estados para o fluxo de modais
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
    
    // Busca o refMovidesk do cliente base
    const customer = customers.find(c => c.id === client.customerId);
    
    // Busca o usuarioMovidesk do técnico responsável pelo nome
    const technicianUser = allUsers.find(u => u.name === technicianName);

    try {
      const payload = {
        event: 'training_finalized',
        apiKey: settings.apiKey,
        protocolo: client.protocolo,
        razao_social: client.razãoSocial,
        ref_movidesk: customer?.refMovidesk || '', 
        usuario_movidesk: technicianUser?.usuarioMovidesk || '', // ENVIANDO O USUÁRIO MOVIDESK DO TÉCNICO
        tipo_treinamento: client.tipoTreinamento,
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
    
    // Captura a data atual YYYY-MM-DD
    const dataAtual = new Date().toISOString().split('T')[0];

    await triggerFinalizeWebhook(activeClient, used, balance, technician, finalizeMessage);

    // Salva status concluído, data final e saldo de horas na coluna residual_hours_added
    const success = await updateClientStatus(activeClient.id, 'completed', dataAtual, Number(balance.toFixed(1)));
    if (success) {
      refreshData();
      closeModal();
    }
  };

  const executeRevert = async () => {
    if (!activeClient) return;
    // Ao reverter, limpamos a data fim e o saldo de horas residual
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn min-h-[400px]">
      {/* Sistema de Modais Customizados */}
      {modalAction !== 'idle' && activeClient && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-slideUp border border-gray-100">
            <div className="p-8">
              {modalAction === 'finalize_confirm' && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-6 mx-auto ring-4 ring-orange-50/50">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Tem certeza?</h3>
                  <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                    Você deseja marcar como <strong>Finalizado</strong> o treinamento de <br/>
                    <strong className="text-blue-600">{activeClient.razãoSocial}</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">Cancelar</button>
                    <button onClick={() => setModalAction('finalize_message')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all">Continuar</button>
                  </div>
                </div>
              )}

              {modalAction === 'finalize_message' && (
                <div className="animate-fadeIn">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 text-center mb-2 tracking-tight">Observações Finais</h3>
                  <textarea
                    autoFocus
                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 outline-none font-medium text-sm bg-gray-50/50 min-h-[140px] transition-all resize-none mb-6"
                    placeholder="Como foi o encerramento?"
                    value={finalizeMessage}
                    onChange={(e) => setFinalizeMessage(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setModalAction('finalize_confirm')} className="px-6 py-4 text-gray-400 hover:text-gray-600 font-black text-xs uppercase tracking-widest transition-all">Voltar</button>
                    <button onClick={executeFinalize} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 transition-all">Concluir Agora</button>
                  </div>
                </div>
              )}

              {modalAction === 'revert_confirm' && (
                <div className="text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto ring-4 ring-red-50/50">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Reverter Status?</h3>
                  <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                    Deseja retornar o cliente <strong className="text-red-600">{activeClient.razãoSocial}</strong> para o status <strong>Pendente</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">Cancelar</button>
                    <button onClick={executeRevert} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 transition-all">Sim, Reverter</button>
                  </div>
                </div>
              )}

              {modalAction === 'revert_blocked' && (
                <div className="text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-3xl flex items-center justify-center mb-6 mx-auto ring-4 ring-gray-50">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">Ação Bloqueada</h3>
                  <div className="bg-red-50 p-4 rounded-2xl mb-8 border border-red-100">
                    <p className="text-red-800 text-sm font-bold leading-relaxed">
                      A comissão deste treinamento já foi paga para <strong className="uppercase">{activeClient.responsavelTecnico}</strong>.
                    </p>
                    <p className="text-red-600 text-xs mt-2 font-medium">
                      Para reverter o status deste treinamento, por favor acione o <strong>gestor financeiro</strong> para estornar o pagamento primeiro.
                    </p>
                  </div>
                  <button 
                    onClick={closeModal} 
                    className="w-full px-6 py-4 bg-gray-800 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestão de Horas de Treinamento</h2>
          <p className="text-sm text-gray-500">Acompanhe o saldo de horas e finalize implantações.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'PENDING' ? 'bg-orange-50 text-white shadow-md shadow-orange-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pendente
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'COMPLETED' ? 'bg-green-600 text-white shadow-md shadow-green-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Finalizado
            </button>
          </div>

          {isManager && (
            <div className="relative w-full md:w-auto">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 rounded-xl shadow-sm hover:border-blue-400 transition-all text-sm font-bold text-gray-700 min-w-[220px] justify-between w-full md:w-auto"
              >
                <span className="truncate max-w-[160px]">
                  {selectedTechs.length === 0 ? 'Todos os Técnicos' : selectedTechs.length === 1 ? selectedTechs[0] : `${selectedTechs.length} Selecionados`}
                </span>
                <svg className={`w-4 h-4 text-blue-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-slideIn">
                    <div className="max-h-60 overflow-y-auto pr-1">
                      {allTechnicians.map(tech => (
                        <label key={tech} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${selectedTechs.includes(tech) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300" checked={selectedTechs.includes(tech)} onChange={() => toggleTechFilter(tech)} />
                          <span className={`text-sm font-bold ${selectedTechs.includes(tech) ? 'text-blue-700' : 'text-gray-600'}`}>{tech}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Protocolo</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
              <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Horas Contratadas</th>
              <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Horas Utilizadas</th>
              <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Saldo de Horas</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Progresso</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Técnico</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.map((client) => {
              const used = getUsedHours(client.id);
              const balance = client.duracaoHoras - used;
              const percent = Math.min(100, (used / client.duracaoHoras) * 100);
              const isCompleted = client.status === 'completed';
              const technician = getResponsibleTechnician(client);

              return (
                <tr key={client.id} className={`transition-all ${isCompleted ? 'bg-gray-50/70' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 font-medium text-gray-500 text-xs whitespace-nowrap">{client.protocolo}</td>
                  <td className="px-6 py-4 font-bold text-gray-800 text-sm">{client.razãoSocial}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-bold text-gray-500">{client.duracaoHoras.toFixed(1)}h</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-black ${isCompleted ? 'text-gray-300' : 'text-blue-600'}`}>{used.toFixed(1)}h</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                      balance <= 0 ? 'bg-green-50 text-green-600' : 
                      balance < client.duracaoHoras * 0.2 ? 'bg-red-50 text-red-600' : 
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {balance.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-black mb-1 ${isCompleted ? 'text-gray-300' : 'text-blue-600'}`}>
                        {percent.toFixed(0)}%
                      </span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px] mx-auto overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-gray-300' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-gray-600 whitespace-nowrap">{technician}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {isCompleted ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-gray-400 rounded-lg text-[10px] font-black uppercase shadow-sm">
                          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          Finalizado {client.dataFim ? `em ${new Date(client.dataFim).toLocaleDateString('pt-BR')}` : ''}
                        </span>
                        <button 
                          onClick={() => handleStartRevert(client)}
                          className={`text-[9px] font-bold uppercase underline tracking-tighter cursor-pointer ${client.commissionPaid ? 'text-gray-300 pointer-events-none' : 'text-red-500 hover:text-red-700'}`}
                        >
                          Reverter
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleStartFinalize(client)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-green-100 active:scale-95"
                      >
                        Finalizar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoursManagement;
