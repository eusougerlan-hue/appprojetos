
import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings, BrandingConfig } from '../types';
import { getStoredIntegrations, saveIntegrations, getStoredBranding, getStoredCloudConfig, saveBranding } from '../storage';
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
          setSupabaseUrl(cloudData.url || '');
          setSupabaseKey(cloudData.key || '');
          localStorage.setItem('SUPABASE_URL', cloudData.url || '');
          localStorage.setItem('SUPABASE_ANON_KEY', cloudData.key || '');
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
      await saveIntegrations(settings);
      alert('Configurações do Webhook salvas com sucesso!');
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

  const payloads = {
    SALE: {
      POST: JSON.stringify({
        customer_id: "ID_DO_CLIENTE_BASE (UUID)", 
        razao_social: "Nome da Empresa LTDA",
        protocolo: "202601004476",
        modulos: ["CRM", "Estoque", "Financeiro"],
        tipo_treinamento: "Implantação Presencial",
        solicitante: "Nome do Usuário Chave",
        duracao_horas: 20,
        data_inicio: "2026-02-15",
        responsavel_tecnico: "Nome do Instrutor",
        valor_implantacao: 4500.00,
        comissao_percent: 10,
        status: "pending",
        observacao: "Venda importada via API"
      }, null, 2),
      GET: JSON.stringify([{ id: "uuid-interna", protocolo: "202601004476", status: "pending", duracao_horas: 15.5 }], null, 2)
    },
    CLIENT: {
      POST: JSON.stringify({
        razao_social: "Nova Empresa Exemplo LTDA",
        cnpj: "00.000.000/0001-91",
        contacts: [{ name: "João Silva", phone: "(11) 98888-7766", keyUser: true }]
      }, null, 2),
      GET: JSON.stringify([{ id: "uuid-cliente", razao_social: "Empresa Master", cnpj: "12.345.678/0001-99" }], null, 2)
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header aligned with screenshots */}
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Painel de Integrações</h2>
        <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed uppercase tracking-widest">
          Cloud, Marca e Conectividade API
        </p>
      </div>

      {/* Tabs Navigation (Optimized for 9:16) */}
      <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner mx-1">
        <button 
          onClick={() => setActivePanel('CONFIG')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Cloud
        </button>
        <button 
          onClick={() => setActivePanel('BRANDING')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Marca
        </button>
        <button 
          onClick={() => setActivePanel('API')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          API
        </button>
      </div>

      {/* Main Content Area */}
      <div className="px-1">
        {activePanel === 'CONFIG' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slideUp">
            <div className="p-6 pb-4 border-b border-slate-50">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Conexão n8n / Webhook</h4>
            </div>
            <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Webhook URL</label>
                   <input 
                    type="url" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/30 focus:border-blue-500 outline-none transition-all text-xs" 
                    value={settings.webhookUrl} 
                    onChange={e => setSettings({...settings, webhookUrl: e.target.value})} 
                    placeholder="https://seu-fluxo-n8n.com" 
                   />
                </div>
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Chave Secreta (API Key)</label>
                   <input 
                    type="password" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/30 focus:border-blue-500 outline-none transition-all text-xs" 
                    value={settings.apiKey} 
                    onChange={e => setSettings({...settings, apiKey: e.target.value})} 
                    placeholder="Sua chave de segurança" 
                   />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4"
              >
                {loading ? 'Salvando...' : 'Gravar Conexão'}
              </button>
            </form>
          </div>
        )}

        {activePanel === 'BRANDING' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slideUp">
            <div className="p-6 pb-4 border-b border-slate-50">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Personalização Visual</h4>
            </div>
            <form onSubmit={handleSaveBranding} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nome do App</label>
                  <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/30 text-xs" value={branding.appName} onChange={e => setBranding({...branding, appName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Subtítulo</label>
                  <input type="text" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/30 text-xs" value={branding.appSubtitle} onChange={e => setBranding({...branding, appSubtitle: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Logo URL (Icon)</label>
                  <input type="url" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 font-bold text-slate-700 bg-slate-50/30 text-xs" value={branding.logoUrl} onChange={e => setBranding({...branding, logoUrl: e.target.value})} placeholder="https://imagem.com/logo.png" />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4"
              >
                {loading ? 'Sincronizando...' : 'Atualizar Identidade'}
              </button>
            </form>
          </div>
        )}

        {activePanel === 'API' && (
          <div className="space-y-4 animate-slideUp">
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white border border-slate-800 shadow-2xl overflow-hidden">
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">API REST Reference</h3>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Documentação Técnica</p>
                 </div>
               </div>

               <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
                 <button onClick={() => setDocEntity('CLIENT')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${docEntity === 'CLIENT' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Clientes</button>
                 <button onClick={() => setDocEntity('SALE')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${docEntity === 'SALE' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Vendas</button>
               </div>

               <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${docMethod === 'POST' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{docMethod}</span>
                       <div className="flex gap-2">
                          <button onClick={() => setDocMethod('POST')} className={`text-[7px] font-black uppercase ${docMethod === 'POST' ? 'text-blue-400 underline' : 'text-slate-500'}`}>POST</button>
                          <button onClick={() => setDocMethod('GET')} className={`text-[7px] font-black uppercase ${docMethod === 'GET' ? 'text-emerald-400 underline' : 'text-slate-500'}`}>GET</button>
                       </div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                       <code className="text-[9px] text-blue-300 font-mono truncate mr-2">{docEntity === 'SALE' ? clientsEndpoint : customersEndpoint}</code>
                       <button onClick={() => copyToClipboard(docEntity === 'SALE' ? clientsEndpoint : customersEndpoint)} className="text-slate-500 hover:text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
                    </div>
                  </div>

                  <div className="bg-black/60 rounded-xl p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Exemplo JSON</span>
                      <button onClick={() => copyToClipboard(docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET))} className="text-[7px] text-blue-500 font-black uppercase">Copiar</button>
                    </div>
                    <pre className="text-[9px] font-mono text-blue-200 overflow-x-auto custom-scrollbar leading-relaxed">
                      {docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET)}
                    </pre>
                  </div>
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
               <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">
                 Utilize os endpoints acima para automatizar a criação de novos projetos e clientes diretamente do seu ERP ou CRM via n8n.
               </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center px-4">
        <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">TrainMaster Connect v2.5</p>
      </div>
    </div>
  );
};

export default Integrations;
