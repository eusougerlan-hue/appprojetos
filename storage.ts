
import { User, Client, TrainingLog, UserRole, SystemModule, Customer, IntegrationSettings, TrainingTypeEntity, BrandingConfig } from './types';
import { supabase, getSupabase, resetSupabaseClient } from './supabase';

/**
 * Chaves para o LocalStorage (Branding Cache)
 */
const BRANDING_LOCAL_KEY = 'TM_BRANDING_DATA';

const mapCustomerFromDB = (db: any): Customer => ({
  id: db.id,
  razãoSocial: db.razao_social,
  cnpj: db.cnpj,
  contacts: db.contacts || []
});

const mapCustomerToDB = (customer: Customer) => ({
  razao_social: customer.razãoSocial,
  cnpj: customer.cnpj,
  contacts: customer.contacts || []
});

const mapClientFromDB = (db: any): Client => ({
  id: db.id,
  customerId: db.customer_id,
  razãoSocial: db.razao_social,
  protocolo: db.protocolo,
  modulos: db.modulos || [],
  tipoTreinamento: db.tipo_tre_namento || db.tipo_treinamento || '',
  duracaoHoras: Number(db.duracao_horas || 0),
  residualHoursAdded: Number(db.residual_hours_added || 0),
  dataInicio: db.data_inicio,
  dataFim: db.data_fim || undefined,
  valorImplantacao: Number(db.valor_implantacao || 0),
  comissaoPercent: Number(db.comissao_percent || 0),
  status: db.status,
  responsavelTecnico: db.responsavel_tecnico || '',
  commissionPaid: db.commission_paid || false,
  observacao: db.observacao || ''
});

const mapClientToDB = (client: Client) => {
  const data: any = {
    customer_id: client.customerId,
    razao_social: client.razãoSocial,
    protocolo: client.protocolo,
    modulos: client.modulos,
    tipo_treinamento: client.tipoTreinamento, 
    duracao_horas: client.duracaoHoras,
    residual_hours_added: client.residualHoursAdded || 0,
    data_inicio: client.dataInicio,
    data_fim: client.dataFim || null,
    valor_implantacao: client.valorImplantacao,
    comissao_percent: client.comissaoPercent,
    status: client.status,
    responsavel_tecnico: client.responsavelTecnico,
    commission_paid: client.commissionPaid || false,
    observacao: client.observacao || ''
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
  receivedBy: db.received_by || [],
  observation: db.observation || '',
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
  observation: log.observation,
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
  return data || [];
};

export const saveUser = async (user: User) => {
  const { id, ...data } = user;
  const { error } = await supabase.from('users').insert([data]);
  if (error) throw error;
};

export const updateUser = async (user: User) => {
  const { error } = await supabase.from('users').update(user).eq('id', user.id);
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

// --- INTEGRATIONS & BRANDING UNIFICADOS (ID 1) ---

/**
 * Helper para ler o registro central (ID 1) que contém Integrações + Branding
 */
const getCentralConfig = async () => {
  const { data, error } = await supabase.from('integrations').select('*').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  
  if (data) {
    try {
      // Tenta ler o JSON do campo webhook_url
      const json = JSON.parse(data.webhook_url);
      return {
        appName: data.api_key || 'TrainMaster',
        webhookUrl: json.webhookUrl || '',
        integrationApiKey: json.integrationApiKey || '',
        appSubtitle: json.appSubtitle || 'SISTEMA PRO',
        logoUrl: json.logoUrl || ''
      };
    } catch {
      // Fallback para formato antigo (quando webhook_url era apenas uma string de URL)
      return {
        appName: 'TrainMaster',
        webhookUrl: data.webhook_url || '',
        integrationApiKey: data.api_key || '',
        appSubtitle: 'SISTEMA PRO',
        logoUrl: ''
      };
    }
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
  // 1. Prioridade para LocalStorage (Cache rápido)
  const local = localStorage.getItem(BRANDING_LOCAL_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }

  // 2. Busca no Banco de Dados (ID 1)
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

  return { appName: 'TrainMaster', appSubtitle: 'SISTEMA PRO', logoUrl: '' };
};

export const saveBranding = async (config: BrandingConfig) => {
  // 1. Salva localmente
  localStorage.setItem(BRANDING_LOCAL_KEY, JSON.stringify(config));

  // 2. Salva no Banco de Dados (ID 1)
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
  return true;
};

export const saveCloudConfigToDB = async (url: string, key: string) => {
  try {
    resetSupabaseClient();
    const client = getSupabase();
    await client.from('integrations').upsert({
      id: 2,
      api_key: key,
      webhook_url: url,
      updated_at: new Date().toISOString()
    });
  } catch (err) {}
};
