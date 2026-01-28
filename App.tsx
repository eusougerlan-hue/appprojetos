
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, ViewState, Client, TrainingLog, BrandingConfig } from './types';
import { getStoredClients, getStoredLogs, getStoredBranding } from './storage';
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
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view') as ViewState;
    const validViews: ViewState[] = ['NEW_TRAINING', 'PENDING_LIST', 'CLIENT_REG', 'DASHBOARD'];
    if (requestedView && validViews.includes(requestedView)) return requestedView;
    return 'DASHBOARD';
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    const cached = localStorage.getItem('TM_BRANDING_DATA');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return {
      appName: 'TrainMaster',
      appSubtitle: 'SISTEMA PRO',
      logoUrl: ''
    };
  });
  
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; subMessage: string } | null>(null);

  // Efeito para sincronizar PWA (Manifesto, Ícone, Título) com a marca
  useEffect(() => {
    const { appName, appSubtitle, logoUrl } = branding;
    const defaultIcon = 'https://cdn-icons-png.flaticon.com/512/3462/3462151.png';
    const iconUrl = logoUrl || defaultIcon;
    const fullDescription = `${appName} - ${appSubtitle}`;

    // 1. Atualizar Título e Meta Descrição
    document.title = `${appName} | ${appSubtitle}`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', fullDescription);

    // 2. Atualizar Favicons
    const favicon = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    const appleIcon = document.getElementById('dynamic-apple-icon') as HTMLLinkElement;
    if (favicon) favicon.href = iconUrl;
    if (appleIcon) appleIcon.href = iconUrl;

    // 3. Gerar Manifesto Dinâmico
    const manifest = {
      name: appName,
      short_name: appName,
      description: fullDescription,
      start_url: "./",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#2563eb",
      orientation: "portrait",
      icons: [
        {
          src: iconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: iconUrl,
          sizes: "192x192",
          type: "image/png"
        }
      ]
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);
    
    const manifestTag = document.getElementById('dynamic-manifest') as HTMLLinkElement;
    if (manifestTag) {
      manifestTag.href = manifestUrl;
    }

    return () => URL.revokeObjectURL(manifestUrl);
  }, [branding]);

  useEffect(() => {
    if (window.location.search && currentUser) {
      window.history.replaceState({}, document.title, "/");
    }
  }, [currentUser]);

  const refreshData = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const [storedClients, storedLogs, storedBranding] = await Promise.all([
        currentUser ? getStoredClients() : Promise.resolve([]),
        currentUser ? getStoredLogs() : Promise.resolve([]),
        getStoredBranding()
      ]);
      setClients(storedClients);
      setLogs(storedLogs);
      setBranding(storedBranding);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentUser]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!isConfigured || !currentUser) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel('public_clients_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload) => {
          const newClient = payload.new;
          const techInDb = normalizeString(newClient.responsavel_tecnico || '');
          const userNow = normalizeString(currentUser.name || '');
          if (techInDb === userNow) {
            setNotification({ message: newClient.razao_social, subMessage: `Protocolo ${newClient.protocolo} atribuído a você.` });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Nova Venda: ${newClient.razao_social}`, { body: `Protocolo ${newClient.protocolo} atribuído a você agora.` });
            }
            try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch (e) {}
            refreshData();
          }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isConfigured, currentUser, refreshData]);

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

  if (!isConfigured) return <SetupView />;
  if (view === 'LOGIN') return <LoginForm onLogin={handleLogin} branding={branding} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {notification && (
        <NotificationToast 
          message={notification.message}
          subMessage={notification.subMessage}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Sidebar fixo à esquerda no desktop */}
      <Sidebar 
        user={currentUser} 
        onLogout={handleLogout} 
        setView={setView} 
        currentView={view} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        branding={branding}
      />
      
      {/* Container Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-72 transition-all duration-300">
        <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex justify-between items-center z-[40] shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2.5 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] leading-none mb-1">Status do Servidor</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Cloud Operations Center Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-black text-gray-800 leading-none">{currentUser?.name}</span>
                <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest mt-1.5">{currentUser?.role === UserRole.MANAGER ? 'Master Admin' : 'Tech Analyst'}</span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black border-2 border-white shadow-lg text-sm uppercase ring-4 ring-blue-50">
                {currentUser?.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto pb-20">
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
    </div>
  );
};

export default App;
