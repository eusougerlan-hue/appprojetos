
import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings } from '../types';
import { getStoredIntegrations, saveIntegrations, saveCloudConfigToDB } from '../storage';
import { isSupabaseConfigured, resetSupabaseClient } from '../supabase';

const Integrations: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    apiKey: '',
    webhookUrl: ''
  });
  
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Estados para a documentação da API
  const [activeTab, setActiveTab] = useState<'POST' | 'GET'>('POST');
  const [activeResource, setActiveResource] = useState<'customers' | 'clients'>('customers');

  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const data = await getStoredIntegrations();
      setSettings(data);
    } catch (err) {
      console.error('Erro ao buscar integrações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [fetchSettings]);

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações de sistema.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      new Notification("Sucesso!", { body: "As notificações do TrainMaster Pro estão ativas." });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
      alert('Configurações salvas com sucesso!');
      window.location.reload();
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.webhookUrl) {
      alert('Informe uma URL de Webhook para testar.');
      return;
    }
    setTesting(true);
    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify({ event: 'test', status: 'ok' })
      });
      alert('Teste disparado! Verifique seu sistema de automação.');
    } catch (error) {
      alert('Erro ao testar webhook.');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const apiEndpoint = `${supabaseUrl}/rest/v1/${activeResource}`;

  const getExamplePayload = () => {
    if (activeResource === 'customers') {
      return `{
  "razao_social": "NOME DA EMPRESA LTDA",
  "cnpj": "00.000.000/0001-00",
  "contacts": [
    {
      "name": "João Silva",
      "phone": "(11) 99999-9999",
      "email": "joao@email.com"
    }
  ]
}`;
    } else {
      return `{
  "customer_id": "UUID_DO_CLIENTE",
  "razao_social": "NOME DO CLIENTE",
  "protocolo": "2024.001",
  "tipo_treinamento": "Implantação Standard",
  "duracao_horas": 20,
  "data_inicio": "2024-05-20",
  "valor_implantacao": 2500.00,
  "comissao_percent": 10,
  "responsavel_tecnico": "Nome do Técnico",
  "modulos": ["Financeiro", "Estoque"],
  "status": "pending",
  "observacao": "Notas sobre o treinamento"
}`;
    }
  };

  const getGetResponseExample = () => {
    if (activeResource === 'customers') {
      return `[ { "id": "uuid", "razao_social": "EMPRESA", "cnpj": "..." } ]`;
    } else {
      return `[ { "id": "uuid", "protocolo": "2024.001", "status": "pending" } ]`;
    }
  };

  const getQueryParam = () => {
    return activeResource === 'customers' ? '?cnpj=eq.{{CNPJ}}' : '?protocolo=eq.{{PROTOCOLO}}';
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* DIAGNÓSTICO DE NOTIFICAÇÕES */}
      <div className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">Status de Notificações</h3>
            <p className="text-xs text-gray-500 font-medium italic">Configuração essencial para avisos em tempo real.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 rounded-2xl border-2 transition-all ${notifPermission === 'granted' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Permissão Navegador</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${notifPermission === 'granted' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                {notifPermission === 'granted' ? 'Ativo' : 'Pendente'}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-700 mb-4 leading-relaxed">Autorize as notificações para que o técnico receba alertas fora da aba do app.</p>
            <button onClick={requestNotifPermission} className="w-full py-2 bg-white border border-gray-200 hover:border-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Testar Permissão</button>
          </div>

          <div className="p-5 bg-slate-900 rounded-2xl border-2 border-slate-800 text-white">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Realtime (Table Editor)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Lembre-se de ativar o <strong>"Enable Realtime"</strong> na tabela <code className="text-blue-400">clients</code> dentro do dashboard do Supabase.</p>
            <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
               <span className="text-[9px] text-emerald-400 font-mono">Tabela: clients</span>
               <span className="text-[9px] text-slate-500 uppercase font-black">Requisito</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES DE API */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8">
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
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Webhook URL (Automação)</label>
              <input type="url" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30" value={settings.webhookUrl} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} placeholder="https://n8n.seu-workflow.com/..." />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Chave de API do Sistema</label>
              <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50/30" value={settings.apiKey} onChange={e => setSettings({ ...settings, apiKey: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button type="button" onClick={handleTestConnection} disabled={testing || !settings.webhookUrl} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200">Testar Webhook</button>
            <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Salvar e Sincronizar</button>
          </div>
        </form>
      </div>

      {/* DOCUMENTAÇÃO DA API REST (RESTAURADA) */}
      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </div>
              Documentação da API REST
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Integre seu n8n com Clientes e Vendas de Treinamento.</p>
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

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Endpoint URL</label>
              <div className="flex gap-2">
                <code className="flex-1 p-4 bg-slate-950 rounded-xl text-blue-400 font-mono text-xs border border-slate-700 break-all leading-relaxed">
                  {activeTab === 'POST' ? apiEndpoint : `${apiEndpoint}${getQueryParam()}`}
                </code>
                <button onClick={() => copyToClipboard(activeTab === 'POST' ? apiEndpoint : `${apiEndpoint}${getQueryParam()}`)} className="p-4 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Configuração n8n</h4>
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-bold">apikey</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Enviada via Header</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold">Metodo</span>
                    <span className="text-[10px] text-blue-400 font-black">{activeTab}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Estrutura JSON</h4>
                <div className="relative">
                   <pre className="bg-slate-950 p-6 rounded-2xl text-[10px] font-mono text-slate-300 border border-slate-800 overflow-x-auto leading-relaxed max-h-[300px]">
{activeTab === 'POST' ? getExamplePayload() : getGetResponseExample()}
                   </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
