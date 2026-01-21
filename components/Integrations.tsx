
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
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

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
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Persiste as chaves de conexão no LocalStorage
      const cleanUrl = supabaseUrl.trim();
      const cleanKey = supabaseKey.trim();
      
      localStorage.setItem('SUPABASE_URL', cleanUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', cleanKey);
      
      // Reseta o cliente para garantir que o saveIntegrations use a conexão correta
      resetSupabaseClient();

      // 2. Tenta persistir no banco (ID 2 para backup das chaves de nuvem e ID 1 para integrações)
      if (cleanUrl && cleanKey) {
        await saveCloudConfigToDB(cleanUrl, cleanKey);
      }

      await saveIntegrations(settings);

      alert('Configurações salvas com sucesso no banco de dados!');
      
      // Recarrega para garantir que todo o app use o novo banco se as chaves mudaram
      window.location.reload();
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar. Verifique se o RLS permite escrita ou se o banco está acessível.';
      alert(`Falha na Operação: ${errorMsg}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'connection_test', 
          timestamp: new Date().toISOString(), 
          app: 'TrainMaster Pro (Cloud)',
          status: 'ok'
        })
      });
      alert('Teste de conexão disparado! Verifique o recebimento no seu sistema de automação (n8n/Webhook).');
    } catch (error) {
      alert('Erro ao tentar conectar com o webhook. Verifique a URL e sua conexão.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-fadeIn max-w-2xl mx-auto overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Configurações de Conexão</h2>
          <p className="text-sm text-gray-500 font-medium">Configure as chaves do banco de dados e integrações externas.</p>
        </div>
        {loading && (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        )}
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" 
                value={supabaseUrl} 
                onChange={e => setSupabaseUrl(e.target.value)} 
                placeholder="https://sua-id.supabase.co"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">API Key (Anon Key)</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" 
                value={supabaseKey} 
                onChange={e => setSupabaseKey(e.target.value)} 
                placeholder="eyJhbGciOiJIUzI1Ni..."
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" 
                value={settings.apiKey} 
                onChange={e => setSettings({ ...settings, apiKey: e.target.value })} 
                placeholder="Insira sua chave de API para automações"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Webhook URL (n8n / Automations)</label>
              <input 
                type="url" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700 bg-gray-50/30 transition-all focus:ring-4 focus:ring-blue-500/5" 
                value={settings.webhookUrl} 
                onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} 
                placeholder="https://seu-workflow.n8n.cloud/webhook/..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={handleTestConnection} 
            disabled={testing || loading || !settings.webhookUrl} 
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {testing ? 'Disparando...' : 'Testar Webhook'}
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : 'Salvar e Sincronizar'}
          </button>
        </div>
      </form>
      <div className="p-4 bg-blue-50 text-[10px] text-blue-800 font-medium leading-relaxed italic border-t border-blue-100">
        Nota: As configurações de integração (Chave de API e Webhook) são armazenadas de forma centralizada no banco de dados, enquanto as credenciais do Supabase são armazenadas localmente no navegador para segurança e acesso imediato.
      </div>
    </div>
  );
};

export default Integrations;
