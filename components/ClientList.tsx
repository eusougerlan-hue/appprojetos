
import React, { useState, useMemo } from 'react';
import { Client, ViewState, TrainingLog } from '../types';
import { deleteClient } from '../storage';

interface ClientListProps {
  clients: Client[];
  logs: TrainingLog[];
  setView: (view: ViewState) => void;
  onEditClient: (client: Client) => void;
  refreshData: () => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, logs, setView, refreshData }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getResponsibleTechnician = (client: Client) => {
    const clientLogs = logs.filter(l => l.clientId === client.id);
    if (clientLogs.length > 0) {
      return clientLogs[clientLogs.length - 1].employeeName;
    }
    return client.responsavelTecnico || 'Não identificado';
  };

  const filteredClients = useMemo(() => {
    // 1. Identifica quais IDs de clientes (Customer) possuem projetos pendentes (vendas novas/ativas)
    const customerIdsWithPending = new Set(
      clients.filter(c => c.status === 'pending').map(c => c.customerId)
    );

    // 2. Mapa para agrupar e manter apenas o projeto concluído MAIS RECENTE por cliente
    const latestResidualsByCustomer = new Map<string, Client>();

    clients.forEach(c => {
      // Filtra apenas finalizados com saldo positivo E que NÃO tenham uma nova compra pendente
      if (
        c.status === 'completed' && 
        (c.residualHoursAdded || 0) > 0 &&
        !customerIdsWithPending.has(c.customerId)
      ) {
        const existing = latestResidualsByCustomer.get(c.customerId);
        
        if (!existing) {
          latestResidualsByCustomer.set(c.customerId, c);
        } else {
          const currentEnd = c.dataFim ? new Date(c.dataFim).getTime() : 0;
          const existingEnd = existing.dataFim ? new Date(existing.dataFim).getTime() : 0;
          
          if (currentEnd > existingEnd) {
            latestResidualsByCustomer.set(c.customerId, c);
          }
        }
      }
    });

    const baseList = Array.from(latestResidualsByCustomer.values());
    
    if (!searchTerm.trim()) return baseList;
    return baseList.filter(c => c.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clients, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Section matching the Screenshot */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Projetos com Saldo Residual</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
            Exibindo apenas o saldo mais recente de projetos finalizados disponíveis.
          </p>
        </div>

        {/* Search Bar - Aesthetic version */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50/50 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all text-xs font-bold text-slate-700"
            placeholder="Buscar por razão social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List Labels for Context */}
      <div className="px-6 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <span>Razão Social</span>
        <span>Saldo / Info</span>
      </div>

      {/* Card List Area */}
      <div className="space-y-4 px-1 pb-20">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] italic max-w-[200px] leading-relaxed">
              {searchTerm ? `Nenhum projeto encontrado para "${searchTerm}"` : 'Nenhum projeto com saldo residual disponível no momento.'}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const technician = getResponsibleTechnician(client);
            const finishedDate = client.dataFim ? new Date(client.dataFim).toLocaleDateString('pt-BR') : '---';

            return (
              <div 
                key={client.id} 
                onClick={() => handleView(client)}
                className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">{client.protocolo}</p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {client.razãoSocial}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                      {client.residualHoursAdded?.toFixed(1)}h
                    </span>
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">Saldo Disp.</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-[10px] border border-slate-100">
                      {technician.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-800 leading-none">{technician.split(' ')[0]}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Responsável</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-800 leading-none">{finishedDate}</p>
                    <p className="text-[7px] text-slate-300 font-black uppercase tracking-widest mt-1">Finalizado em</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-6 text-center text-slate-300 text-[8px] font-black uppercase tracking-[0.2em] italic mt-10">
        TrainMaster Pro Management System
      </div>
    </div>
  );

  function handleView(client: Client) {
    alert(`DETALHES DO SALDO RESIDUAL:\n\n` +
          `Cliente: ${client.razãoSocial}\n` +
          `Protocolo: ${client.protocolo}\n` +
          `Responsável: ${client.responsavelTecnico}\n` +
          `Finalizado em: ${client.dataFim ? new Date(client.dataFim).toLocaleDateString('pt-BR') : '---'}\n\n` +
          `SALDO DISPONÍVEL: ${client.residualHoursAdded?.toFixed(1)}h\n\n` +
          `Este saldo poderá ser migrado automaticamente quando uma nova venda for iniciada para este mesmo cliente.`);
  }
};

export default ClientList;
