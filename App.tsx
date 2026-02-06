
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, ViewState, Client, TrainingLog, BrandingConfig } from './types';
import { getStoredClients, getStoredLogs, getStoredBranding, normalizeString } from './storage';
import { isSupabaseConfigured } from './supabase';
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
    return 'DASHBOARD';
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>({
    appName: 'TrainMaster',
    appSubtitle: 'SISTEMA PRO',
    logoUrl: ''
  });
  
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; subMessage: string } | null>(null);

  const refreshData = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const [storedClients, storedLogs, storedBranding] = await Promise.all([
        currentUser ? getStoredClients() : Promise.resolve([]),
        currentUser ? getStoredLogs() : Promise.resolve([]),
        getStoredBranding()
      ]);
      setClients(storedClients || []);
      setLogs(storedLogs || []);
      setBranding(brandData => ({ ...brandData, ...storedBranding }));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [isConfigured, currentUser]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredData = useMemo(() => {
    if (!currentUser) return { clients: [], logs: [] };
    if (currentUser.role === UserRole.MANAGER) return { clients, logs };
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

  const renderContent = () => {
    if (!isConfigured) return <SetupView />;
    if (view === 'LOGIN') return <LoginForm onLogin={handleLogin} branding={branding} />;

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-40 shadow-sm flex-shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-800 leading-none">{currentUser?.name.split(' ')[0]}</span>
              <span className="text-[8px] text-blue-600 font-black uppercase tracking-widest mt-1">
                {currentUser?.role === UserRole.MANAGER ? 'Admin' : 'Analista'}
              </span>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black border border-white shadow-sm text-xs uppercase">
              {currentUser?.name.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-4 pb-20">
          <div className="animate-fadeIn max-w-full">
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
            {view === 'INTEGRATIONS' && <Integrations onBrandingChange={refreshData} />}
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-900 flex justify-center items-center overflow-hidden">
      {/* Container Principal: Proporção 9:16 fixa no Desktop, Full no Mobile */}
      <div className="w-full h-full md:w-[420px] md:h-[746px] bg-white flex flex-col relative md:shadow-[0_0_80px_rgba(0,0,0,0.6)] md:rounded-[3rem] overflow-hidden transition-all">
        
        {notification && (
          <NotificationToast 
            message={notification.message}
            subMessage={notification.subMessage}
            onClose={() => setNotification(null)}
          />
        )}

        {view !== 'LOGIN' && isConfigured && (
          <Sidebar 
            user={currentUser} 
            onLogout={handleLogout} 
            setView={setView} 
            currentView={view} 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            branding={branding}
          />
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
