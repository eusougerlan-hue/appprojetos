
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

      const techCompleted = clients.filter(c => {
        if (c.status !== 'completed' || c.responsavelTecnico !== tech.name) return false;
        const clientLogs = logs.filter(l => l.clientId === c.id);
        if (clientLogs.length === 0) return false;
        
        const lastLogDate = new Date(clientLogs[clientLogs.length - 1].date);
        return lastLogDate.getMonth() === currentMonth && 
               lastLogDate.getFullYear() === currentYear;
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
        completed: techCompleted,
        sessions: techLogs
      };
    }).sort((a, b) => b.sessions - a.sessions);
  }, [isManager, allUsers, clients, logs, currentMonth, currentYear]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Olá, {user.name.split(' ')[0]}!</h1>
          <p className="text-gray-500">Bem-vindo ao painel de controle de treinamentos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Total de Clientes</h3>
          <p className="text-2xl font-bold text-gray-800">{clients.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Treinamentos Pendentes</h3>
          <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Treinamentos Realizados</h3>
          <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
        </div>
      </div>

      {isManager && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Produtividade da Equipe
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Métricas de {monthName} de {currentYear}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Técnico Responsável</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pendentes (Mês)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Finalizados (Mês)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sessões Realizadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {techProductivity.map((tech) => (
                  <tr key={tech.name} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                          {tech.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-700 text-sm">{tech.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-black text-xs ${tech.pending > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-300'}`}>
                        {tech.pending}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-black text-xs ${tech.completed > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300'}`}>
                        {tech.completed}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-blue-600">{tech.sessions}</span>
                        <div className="w-12 bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (tech.sessions / 20) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Atividades Recentes</h3>
          <button 
            onClick={() => setView('PENDING_LIST')}
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
          >
            Ver todos pendentes
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nenhuma atividade registrada hoje.</div>
          ) : (
            logs.slice(-5).reverse().map((log) => {
              const client = clients.find(c => c.id === log.clientId);
              return (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{client?.razãoSocial || 'Cliente Excluído'}</p>
                      <p className="text-xs text-gray-500">{log.date} • {log.startTime1} às {log.endTime1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Responsável</p>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {log.employeeName || 'Não identificado'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
