
import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings, BrandingConfig } from '../types';
import { getStoredIntegrations, saveIntegrations, saveCloudConfigToDB, getStoredBranding, saveBranding } from '../storage';
import { isSupabaseConfigured, resetSupabaseClient } from '../supabase';

interface IntegrationsProps {
  onBrandingChange?: () => void;
}

const Integrations: React.FC<IntegrationsProps> = ({ onBrandingChange }) => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    apiKey: '',
    webhookUrl: ''
  });
  
  const [branding, setBranding] = useState<BrandingConfig>({
    appName: '',
    appSubtitle: '',
    logoUrl: ''
  });
  
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  const [loading, setLoading] = useState(false);
  
  const [activePanel, setActivePanel] = useState<'CONFIG' | 'BRANDING' | 'API'>('CONFIG');

  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const [intData, brandData] = await Promise.all([
        getStoredIntegrations(),
        getStoredBranding()
      ]);
      setSettings(intData);
      setBranding(brandData);
    } catch (err) {
      console.error('Erro ao buscar integrações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey.trim());
      resetSupabaseClient();
      if (supabaseUrl && supabaseKey) {
        await saveCloudConfigToDB(supabaseUrl.trim(), supabaseKey.trim());
      }
      await saveIntegrations(settings);
      alert('Configurações salvas!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // O saveBranding agora é resiliente e lida com erros de banco ID 3
      await saveBranding(branding);
      alert('Identidade visual atualizada com sucesso!');
      if (onBrandingChange) onBrandingChange();
    } catch (err) {
      // Caso caia aqui, é um erro real de código ou conexão grave
      console.error(err);
      alert('Erro inesperado ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  const apiEndpoint = supabaseUrl ? `${supabaseUrl}/rest/v1/clients` : `/rest/v1/clients`;

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button onClick={() => setActivePanel('CONFIG')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Conexão Cloud</button>
        <button onClick={() => setActivePanel('BRANDING')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Identidade Visual</button>
        <button onClick={() => setActivePanel('API')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Doc. API</button>
      </div>

      {activePanel === 'BRANDING' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Personalização da Marca</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Altere o nome, subtítulo e logomarca do sistema</p>
          </div>
          <form onSubmit={handleSaveBranding} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">URL da Logomarca (PNG/SVG)</label>
                <div className="flex gap-4 items-center">
                   <input type="url" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={branding.logoUrl} onChange={e => setBranding({...branding, logoUrl: e.target.value})} placeholder="https://exemplo.com/logo.png" />
                   {branding.logoUrl && <img src={branding.logoUrl} alt="Preview" className="h-10 w-10 object-contain rounded-lg border border-gray-100" />}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Nome do Sistema</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={branding.appName} onChange={e => setBranding({...branding, appName: e.target.value})} placeholder="TrainMaster" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Subtítulo / Descrição Curta</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={branding.appSubtitle} onChange={e => setBranding({...branding, appSubtitle: e.target.value})} placeholder="SISTEMA PRO" required />
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-[10px] text-blue-700 font-bold uppercase tracking-tight leading-relaxed">
                <p>As alterações são aplicadas instantaneamente neste navegador.</p>
                <p className="mt-1 opacity-70">Nota: Em alguns casos, a sincronização entre dispositivos pode falhar devido a restrições de banco de dados.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-50">
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
                {loading ? 'Salvando...' : 'Atualizar Identidade'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activePanel === 'CONFIG' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Configurações Cloud</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Conexão direta com Supabase</p>
          </div>
          <form onSubmit={handleSaveConfig} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Supabase URL</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Anon Key</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-50">
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {activePanel === 'API' && (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white animate-slideUp">
          <h2 className="text-xl font-black mb-4">Documentação da API</h2>
          <code className="block p-4 bg-slate-950 rounded-xl text-blue-400 text-xs break-all">
            {apiEndpoint}
          </code>
          <button onClick={() => copyToClipboard(apiEndpoint)} className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold uppercase">Copiar Endpoint</button>
        </div>
      )}
    </div>
  );
};

export default Integrations;
