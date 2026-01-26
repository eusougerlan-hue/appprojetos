
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, ViewState, Client, TrainingLog } from './types';
import { getStoredClients, getStoredLogs } from './storage';
import { isSupabaseConfigured, getSupabase } from './supabase';
import LoginForm from './components/LoginForm';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import TrainingPurchase from './components/TrainingPurchase';
import EmployeeRegistration from './components/EmployeeRegistration';
import TrainingForm from './components/TrainingForm';
import PendingTrainings from './components/PendingTrainings';
import ClientList from './components/ClientList';
import HoursManagement from './components/HoursManagement';
import ModuleManagement from './components/ModuleManagement';
import TrainingTypeManagement from './components/TrainingTypeManagement';
import ProfitabilityReport from './components/ProfitabilityReport';
import CommissionPayment from './components/CommissionPayment';
import Integrations from './components/Integrations';
import SetupView from './components/SetupView';
import NotificationToast from './components/NotificationToast';

const SESSION_KEY = 'TM_SESSION_USER';

const normalizeString = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState<ViewState>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return 'LOGIN';
    
    // Suporte para atalhos do PWA via Query Params
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view') as ViewState;
    const validViews: ViewState[] = ['NEW_TRAINING', 'PENDING_LIST', 'CLIENT_REG', 'DASHBOARD'];
    
    if (requestedView && validViews.includes(requestedView)) {
      return requestedView;
    }
    
    return 'DASHBOARD';
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; subMessage: string } | null>(null);

  // Efeito para limpar query params após leitura (limpa a URL do PWA)
  useEffect(() => {
    if (window.location.search && currentUser) {
      window.history.replaceState({}, document.title, "/");
    }
  }, [currentUser]);

  const refreshData = useCallback(async () => {
    if (!isConfigured || !currentUser) return;
    setLoading(true);
    try {
      const [storedClients, storedLogs] = await Promise.all([
        getStoredClients(),
        getStoredLogs()
      ]);
      setClients(storedClients);
      setLogs(storedLogs);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentUser]);

  useEffect(() => {
    if (!isConfigured || !currentUser) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel('public_clients_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clients' },
        (payload) => {
          const newClient = payload.new;
          const techInDb = normalizeString(newClient.responsavel_tecnico || '');
          const userNow = normalizeString(currentUser.name || '');

          if (techInDb === userNow) {
            const title = `Nova Venda: ${newClient.razao_social}`;
            const body = `Protocolo ${newClient.protocolo} atribuído a você agora.`;

            setNotification({ message: newClient.razao_social, subMessage: body });

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png'
              });
            }

            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {}

            refreshData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConfigured, currentUser, refreshData]);

  useEffect(() => {
    if (currentUser && isConfigured) {
      refreshData();
    }
  }, [view, currentUser, refreshData, isConfigured]);

  const filteredData = useMemo(() => {
    if (!currentUser) return { clients: [], logs: [] };
    if (currentUser.role === UserRole.MANAGER) {
      return { clients, logs };
    }
    const userLogs = logs.filter(l => l.employeeId === currentUser.id);
    const clientIdsWithLogs = new Set(userLogs.map(l => l.clientId));
    const userClients = clients.filter(c => 
      normalizeString(c.responsavelTecnico) === normalizeString(currentUser.name) || 
      clientIdsWithLogs.has(c.id)
    );
    return { clients: userClients, logs: userLogs };
  }, [currentUser, clients, logs]);

  const handleLogin = (user: User) => {
    const { password, ...userSafe } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSafe));
    setCurrentUser(userSafe as User);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setView('LOGIN');
    setIsSidebarOpen(false);
  };

  if (!isConfigured) return <SetupView />;
  if (view === 'LOGIN') return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gray-50 flex-col lg:flex-row overflow-hidden relative">
      {notification && (
        <NotificationToast 
          message={notification.message}
          subMessage={notification.subMessage}
          onClose={() => setNotification(null)}
        />
      )}

      <Sidebar 
        user={currentUser} 
        onLogout={handleLogout} 
        setView={setView} 
        currentView={view} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex justify-between items-center z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="hidden lg:block text-gray-400 text-xs font-black uppercase tracking-[0.25em]">Cloud Operations Center</span>
          </div>
          
          <div className="flex items-center gap-3">
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-gray-800 leading-none">{currentUser?.name}</span>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1.5">{currentUser?.role === UserRole.MANAGER ? 'Manager' : 'Technical'}</span>
            </div>
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md text-sm">
              {currentUser?.name.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            {view === 'DASHBOARD' && <Dashboard user={currentUser!} clients={filteredData.clients} logs={filteredData.logs} setView={setView} />}
            {view === 'CLIENT_REG' && <CustomerManagement user={currentUser!} onComplete={() => { refreshData(); setView('DASHBOARD'); }} />}
            {view === 'TRAINING_PURCHASE' && <TrainingPurchase user={currentUser!} onComplete={() => refreshData()} />}
            {view === 'EMPLOYEE_REG' && <EmployeeRegistration onComplete={() => { refreshData(); setView('DASHBOARD'); }} />}
            {view === 'NEW_TRAINING' && <TrainingForm clients={filteredData.clients} logs={filteredData.logs} user={currentUser!} onComplete={() => refreshData()} />}
            {view === 'PENDING_LIST' && <PendingTrainings clients={filteredData.clients} logs={filteredData.logs} setView={setView} />}
            {view === 'CLIENT_LIST' && <ClientList clients={filteredData.clients} logs={filteredData.logs} setView={setView} onEditClient={() => {}} refreshData={refreshData} />}
            {view === 'HOURS_MANAGEMENT' && <HoursManagement clients={filteredData.clients} logs={filteredData.logs} user={currentUser!} refreshData={refreshData} />}
            {view === 'MODULE_MANAGEMENT' && <ModuleManagement onComplete={() => setView('DASHBOARD')} />}
            {view === 'TRAINING_TYPE_MGMT' && <TrainingTypeManagement onComplete={() => setView('DASHBOARD')} />}
            {view === 'PROFITABILITY' && <ProfitabilityReport clients={clients} logs={logs} />}
            {view === 'COMMISSION_PAYMENT' && <CommissionPayment clients={clients} refreshData={refreshData} />}
            {view === 'INTEGRATIONS' && <Integrations />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
