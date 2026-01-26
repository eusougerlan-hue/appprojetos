
import React from 'react';
import { User, UserRole, ViewState, BrandingConfig } from '../types';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  setView: (view: ViewState) => void;
  currentView: ViewState;
  isOpen?: boolean;
  onClose?: () => void;
  branding: BrandingConfig;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, setView, currentView, isOpen, onClose, branding }) => {
  const isManager = user?.role === UserRole.MANAGER;

  const NavItem = ({ view, label, icon }: { view: ViewState, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => {
        setView(view);
        if (onClose) onClose();
      }}
      className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 translate-x-1' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
      }`}
    >
      <div className={`${currentView === view ? 'text-white' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className="font-bold text-[13px] tracking-tight">{label}</span>
    </button>
  );

  return (
    <>
      {/* Backdrop Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-fadeIn" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-[70] h-screen bg-white border-r border-slate-100 flex flex-col
        transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) w-72
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Info */}
        <div className="p-8 mb-2 flex justify-between items-center">
          <div className="flex items-center gap-4 overflow-hidden">
             {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              )}
            <div className="flex flex-col truncate">
              <span className="text-lg font-black text-slate-800 leading-none truncate">{branding.appName}</span>
              <span className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1.5 truncate">{branding.appSubtitle}</span>
            </div>
          </div>
          
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Principal conforme Print do Usuário */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavItem 
            view="DASHBOARD" 
            label="Início" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} 
          />
          <NavItem 
            view="PENDING_LIST" 
            label="Projetos Pendentes" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          />
          <NavItem 
            view="NEW_TRAINING" 
            label="Treinamentos" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} 
          />
          <NavItem 
            view="HOURS_MANAGEMENT" 
            label="Projetos" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
          />
          <NavItem 
            view="CLIENT_REG" 
            label="Clientes" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} 
          />
          <NavItem 
            view="TRAINING_PURCHASE" 
            label="Compras Treinamentos" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} 
          />
          <NavItem 
            view="CLIENT_LIST" 
            label="Lista de Projetos" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
          />
          
          {/* Seção Administrativa Ocultável para Staff */}
          {isManager && (
            <div className="pt-8 mt-4 border-t border-slate-50">
              <div className="px-5 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configurações</span>
              </div>
              <div className="space-y-1">
                <NavItem 
                  view="PROFITABILITY" 
                  label="Lucratividade" 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.407-2.67-1M12 16V15" /></svg>} 
                />
                <NavItem 
                  view="COMMISSION_PAYMENT" 
                  label="Pagamento Comissões" 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                />
                <NavItem 
                  view="EMPLOYEE_REG" 
                  label="Funcionários" 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>} 
                />
                <NavItem 
                  view="MODULE_MANAGEMENT" 
                  label="Módulos do Sistema" 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>} 
                />
                <NavItem 
                  view="INTEGRATIONS" 
                  label="Integrações Cloud" 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1" /></svg>} 
                />
              </div>
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-6 mt-auto bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-100 mb-6 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            LOGOUT DO SISTEMA
          </button>
          
          <div className="flex items-center gap-4 px-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black shadow-sm ring-4 ring-slate-100">
              {user?.name.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black text-slate-800 leading-none truncate">{user?.name.split(' ')[0]}</span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1.5 truncate">
                {user?.role === UserRole.MANAGER ? 'ADMINISTRADOR' : 'TÉCNICO ANALISTA'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
