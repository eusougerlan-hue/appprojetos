
import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings, BrandingConfig } from '../types';
import { getStoredIntegrations, saveIntegrations, saveCloudConfigToDB, getStoredBranding, saveBranding, getStoredCloudConfig } from '../storage';
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
  const [docEntity, setDocEntity] = useState<'CLIENT' | 'SALE'>('SALE');
  const [docMethod, setDocMethod] = useState<'GET' | 'POST'>('POST');

  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      if (!supabaseUrl || !supabaseKey) {
        const cloudData = await getStoredCloudConfig();
        if (cloudData) {
          setSupabaseUrl(cloudData.url);
          setSupabaseKey(cloudData.key);
          localStorage.setItem('SUPABASE_URL', cloudData.url);
          localStorage.setItem('SUPABASE_ANON_KEY', cloudData.key);
          resetSupabaseClient();
        }
      }

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
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveCloudConfigToDB(supabaseUrl.trim(), supabaseKey.trim());
      await saveIntegrations(settings);
      alert('Configurações salvas e sincronizadas!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao salvar configurações de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveBranding(branding);
      alert('Identidade visual salva com sucesso!');
      if (onBrandingChange) onBrandingChange();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar identidade: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const clientsEndpoint = supabaseUrl ? `${supabaseUrl}/rest/v1/clients` : `/rest/v1/clients`;
  const customersEndpoint = supabaseUrl ? `${supabaseUrl}/rest/v1/customers` : `/rest/v1/customers`;

  // === DADOS DE DOCUMENTAÇÃO ===
  
  const payloads = {
    SALE: {
      POST: JSON.stringify({
        customer_id: "7d9e84b1-...", 
        razao_social: "Nome da Empresa Exemplo",
        protocolo: "202601004476",
        modulos: ["CRM", "Financeiro"],
        tipo_treinamento: "Treinamento Presencial",
        duracao_horas: 15,
        data_inicio: "2026-01-26",
        responsavel_tecnico: "Nome do Instrutor",
        valor_implantacao: 3500.00,
        comissao_percent: 10,
        status: "pending",
        observacao: "Configurado via n8n"
      }, null, 2),
      GET: JSON.stringify([
        {
          id: "uuid-interna",
          razao_social: "Cliente Ativo",
          protocolo: "202601004476",
          status: "pending",
          duracao_horas: 10
        }
      ], null, 2)
    },
    CLIENT: {
      POST: JSON.stringify({
        razao_social: "Novo Cliente Corporativo LTDA",
        cnpj: "00.000.000/0001-00",
        contacts: []
      }, null, 2),
      GET: JSON.stringify([
        {
          id: "uuid-cliente",
          razao_social: "Empresa Master Cadastrada",
          cnpj: "12.345.678/0001-99"
        }
      ], null, 2)
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-20">
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[1.5rem] w-fit mx-auto lg:mx-0">
        <button onClick={() => setActivePanel('CONFIG')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Conexão Cloud</button>
        <button onClick={() => setActivePanel('BRANDING')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Marca</button>
        <button onClick={() => setActivePanel('API')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>API Docs</button>
      </div>

      {activePanel === 'CONFIG' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-10 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Conectividade Global</h2>
          </div>
          <form onSubmit={handleSaveConfig} className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Supabase URL</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Anon Key</label>
                {/* Fix: Restored className and removed malformed attribute quote on input tag below */}
                <input type="password" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} required />
              </div>
              <div className="md:col-span-2 pt-8 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Integrações Customizadas (Webhook n8n)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Webhook URL</label>
                       <input type="url" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} placeholder="https://seu-n8n-url.com" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">API Key Webhook</label>
                       <input type="password" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50" value={settings.apiKey} onChange={e => setSettings({...settings, apiKey: e.target.value})} placeholder="Secret Key" />
                    </div>
                 </div>
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button type="submit" disabled={loading} className="px-16 py-5 bg-blue-600 text-white font-black rounded-[1.25rem] text-xs uppercase tracking-[0.2em]">Gravar Configurações</button>
            </div>
          </form>
        </div>
      )}

      {activePanel === 'BRANDING' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
           <div className="p-10 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Identidade do White-Label</h2>
           </div>
           <form onSubmit={handleSaveBranding} className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Nome do Aplicativo</label>
                    <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50" value={branding.appName} onChange={e => setBranding({...branding, appName: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Slogan / Subtítulo</label>
                    <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50" value={branding.appSubtitle} onChange={e => setBranding({...branding, appSubtitle: e.target.value})} required />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">URL da Logo (PNG/SVG)</label>
                    <input type="url" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50" value={branding.logoUrl} onChange={e => setBranding({...branding, logoUrl: e.target.value})} placeholder="https://link-da-imagem.com/logo.png" />
                 </div>
              </div>
              <div className="flex justify-end pt-6">
                 <button type="submit" disabled={loading} className="px-16 py-5 bg-blue-600 text-white font-black rounded-[1.25rem] text-xs uppercase tracking-[0.2em]">Salvar Identidade</button>
              </div>
           </form>
        </div>
      )}

      {activePanel === 'API' && (
        <div className="bg-[#0b101b] rounded-[3rem] p-10 md:p-16 text-white animate-slideUp border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-blue-600 rounded-[2.25rem] flex items-center justify-center shadow-2xl shadow-blue-900/40">
                   <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight leading-none mb-3">API Reference</h2>
                  <p className="text-slate-400 text-sm font-medium">Use a coluna correta: <code className="text-emerald-400">tipo_treinamento</code></p>
                </div>
              </div>
              <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                 <button onClick={() => setDocEntity('CLIENT')} className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${docEntity === 'CLIENT' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Clientes</button>
                 <button onClick={() => setDocEntity('SALE')} className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${docEntity === 'SALE' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Vendas</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-12 space-y-8">
                <div className="bg-[#05080f] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="flex border-b border-slate-800 p-2 bg-slate-900/30">
                     <button onClick={() => setDocMethod('POST')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl ${docMethod === 'POST' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500'}`}>POST (Criar)</button>
                     <button onClick={() => setDocMethod('GET')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl ${docMethod === 'GET' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500'}`}>GET (Listar)</button>
                  </div>
                  <div className="p-8 space-y-10">
                    <div className="animate-fadeIn">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Target Resource URL</label>
                       <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                          <span className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase ${docMethod === 'POST' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{docMethod}</span>
                          <code className="text-xs font-mono text-blue-300 truncate flex-1">{docEntity === 'SALE' ? clientsEndpoint : customersEndpoint}</code>
                       </div>
                    </div>
                    <div className="animate-fadeIn">
                       <div className="flex justify-between items-center mb-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Exemplo de Payload JSON</label>
                          <button onClick={() => copyToClipboard(docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET))} className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Copy JSON</button>
                       </div>
                       <pre className="bg-[#0b101b] p-8 rounded-[2rem] border border-slate-800 text-blue-200 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto">
                        {docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET)}
                       </pre>
                    </div>
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
