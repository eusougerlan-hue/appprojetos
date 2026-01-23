
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

const ClientList: React.FC<ClientListProps> = ({ clients, logs, setView, onEditClient, refreshData }) => {
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
          // Se já existe um registro para este cliente, comparamos a data de finalização (ou ID se data for igual)
          // para garantir que estamos exibindo apenas o saldo do ÚLTIMO contrato encerrado.
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

  const handleDelete = async (client: Client) => {
    if (client.status === 'completed') {
      alert('BLOQUEIO: Esta compra não pode ser excluída porque o treinamento já foi FINALIZADO na tela de Gestão de Horas. O registro histórico de finalização impede a remoção deste projeto.');
      return;
    }

    if (confirm(`ATENÇÃO: Deseja realmente excluir o cliente "${client.razãoSocial}"?\n\nEsta ação é irreversível e removerá todos os dados cadastrados deste cliente.`)) {
      try {
        await deleteClient(client.id);
        refreshData();
      } catch (err: any) {
        if (err.code === '23503' || (err.message && err.message.includes('foreign key'))) {
          alert('Não é possível excluir: existem treinamentos registrados para esta compra. Remova os treinamentos primeiro.');
        } else {
          alert('Erro ao excluir cliente.');
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Projetos com Saldo Residual</h2>
          <p className="text-sm text-gray-500">Exibindo apenas o saldo mais recente de projetos finalizados disponíveis.</p>
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-xs font-bold"
              placeholder="Buscar por razão social..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Razão Social</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Responsável Técnico</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Finalizado em</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Saldo Restante</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Duração Original</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  {searchTerm ? `Nenhum projeto com saldo encontrado para "${searchTerm}"` : 'Nenhum projeto com saldo residual disponível.'}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const technician = getResponsibleTechnician(client);

                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{client.razãoSocial}</p>
                        <span title={`Saldo de ${client.residualHoursAdded}h migrado de contrato finalizado`} className="w-5 h-5 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center border border-blue-100">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Prot: {client.protocolo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-600">
                          {technician}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-gray-500">
                        {client.dataFim ? new Date(client.dataFim).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        {client.residualHoursAdded?.toFixed(1)}h
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center font-black">{client.duracaoHoras}h</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleView(client)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
                          title="Visualizar detalhes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
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

  function handleView(client: Client) {
    alert(`Detalhes do Saldo Residual Atual:\n\nCliente: ${client.razãoSocial}\nProtocolo: ${client.protocolo}\nResponsável: ${client.responsavelTecnico}\n\nEste é o saldo residual MAIS RECENTE deste cliente (${client.residualHoursAdded}h). Ele permanecerá aqui até que uma nova compra seja aberta ou que um saldo mais recente seja gerado.`);
  }
};

export default ClientList;
