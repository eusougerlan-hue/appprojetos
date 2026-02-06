
import React from 'react';
import { Client, ViewState, TrainingLog } from '../types';

interface PendingTrainingsProps {
  clients: Client[];
  logs: TrainingLog[];
  setView: (view: ViewState) => void;
}

const PendingTrainings: React.FC<PendingTrainingsProps> = ({ clients, logs, setView }) => {
  const pending = clients.filter(c => c.status === 'pending');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getResponsibleTechnician = (client: Client) => {
    const clientLogs = logs.filter(l => l.clientId === client.id);
    if (clientLogs.length > 0) {
      return clientLogs[clientLogs.length - 1].employeeName;
    }
    return client.responsavelTecnico || 'Não identificado';
  };

  const calculateDaysPending = (startDateStr: string) => {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 px-2">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Projetos Pendentes</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
          Aguardando início ou conclusão ({pending.length})
        </p>
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
            const hasStarted = logs.some(l => l.clientId === client.id);
            const daysPending = calculateDaysPending(client.dataInicio);

            return (
              <div key={client.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98]">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{client.protocolo}</p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight mb-2">{client.razãoSocial}</h3>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100 font-black uppercase tracking-widest">
                        {client.tipoTreinamento}
                      </span>
                      {client.modulos.slice(0, 2).map(m => (
                        <span key={m} className="text-[8px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100 font-black uppercase tracking-widest">
                          {m}
                        </span>
                      ))}
                      {client.modulos.length > 2 && (
                        <span className="text-[8px] text-slate-300 font-black p-1">+{client.modulos.length - 2}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[14px] font-black ${daysPending > 15 ? 'text-red-500' : daysPending > 7 ? 'text-orange-500' : 'text-blue-400'}`}>
                      {daysPending}
                    </span>
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">dias pend.</span>
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
