
import React, { useMemo, useState, useEffect } from 'react';
import { User, Client, TrainingLog, ViewState, UserRole } from '../types';
import { getStoredUsers, normalizeString } from '../storage';

interface DashboardProps {
  user: User;
  clients: Client[];
  logs: TrainingLog[];
  setView: (view: ViewState) => void;
}

const parseDateParts = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-/T ]/);
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    if (!isNaN(year) && !isNaN(month)) {
      return { year, month };
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() };
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ user, clients, logs, setView }) => {
  const isManager = user.role === UserRole.MANAGER;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthName = now.toLocaleString('pt-BR', { month: 'long' });

  const pendingCount = clients.filter(c => c.status === 'pending').length;
  const completedCount = logs.length;

  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isManager) {
        try {
          const data = await getStoredUsers();
          setAllUsers(data);
        } catch (err) {
          console.error('Erro ao carregar usuários:', err);
        }
      }
    };
    fetchUsers();
  }, [isManager]);

  const techProductivity = useMemo(() => {
    if (!isManager || allUsers.length === 0) return [];
    const technicians = allUsers.filter(u => u.active !== false);

    const list = technicians.map(tech => {
      // Clientes pendentes atribuídos a este técnico (status pendente ativo)
      const techPending = clients.filter(c => 
        c.status === 'pending' && 
        normalizeString(c.responsavelTecnico) === normalizeString(tech.name)
      ).length;

      // Treinamentos finalizados pelo técnico no mês atual
      const techCompleted = clients.filter(c => {
        if (c.status !== 'completed') return false;
        if (normalizeString(c.responsavelTecnico) !== normalizeString(tech.name)) return false;
        if (c.dataFim) {
          const parts = parseDateParts(c.dataFim);
          if (parts) {
            return parts.month === currentMonth && parts.year === currentYear;
          }
        }
        return true;
      }).length;

      // Sessões de atendimento realizadas pelo técnico no mês atual
      const techLogs = logs.filter(l => {
        const isMatch = (l.employeeId && l.employeeId === tech.id) || 
                        (l.employeeName && normalizeString(l.employeeName) === normalizeString(tech.name));
        if (!isMatch) return false;
        const parts = parseDateParts(l.date);
        if (parts) {
          return parts.month === currentMonth && parts.year === currentYear;
        }
        return true;
      }).length;

      return {
        id: tech.id,
        name: tech.name,
        pending: techPending,
        completed: techCompleted,
        sessions: techLogs
      };
    });

    // Se houver clientes pendentes sem responsável ou com responsável não cadastrado, exibe linha de Não Atribuído
    const unassignedPending = clients.filter(c => 
      c.status === 'pending' && 
      (!c.responsavelTecnico || !allUsers.some(u => normalizeString(u.name) === normalizeString(c.responsavelTecnico)))
    ).length;

    if (unassignedPending > 0) {
      list.push({
        id: 'unassigned',
        name: 'Não Atribuído',
        pending: unassignedPending,
        completed: 0,
        sessions: 0
      });
    }

    return list.sort((a, b) => {
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      if (b.pending !== a.pending) return b.pending - a.pending;
      return a.name.localeCompare(b.name);
    });
  }, [isManager, allUsers, clients, logs, currentMonth, currentYear]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Olá, {user.name}!</h1>
        <p className="text-sm text-gray-500 font-medium">Bem-vindo ao painel de controle de treinamentos.</p>
      </header>

      {/* Grid de Cartões - Agora com 3 colunas fixas desde o mobile */}
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        {/* Card Clientes */}
        <div className="bg-white p-2 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <div className="w-7 h-7 md:w-11 md:h-11 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="text-blue-600 text-[10px] md:text-base font-black leading-none truncate">Clientes</h3>
          </div>
          <p className="text-xl md:text-4xl font-black text-gray-800 mt-2 md:mt-6 leading-none">{clients.length}</p>
        </div>

        {/* Card Pendentes */}
        <div className="bg-white p-2 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <div className="w-7 h-7 md:w-11 md:h-11 bg-orange-50 text-orange-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-blue-600 text-[10px] md:text-base font-black leading-none truncate">Pendentes</h3>
          </div>
          <p className="text-xl md:text-4xl font-black text-gray-800 mt-2 md:mt-6 leading-none">{pendingCount}</p>
        </div>

        {/* Card Realizados */}
        <div className="bg-white p-2 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <div className="w-7 h-7 md:w-11 md:h-11 bg-green-50 text-green-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-blue-600 text-[10px] md:text-base font-black leading-none truncate">Realizados</h3>
          </div>
          <p className="text-xl md:text-4xl font-black text-gray-800 mt-2 md:mt-6 leading-none">{completedCount}</p>
        </div>
      </div>

      {isManager && (
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mt-8 animate-slideUp">
          <div className="p-4 md:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-black text-gray-800 flex items-center gap-2 text-xs md:text-sm">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Produtividade da Equipe
              </h3>
              <p className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Métricas de {monthName} de {currentYear}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/30">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Técnico</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Pend.</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Fin.</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Sessões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {techProductivity.map((tech) => (
                  <tr key={tech.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 md:px-6 py-2 md:py-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-white font-black text-[8px] md:text-[10px] ${
                          tech.id === 'unassigned' ? 'bg-amber-500' : 'bg-blue-600'
                        }`}>
                          {tech.id === 'unassigned' ? '?' : tech.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs truncate max-w-[80px] md:max-w-none">
                          {tech.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-3 text-center">
                      <span className={`text-[10px] md:text-xs font-bold ${
                        tech.pending > 0 ? 'text-orange-600 font-black bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100' : 'text-gray-400'
                      }`}>
                        {tech.pending}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-3 text-center">
                      <span className={`text-[10px] md:text-xs font-bold ${
                        tech.completed > 0 ? 'text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100' : 'text-gray-400'
                      }`}>
                        {tech.completed}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-2 md:py-3 text-center">
                      <span className="text-[11px] md:text-sm font-black text-blue-600">{tech.sessions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
