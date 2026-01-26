
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
        customer_id: "7d9e84b1-...", // UUID do cliente da GW Sistemas
        razao_social: "Nome da Empresa Exemplo",
        protocolo: "2024.1001",
        modulos: ["CRM", "Financeiro", "Logística"],
        tipo_treinamento: "Treinamento Presencial",
        duracao_horas: 15,
        data_inicio: "2024-06-01",
        responsavel_tecnico: "Nome do Instrutor",
        valor_implantacao: 3500.00,
        comissao_percent: 10,
        status: "pending",
        observacao: "Configurado via Webhook externo"
      }, null, 2),
      GET: JSON.stringify([
        {
          id: "uuid-interna",
          razao_social: "Cliente Ativo",
          protocolo: "2024.005",
          status: "pending",
          duracao_horas: 10,
          "...": "outros campos analíticos"
        }
      ], null, 2)
    },
    CLIENT: {
      POST: JSON.stringify({
        razao_social: "Novo Cliente Corporativo LTDA",
        cnpj: "00.000.000/0001-00",
        contacts: [
          {
            name: "João da Silva",
            phone: "(11) 99999-8888",
            email: "joao@empresa.com"
          }
        ]
      }, null, 2),
      GET: JSON.stringify([
        {
          id: "uuid-cliente",
          razao_social: "Empresa Master Cadastrada",
          cnpj: "12.345.678/0001-99",
          contacts: []
        }
      ], null, 2)
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-20">
      {/* Navegação Superior Principal */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[1.5rem] w-fit mx-auto lg:mx-0">
        <button 
          onClick={() => setActivePanel('CONFIG')} 
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Conexão Cloud
        </button>
        <button 
          onClick={() => setActivePanel('BRANDING')} 
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Marca
        </button>
        <button 
          onClick={() => setActivePanel('API')} 
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          API Docs
        </button>
      </div>

      {activePanel === 'CONFIG' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-10 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Conectividade Global</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Parâmetros nativos de sincronização Supabase</p>
          </div>
          <form onSubmit={handleSaveConfig} className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Supabase URL</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Anon Key (Master Key)</label>
                <input type="password" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} required />
              </div>

              <div className="md:col-span-2 pt-8 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Integrações Customizadas (Webhook)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Webhook URL (n8n / Make)</label>
                       <input type="url" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} placeholder="https://seu-fluxo.com" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Secret API Key do Webhook</label>
                       <input type="password" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/5 transition-all" value={settings.apiKey} onChange={e => setSettings({...settings, apiKey: e.target.value})} placeholder="X-API-KEY" />
                    </div>
                 </div>
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button type="submit" disabled={loading} className="px-16 py-5 bg-blue-600 text-white font-black rounded-[1.25rem] text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-95 hover:bg-blue-700">
                {loading ? 'Sincronizando...' : 'Gravar Configurações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activePanel === 'BRANDING' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-slideUp">
          <div className="p-10 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">White Label & UI</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Identidade visual persistente em nuvem</p>
          </div>
          <form onSubmit={handleSaveBranding} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">URL da Logomarca (PNG/SVG)</label>
                <div className="flex gap-6 items-center">
                   <input type="url" className="flex-1 px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" value={branding.logoUrl} onChange={e => setBranding({...branding, logoUrl: e.target.value})} placeholder="https://cloud.com/logo.png" />
                   {branding.logoUrl && (
                     <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 p-2 shadow-sm flex items-center justify-center">
                        <img src={branding.logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                     </div>
                   )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Nome do Aplicativo</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" value={branding.appName} onChange={e => setBranding({...branding, appName: e.target.value})} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Slogan / Subtítulo</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" value={branding.appSubtitle} onChange={e => setBranding({...branding, appSubtitle: e.target.value})} required />
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button type="submit" disabled={loading} className="px-16 py-5 bg-blue-600 text-white font-black rounded-[1.25rem] text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-95">
                {loading ? 'Aplicando UI...' : 'Salvar Identidade'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOCUMENTAÇÃO PROFISSIONAL DARK - TOTALMENTE REFORMULADA */}
      {activePanel === 'API' && (
        <div className="bg-[#0b101b] rounded-[3rem] p-10 md:p-16 text-white animate-slideUp border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Decoração Background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] pointer-events-none opacity-30"></div>
          
          <div className="relative">
            {/* Header da Documentação */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-blue-600 rounded-[2.25rem] flex items-center justify-center shadow-2xl shadow-blue-900/40 ring-1 ring-blue-400/30">
                   <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                   </svg>
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight leading-none mb-3">API Reference</h2>
                  <p className="text-slate-400 text-sm font-medium tracking-wide">RESTful Supabase Engine v2.0 - Integração Direta n8n/Make</p>
                </div>
              </div>

              {/* Seletor de Entidade (Venda/Cliente) */}
              <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 ring-1 ring-white/5 shadow-inner">
                 <button 
                   onClick={() => setDocEntity('CLIENT')}
                   className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${docEntity === 'CLIENT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   Clientes
                 </button>
                 <button 
                   onClick={() => setDocEntity('SALE')}
                   className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${docEntity === 'SALE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   Vendas
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Coluna Esquerda: Definições e Headers */}
              <div className="lg:col-span-5 space-y-12">
                <section>
                  <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-6 h-px bg-blue-500/30"></span>
                    Authentication & Headers
                  </h3>
                  <div className="space-y-4">
                    {[
                      { name: 'Authorization', value: `Bearer ${supabaseKey?.substring(0, 15)}...`, label: 'Bearer Token' },
                      { name: 'apikey', value: supabaseKey?.substring(0, 15) + "...", label: 'Supabase Key' },
                      { name: 'Content-Type', value: 'application/json', label: 'Mime Type' },
                      { name: 'Prefer', value: 'return=representation', label: 'Upsert Mode' }
                    ].map((h, i) => (
                      <div key={i} className="group bg-slate-900/40 hover:bg-slate-900/60 p-5 rounded-2xl border border-slate-800/60 transition-all">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{h.name}</span>
                           <span className="text-[9px] font-bold text-slate-600 italic">{h.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <code className="text-xs text-blue-400 font-mono truncate flex-1">{h.value}</code>
                          <button 
                            onClick={() => copyToClipboard(h.name === 'Authorization' ? `Bearer ${supabaseKey}` : h.name === 'apikey' ? supabaseKey : h.value)} 
                            className="p-2.5 bg-slate-800/50 hover:bg-blue-600 rounded-xl transition-all text-slate-400 hover:text-white border border-slate-700 group-hover:border-blue-500/30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="p-8 bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm">
                   <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                     Base URL
                   </h4>
                   <div className="flex items-center gap-4 bg-[#05080f] p-4 rounded-2xl border border-slate-800 shadow-inner">
                      <code className="text-xs text-slate-300 font-mono truncate flex-1">{supabaseUrl}</code>
                      <button onClick={() => copyToClipboard(supabaseUrl)} className="p-2 text-slate-500 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                   </div>
                </section>
              </div>

              {/* Coluna Direita: Endpoints e Exemplos JSON Interativos */}
              <div className="lg:col-span-7 space-y-8">
                <div className="bg-[#05080f] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl ring-1 ring-white/5">
                  {/* Seletor de Método (GET/POST) com visual de tabs de código */}
                  <div className="flex border-b border-slate-800 p-2 bg-slate-900/30">
                     <button 
                       onClick={() => setDocMethod('POST')}
                       className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl ${docMethod === 'POST' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       POST <span className="ml-1 text-[9px] opacity-60">Create/Update</span>
                     </button>
                     <button 
                       onClick={() => setDocMethod('GET')}
                       className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl ${docMethod === 'GET' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       GET <span className="ml-1 text-[9px] opacity-60">Read List</span>
                     </button>
                  </div>

                  <div className="p-8 space-y-10">
                    {/* Linha do Endpoint com Badge de Método */}
                    <div className="animate-fadeIn">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Target Resource URL</label>
                       <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 ring-1 ring-inset ring-white/5 shadow-inner">
                          <span className={`px-4 py-1.5 rounded-lg text-[11px] font-black tracking-widest uppercase ${docMethod === 'POST' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            {docMethod}
                          </span>
                          <code className="text-xs font-mono text-blue-300 truncate flex-1 tracking-tight">
                            {docEntity === 'SALE' ? clientsEndpoint : customersEndpoint}
                          </code>
                          <button onClick={() => copyToClipboard(docEntity === 'SALE' ? clientsEndpoint : customersEndpoint)} className="p-2 text-slate-400 hover:text-white transition-all active:scale-90">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          </button>
                       </div>
                    </div>

                    {/* Exemplo de Payload / Response JSON */}
                    <div className="animate-fadeIn">
                       <div className="flex justify-between items-center mb-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            {docMethod === 'POST' ? 'Request Payload (JSON Body)' : 'Response Schema (Array)'}
                          </label>
                          <button 
                            onClick={() => copyToClipboard(docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET))} 
                            className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Copy JSON
                          </button>
                       </div>
                       <div className="relative group overflow-hidden rounded-[2rem]">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[80px] pointer-events-none opacity-60"></div>
                          <pre className="bg-[#0b101b] p-8 rounded-[2rem] border border-slate-800 text-blue-200 font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 shadow-inner ring-1 ring-white/5">
                            {docEntity === 'SALE' 
                               ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) 
                               : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET)}
                          </pre>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer Info / Pro Tips */}
                <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-500/10 flex items-start gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div className="space-y-1">
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Developer Note</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Ao integrar com <strong>n8n</strong> ou <strong>Make</strong>, utilize o nó "HTTP Request". Certifique-se de preencher todos os Headers acima para evitar erros 401/403. Para filtragem avançada, consulte os operadores <code className="text-blue-500 font-bold">PostgREST</code>.
                      </p>
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
