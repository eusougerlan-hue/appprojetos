
import React, { useState, useEffect } from 'react';
import { IntegrationSettings } from '../types';
import { getStoredIntegrations, saveIntegrations, saveCloudConfigToDB } from '../storage';

const Integrations: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    apiKey: '',
    webhookUrl: ''
  });
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getStoredIntegrations();
      setSettings(data);
    } catch (err) {
      console.error('Certifique-se de configurar as chaves do Supabase primeiro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      fetchSettings();
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Salva chaves do banco no browser
      localStorage.setItem('SUPABASE_URL', supabaseUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);

      // 2. Salva integrações no banco (ID 1)
      await saveIntegrations(settings);

      // 3. Salva configuração Cloud no banco (ID 2)
      await saveCloudConfigToDB(supabaseUrl, supabaseKey);

      alert('Configurações salvas e sincronizadas com a nuvem!');
      window.location.replace(window.location.origin);
    } catch (err) {
      alert('Erro ao salvar: verifique a conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.webhookUrl) {
      alert('Informe uma URL de Webhook.');
      return;
    }
    setTesting(true);
    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'connection_test', timestamp: new Date().toISOString(), app: 'TrainMaster Pro (Cloud)' })
      });
      alert('Teste disparado! Verifique seu n8n/webhook.');
    } catch (error) {
      alert('Erro ao conectar com o webhook.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn max-w-2xl mx-auto overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-black text-gray-800 tracking-tight">Configurações de Conexão</h2>
        <p className="text-sm text-gray-500 font-medium">Configure as chaves do banco de dados e integrações externas.</p>
      </div>

      <form onSubmit={handleSave} className="p-8 space-y-8">
        {/* Seção Supabase */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Banco de Dados (Cloud Config)</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Project URL</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30" 
                value={supabaseUrl} 
                onChange={e => setSupabaseUrl(e.target.value)} 
                placeholder="https://xyz.supabase.co"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">API Key (Anon Key)</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30" 
                value={supabaseKey} 
                onChange={e => setSupabaseKey(e.target.value)} 
                placeholder="eyJhbGci..."
                required
              />
            </div>
          </div>
        </div>

        {/* Seção Integrações */}
        <div className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Integrações Externas</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Chave de API do Sistema</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30" 
                value={settings.apiKey} 
                onChange={e => setSettings({ ...settings, apiKey: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Webhook URL (n8n / Automations)</label>
              <input 
                type="url" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30" 
                value={settings.webhookUrl} 
                onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} 
                placeholder="https://sua-url-de-webhook.com"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={handleTestConnection} 
            disabled={testing || loading || !settings.webhookUrl} 
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
          >
            {testing ? 'Disparando...' : 'Testar Webhook'}
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            Salvar e Sincronizar
          </button>
        </div>
      </form>
    </div>
  );
};

export default Integrations;
