
import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings, BrandingConfig } from '../types';
// Import saveBranding from storage to fix the compilation error.
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

  // === DADOS DE DOCUMENTAÇÃO ===
  
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
      GET: JSON.stringify([
        {
          id: "uuid-interna",
          protocolo: "202601004476",
          razao_social: "Cliente Ativo",
          solicitante: "João da Silva",
          status: "pending",
          duracao_horas: 15.5
        }
      ], null, 2)
    },
    CLIENT: {
      POST: JSON.stringify({
        razao_social: "Nova Empresa Exemplo LTDA",
        cnpj: "00.000.000/0001-91",
        ref_movidesk: "MD-9988",
        contacts: [
          {
            name: "João Silva",
            phone: "(11) 98888-7766",
            email: "joao@cliente.com",
            keyUser: true
          }
        ]
      }, null, 2),
      GET: JSON.stringify([
        {
          id: "uuid-cliente",
          razao_social: "Empresa Master",
          cnpj: "12.345.678/0001-99",
          ref_movidesk: "MD-123",
          contacts: [
            {
              name: "João Silva",
              keyUser: true
            }
          ]
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
            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6 border-b border-blue-50 pb-2">Integrações Customizadas (Webhook n8n)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">Webhook URL</label>
                     <input type="url" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} placeholder="https://seu-n8n-url.com" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">API Key Webhook</label>
                     <input type="password" className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-700 bg-gray-50/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={settings.apiKey} onChange={e => setSettings({...settings, apiKey: e.target.value})} placeholder="Secret Key" />
                  </div>
               </div>
            </div>
            <div className="flex justify-end pt-6">
              <button type="submit" disabled={loading} className="px-16 py-5 bg-blue-600 text-white font-black rounded-[1.25rem] text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all">Gravar Configurações</button>
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
        <div className="bg-[#0b101b] rounded-[3rem] p-8 md:p-14 text-white animate-slideUp border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-900/40">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-none mb-2 uppercase">API REST Reference</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Integre seu ERP ou Webhook n8n diretamente</p>
                </div>
              </div>
              <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                 <button onClick={() => setDocEntity('CLIENT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docEntity === 'CLIENT' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Base de Clientes</button>
                 <button onClick={() => setDocEntity('SALE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docEntity === 'SALE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Vendas (Contratos)</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar da documentação */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                   <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Autenticação (Headers)</h4>
                   <div className="space-y-4">
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">apikey</p>
                        <code className="text-[10px] text-emerald-400 break-all block bg-black/40 p-2 rounded-lg border border-slate-800">{supabaseKey ? 'Sincronizada' : 'NÃO CONFIGURADA'}</code>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Content-Type</p>
                        <code className="text-[10px] text-blue-400 block bg-black/40 p-2 rounded-lg border border-slate-800">application/json</code>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                   <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Campos Principais ({docEntity === 'SALE' ? 'Venda' : 'Cliente'})</h4>
                   <div className="space-y-3 text-[10px] font-medium text-slate-400">
                      {docEntity === 'SALE' ? (
                        <>
                          <p><strong className="text-white">customer_id:</strong> Link com UUID do cliente base.</p>
                          <p><strong className="text-white">protocolo:</strong> Número único de atendimento.</p>
                          <p><strong className="text-white">solicitante:</strong> Nome do Usuário Chave que solicitou.</p>
                          <p><strong className="text-white">tipo_treinamento:</strong> Nome idêntico ao cadastrado.</p>
                          <p><strong className="text-white">duracao_horas:</strong> Carga horária total (number).</p>
                        </>
                      ) : (
                        <>
                          <p><strong className="text-white">razao_social:</strong> Nome jurídico da empresa.</p>
                          <p><strong className="text-white">cnpj:</strong> Formato string com pontuação.</p>
                          <p><strong className="text-white">contacts:</strong> Lista de contatos com <code className="text-blue-400">keyUser: true</code> para Usuários Chave.</p>
                        </>
                      )}
                   </div>
                </div>
              </div>

              {/* Área de Código / Playground */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-[#05080f] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="flex border-b border-slate-800 p-2 bg-slate-900/30">
                     <button onClick={() => setDocMethod('POST')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${docMethod === 'POST' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500'}`}>POST (Criar)</button>
                     <button onClick={() => setDocMethod('GET')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${docMethod === 'GET' ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-500'}`}>GET (Listar)</button>
                  </div>
                  <div className="p-8 space-y-8">
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Endpoint URL</label>
                       <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                          <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${docMethod === 'POST' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{docMethod}</span>
                          <code className="text-[11px] font-mono text-blue-300 truncate flex-1">{docEntity === 'SALE' ? clientsEndpoint : customersEndpoint}</code>
                          <button onClick={() => copyToClipboard(docEntity === 'SALE' ? clientsEndpoint : customersEndpoint)} className="text-slate-600 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          </button>
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between items-center mb-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">JSON {docMethod === 'POST' ? 'Request Body' : 'Response Body'}</label>
                          <button onClick={() => copyToClipboard(docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET))} className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">Copy Payload</button>
                       </div>
                       <pre className="bg-[#0b101b] p-6 rounded-2xl border border-slate-800 text-blue-200 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto custom-scrollbar">
                        {docEntity === 'SALE' ? (docMethod === 'POST' ? payloads.SALE.POST : payloads.SALE.GET) : (docMethod === 'POST' ? payloads.CLIENT.POST : payloads.CLIENT.GET)}
                       </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-800 flex items-center gap-4 text-slate-500">
               <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                 Nota: O campo <code className="text-white">solicitante</code> nas vendas deve conter o nome de um contato marcado como <code className="text-blue-400">keyUser: true</code> na base de clientes para correta exibição no sistema.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
