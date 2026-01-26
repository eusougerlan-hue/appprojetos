
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
  
  const [activeTab, setActiveTab] = useState<'POST' | 'GET'>('POST');
  const [activeResource, setActiveResource] = useState<'customers' | 'clients'>('customers');
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
      alert('Configurações de conexão salvas!');
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
      await saveBranding(branding);
      alert('Identidade visual atualizada com sucesso!');
      if (onBrandingChange) onBrandingChange();
    } catch (err) {
      alert('Erro ao salvar identidade visual.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const apiEndpoint = supabaseUrl ? `${supabaseUrl}/rest/v1/${activeResource}` : `/rest/v1/${activeResource}`;

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* SELETOR DE PAINEL */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button onClick={() => setActivePanel('CONFIG')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Conexão Cloud</button>
        <button onClick={() => setActivePanel('BRANDING')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Identidade Visual</button>
        <button onClick={() => setActivePanel('API')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Doc. API</button>
      </div>

      {/* PAINEL DE IDENTIDADE VISUAL */}
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
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight leading-relaxed">
                Essas alterações serão aplicadas globalmente para todos os usuários na Sidebar e na Tela de Login.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-50">
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
                {loading ? 'Salvando...' : 'Atualizar Identidade'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIGURAÇÃO SUPABASE E WEBHOOK */}
      {activePanel === 'CONFIG' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Configurações de Conexão Cloud</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Parâmetros de sincronização e automação</p>
          </div>
          <form onSubmit={handleSaveConfig} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Supabase URL</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Supabase Anon Key</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Webhook URL (n8n/Make)</label>
                <input type="url" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30" value={settings.webhookUrl} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Chave de API (Opcional)</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30" value={settings.apiKey} onChange={e => setSettings({ ...settings, apiKey: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-50">
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
                Salvar e Sincronizar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENTAÇÃO TÉCNICA DA API */}
      {activePanel === 'API' && (
        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800 animate-slideUp">
          <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 gap-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                Especificação Técnica da API
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Utilize estes parâmetros no seu n8n ou Postman.</p>
            </div>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
               <button onClick={() => setActiveResource('customers')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeResource === 'customers' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>Clientes</button>
               <button onClick={() => setActiveResource('clients')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeResource === 'clients' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>Vendas</button>
            </div>
          </div>

          <div className="p-8">
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-8 w-fit">
              <button onClick={() => setActiveTab('POST')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'POST' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>POST (Criar)</button>
              <button onClick={() => setActiveTab('GET')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GET' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>GET (Listar)</button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Endpoint (URL Completa)</label>
                <div className="flex gap-2">
                  <code className="flex-1 p-4 bg-slate-950 rounded-xl text-blue-400 font-mono text-xs border border-slate-700 break-all leading-relaxed">
                    {activeTab === 'POST' ? apiEndpoint : `${apiEndpoint}${activeResource === 'customers' ? '?cnpj=eq.{{CNPJ}}' : '?protocolo=eq.{{PROTOCOLO}}'}`}
                  </code>
                  <button onClick={() => copyToClipboard(apiEndpoint)} className="p-4 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Configuração de Cabeçalhos (Headers)</h4>
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-4 shadow-inner">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Authorization</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Bearer [Sua Anon Key]</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">apikey</span>
                      <span className="text-[10px] text-emerald-400 font-mono">[Sua Anon Key]</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Content-Type</span>
                      <span className="text-[10px] text-emerald-400 font-mono">application/json</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Prefer</span>
                      <span className="text-[10px] text-emerald-400 font-mono">return=representation</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Payload JSON de Exemplo</h4>
                  <div className="relative group">
                     <pre className="bg-slate-950 p-6 rounded-2xl text-[10px] font-mono text-slate-300 border border-slate-800 overflow-x-auto leading-relaxed max-h-[300px] scrollbar-thin">
{activeTab === 'POST' ? (
  activeResource === 'customers' ? 
`{
  "razao_social": "EMPRESA LTDA",
  "cnpj": "00.000.000/0001-00",
  "contacts": [
    { "name": "João", "phone": "..." }
  ]
}` : 
`{
  "customer_id": "UUID_CLIENTE",
  "razao_social": "EMPRESA LTDA",
  "protocolo": "2024.001",
  "tipo_treinamento": "Implantação",
  "duracao_horas": 10,
  "data_inicio": "2024-06-01",
  "valor_implantacao": 1500.00,
  "comissao_percent": 10,
  "responsavel_tecnico": "Nome Exato do Técnico",
  "modulos": ["Módulo A"],
  "status": "pending"
}`
) : (
`// Resposta Esperada (200 OK)
[
  {
    "id": "uuid",
    "razao_social": "EMPRESA LTDA",
    "status": "pending",
    "..."
  }
]`
)}
                     </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
