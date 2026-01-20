
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
    if (!searchTerm.trim()) return clients;
    return clients.filter(c => c.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase()));
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
          <h2 className="text-xl font-bold text-gray-800">Todos os Clientes</h2>
          <p className="text-sm text-gray-500">Base completa de clientes cadastrados no sistema.</p>
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
          
          <button 
            onClick={() => setView('CLIENT_REG')}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:bg-blue-700 shadow-md shadow-blue-100 active:scale-95 flex items-center gap-2 uppercase tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Novo Cliente
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Razão Social</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Responsável Técnico</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Financeiro</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Duração</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}"` : 'Nenhum cliente cadastrado.'}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const technician = getResponsibleTechnician(client);
                const hasStarted = logs.some(l => l.clientId === client.id);
                const isCompleted = client.status === 'completed';

                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{client.razãoSocial}</p>
                        {client.residualHoursAdded && client.residualHoursAdded > 0 && (
                          <span title={`Inclui ${client.residualHoursAdded}h residuais de contratos passados`} className="w-5 h-5 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center border border-blue-100">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Prot: {client.protocolo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${hasStarted ? 'text-blue-600' : 'text-gray-700'}`}>
                          {technician}
                        </span>
                        {!hasStarted && (
                          <span className="text-[9px] text-gray-400 italic">Cadastrado por</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {client.modulos.map(m => (
                          <span key={m} className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 font-medium">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                        client.status === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {client.status === 'pending' ? 'PENDENTE' : 'CONCLUÍDO'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">R$ {client.valorImplantacao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Comissão: {client.comissaoPercent}%</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center font-black">{client.duracaoHoras}h</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => !isCompleted && onEditClient(client)}
                          className={`p-2 rounded-lg transition-all ${isCompleted ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                          title={isCompleted ? "Bloqueado: Treinamento já finalizado" : "Editar cadastro"}
                          disabled={isCompleted}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(client)}
                          className={`p-2 rounded-lg transition-all ${isCompleted ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={isCompleted ? "Bloqueado: Treinamento já finalizado" : "Excluir cliente"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
};

export default ClientList;
