
import React, { useMemo, useState } from 'react';
import { Client, TrainingLog } from '../types';

interface ProfitabilityReportProps {
  clients: Client[];
  logs: TrainingLog[];
}

type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED';

const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({ clients, logs }) => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const reports = useMemo(() => {
    return clients
      .map(client => {
        const clientLogs = logs.filter(l => l.clientId === client.id);
        
        const usedHours = clientLogs.reduce((acc, log) => acc + (log.horasCalculadas || 0), 0);
        
        const totalTransport = clientLogs.reduce((acc, log) => {
          return acc + (log.uberTotal || 0) + (log.ownVehicleTotal || 0);
        }, 0);

        const commissionValue = (client.valorImplantacao * client.comissaoPercent) / 100;
        const totalCosts = totalTransport + commissionValue;
        const profitValue = client.valorImplantacao - totalCosts;
        const profitPercent = client.valorImplantacao > 0 ? (profitValue / client.valorImplantacao) * 100 : 0;

        // Cálculo de dias para finalizar
        let daysToFinish = 0;
        if (clientLogs.length > 0) {
          const dates = clientLogs.map(l => new Date(l.date).getTime());
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
          // Diferença em milissegundos convertida para dias (mínimo 1 dia)
          daysToFinish = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
        }

        return {
          ...client,
          usedHours,
          totalTransport,
          commissionValue,
          profitValue,
          profitPercent,
          daysToFinish
        };
      })
      .filter(report => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return report.status === 'pending';
        if (filter === 'COMPLETED') return report.status === 'completed';
        return true;
      });
  }, [clients, logs, filter]);

  const totals = useMemo(() => {
    return reports.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.valorImplantacao,
      profit: acc.profit + curr.profitValue,
      transport: acc.transport + curr.totalTransport,
      commission: acc.commission + curr.commissionValue,
      residualHours: acc.residualHours + (curr.residualHoursAdded || 0)
    }), { revenue: 0, profit: 0, transport: 0, commission: 0, residualHours: 0 });
  }, [reports]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Relatório de Lucratividade</h2>
          <p className="text-sm text-gray-500">Análise financeira detalhada de cada projeto e implantação.</p>
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">Status:</span>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'ALL' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Ambos
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'PENDING' 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Pendente
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'COMPLETED' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Finalizado
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
          <p className="text-xl font-black text-blue-600">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Comissões</p>
          <p className="text-xl font-black text-orange-600">R$ {totals.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Logística</p>
          <p className="text-xl font-black text-purple-600">R$ {totals.transport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Horas Migradas</p>
          <p className="text-xl font-black text-blue-400">{totals.residualHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 ring-2 ring-blue-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lucro Líquido</p>
          <p className={`text-xl font-black ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase">Razão Social / Módulos</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Valor Contrato</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Horas / Dias</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Composição Carga</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Transporte</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Comissão</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-center">Status</th>
                <th className="px-4 py-4 font-bold text-gray-500 uppercase text-right">Resultado (Lucro)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">Nenhum dado disponível para análise com o filtro selecionado.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-800">{report.razãoSocial}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {report.modulos.map(m => (
                          <span key={m} className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded border border-blue-100 font-bold uppercase">{m}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <p className="font-bold text-gray-700">R$ {report.valorImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{report.tipoTreinamento}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-blue-600">{report.usedHours.toFixed(1)}h</span>
                        <span className="text-[10px] text-gray-400 font-medium">em {report.daysToFinish} dias</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-600">{(report.duracaoHoras - (report.residualHoursAdded || 0)).toFixed(1)}h Novas</span>
                        {report.residualHoursAdded && report.residualHoursAdded > 0 ? (
                           <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black">+ {report.residualHoursAdded.toFixed(1)}h Residuais</span>
                        ) : (
                           <span className="text-[9px] text-gray-300">Sem resíduos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <p className="font-bold text-purple-600">R$ {report.totalTransport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <p className="font-bold text-orange-600">R$ {report.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${
                        report.status === 'pending' 
                          ? 'bg-orange-50 text-orange-600 border-orange-200' 
                          : 'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        {report.status === 'pending' ? 'PENDENTE' : 'FINALIZADO'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <p className={`font-black text-sm ${report.profitValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {report.profitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          report.profitPercent >= 30 ? 'bg-green-100 text-green-700' : 
                          report.profitPercent > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {report.profitPercent.toFixed(1)}% Margem
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-blue-800 leading-relaxed">
          <strong>Gestão de Horas Residuais:</strong> A carga total de um contrato agora é dividida analiticamente entre "Horas Novas" (faturadas agora) e "Horas Residuais" (migradas de atendimentos anteriores concluídos). Isso permite identificar se novos faturamentos estão sendo consumidos por saldos de contratos passados.
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityReport;
