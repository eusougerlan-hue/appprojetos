
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
      return (e[0] - s[0]) + (e[1] - s[1]) / 60;
    };
    return calc(formData.startTime1, formData.endTime1) + calc(formData.startTime2, formData.endTime2);
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
    if (!formData.startTime1 || !formData.endTime1) return alert('Preencha os horários do 1º turno');

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
      } else {
        await saveLog(logData);
      }
      
      onComplete();
      setViewMode('list');
      resetForm();
    } catch (err) {
      alert('Erro ao salvar registro.');
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

        <div className="max-h-[500px] overflow-y-auto">
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
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Novo Atendimento</h2>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Gestão de Horas do Técnico</p>
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
              <div className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-50 font-black bg-slate-50 text-slate-400 text-[9px] truncate h-[46px] flex items-center">
                {selectedClient?.protocolo || 'Nenhum'}
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl space-y-4 border border-blue-100">
            <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Horários</h4>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" className="w-full px-3 py-3 rounded-xl border-2 border-white font-black text-slate-700 text-xs" value={formData.startTime1} onChange={(e) => setFormData({...formData, startTime1: e.target.value})} required />
              <input type="time" className="w-full px-3 py-3 rounded-xl border-2 border-white font-black text-slate-700 text-xs" value={formData.endTime1} onChange={(e) => setFormData({...formData, endTime1: e.target.value})} required />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Logística</label>
            <select className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 text-xs" value={formData.transportType} onChange={(e) => setFormData({...formData, transportType: e.target.value as TransportType})}>
              <option value={TransportType.ONLINE}>Online</option>
              <option value={TransportType.UBER}>Uber</option>
              <option value={TransportType.OWN_VEHICLE}>Carro Próprio</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Participantes</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[60px]">
              {availableContacts.map(contact => (
                <button 
                  key={contact.name} 
                  type="button" 
                  onClick={() => toggleContactSelection(contact)} 
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black border transition-all ${formData.receivedBy.some(c => c.name === contact.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200'}`}
                >
                  {contact.name}
                </button>
              ))}
              {availableContacts.length === 0 && <p className="text-[8px] text-slate-300 italic">Sem contatos cadastrados</p>}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
            <textarea className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 h-24 text-xs font-bold text-slate-700 outline-none resize-none" value={formData.observation} onChange={(e) => setFormData({...formData, observation: e.target.value})} placeholder="O que foi treinado hoje?"></textarea>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-[10px] active:scale-95 transition-all">
          {loading ? 'Salvando...' : 'Confirmar Atendimento'}
        </button>
      </form>
    </div>
  );
};

export default TrainingForm;
