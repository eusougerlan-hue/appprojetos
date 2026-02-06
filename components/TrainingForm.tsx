
import React, { useState, useMemo, useEffect } from 'react';
import { Client, TransportType, TrainingLog, User, UserRole, Customer, Contact } from '../types';
import { saveLog, updateLog, deleteLog, getStoredIntegrations, getStoredCustomers, normalizeString } from '../storage';

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
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [viewMode, clients]);

  const pendingClients = useMemo(() => {
    let filtered = clients.filter(c => c.status === 'pending');
    if (user.role !== UserRole.MANAGER || !showAllProjects) {
      filtered = filtered.filter(c => 
        normalizeString(c.responsavelTecnico) === normalizeString(user.name)
      );
    }
    return filtered;
  }, [clients, user.name, user.role, showAllProjects]);

  const [formData, setFormData] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    shifts: [{ start: '', end: '' }] as { start: string, end: string }[],
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
    let found = allCustomers.find(cust => cust.id === selectedClient.customerId);
    if (!found) {
      found = allCustomers.find(cust => 
        normalizeString(cust.razãoSocial) === normalizeString(selectedClient.razãoSocial)
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
      const diff = (e[0] - s[0]) + (e[1] - s[1]) / 60;
      return diff > 0 ? diff : 0;
    };
    return formData.shifts.reduce((acc, shift) => acc + calc(shift.start, shift.end), 0);
  };

  // FUNÇÃO PARA DISPARO DO WEBHOOK (ESTRUTURA RESTAURADA PARA N8N COM NOVOS CAMPOS E PARTICIPANTES DETALHADOS)
  const triggerLogWebhook = async (logData: TrainingLog, client: Client) => {
    const settings = await getStoredIntegrations();
    if (!settings.webhookUrl) return;

    try {
      // Objeto LOG com todos os campos solicitados para o ticket
      const logPayload: any = {
        numeroProtocolo: logData.numeroProtocolo,
        date: logData.date,
        startTime1: logData.startTime1,
        endTime1: logData.endTime1,
        startTime2: logData.startTime2 || '',
        endTime2: logData.endTime2 || '',
        observation: logData.observation,
        transportType: logData.transportType,
        employeeName: logData.employeeName, // NOVO: Nome do instrutor
        horasCalculadas: logData.horasCalculadas, // NOVO: Horas totais da sessão
        participantes: logData.receivedBy?.map(p => ({
          nome: p.name,
          telefone: p.phone,
          email: p.email
        })) || [] // NOVO: Dados detalhados dos participantes
      };

      // REGRA DE LOGÍSTICA: Adiciona detalhes de transporte APENAS se não for ONLINE
      if (logData.transportType === TransportType.UBER) {
        logPayload.uberIda = logData.uberIda;
        logPayload.uberVolta = logData.uberVolta;
        logPayload.uberTotal = logData.uberTotal;
      } else if (logData.transportType === TransportType.OWN_VEHICLE) {
        logPayload.ownVehicleKm = logData.ownVehicleKm;
        logPayload.ownVehicleKmValue = logData.ownVehicleKmValue;
        logPayload.ownVehicleTotal = logData.ownVehicleTotal;
      }

      // Objeto CLIENT com os campos solicitados
      const clientPayload = {
        tipoTreinamento: client.tipoTreinamento,
        modulos: client.modulos,
        duracaoContratada: client.duracaoHoras,
        status: client.status
      };

      const finalPayload = {
        event: 'training_log_created',
        apiKey: settings.apiKey,
        log: logPayload,
        client: clientPayload,
        tecnico: logData.employeeName,
        timestamp: new Date().toISOString()
      };

      console.log('--- ENVIANDO AO N8N (LOG COMPLETO COM PARTICIPANTES) ---', finalPayload);
      
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      if (response.ok) {
        console.log('Webhook n8n disparado com sucesso.');
      }
    } catch (error) {
      console.error('Erro ao enviar dados ao n8n:', error);
    }
  };

  const handleEdit = (log: TrainingLog) => {
    setEditingLogId(log.id);
    const initialShifts = [{ start: log.startTime1, end: log.endTime1 }];
    if (log.startTime2 && log.endTime2) {
      initialShifts.push({ start: log.startTime2, end: log.endTime2 });
    }
    setFormData({
      clientId: log.clientId,
      date: log.date,
      shifts: initialShifts,
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

  const resetForm = () => {
    setEditingLogId(null);
    setFormData({
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      shifts: [{ start: '', end: '' }],
      receivedBy: [],
      observation: '',
      transportType: TransportType.ONLINE,
      uberIda: 0,
      uberVolta: 0,
      ownVehicleKm: 0,
      ownVehicleKmValue: 0
    });
  };

  const addShift = () => {
    if (formData.shifts.length >= 2) {
      alert("O sistema atual suporta até 2 turnos por registro de atendimento.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      shifts: [...prev.shifts, { start: '', end: '' }]
    }));
  };

  const updateShift = (index: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => {
      const newShifts = [...prev.shifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return { ...prev, shifts: newShifts };
    });
  };

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
    if (!formData.clientId || !selectedClient) return alert('Selecione um cliente');
    if (!formData.shifts[0]?.start || !formData.shifts[0]?.end) return alert('Preencha pelo menos o primeiro horário');

    setLoading(true);
    try {
      const logData: TrainingLog = {
        id: editingLogId || Math.random().toString(36).substr(2, 9),
        clientId: formData.clientId,
        numeroProtocolo: selectedClient?.protocolo || '',
        employeeId: user.id,
        employeeName: user.name,
        date: formData.date,
        startTime1: formData.shifts[0]?.start || '',
        endTime1: formData.shifts[0]?.end || '',
        startTime2: formData.shifts[1]?.start || '',
        endTime2: formData.shifts[1]?.end || '',
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
      } else {
        await saveLog(logData);
      }
      
      // DISPARA O WEBHOOK COM A ESTRUTURA COMPLETA
      await triggerLogWebhook(logData, selectedClient);
      
      onComplete();
      setViewMode('list');
      resetForm();
    } catch (err) {
      alert('Erro ao salvar registro no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 animate-fadeIn overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atendimentos</h2>
            <button 
              onClick={() => { resetForm(); setViewMode('form'); }}
              className="bg-blue-600 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <input
            type="text"
            className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-[10px] font-bold outline-none"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <p className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase">Sem registros</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.filter(l => clients.find(c => c.id === l.clientId)?.razãoSocial.toLowerCase().includes(searchTerm.toLowerCase())).map(log => {
                const client = clients.find(c => c.id === log.clientId);
                return (
                  <div key={log.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase">{client?.razãoSocial}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-800">{log.horasCalculadas.toFixed(1)}h</span>
                       <button onClick={() => handleEdit(log)} className="text-blue-500 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl animate-slideUp overflow-hidden">
      <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">NOVO ATENDIMENTO</h2>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Gestão de Horas do Técnico</p>
        </div>
        <button onClick={() => setViewMode('list')} className="text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cliente Atendido</label>
            <select
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-700 bg-white text-xs appearance-none"
              value={formData.clientId}
              onChange={(e) => setFormData({...formData, clientId: e.target.value, receivedBy: []})}
              required
              disabled={!!editingLogId || loading}
            >
              <option value="">Selecione...</option>
              {pendingClients.map(c => <option key={c.id} value={c.id}>{c.razãoSocial}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data</label>
              <input type="date" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-800 text-xs" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Protocolo</label>
              <div className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-50 font-black bg-slate-50/50 text-slate-400 text-[9px] truncate h-[46px] flex items-center">
                {selectedClient?.protocolo || 'Nenhum'}
              </div>
            </div>
          </div>

          <div className="bg-blue-50/30 p-4 rounded-[1.5rem] space-y-4 border border-blue-50">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Horários</h4>
              <button 
                type="button"
                onClick={addShift}
                className="w-7 h-7 bg-white border-2 border-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm active:scale-90 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.shifts.map((shift, index) => (
                <div key={index} className="grid grid-cols-2 gap-3 animate-fadeIn">
                  <input 
                    type="time" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-white font-black text-slate-700 text-xs shadow-sm" 
                    value={shift.start} 
                    onChange={(e) => updateShift(index, 'start', e.target.value)} 
                    required 
                  />
                  <input 
                    type="time" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-white font-black text-slate-700 text-xs shadow-sm" 
                    value={shift.end} 
                    onChange={(e) => updateShift(index, 'end', e.target.value)} 
                    required 
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Logística</label>
            <select className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 text-xs bg-slate-50/50 appearance-none" value={formData.transportType} onChange={(e) => setFormData({...formData, transportType: e.target.value as TransportType})}>
              <option value={TransportType.ONLINE}>Online</option>
              <option value={TransportType.UBER}>Uber</option>
              <option value={TransportType.OWN_VEHICLE}>Carro Próprio</option>
            </select>
          </div>

          {formData.transportType === TransportType.UBER && (
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
               <div>
                  <label className="block text-[8px] font-black text-blue-500 uppercase mb-1 ml-1">Uber Ida (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-700 text-xs" 
                    value={formData.uberIda} 
                    onChange={e => setFormData({...formData, uberIda: Number(e.target.value)})} 
                  />
               </div>
               <div>
                  <label className="block text-[8px] font-black text-blue-500 uppercase mb-1 ml-1">Uber Volta (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-700 text-xs" 
                    value={formData.uberVolta} 
                    onChange={e => setFormData({...formData, uberVolta: Number(e.target.value)})} 
                  />
               </div>
            </div>
          )}

          {formData.transportType === TransportType.OWN_VEHICLE && (
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
               <div>
                  <label className="block text-[8px] font-black text-blue-500 uppercase mb-1 ml-1">KM Rodados</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-700 text-xs" 
                    value={formData.ownVehicleKm} 
                    onChange={e => setFormData({...formData, ownVehicleKm: Number(e.target.value)})} 
                  />
               </div>
               <div>
                  <label className="block text-[8px] font-black text-blue-500 uppercase mb-1 ml-1">R$ por KM</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-700 text-xs" 
                    value={formData.ownVehicleKmValue} 
                    onChange={e => setFormData({...formData, ownVehicleKmValue: Number(e.target.value)})} 
                  />
               </div>
            </div>
          )}

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Participantes</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[60px]">
              {availableContacts.map(contact => (
                <button 
                  key={contact.name} 
                  type="button" 
                  onClick={() => toggleContactSelection(contact)} 
                  className={`px-3 py-1.5 rounded-xl text-[8px] font-black border transition-all ${formData.receivedBy.some(c => c.name === contact.name) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                >
                  {contact.name}
                </button>
              ))}
              {availableContacts.length === 0 && <p className="text-[8px] text-slate-300 italic">Sem contatos cadastrados</p>}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
            <textarea className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 h-24 text-xs font-bold text-slate-700 outline-none resize-none bg-slate-50/30" value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} placeholder="O que foi treinado hoje?"></textarea>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all mt-4">
          {loading ? 'Salvando...' : 'Confirmar Atendimento'}
        </button>
      </form>
    </div>
  );
};

export default TrainingForm;
