
import React, { useState, useMemo } from 'react';
import { Client, ViewState, TrainingLog, User, UserRole } from '../types';
import { updateClientComment, normalizeString } from '../storage';

interface PendingTrainingsProps {
  clients: Client[];
  logs: TrainingLog[];
  user: User;
  setView: (view: ViewState) => void;
  refreshData: () => void;
}

const PendingTrainings: React.FC<PendingTrainingsProps> = ({ clients, logs, user, setView, refreshData }) => {
  const [selectedTech, setSelectedTech] = useState<string>('ALL');
  const isManager = user?.role === UserRole.MANAGER;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getResponsibleTechnician = (client: Client) => {
    const clientLogs = logs.filter(l => l.clientId === client.id);
    if (clientLogs.length > 0) {
      return clientLogs[clientLogs.length - 1].employeeName;
    }
    return client.responsavelTecnico || 'Não identificado';
  };

  const technicianList = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => {
      if (c.status === 'pending') {
        const tech = getResponsibleTechnician(c);
        if (tech && tech !== 'Não identificado') set.add(tech);
      }
    });
    return Array.from(set).sort();
  }, [clients, logs]);

  const pending = useMemo(() => {
    let list = clients.filter(c => c.status === 'pending');
    if (isManager && selectedTech !== 'ALL') {
      list = list.filter(c => {
        const tech = getResponsibleTechnician(c);
        return normalizeString(tech) === normalizeString(selectedTech) ||
               normalizeString(c.responsavelTecnico) === normalizeString(selectedTech);
      });
    }
    return list;
  }, [clients, isManager, selectedTech, logs]);

  const calculateDaysPending = (startDateStr: string) => {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const handleUpdateComment = async (clientId: string, comentario: string) => {
    try {
      await updateClientComment(clientId, comentario);
      refreshData();
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 px-2 space-y-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Projetos Pendentes</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Aguardando início ou conclusão ({pending.length})
          </p>
        </div>

        {isManager && technicianList.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex-1 min-w-0">
              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Técnico</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer appearance-none truncate"
              >
                <option value="ALL">Todos os Técnicos ({clients.filter(c => c.status === 'pending').length} pendentes)</option>
                {technicianList.map(tech => {
                  const count = clients.filter(c => c.status === 'pending' && (
                    normalizeString(getResponsibleTechnician(c)) === normalizeString(tech) ||
                    normalizeString(c.responsavelTecnico) === normalizeString(tech)
                  )).length;
                  return (
                    <option key={tech} value={tech}>
                      {tech} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
            {selectedTech !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedTech('ALL')}
                className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg"
              >
                Limpar
              </button>
            )}
            <svg className="w-4 h-4 text-slate-400 pointer-events-none flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="space-y-4 px-1 pb-10">
        {pending.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase">Nenhum treinamento pendente</p>
          </div>
        ) : (
          pending.map((client) => {
            const technician = getResponsibleTechnician(client);
            const clientLogs = logs.filter(l => l.clientId === client.id);
            const hasStarted = clientLogs.length > 0;
            
            // Get the first training log date
            const firstLog = [...clientLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            const startDate = firstLog ? firstLog.date : client.dataInicio;
            const formattedStartDate = new Date(startDate).toLocaleDateString('pt-BR');
            
            const daysPending = calculateDaysPending(startDate);
            const isDelayed = daysPending >= 30;

            const horasContratadas = client.duracaoHoras;
            const horasUtilizadas = clientLogs.reduce((acc, log) => acc + (log.horasCalculadas || 0), 0);
            const saldoHoras = horasContratadas - horasUtilizadas;

            return (
              <div key={client.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all active:scale-[0.98]">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{client.protocolo}</p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight mb-2">{client.razãoSocial}</h3>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100 font-black uppercase tracking-widest">
                        {client.tipoTreinamento}
                      </span>
                      {client.modulos.map(m => (
                        <span key={m} className="text-[8px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100 font-black uppercase tracking-widest">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* New Columns Grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Início do Projeto</span>
                    <span className="text-[10px] font-black text-slate-700">{hasStarted ? formattedStartDate : 'Não iniciado'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Contratadas</span>
                    <span className="text-[10px] font-black text-slate-700">{horasContratadas.toFixed(1)}h</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Utilizadas</span>
                    <span className="text-[10px] font-black text-blue-600">{horasUtilizadas.toFixed(1)}h</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Saldo</span>
                    <span className={`text-[10px] font-black ${saldoHoras < 0 ? 'text-red-500' : 'text-green-600'}`}>{saldoHoras.toFixed(1)}h</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Dias Pend.</span>
                    <span className={`text-[10px] font-black ${isDelayed ? 'text-red-600' : daysPending > 15 ? 'text-orange-500' : 'text-blue-500'}`}>{daysPending}</span>
                  </div>
                  <div className="flex flex-col col-span-2 md:col-span-1">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">Comentário</span>
                    <input 
                      type="text"
                      className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="Adicionar..."
                      defaultValue={client.comentario || ''}
                      onBlur={(e) => handleUpdateComment(client.id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                      {technician.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-800 leading-none">{technician.split(' ')[0]}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${!hasStarted ? 'bg-slate-200' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{!hasStarted ? 'Aguardando' : 'Em curso'}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setView('NEW_TRAINING')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-blue-100 transition-all active:scale-90"
                  >
                    Treinar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PendingTrainings;
