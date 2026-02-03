
import { User, Client, TrainingLog, UserRole, SystemModule, Customer, IntegrationSettings, TrainingTypeEntity, BrandingConfig, Contact } from './types';
import { supabase, getSupabase, resetSupabaseClient } from './supabase';

/**
 * Chaves para o LocalStorage (Branding Cache e Config Cloud)
 */
const BRANDING_LOCAL_KEY = 'TM_BRANDING_DATA';
const SUPABASE_URL_KEY = 'SUPABASE_URL';
const SUPABASE_KEY_KEY = 'SUPABASE_ANON_KEY';

// Utilitário global para comparação de strings (Nomes de técnicos, etc)
export const normalizeString = (str: string | null | undefined): string => 
  (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// Funções auxiliares para tratar quebras de linha entre HTML (<br>) e Textarea (\n)
const brToNewline = (str: string) => {
  if (!str) return '';
  return str.replace(/<br\s*\/?>/gi, '\n');
};

const newlineToBr = (str: string) => {
  if (!str) return '';
  return str.replace(/\n/g, '<br>');
};

// Garante que contatos vindos da API (que podem vir como string JSON) sejam tratados como array
const parseContacts = (contacts: any): Contact[] => {
  if (!contacts) return [];
  if (typeof contacts === 'string') {
    try {
      const parsed = JSON.parse(contacts);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(contacts) ? contacts : [];
};

const mapUserFromDB = (db: any): User => ({
  id: db.id,
  name: db.name,
  phone: db.phone,
  email: db.email,
  cpf: db.cpf,
  password: db.password,
  role: db.role,
  active: db.active,
  usuarioMovidesk: db.usuario_movidesk || ''
});

const mapUserToDB = (user: User) => ({
  name: user.name,
  phone: user.phone,
  email: user.email,
  cpf: user.cpf,
  password: user.password,
  role: user.role,
  active: user.active !== false,
  usuario_movidesk: user.usuarioMovidesk || ''
});

const mapCustomerFromDB = (db: any): Customer => ({
  id: db.id,
  razãoSocial: db.razao_social,
  cnpj: db.cnpj,
  refMovidesk: db.ref_movidesk || '',
  contacts: parseContacts(db.contacts)
});

const mapCustomerToDB = (customer: Customer) => ({
  razao_social: customer.razãoSocial,
  cnpj: customer.cnpj,
  ref_movidesk: customer.refMovidesk || '',
  contacts: customer.contacts || [],
  usuario_chave: customer.contacts?.some(c => c.keyUser) || false
});

const mapClientFromDB = (db: any): Client => ({
  id: db.id,
  customerId: db.customer_id,
  razãoSocial: db.razao_social,
  protocolo: db.protocolo,
  modulos: db.modulos || [],
  tipoTreinamento: db.tipo_treinamento || '',
  solicitante: db.solicitante || '',
  duracaoHoras: Number(db.duracao_horas || 0),
  residualHoursAdded: Number(db.residual_hours_added || 0),
  dataInicio: db.data_inicio,
  dataFim: db.data_fim || undefined,
  valorImplantacao: Number(db.valor_implantacao || 0),
  comissaoPercent: Number(db.comissao_percent || 0),
  status: db.status,
  responsavelTecnico: db.responsavel_tecnico || '',
  commissionPaid: db.commission_paid || false,
  observacao: brToNewline(db.observacao || '')
});

const mapClientToDB = (client: Client) => {
  const data: any = {
    customer_id: client.customerId,
    razao_social: client.razãoSocial,
    protocolo: client.protocolo,
    modulos: client.modulos,
    tipo_treinamento: client.tipoTreinamento,
    solicitante: client.solicitante || '',
    duracao_horas: client.duracaoHoras,
    residual_hours_added: client.residualHoursAdded || 0,
    data_inicio: client.dataInicio,
    data_fim: client.dataFim || null,
    valor_implantacao: client.valorImplantacao,
    comissao_percent: client.comissaoPercent,
    status: client.status,
    responsavel_tecnico: client.responsavelTecnico,
    commission_paid: client.commissionPaid || false,
    observacao: newlineToBr(client.observacao || '')
  };
  return data;
};

const mapLogFromDB = (db: any): TrainingLog => ({
  id: db.id,
  clientId: db.client_id,
  numeroProtocolo: db.numero_protocolo || '',
  employeeId: db.employee_id,
  employeeName: db.employee_name,
  date: db.date,
  startTime1: db.start_time_1,
  endTime1: db.end_time_1,
  startTime2: db.start_time_2 || '',
  endTime2: db.end_time_2 || '',
  receivedBy: parseContacts(db.received_by),
  observation: brToNewline(db.observation || ''),
  transportType: db.transport_type,
  uberIda: Number(db.uber_ida || 0),
  uberVolta: Number(db.uber_volta || 0),
  uberTotal: Number(db.uber_total || 0),
  ownVehicleKm: Number(db.own_vehicle_km || 0),
  ownVehicleKmValue: Number(db.own_vehicle_km_value || 0),
  ownVehicleTotal: Number(db.own_vehicle_total || 0),
  createdAt: db.created_at,
  horasCalculadas: Number(db.horas_calculadas || 0)
});

const mapLogToDB = (log: TrainingLog) => ({
  client_id: log.clientId,
  numero_protocolo: log.numeroProtocolo,
  employee_id: log.employeeId,
  employee_name: log.employeeName,
  date: log.date,
  start_time_1: log.startTime1,
  end_time_1: log.endTime1,
  start_time_2: log.startTime2 || null,
  end_time_2: log.endTime2 || null,
  received_by: log.receivedBy || [],
  observation: newlineToBr(log.observation),
  transport_type: log.transportType,
  uber_ida: log.uberIda,
  uber_volta: log.uberVolta,
  uber_total: log.uberTotal,
  own_vehicle_km: log.ownVehicleKm,
  own_vehicle_km_value: log.ownVehicleKmValue,
  own_vehicle_total: log.ownVehicleTotal,
  horas_calculadas: log.horasCalculadas
});

// --- USERS ---
export const getStoredUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) throw error;
  return (data || []).map(mapUserFromDB);
};

export const saveUser = async (user: User) => {
  const data = mapUserToDB(user);
  const { error } = await supabase.from('users').insert([data]);
  if (error) throw error;
};

export const updateUser = async (user: User) => {
  const data = mapUserToDB(user);
  const { error } = await supabase.from('users').update(data).eq('id', user.id);
  if (error) throw error;
  return true;
};

// --- CUSTOMERS ---
export const getStoredCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*').order('razao_social');
  if (error) throw error;
  return (data || []).map(mapCustomerFromDB);
};

export const saveCustomer = async (customer: Customer) => {
  const payload = mapCustomerToDB(customer);
  const { error } = await supabase.from('customers').insert([payload]);
  if (error) throw error;
};

export const updateCustomer = async (customer: Customer) => {
  const payload = mapCustomerToDB(customer);
  const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
  if (error) throw error;
  return true;
};

export const deleteCustomer = async (id: string) => {
  const client = getSupabase();
  const { error } = await client.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- CLIENTS ---
export const getStoredClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClientFromDB);
};

export const saveClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  const { error } = await supabase.from('clients').insert([payload]);
  if (error) throw error;
  return true;
};

export const updateClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
  if (error) throw error;
  return true;
};

export const deleteClient = async (clientId: string) => {
  const client = getSupabase();
  const { error } = await client.from('clients').delete().eq('id', clientId);
  if (error) throw error;
  return true;
};

export const updateClientStatus = async (clientId: string, status: 'pending' | 'completed', dataFim: string | null = null, residualHours: number | null = null) => {
  const updateData: any = { status, data_fim: dataFim };
  if (residualHours !== null) updateData.residual_hours_added = residualHours;
  const { error } = await supabase.from('clients').update(updateData).eq('id', clientId);
  if (error) throw error;
  return true;
};

export const updateCommissionStatus = async (clientId: string, paid: boolean) => {
  const { error } = await supabase.from('clients').update({ commission_paid: paid }).eq('id', clientId);
  if (error) throw error;
  return true;
};

// --- LOGS ---
export const getStoredLogs = async (): Promise<TrainingLog[]> => {
  const { data, error } = await supabase.from('training_logs').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLogFromDB);
};

export const saveLog = async (log: TrainingLog) => {
  const payload = mapLogToDB(log);
  const { error } = await supabase.from('training_logs').insert([payload]);
  if (error) throw error;
};

export const updateLog = async (log: TrainingLog) => {
  const payload = mapLogToDB(log);
  const { error } = await supabase.from('training_logs').update(payload).eq('id', log.id);
  if (error) throw error;
  return true;
};

export const deleteLog = async (logId: string) => {
  const { error } = await supabase.from('training_logs').delete().eq('id', logId);
  if (error) throw error;
};

// --- MODULES ---
export const getStoredModules = async (): Promise<SystemModule[]> => {
  const { data, error } = await supabase.from('system_modules').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const saveModule = async (module: SystemModule) => {
  const { id, ...data } = module;
  const { error } = await supabase.from('system_modules').insert([data]);
  if (error) throw error;
};

export const updateModule = async (module: SystemModule) => {
  const { error } = await supabase.from('system_modules').update(module).eq('id', module.id);
  if (error) throw error;
  return true;
};

export const deleteModule = async (id: string) => {
  const { error } = await supabase.from('system_modules').delete().eq('id', id);
  if (error) throw error;
};

// --- TRAINING TYPES ---
export const getStoredTrainingTypes = async (): Promise<TrainingTypeEntity[]> => {
  const { data, error } = await supabase.from('training_types').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const saveTrainingType = async (type: TrainingTypeEntity) => {
  const { id, ...data } = type;
  const { error } = await supabase.from('training_types').insert([data]);
  if (error) throw error;
};

export const updateTrainingType = async (type: TrainingTypeEntity) => {
  const { error } = await supabase.from('training_types').update(type).eq('id', type.id);
  if (error) throw error;
  return true;
};

export const deleteTrainingType = async (id: string) => {
  const { error } = await supabase.from('training_types').delete().eq('id', id);
  if (error) throw error;
};

// --- INTEGRATIONS & BRANDING UNIFICADOS NO ID 1 ---

const getCentralConfig = async () => {
  try {
    const { data, error } = await supabase.from('integrations').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      try {
        const parsed = JSON.parse(data.webhook_url);
        return {
          appName: data.api_key || 'TrainMaster',
          webhookUrl: parsed.webhookUrl || '',
          integrationApiKey: parsed.integrationApiKey || '',
          appSubtitle: parsed.appSubtitle || 'SISTEMA PRO',
          logoUrl: parsed.logoUrl || ''
        };
      } catch {
        return {
          appName: 'TrainMaster',
          webhookUrl: data.webhook_url || '',
          integrationApiKey: data.api_key || '',
          appSubtitle: 'SISTEMA PRO',
          logoUrl: ''
        };
      }
    }
  } catch (err) {
    console.error("Erro ao buscar central config:", err);
  }
  return null;
};

export const getStoredIntegrations = async (): Promise<IntegrationSettings> => {
  const config = await getCentralConfig();
  if (!config) return { apiKey: '', webhookUrl: '' };
  return { apiKey: config.integrationApiKey, webhookUrl: config.webhookUrl };
};

export const saveIntegrations = async (settings: IntegrationSettings) => {
  const current = await getCentralConfig();
  const jsonPayload = JSON.stringify({
    webhookUrl: settings.webhookUrl,
    integrationApiKey: settings.apiKey,
    appSubtitle: current?.appSubtitle || 'SISTEMA PRO',
    logoUrl: current?.logoUrl || ''
  });

  const { error } = await supabase.from('integrations').upsert({ 
    id: 1, 
    api_key: current?.appName || 'TrainMaster', 
    webhook_url: jsonPayload,
    updated_at: new Date().toISOString() 
  });
  if (error) throw error;
};

export const getStoredBranding = async (): Promise<BrandingConfig> => {
  const config = await getCentralConfig();
  if (config) {
    const branding = {
      appName: config.appName,
      appSubtitle: config.appSubtitle,
      logoUrl: config.logoUrl
    };
    localStorage.setItem(BRANDING_LOCAL_KEY, JSON.stringify(branding));
    return branding;
  }

  const local = localStorage.getItem(BRANDING_LOCAL_KEY);
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }

  return { appName: 'TrainMaster', appSubtitle: 'SISTEMA PRO', logoUrl: '' };
};

export const saveBranding = async (config: BrandingConfig) => {
  const current = await getCentralConfig();
  const jsonPayload = JSON.stringify({
    webhookUrl: current?.webhookUrl || '',
    integrationApiKey: current?.integrationApiKey || '',
    appSubtitle: config.appSubtitle,
    logoUrl: config.logoUrl
  });

  const { error } = await supabase.from('integrations').upsert({ 
    id: 1, 
    api_key: config.appName, 
    webhook_url: jsonPayload,
    updated_at: new Date().toISOString() 
  });
  
  if (error) throw error;
  localStorage.setItem(BRANDING_LOCAL_KEY, JSON.stringify(config));
  return true;
};

export const getStoredCloudConfig = async () => {
  try {
    const { data, error } = await supabase.from('integrations').select('*').eq('id', 2).single();
    if (error) return null;
    return {
      url: data.webhook_url, 
      key: data.api_key      
    };
  } catch (err) {
    return null;
  }
};

export const saveCloudConfigToDB = async (url: string, key: string) => {
  try {
    resetSupabaseClient();
    localStorage.setItem(SUPABASE_URL_KEY, url);
    localStorage.setItem(SUPABASE_KEY_KEY, key);
    
    const client = getSupabase();
    await client.from('integrations').upsert({
      id: 2,
      api_key: key,
      webhook_url: url,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Falha ao persistir cloud config no DB:", err);
  }
};
