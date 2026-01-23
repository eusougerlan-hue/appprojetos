
import React, { useEffect } from 'react';

interface NotificationToastProps {
  message: string;
  subMessage?: string;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, subMessage, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-4 z-[100] animate-slideIn">
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-4 max-w-sm ring-4 ring-blue-500/10">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Nova Venda Atribuída</h4>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="font-bold text-sm truncate">{message}</p>
          {subMessage && <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{subMessage}</p>}
          <div className="mt-3 flex gap-2">
            <button 
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
