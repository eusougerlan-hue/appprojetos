
import React, { useMemo, useState, useEffect } from 'react';
import { User, Client, TrainingLog, ViewState, UserRole } from '../types';
import { getStoredUsers } from '../storage';

interface DashboardProps {
  user: User;
  clients: Client[];
  logs: TrainingLog[];
  setView: (view: ViewState) => void;
}

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
    return technicians.map(tech => {
      const techPending = clients.filter(c => {
        const startDate = new Date(c.dataInicio);
        return c.status === 'pending' && 
               c.responsavelTecnico === tech.name &&
               startDate.getMonth() === currentMonth &&
               startDate.getFullYear() === currentYear;
      }).length;
      const techLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        return l.employeeId === tech.id &&
               logDate.getMonth() === currentMonth &&
               logDate.getFullYear() === currentYear;
      }).length;
      return {
        name: tech.name,
        pending: techPending,
        completed: 0, // Simplified for this view
        sessions: techLogs
      };
    }).sort((a, b) => b.sessions - a.sessions);
  }, [isManager, allUsers, clients, logs, currentMonth, currentYear]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Olá, Gestor!</h1>
        <p className="text-sm text-gray-500 font-medium">Bem-vindo ao painel de controle de treinamentos.</p>
      </header>

      {/* Grid de Cartões - 2 colunas no mobile, compactos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {/* Card Clientes */}
        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-blue-600 text-sm md:text-base font-black leading-none">Clientes</h3>
            </div>
          </div>
          <p className="text-2xl md:text-4xl font-black text-gray-800 mt-4 md:mt-6 leading-none">{clients.length}</p>
        </div>

        {/* Card Pendentes */}
        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-blue-600 text-sm md:text-base font-black leading-none">Pendentes</h3>
            </div>
          </div>
          <p className="text-2xl md:text-4xl font-black text-gray-800 mt-4 md:mt-6 leading-none">{pendingCount}</p>
        </div>

        {/* Card Realizados */}
        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-blue-600 text-sm md:text-base font-black leading-none">Realizados</h3>
            </div>
          </div>
          <p className="text-2xl md:text-4xl font-black text-gray-800 mt-4 md:mt-6 leading-none">{completedCount}</p>
        </div>
      </div>

      {isManager && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mt-8 animate-slideUp">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Produtividade da Equipe
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Métricas de {monthName} de {currentYear}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/30">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Técnico Responsável</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Pendentes</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Finalizados</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Sessões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {techProductivity.map((tech) => (
                  <tr key={tech.name} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
                          {tech.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-700 text-xs">{tech.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-xs font-bold text-gray-400">{tech.pending}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-xs font-bold text-gray-400">0</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-sm font-black text-blue-600">{tech.sessions}</span>
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
