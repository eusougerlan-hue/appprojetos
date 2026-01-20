
import React, { useState } from 'react';

const SetupView: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Pequeno delay para efeito visual de "conectando"
    setTimeout(() => {
      localStorage.setItem('SUPABASE_URL', url.trim());
      localStorage.setItem('SUPABASE_ANON_KEY', key.trim());
      window.location.reload(); // Recarrega para inicializar o cliente
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">TrainMaster Pro</h1>
              <p className="text-sm text-emerald-600 font-bold uppercase tracking-widest">Configuração Inicial Cloud</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8">
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Detectamos que esta é a primeira vez que você acessa este ambiente. 
              Para continuar, conecte o aplicativo ao seu projeto do <strong>Supabase</strong>.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Project URL</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-gray-700 placeholder-gray-300"
                placeholder="https://sua-id.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">API Key (Anon Key)</label>
              <input
                type="password"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-gray-700 placeholder-gray-300"
                placeholder="eyJhbGciOiJIUzI1NiI..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  Validar e Conectar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">v2.5 Stable</span>
             <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-black uppercase hover:underline">Pegar chaves no dashboard →</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupView;
