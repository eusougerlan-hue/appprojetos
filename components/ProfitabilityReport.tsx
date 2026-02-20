
import React, { useMemo, useState } from 'react';
import { Client, TrainingLog } from '../types';

interface ProfitabilityReportProps {
  clients: Client[];
  logs: TrainingLog[];
}

type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED';

const ProfitabilityReport: React.FC<ProfitabilityReportProps> = ({ clients, logs }) => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const reports = useMemo(() => {
    return clients
      .map(client => {
        const clientLogs = logs.filter(l => l.clientId === client.id);
        const usedHours = clientLogs.reduce((acc, log) => acc + (log.horasCalculadas || 0), 0);
        const totalTransport = clientLogs.reduce((acc, log) => (acc + (log.uberTotal || 0) + (log.ownVehicleTotal || 0)), 0);
        const commissionValue = (client.valorImplantacao * client.comissaoPercent) / 100;
        const totalCosts = totalTransport + commissionValue;
        const profitValue = client.valorImplantacao - totalCosts;
        const profitPercent = client.valorImplantacao > 0 ? (profitValue / client.valorImplantacao) * 100 : 0;

        let daysToFinish = 0;
        if (clientLogs.length > 0) {
          const dates = clientLogs.map(l => new Date(l.date).getTime());
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
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
        const matchesStatus = filter === 'ALL' || (filter === 'PENDING' ? report.status === 'pending' : report.status === 'completed');
        const projectDate = new Date(report.dataInicio);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        projectDate.setHours(12, 0, 0, 0);
        const matchesDate = (!start || projectDate >= start) && (!end || projectDate <= end);
        return matchesStatus && matchesDate;
      });
  }, [clients, logs, filter, startDate, endDate]);

  const totals = useMemo(() => {
    return reports.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.valorImplantacao,
      profit: acc.profit + curr.profitValue,
      transport: acc.transport + curr.totalTransport,
      commission: acc.commission + curr.commissionValue,
      residualHours: acc.residualHours + (curr.residualHoursAdded || 0)
    }), { revenue: 0, profit: 0, transport: 0, commission: 0, residualHours: 0 });
  }, [reports]);

  const SummaryCard = ({ title, value, colorClass, prefix = "R$ " }: { title: string, value: string | number, colorClass: string, prefix?: string }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex flex-col items-center justify-center min-w-[140px] flex-1 text-center h-28">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-base font-black ${colorClass} leading-none`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: title.includes('HORAS') ? 1 : 2 }) : value}
        {title.includes('HORAS') || title.includes('MIGRADAS') ? 'h' : ''}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* Header aligned with Screenshot */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Relatório de Lucratividade</h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">
          Análise financeira detalhada de cada projeto e implantação.
        </p>
      </div>

      {/* Date Filters Card */}
      <div className="bg-white/50 p-2 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-3">
        <div className="bg-white flex items-center gap-4 px-6 py-4 rounded-[2rem] border border-slate-50 relative group">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">De</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-xs font-black text-blue-600 bg-transparent outline-none cursor-pointer" />
          </div>
          <div className="w-px h-6 bg-slate-100"></div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-xs font-black text-blue-600 bg-transparent outline-none cursor-pointer" />
          </div>
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Status Filter - Pill style */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shadow-inner">
          <button onClick={() => setFilter('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Ambos</button>
          <button onClick={() => setFilter('PENDING')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'PENDING' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Pendente</button>
          <button onClick={() => setFilter('COMPLETED')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'COMPLETED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Finalizado</button>
        </div>
      </div>

      {/* Summary Cards Grid - Horizontal scroll ensured for side-by-side columns */}
      <div className="overflow-x-auto pb-4 custom-scrollbar -mx-2 px-2">
        <div className="flex gap-3 min-w-max">
          <SummaryCard title="Faturamento Bruto" value={totals.revenue} colorClass="text-blue-600" />
          <SummaryCard title="Total Comissões" value={totals.commission} colorClass="text-orange-600" />
          <SummaryCard title="Total Logística" value={totals.transport} colorClass="text-purple-600" />
          <SummaryCard title="Horas Migradas" value={totals.residualHours} colorClass="text-blue-400" prefix="" />
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col items-center justify-center min-w-[140px] flex-1 text-center h-28 ring-4 ring-blue-50/20">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido</p>
            <p className={`text-base font-black ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'} leading-none`}>
              R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Project Table/List Area - Wrapped in overflow-x-auto to keep columns side-by-side */}
      <div className="bg-white/50 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px]">
            {/* Table Header */}
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 grid grid-cols-4 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
              <span className="text-left">Razão Social / Módulos</span>
              <span>Valor Contrato</span>
              <span>Horas / Dias</span>
              <span className="text-right pr-4">Composição Carga</span>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100 bg-white">
              {reports.length === 0 ? (
                <div className="p-20 text-center text-xs font-black text-slate-300 uppercase tracking-widest italic">Nenhum dado encontrado no período</div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-6 hover:bg-blue-50/10 transition-colors">
                    <div className="grid grid-cols-4 gap-4 items-start text-center">
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800 leading-tight mb-1">{report.razãoSocial}</p>
                        <p className="text-[9px] text-slate-400 font-bold mb-3">{new Date(report.dataInicio).toLocaleDateString('pt-BR')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.modulos.slice(0, 4).map(m => (
                            <span key={m} className="text-[7px] bg-blue-50/50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100/50 font-black uppercase tracking-tighter">
                              {m}
                            </span>
                          ))}
                          {report.modulos.length > 4 && <span className="text-[7px] text-slate-300 font-black">+{report.modulos.length - 4}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center pt-1">
                        <p className="text-xs font-black text-slate-700">R$ {report.valorImplantacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className="text-[8px] text-slate-300 font-bold uppercase mt-1.5 tracking-widest">{report.tipoTreinamento}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center pt-1">
                        <span className="text-xs font-black text-blue-600">{report.usedHours.toFixed(1)}h</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">EM {report.daysToFinish} DIAS</span>
                      </div>

                      <div className="flex flex-col items-end justify-center pt-1 pr-4">
                        <span className="text-xs font-black text-slate-600">{(report.duracaoHoras - (report.residualHoursAdded || 0)).toFixed(1)}h Novas</span>
                        {report.residualHoursAdded && report.residualHoursAdded > 0 ? (
                           <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-[9px] tracking-tighter mt-1.5 shadow-md">
                             + {report.residualHoursAdded.toFixed(1)}h Residuais
                           </div>
                        ) : (
                           <span className="text-[8px] text-slate-300 font-bold mt-1.5 uppercase tracking-widest">Saldo Limpo</span>
                        )}
                      </div>
                    </div>

                    {/* Result Footer per item */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                      <div className="flex gap-8">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase leading-none tracking-widest mb-1.5">Transporte</span>
                          <span className="text-[10px] font-black text-purple-600">R$ {report.totalTransport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase leading-none tracking-widest mb-1.5">Comissão</span>
                          <span className="text-[10px] font-black text-orange-600">R$ {report.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none tracking-widest mb-1.5">Resultado</span>
                        <p className={`text-sm font-black ${report.profitValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {report.profitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityReport;
