
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

  const totals = useMemo(() => {
    return commissions.reduce((acc, curr) => ({
      pending: acc.pending + (!curr.commissionPaid ? curr.commissionValue : 0),
      paid: acc.paid + (curr.commissionPaid ? curr.commissionValue : 0)
    }), { pending: 0, paid: 0 });
  }, [commissions]);

  // Cálculo de comissões agrupadas por funcionário apenas para treinamentos finalizados
  const employeeTotals = useMemo(() => {
    const grouped: Record<string, { pending: number; paid: number; clientCount: number }> = {};
    
    completedClients.forEach(client => {
      const emp = client.responsavelTecnico;
      const value = (client.valorImplantacao * client.comissaoPercent) / 100;
      
      if (!grouped[emp]) {
        grouped[emp] = { pending: 0, paid: 0, clientCount: 0 };
      }
      
      if (client.commissionPaid) {
        grouped[emp].paid += value;
      } else {
        grouped[emp].pending += value;
      }
      grouped[emp].clientCount += 1;
    });
    
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.pending - a.pending);
  }, [completedClients]);

  const handleTogglePaid = async (clientId: string, currentStatus: boolean) => {
    setUpdatingId(clientId);
    try {
      // Aguarda a resposta do banco antes de atualizar a lista
      await updateCommissionStatus(clientId, !currentStatus);
      refreshData();
    } catch (err) {
      console.error('Erro ao atualizar status da comissão:', err);
      alert('Erro ao processar o pagamento. Verifique sua conexão.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Pagamento de Comissões</h2>
          <p className="text-sm text-gray-500">Liberação de comissões para treinamentos <strong>finalizados</strong>.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'PENDING' ? 'bg-orange-50 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            A Pagar
          </button>
          <button
            onClick={() => setFilter('PAID')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'PAID' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Pagos
          </button>
        </div>
      </div>

      {completedClients.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 p-8 rounded-2xl text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-orange-800">Nenhum treinamento finalizado</h3>
          <p className="text-orange-600 max-w-md mx-auto mt-2">
            As comissões só aparecem aqui após o responsável técnico marcar o treinamento como <strong>"Finalizado"</strong> na tela de Gestão de Horas.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Pagar (Pendente)</p>
                <p className="text-2xl font-black text-orange-600">R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pago (Histórico)</p>
                <p className="text-2xl font-black text-green-600">R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
          </div>

          {/* Resumo por Funcionário */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Resumo de Comissões por Funcionário (Treinamentos Finalizados)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
              {employeeTotals.length === 0 ? (
                <div className="bg-white p-6 text-center text-gray-400 text-xs italic md:col-span-3">Nenhum funcionário com treinamentos finalizados.</div>
              ) : (
                employeeTotals.map((emp) => (
                  <div key={emp.name} className="bg-white p-4 hover:bg-blue-50/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 text-sm leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.clientCount} {emp.clientCount === 1 ? 'finalizado' : 'finalizados'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                        <p className="text-[8px] font-black text-orange-400 uppercase leading-none mb-1">A Pagar</p>
                        <p className="text-sm font-black text-orange-600">R$ {emp.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                        <p className="text-[8px] font-black text-green-400 uppercase leading-none mb-1">Já Pago</p>
                        <p className="text-sm font-black text-green-600">R$ {emp.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Funcionário / Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Valor Base</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Comissão %</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Valor Líquido</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Lançar Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic font-medium">Nenhuma comissão pendente para os filtros selecionados.</td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.commissionPaid ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-blue-500 font-black uppercase tracking-tighter mb-0.5">{c.protocolo}</p>
                          <p className="font-bold text-blue-600 text-sm leading-tight">{c.responsavelTecnico}</p>
                          <p className="text-xs text-gray-500 font-medium">{c.razãoSocial}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-600">R$ {c.valorImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-bold text-gray-700">{c.comissaoPercent}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-gray-800">R$ {c.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${c.commissionPaid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                            {c.commissionPaid ? 'PAGO' : 'AGUARDANDO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <label className={`inline-flex items-center gap-3 cursor-pointer group ${updatingId === c.id ? 'opacity-50 pointer-events-none' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                              {updatingId === c.id ? 'Processando...' : 'Marcar como Pago'}
                            </span>
                            <input
                              type="checkbox"
                              checked={!!c.commissionPaid}
                              onChange={() => handleTogglePaid(c.id, !!c.commissionPaid)}
                              disabled={updatingId === c.id}
                              className="w-5 h-5 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 transition-all cursor-pointer"
                            />
                          </label>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-start gap-3">
        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-xs text-gray-500 leading-relaxed italic">
          As comissões são baseadas no percentual definido no cadastro do cliente. Esta tela serve para o gestor financeiro controlar quais valores já foram repassados aos funcionários responsáveis técnicos pelas implantações <strong>concluídas</strong>.
        </p>
      </div>
    </div>
  );
};

export default CommissionPayment;
