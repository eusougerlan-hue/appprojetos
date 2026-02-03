
import React, { useState, useMemo, useEffect } from 'react';
import { Client, TransportType, TrainingLog, User, UserRole, Customer, Contact } from '../types';
import { saveLog, updateLog, deleteLog, getStoredIntegrations, getStoredCustomers } from '../storage';

interface TrainingFormProps {
  clients: Client[];
  logs: TrainingLog[]; 
  user: User;
  onComplete: () => void;
}

const TrainingForm: React.FC<TrainingFormProps> = ({ clients, logs, user, onComplete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllForManager, setShowAllForManager] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const customers = await getStoredCustomers();
      setAllCustomers(customers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [viewMode, clients]); // Atualiza se a lista de clientes mudar

  const pendingClients = useMemo(() => {
    let filtered = clients.filter(c => c.status === 'pending');
    if (!showAllForManager && user.role !== UserRole.MANAGER) {
      filtered = filtered.filter(c => c.responsavelTecnico === user.name);
    }
    return filtered;
  }, [clients, user.name, user.role, showAllForManager]);

  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    startTime1: '',
    endTime1: '',
    startTime2: '',
    endTime2: '',
    receivedBy: [] as Contact[],
    observation: '',
    transportType: TransportType.ONLINE,
    uberIda: 0,
    uberVolta: 0,
    ownVehicleKm: 0,
    ownVehicleKmValue: 0
  });

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === formData.clientId),
  [formData.clientId, clients]);

  const currentCustomer = useMemo(() => {
    if (!selectedClient) return null;
    
    // Tenta primeiro encontrar pelo ID (Link oficial)
    let found = allCustomers.find(cust => cust.id === selectedClient.customerId);
    
    // Fallback: Se não encontrar pelo ID (comum em importações via API), tenta pela Razão Social
    if (!found) {
      found = allCustomers.find(cust => 
        cust.razãoSocial.trim().toLowerCase() === selectedClient.razãoSocial.trim().toLowerCase()
      );
    }
    
    return found;
  }, [selectedClient, allCustomers]);

  const availableContacts = useMemo(() => {
    return currentCustomer?.contacts || [];
  }, [currentCustomer]);

  const uberTotal = useMemo(() => formData.transportType === TransportType.UBER ? (Number(formData.uberIda) + Number(formData.uberVolta)) : 0, [formData.uberIda, formData.uberVolta, formData.transportType]);
  const vehicleTotal = useMemo(() => formData.transportType === TransportType.OWN_VEHICLE ? (Number(formData.ownVehicleKm) * Number(formData.ownVehicleKmValue)) : 0, [formData.ownVehicleKm, formData.ownVehicleKmValue, formData.transportType]);

  const calculateHours = () => {
    const calc = (start: string, end: string) => {
      if (!start || !end) return 0;
      const s = start.split(':').map(Number);
      const e = end.split(':').map(Number);
      return (e[0] - s[0]) + (e[1] - s[1]) / 60;
    };
    return calc(formData.startTime1, formData.endTime1) + calc(formData.startTime2, formData.endTime2);
  };

  const triggerLogWebhook = async (log: TrainingLog, isUpdate: boolean) => {
    const settings = await getStoredIntegrations();
    if (!settings.webhookUrl) return;
    
    // CRITICAL: Force correct event names for training logs
    const eventName = isUpdate ? 'training_log_updated' : 'training_log_created';
    
    const client = clients.find(c => c.id === log.clientId);
    try {
      const payload = {
        event: eventName,
        apiKey: settings.apiKey,
        usuario_movidesk: user.usuarioMovidesk || '', 
        client: client ? {
          id: client.id,
          razãoSocial: client.razãoSocial,
          protocolo: client.protocolo,
          tipoTreinamento: client.tipoTreinamento,
          modulos: client.modulos,
          duracaoContratada: client.duracaoHoras,
          status: client.status
        } : null,
        log: log, 
        timestamp: new Date().toISOString()
      };
      
      await fetch(settings.webhookUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
    } catch (error) { 
      console.error('Falha ao disparar webhook:', error); 
    }
  };

  const handleEdit = (log: TrainingLog) => {
    setEditingLogId(log.id);
    setFormData({
      clientId: log.clientId,
      date: log.date,
      startTime1: log.startTime1,
      endTime1: log.endTime1,
      startTime2: log.startTime2 || '',
      endTime2: log.endTime2 || '',
      receivedBy: log.receivedBy || [],
      observation: log.observation,
      transportType: log.transportType || TransportType.ONLINE,
      uberIda: log.uberIda || 0,
      uberVolta: log.uberVolta || 0,
      ownVehicleKm: log.ownVehicleKm || 0,
      ownVehicleKmValue: log.ownVehicleKmValue || 0
    });
    setViewMode('form');
  };

  const handleDeleteLog = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLog(id);
      setConfirmDeleteId(null);
      onComplete();
    } catch (err) {
      alert('Erro ao excluir o registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingLogId(null);
    setFormData({
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      startTime1: '',
      endTime1: '',
      startTime2: '',
      endTime2: '',
      receivedBy: [],
      observation: '',
      transportType: TransportType.ONLINE,
      uberIda: 0,
      uberVolta: 0,
      ownVehicleKm: 0,
      ownVehicleKmValue: 0
    });
  };

  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (searchTerm.trim()) {
      result = result.filter(log => {
        const client = clients.find(c => c.id === log.clientId);
        return client?.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    return result;
  }, [logs, clients, searchTerm]);

  const toggleContactSelection = (contact: Contact) => {
    setFormData(prev => ({
      ...prev,
      receivedBy: prev.receivedBy.some(c => c.name === contact.name)
        ? prev.receivedBy.filter(c => c.name !== contact.name)
        : [...prev.receivedBy, contact]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return alert('Selecione um cliente');
    if (!formData.startTime1 || !formData.endTime1) return alert('Preencha pelo menos o primeiro turno de horários');

    setLoading(true);
    try {
      const logData: TrainingLog = {
        id: editingLogId || Math.random().toString(36).substr(2, 9),
        clientId: formData.clientId,
        numeroProtocolo: selectedClient?.protocolo || '',
        employeeId: user.id,
        employeeName: user.name,
        date: formData.date,
        startTime1: formData.startTime1,
        endTime1: formData.endTime1,
        startTime2: formData.startTime2,
        endTime2: formData.endTime2,
        receivedBy: formData.receivedBy,
        observation: formData.observation,
        transportType: formData.transportType,
        uberIda: formData.uberIda,
        uberVolta: formData.uberVolta,
        uberTotal: uberTotal,
        ownVehicleKm: formData.ownVehicleKm,
        ownVehicleKmValue: formData.ownVehicleKmValue,
        ownVehicleTotal: vehicleTotal,
        createdAt: new Date().toISOString(),
        horasCalculadas: calculateHours()
      };

      if (editingLogId) {
        await updateLog(logData);
        await triggerLogWebhook(logData, true);
      } else {
        await saveLog(logData);
        await triggerLogWebhook(logData, false);
      }
      
      onComplete();
      setViewMode('list');
      resetForm();
    } catch (err) {
      alert('Erro ao salvar no banco.');
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 animate-fadeIn overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-white sticky top-0 z-10 gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Atendimentos</h2>
            <p className="text-sm text-slate-500 font-medium">Histórico de treinamentos realizados.</p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4 w-full md:w-auto">
            <input
              type="text"
              className="block w-full max-w-xs pl-4 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center gap-2 uppercase tracking-wider transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              Novo Atendimento
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
             <div className="flex justify-center items-center p-20">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Logística</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-bold">Nenhum treinamento registrado.</td>
                  </tr>
                ) : (
                  filteredLogs.slice(0, 50).map((log) => {
                    const client = clients.find(c => c.id === log.clientId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-700 text-sm leading-tight">{new Date(log.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-blue-600 font-black uppercase tracking-tighter mt-0.5">{client?.razãoSocial || 'Cliente Excluído'}</p>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-black text-slate-800">{log.horasCalculadas.toFixed(1)}h</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600">{log.transportType}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 items-center">
                            {deletingId === log.id ? (
                               <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            ) : confirmDeleteId === log.id ? (
                               <div className="flex items-center gap-1 animate-fadeIn">
                                  <button onClick={() => handleDeleteLog(log.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-red-700 shadow-sm transition-all">Apagar?</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-slate-200 transition-all">Sair</button>
                               </div>
                            ) : (
                               <>
                                <button onClick={() => handleEdit(log)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                <button onClick={() => setConfirmDeleteId(log.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                               </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 animate-slideUp overflow-hidden max-w-5xl mx-auto">
      {/* Header outside the blue box */}
      <div className="p-10 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Novo Atendimento</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">OS DADOS SERÃO SALVOS PERMANENTEMENTE NO SUPABASE.</p>
        </div>
        <span className="px-6 py-2 bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-black border border-blue-100 uppercase tracking-widest">{user.name}</span>
      </div>
      
      <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-10">
        {/* Main blue box wrapping fields */}
        <div className="border-2 border-blue-400 rounded-[2rem] p-10 space-y-10 relative">
          
          {/* CLIENTE ATENDIDO */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CLIENTE ATENDIDO</label>
            <select
              className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white transition-all appearance-none bg-no-repeat bg-[right_1.5rem_center]" 
              style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2.5\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundSize: '1.2rem'}}
              value={formData.clientId}
              onChange={(e) => setFormData({...formData, clientId: e.target.value, receivedBy: []})}
              required
              disabled={!!editingLogId || loading}
            >
              <option value="">Selecione um cliente...</option>
              {pendingClients.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* DATA DO ATENDIMENTO */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA DO ATENDIMENTO</label>
              <input type="date" className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-slate-200 focus:border-blue-500 outline-none font-black text-slate-800 bg-white transition-all" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required disabled={loading} />
            </div>

            {/* NÚMERO DO PROTOCOLO */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NÚMERO DO PROTOCOLO</label>
              <div className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-slate-100 font-black bg-slate-50 text-slate-400 min-h-[64px] flex items-center shadow-inner">
                {selectedClient ? selectedClient.protocolo : 'Selecione um cliente'}
              </div>
            </div>
          </div>

          {/* HORÁRIOS DE ATENDIMENTO */}
          <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">HORÁRIOS DE ATENDIMENTO</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-5">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 px-4 py-1.5 rounded-full border border-blue-100">1º TURNO (OBRIGATÓRIO)</span>
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-blue-300 shadow-sm font-black text-slate-700 outline-none transition-all" value={formData.startTime1} onChange={(e) => setFormData({...formData, startTime1: e.target.value})} required disabled={loading} />
                  <input type="time" className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-blue-300 shadow-sm font-black text-slate-700 outline-none transition-all" value={formData.endTime1} onChange={(e) => setFormData({...formData, endTime1: e.target.value})} required disabled={loading} />
                </div>
              </div>

              <div className="space-y-5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-100">2º TURNO (OPCIONAL)</span>
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-blue-200 shadow-sm font-black text-slate-700 outline-none transition-all" value={formData.startTime2} onChange={(e) => setFormData({...formData, startTime2: e.target.value})} disabled={loading} />
                  <input type="time" className="w-full px-6 py-4 rounded-2xl border-2 border-white focus:border-blue-200 shadow-sm font-black text-slate-700 outline-none transition-all" value={formData.endTime2} onChange={(e) => setFormData({...formData, endTime2: e.target.value})} disabled={loading} />
                </div>
              </div>
            </div>
          </div>

          {/* LOGÍSTICA DE DESLOCAMENTO */}
          <div className="p-8 bg-indigo-50/20 rounded-[2rem] border-2 border-indigo-100/50 space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">LOGÍSTICA DE DESLOCAMENTO</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Deslocamento</label>
                  <select className="w-full px-8 py-5 rounded-[1.5rem] border-2 border-indigo-100 focus:border-indigo-500 outline-none font-bold text-indigo-700 bg-white transition-all appearance-none bg-no-repeat bg-[right_1.5rem_center]" 
                    style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2.5\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundSize: '1.2rem'}}
                    value={formData.transportType} onChange={(e) => setFormData({...formData, transportType: e.target.value as TransportType})} disabled={loading}>
                      <option value={TransportType.ONLINE}>🌐 Atendimento Online (Sem custos)</option>
                      <option value={TransportType.UBER}>🚖 Uber / Táxi</option>
                      <option value={TransportType.OWN_VEHICLE}>🚗 Veículo Próprio</option>
                  </select>
                </div>

                {formData.transportType === TransportType.UBER && (
                  <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-3">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Ida (R$)</label>
                        <input type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 font-black text-indigo-800 bg-white shadow-inner" value={formData.uberIda} onChange={e => setFormData({...formData, uberIda: Number(e.target.value)})} disabled={loading} />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Volta (R$)</label>
                        <input type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 font-black text-indigo-800 bg-white shadow-inner" value={formData.uberVolta} onChange={e => setFormData({...formData, uberVolta: Number(e.target.value)})} disabled={loading} />
                    </div>
                  </div>
                )}

                {formData.transportType === TransportType.OWN_VEHICLE && (
                  <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-3">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">KM Rodado</label>
                        <input type="number" step="0.1" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 font-black text-indigo-800 bg-white shadow-inner" value={formData.ownVehicleKm} onChange={e => setFormData({...formData, ownVehicleKm: Number(e.target.value)})} disabled={loading} />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor p/ KM (R$)</label>
                        <input type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl border-2 border-indigo-100 font-black text-indigo-800 bg-white shadow-inner" value={formData.ownVehicleKmValue} onChange={e => setFormData({...formData, ownVehicleKmValue: Number(e.target.value)})} disabled={loading} />
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* PARTICIPANTES E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
            <div className="space-y-5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PARTICIPANTES</label>
                <div className="flex flex-wrap gap-2 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-200 min-h-[120px] shadow-inner">
                  {availableContacts.length === 0 ? <p className="text-[10px] text-slate-400 font-bold italic p-1">Nenhum contato cadastrado na base.</p> : 
                    availableContacts.map(contact => {
                      const isSelected = formData.receivedBy.some(c => c.name === contact.name);
                      return (
                        <button key={contact.name} type="button" onClick={() => toggleContactSelection(contact)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'}`}>
                          {contact.name}
                        </button>
                      );
                  })}
                </div>
            </div>

            <div className="space-y-5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">INFORMAÇÕES ADICIONAIS / OBSERVAÇÃO</label>
                <textarea className="w-full px-8 py-8 rounded-[2rem] border-2 border-slate-200 focus:border-blue-500 h-44 outline-none text-sm font-bold text-slate-700 bg-white resize-none shadow-inner transition-all" value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} placeholder="Descreva aqui os detalhes do que foi treinado..." disabled={loading}></textarea>
            </div>
          </div>
        </div>

        {/* Action buttons outside the blue box */}
        <div className="flex justify-end items-center gap-10 pt-4 px-4">
          <button type="button" onClick={() => { resetForm(); setViewMode('list'); }} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all" disabled={loading}>CANCELAR</button>
          <button type="submit" disabled={loading} className="px-24 py-6 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 flex items-center gap-4 uppercase tracking-[0.2em] text-[11px]">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (editingLogId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR ATENDIMENTO')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrainingForm;
