import React, { useState, useEffect, useMemo } from 'react';
import { Client, TrainingLog } from '../types';
import { getStoredTimeConfig, saveTimeConfig } from '../storage';

interface TimeManagementProps {
  clients: Client[];
  logs: TrainingLog[];
}

const TimeManagement: React.FC<TimeManagementProps> = ({ clients, logs }) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [dias, setDias] = useState<number>(0);
  const [horasPorDia, setHorasPorDia] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const monthYear = useMemo(() => {
    return startDate.substring(0, 7); // YYYY-MM
  }, [startDate]);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getStoredTimeConfig(monthYear);
      if (config) {
        setDias(config.dias);
        setHorasPorDia(config.horasPorDia);
      } else {
        setDias(0);
        setHorasPorDia(0);
      }
    };
    loadConfig();
  }, [monthYear]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveTimeConfig({ id: monthYear, dias, horasPorDia });
      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      alert('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  };

  const tableData = useMemo(() => {
    const pendingClients = clients.filter(c => c.status === 'pending');
    
    const mappedClients = pendingClients.map(client => {
      const clientLogs = logs.filter(l => l.clientId === client.id);
      
      const firstLog = [...clientLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      const dataInicioReal = firstLog ? firstLog.date : client.dataInicio;
      
      const horasContratadas = client.duracaoHoras;
      const horasUtilizadas = clientLogs.reduce((acc, log) => acc + (log.horasCalculadas || 0), 0);
      const saldo = horasContratadas - horasUtilizadas;

      return {
        ...client,
        dataInicioReal,
        horasContratadas,
        horasUtilizadas,
        saldo
      };
    });

    return mappedClients
      .filter(client => client.dataInicioReal >= startDate && client.dataInicioReal <= endDate)
      .sort((a, b) => new Date(a.dataInicioReal).getTime() - new Date(b.dataInicioReal).getTime());
  }, [clients, logs, startDate, endDate]);

  const horasOcupadas = tableData.reduce((acc, curr) => acc + curr.saldo, 0);
  const totalHoras = dias * horasPorDia;
  const horasLivres = totalHoras - horasOcupadas;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Gestão de Tempo</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
            Análise de capacidade e ocupação de projetos pendentes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Início</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 rounded-xl border border-white font-bold text-slate-700 bg-white shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Fim</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 rounded-xl border border-white font-bold text-slate-700 bg-white shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
            <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Dias Úteis</label>
            <input 
              type="number" 
              className="w-full px-4 py-3 rounded-xl border border-white font-bold text-blue-700 bg-white shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={dias} 
              onChange={e => setDias(Number(e.target.value))} 
            />
          </div>
          <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
            <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Horas por Dia</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-full px-4 py-3 rounded-xl border border-white font-bold text-blue-700 bg-white shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={horasPorDia} 
                onChange={e => setHorasPorDia(Number(e.target.value))} 
              />
              <button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-5 rounded-2xl shadow-lg">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Horas (Mês)</span>
            <span className="text-2xl font-black text-white">{totalHoras.toFixed(1)}h</span>
          </div>
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest block mb-1">Horas Ocupadas</span>
            <span className="text-2xl font-black text-orange-600">{horasOcupadas.toFixed(1)}h</span>
          </div>
          <div className={`p-5 rounded-2xl border ${horasLivres < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${horasLivres < 0 ? 'text-red-400' : 'text-green-400'}`}>Horas Livres</span>
            <span className={`text-2xl font-black ${horasLivres < 0 ? 'text-red-600' : 'text-green-600'}`}>{horasLivres.toFixed(1)}h</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Início</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Protocolo</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Módulos</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Contratadas</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Utilizadas</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                    Nenhum projeto pendente no período selecionado.
                  </td>
                </tr>
              ) : (
                tableData.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                      {new Date(client.dataInicioReal).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-[10px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">
                      {client.protocolo}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-800">
                      {client.razãoSocial}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {client.modulos.map(m => (
                          <span key={m} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600 text-right whitespace-nowrap">
                      {client.horasContratadas.toFixed(1)}h
                    </td>
                    <td className="p-4 text-xs font-bold text-blue-600 text-right whitespace-nowrap">
                      {client.horasUtilizadas.toFixed(1)}h
                    </td>
                    <td className="p-4 text-xs font-black text-right whitespace-nowrap">
                      <span className={client.saldo < 0 ? 'text-red-500' : 'text-green-600'}>
                        {client.saldo.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeManagement;
