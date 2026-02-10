
import React, { useMemo, useState } from 'react';
import { Client } from '../types';
import { updateCommissionStatus } from '../storage';

interface CommissionPaymentProps {
  clients: Client[];
  refreshData: () => void;
}

const CommissionPayment: React.FC<CommissionPaymentProps> = ({ clients, refreshData }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtramos apenas os clientes que já tiveram o treinamento finalizado
  const completedClients = useMemo(() => {
    return clients.filter(c => c.status === 'completed');
  }, [clients]);

  const commissions = useMemo(() => {
    return completedClients
      // REGRA: Só exibe na tela de comissão se houver valor de contrato e percentual de comissão
      .filter(c => (c.valorImplantacao || 0) > 0 && (c.comissaoPercent || 0) > 0)
      .map(client => ({
        ...client,
        commissionValue: (client.valorImplantacao * client.comissaoPercent) / 100
      }))
      .filter(c => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return !c.commissionPaid;
        if (filter === 'PAID') return !!c.commissionPaid;
        return true;
      });
  }, [completedClients, filter]);

  const handleTogglePaid = async (clientId: string, currentStatus: boolean) => {
    setUpdatingId(clientId);
    try {
      await updateCommissionStatus(clientId, !currentStatus);
      refreshData();
    } catch (err) {
      console.error('Erro ao atualizar status da comissão:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header Section */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
          Gestão de Pagamento de Comissões
        </h2>
        <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
          Liberação de comissões para treinamentos <strong className="text-slate-700">finalizados</strong> e com valores definidos via API.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'PENDING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            A Pagar
          </button>
          <button
            onClick={() => setFilter('PAID')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'PAID' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pagos
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-1">
        {commissions.length === 0 ? (
          <div className="bg-blue-50/50 border-2 border-blue-100/50 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center animate-fadeIn min-h-[300px]">
            <div className="w-16 h-16 bg-blue-100/50 text-blue-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-blue-900 mb-4 tracking-tight">
              Nenhuma comissão monetizada encontrada
            </h3>
            <p className="text-[11px] text-blue-600 font-medium leading-relaxed max-w-[240px]">
              Existem treinamentos finalizados, porém eles não possuem <strong className="text-blue-800">Valor de Contrato</strong> ou <strong className="text-blue-800">Percentual de Comissão</strong> definidos (geralmente inseridos via API).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {commissions.map((c) => (
              <div 
                key={c.id} 
                className={`bg-white rounded-[2rem] p-5 shadow-sm border transition-all ${
                  c.commissionPaid ? 'border-slate-50 opacity-80' : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
                      {c.protocolo}
                    </p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight truncate">
                      {c.responsavelTecnico}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 truncate">
                      {c.razãoSocial}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${
                    c.commissionPaid ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {c.commissionPaid ? 'Pago' : 'Pendente'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Base Contrato</p>
                    <p className="text-[10px] font-black text-slate-700">
                      R$ {c.valorImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100">
                    <p className="text-[7px] font-black text-blue-400 uppercase mb-1">Valor Líquido ({c.comissaoPercent}%)</p>
                    <p className="text-[11px] font-black text-blue-600">
                      R$ {c.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                    {c.commissionPaid ? 'Lançado em Histórico' : 'Confirmar Pagamento'}
                  </span>
                  <button
                    onClick={() => handleTogglePaid(c.id, !!c.commissionPaid)}
                    disabled={updatingId === c.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      c.commissionPaid 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-green-600 text-white shadow-lg shadow-green-100'
                    }`}
                  >
                    {updatingId === c.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : c.commissionPaid ? (
                      'PAGO'
                    ) : (
                      'PAGAR AGORA'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instruction Footer Card */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mx-1">
        <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium text-center">
          As comissões são baseadas no percentual definido no cadastro do cliente vindo da API. Esta tela serve para o gestor financeiro controlar quais valores já foram repassados aos funcionários responsáveis técnicos pelas implantações <strong className="text-slate-500">concluídas</strong> e monetizadas.
        </p>
      </div>
    </div>
  );
};

export default CommissionPayment;
