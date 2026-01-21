
import React from 'react';
import { Client, ViewState, TrainingLog } from '../types';

interface PendingTrainingsProps {
  clients: Client[];
  logs: TrainingLog[]; // Recebe logs para encontrar o responsável
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Treinamentos Pendentes</h2>
          <p className="text-sm text-gray-500">Lista de clientes que aguardam início ou conclusão de treinamento.</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Razão Social</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Módulo</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Responsável Técnico</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Início</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Dias Pendentes</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nenhum treinamento pendente no momento.</td>
              </tr>
            ) : (
              pending.map((client) => {
                const technician = getResponsibleTechnician(client);
                const hasStarted = logs.some(l => l.clientId === client.id);
                const daysPending = calculateDaysPending(client.dataInicio);

                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{client.razãoSocial}</p>
                      <p className="text-xs text-gray-400">{client.protocolo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.modulos.length > 0 ? (
                          client.modulos.map(m => (
                            <span key={m} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-black uppercase tracking-tighter">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                        {client.tipoTreinamento}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${!hasStarted ? 'bg-gray-300' : 'bg-green-500 animate-pulse'}`}></div>
                          <span className={`text-sm font-bold ${!hasStarted ? 'text-gray-700' : 'text-blue-600'}`}>
                            {technician}
                          </span>
                        </div>
                        {!hasStarted && (
                          <span className="text-[9px] text-gray-400 italic ml-4">Registrado por</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center font-medium">
                      {new Date(client.dataInicio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black ${daysPending > 15 ? 'text-red-600' : daysPending > 7 ? 'text-orange-600' : 'text-gray-700'}`}>
                        {daysPending}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setView('NEW_TRAINING')}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-lg font-black text-xs transition-all shadow-sm active:scale-95"
                      >
                        Treinar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingTrainings;
