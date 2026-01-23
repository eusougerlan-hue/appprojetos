
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
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const cleanUrl = supabaseUrl.trim();
      const cleanKey = supabaseKey.trim();
      
      localStorage.setItem('SUPABASE_URL', cleanUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', cleanKey);
      
      resetSupabaseClient();

      if (cleanUrl && cleanKey) {
        await saveCloudConfigToDB(cleanUrl, cleanKey);
      }

      await saveIntegrations(settings);

      alert('Configurações salvas com sucesso no banco de dados!');
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
  "observacao": "Detalhes sobre o contrato ou necessidades específicas do cliente"
}`;
    }
  };

  const getGetResponseExample = () => {
    if (activeResource === 'customers') {
      return `[
  {
    "id": "uuid-cliente",
    "razao_social": "EMPRESA EXEMPLO",
    "cnpj": "000..."
  }
]`;
    } else {
      return `[
  {
    "id": "uuid-venda",
    "protocolo": "2024.001",
    "status": "pending",
    "duracao_horas": 20,
    "observacao": "..."
  }
]`;
    }
  };

  const getQueryParam = () => {
    return activeResource === 'customers' ? '?cnpj=eq.{{VALOR}}' : '?protocolo=eq.{{VALOR}}';
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Alerta de Configuração Obrigatória para Notificações - Atualizado para o novo painel */}
      <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-[2rem] flex items-start gap-5 shadow-sm">
        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0 animate-pulse">
           <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 className="text-sm font-black text-orange-800 uppercase tracking-tight">Ativar Notificações em Tempo Real</h4>
          <p className="text-xs text-orange-700 mt-1 leading-relaxed font-medium">
            Seu screenshot mostrou a aba de "Replication" para BigQuery. Para notificações no App, o caminho é outro:
          </p>
          <ol className="text-[11px] text-orange-800 mt-3 space-y-2 font-bold list-decimal list-inside">
            <li>No Supabase, clique no ícone <span className="underline decoration-orange-300 underline-offset-2">Table Editor</span> (Tabelas).</li>
            <li>Selecione a tabela <strong>"clients"</strong> na lista à esquerda.</li>
            <li>No topo, clique em <strong>"Edit Table"</strong> (ou na engrenagem de configurações).</li>
            <li>Ative a opção <strong>"Enable Realtime"</strong>.</li>
            <li>Clique em <strong>Save</strong> para aplicar.</li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Banco de Dados (Cloud Config)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-4 border-t border-gray-100 pt-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Integrações Externas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Seção de Documentação da API para n8n */}
      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </div>
              Documentação da API REST
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Integre seu n8n com Clientes e Compras de Treinamento.</p>
          </div>

          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
             <button 
                onClick={() => setActiveResource('customers')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeResource === 'customers' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
             >
                Clientes
             </button>
             <button 
                onClick={() => setActiveResource('clients')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeResource === 'clients' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
             >
                Compras
             </button>
          </div>
        </div>

        <div className="p-8">
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-8 w-fit">
            <button 
              onClick={() => setActiveTab('POST')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'POST' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              POST (Criar)
            </button>
            <button 
              onClick={() => setActiveTab('GET')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GET' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              GET (Consultar)
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Endpoint URL</label>
              <div className="flex gap-2">
                <code className="flex-1 p-4 bg-slate-950 rounded-xl text-blue-400 font-mono text-xs border border-slate-700 break-all leading-relaxed">
                  {activeTab === 'POST' ? apiEndpoint : `${apiEndpoint}${getQueryParam()}`}
                </code>
                <button onClick={() => copyToClipboard(activeTab === 'POST' ? apiEndpoint : `${apiEndpoint}${getQueryParam()}`)} className="p-4 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all hover:bg-slate-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                   Configuração do Nó n8n
                </h4>
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Header apikey</span>
                    <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[150px]">{supabaseKey.substring(0, 15)}...</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Authorization</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Bearer [Sua_Key]</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Metodo</span>
                    <span className="text-[10px] text-blue-400 font-black">{activeTab}</span>
                  </div>
                  {activeTab === 'POST' && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Prefer</span>
                      <span className="text-[10px] text-emerald-400 font-mono">return=representation</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                   {activeTab === 'POST' ? 'Estrutura do JSON' : 'Resposta Esperada'}
                </h4>
                <div className="relative">
                   <pre className="bg-slate-950 p-6 rounded-2xl text-[10px] font-mono text-slate-300 border border-slate-800 overflow-x-auto leading-relaxed max-h-[300px]">
{activeTab === 'POST' ? getExamplePayload() : getGetResponseExample()}
                   </pre>
                   <button 
                      onClick={() => copyToClipboard(activeTab === 'POST' ? getExamplePayload() : getGetResponseExample())}
                      className="absolute top-4 right-4 text-slate-600 hover:text-blue-400 transition-colors"
                   >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-950/30 border-t border-slate-800">
           <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-200 font-bold uppercase tracking-widest">Dica de Integração</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Ao criar uma <strong>Compra</strong> via n8n, certifique-se de obter o <code className="text-blue-400">customer_id</code> primeiro. 
                  Você pode fazer isso com um nó de GET Clientes filtrando pelo CNPJ. O n8n então passa o ID retornado para o campo <code className="text-emerald-400">customer_id</code> da compra.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
