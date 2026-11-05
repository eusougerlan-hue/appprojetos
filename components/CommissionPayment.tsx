import React, { useMemo, useState } from 'react';
import { Client, User, UserRole } from '../types';
import { updateCommissionStatus, normalizeString } from '../storage';

interface CommissionPaymentProps {
  clients: Client[];
  user: User;
  refreshData: () => void;
}

const CommissionPayment: React.FC<CommissionPaymentProps> = ({ clients, user, refreshData }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);

  const isManager = user?.role === UserRole.MANAGER;

  // Se o usuário for Instrutor (não gestor), filtra estritamente as vendas onde ele é o responsável técnico
  const userFilteredClients = useMemo(() => {
    if (isManager) return clients;
    return clients.filter(c => 
      normalizeString(c.responsavelTecnico) === normalizeString(user.name)
    );
  }, [clients, isManager, user?.name]);

  // Filtramos apenas os clientes que já tiveram o treinamento finalizado
  const completedClients = useMemo(() => {
    return userFilteredClients.filter(c => c.status === 'completed');
  }, [userFilteredClients]);

  // Vendas monetizadas com percentual de comissão
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

  // Estatísticas de comissões para o usuário ou gestor
  const stats = useMemo(() => {
    const base = completedClients
      .filter(c => (c.valorImplantacao || 0) > 0 && (c.comissaoPercent || 0) > 0)
      .map(client => ({
        ...client,
        commissionValue: (client.valorImplantacao * client.comissaoPercent) / 100
      }));

    const totalVal = base.reduce((acc, c) => acc + c.commissionValue, 0);
    const pendingVal = base.filter(c => !c.commissionPaid).reduce((acc, c) => acc + c.commissionValue, 0);
    const paidVal = base.filter(c => !!c.commissionPaid).reduce((acc, c) => acc + c.commissionValue, 0);

    return {
      totalCount: base.length,
      totalValue: totalVal,
      pendingCount: base.filter(c => !c.commissionPaid).length,
      pendingValue: pendingVal,
      paidCount: base.filter(c => !!c.commissionPaid).length,
      paidValue: paidVal
    };
  }, [completedClients]);

  const selectedClient = useMemo(() => {
    return commissions.find(c => c.id === confirmPaymentId);
  }, [commissions, confirmPaymentId]);

  const handleTogglePaid = async (clientId: string, currentStatus: boolean) => {
    if (!isManager) return; // Apenas gestores podem confirmar pagamentos
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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Section */}
      <div className="px-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
              {isManager ? 'Gestão de Pagamento de Comissões' : 'Minhas Comissões'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
              {isManager
                ? 'Liberação e controle financeiro de comissões para a equipe técnica de implantação.'
                : 'Acompanhamento dos valores e status de pagamento das suas comissões técnicas.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isManager ? (
              <div className="bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                  Instrutor: {user.name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  Visão Gestor (Todos)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-1">
        {/* Card Pendente / A Receber */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">
              {isManager ? 'Total a Pagar' : 'A Receber (Pendente)'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-black text-slate-800">
            R$ {stats.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
            {stats.pendingCount} {stats.pendingCount === 1 ? 'venda pendente' : 'vendas pendentes'}
          </p>
        </div>

        {/* Card Pago / Recebido */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
              {isManager ? 'Total Já Pago' : 'Comissões Recebidas'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-black text-slate-800">
            R$ {stats.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
            {stats.paidCount} {stats.paidCount === 1 ? 'venda quitada' : 'vendas quitadas'}
          </p>
        </div>

        {/* Card Total Geral */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
              Total Acumulado
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16V15" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-black text-slate-800">
            R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
            {stats.totalCount} {stats.totalCount === 1 ? 'venda com comissão' : 'vendas com comissão'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Todas ({stats.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'PENDING' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            A Pagar ({stats.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PAID')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'PAID' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pagas ({stats.paidCount})
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
            <h3 className="text-base font-black text-blue-900 mb-3 tracking-tight">
              {isManager ? 'Nenhuma comissão encontrada' : 'Nenhuma comissão encontrada para você'}
            </h3>
            <p className="text-[11px] text-blue-600 font-medium leading-relaxed max-w-sm">
              {!isManager ? (
                <>
                  Você não possui comissões {filter === 'PENDING' ? 'pendentes' : filter === 'PAID' ? 'pagas' : ''} vinculadas como responsável técnico no momento. Assim que treinamentos finalizados possuírem valor de contrato e % de comissão cadastrados, os valores aparecerão aqui.
                </>
              ) : (
                <>
                  Existem treinamentos finalizados, porém eles não possuem <strong className="text-blue-800">Valor de Contrato</strong> ou <strong className="text-blue-800">Percentual de Comissão</strong> definidos.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {commissions.map((c) => (
              <div 
                key={c.id} 
                className={`bg-white rounded-[2rem] p-5 shadow-sm border transition-all ${
                  c.commissionPaid ? 'border-slate-200 opacity-90' : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">
                      {c.protocolo || 'SEM PROTOCOLO'}
                    </p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight truncate">
                      {c.razãoSocial}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px]">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                        {c.tipoTreinamento}
                      </span>
                      {isManager && (
                        <span className="text-slate-400 font-medium">
                          Instrutor: <strong className="text-slate-700">{c.responsavelTecnico}</strong>
                        </span>
                      )}
                      {!isManager && (
                        <span className="text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">
                          Sua Venda
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                    c.commissionPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {c.commissionPaid ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Pago</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        <span>Pendente</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Base do Contrato</p>
                    <p className="text-xs font-black text-slate-700">
                      R$ {c.valorImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
                    <p className="text-[8px] font-black text-blue-500 uppercase mb-1 tracking-wider">
                      Comissão ({c.comissaoPercent}%)
                    </p>
                    <p className="text-sm font-black text-blue-600">
                      R$ {c.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Footer do Card com Ação para Gestor ou Status para Instrutor */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {c.commissionPaid
                      ? 'Lançado no histórico de pagamentos'
                      : isManager
                      ? 'Aguardando liberação financeira'
                      : 'Aguardando repasse pelo gestor financeiro'}
                  </span>

                  {isManager ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!c.commissionPaid) {
                          setConfirmPaymentId(c.id);
                        } else {
                          handleTogglePaid(c.id, !!c.commissionPaid);
                        }
                      }}
                      disabled={updatingId === c.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        c.commissionPaid 
                          ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100'
                      }`}
                    >
                      {updatingId === c.id ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : c.commissionPaid ? (
                        'ESTORNAR PAGO'
                      ) : (
                        'PAGAR AGORA'
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {c.commissionPaid ? (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          Comissão Quitada
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Em Análise / Pendente
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instruction Footer Card */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mx-1">
        <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium text-center">
          {isManager
            ? 'As comissões são baseadas no percentual definido no cadastro do cliente vindo da API ou registro manual. Esta tela serve para o gestor financeiro controlar e registrar quais valores já foram repassados aos instrutores responsáveis pelas implantações concluídas.'
            : 'As comissões são calculadas sobre os contratos de treinamentos concluídos onde você foi designado como responsável técnico. O status "Pago" indica que o valor já foi repassado pelo gestor financeiro.'}
        </p>
      </div>

      {/* Confirmation Modal para o Gestor */}
      {confirmPaymentId && selectedClient && isManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-scaleIn">
            <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 border border-amber-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 text-center tracking-tight mb-2">
              Confirmar Pagamento de Comissão?
            </h3>
            <p className="text-xs text-slate-500 text-center leading-relaxed mb-6 font-medium">
              Tem certeza que deseja confirmar o pagamento de comissão para este treinamento? Esta ação registrará a quitação no histórico.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left mb-6 space-y-3">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Responsável Técnico (Instrutor)</span>
                <span className="text-xs font-bold text-slate-800">{selectedClient.responsavelTecnico}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Cliente / Razão Social</span>
                <span className="text-xs font-bold text-slate-800">{selectedClient.razãoSocial}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                  Valor Líquido ({selectedClient.comissaoPercent}%)
                </span>
                <span className="text-sm font-black text-blue-600">
                  R$ {selectedClient.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmPaymentId(null)}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmPaymentId) {
                    handleTogglePaid(confirmPaymentId, false);
                    setConfirmPaymentId(null);
                  }
                }}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 text-center"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionPayment;
