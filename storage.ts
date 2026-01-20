
import { User, Client, TrainingLog, UserRole, SystemModule, Customer, IntegrationSettings, TrainingTypeEntity } from './types';
import { supabase, getSupabase } from './supabase';

/**
 * Utilitários de Mapeamento (Mappers)
 */

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
  if (error) {
    console.error("Erro ao salvar cliente:", error.message || error);
    throw error;
  }
};

export const updateCustomer = async (customer: Customer) => {
  const payload = mapCustomerToDB(customer);
  const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
  if (error) throw error;
  return true;
};

export const deleteCustomer = async (id: string) => {
  if (!id) throw new Error("ID do cliente não fornecido.");
  const client = getSupabase();
  const { error } = await client.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- CLIENTS (COM SALVAMENTO RESILIENTE) ---
export const getStoredClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClientFromDB);
};

/**
 * Tenta salvar ou atualizar tratando o erro de colunas inexistentes no banco do usuário.
 */
const performResilientClientOperation = async (payload: any, operation: 'insert' | 'update', id?: string) => {
  let currentPayload = { ...payload };
  
  const tryOperation = async (p: any) => {
    if (operation === 'insert') {
      return await supabase.from('clients').insert([p]);
    } else {
      return await supabase.from('clients').update(p).eq('id', id);
    }
  };

  let response = await tryOperation(currentPayload);

  // Erro 42703 = undefined_column (Coluna não existe na tabela)
  if (response.error && response.error.code === '42703') {
    const errorMsg = response.error.message.toLowerCase();
    console.warn("Compatibilidade: Coluna inexistente detectada no Supabase:", response.error.message);
    
    // 1. Tentar remover 'observacao' se for o culpado
    if (errorMsg.includes('observacao')) {
      console.log("Removendo campo 'observacao' e tentando novamente...");
      delete currentPayload.observacao;
      response = await tryOperation(currentPayload);
    }

    // 2. Tentar trocar 'tipo_treinamento' por 'tipo_tre_namento' se for o culpado
    if (response.error && response.error.code === '42703' && errorMsg.includes('tipo_treinamento')) {
      console.log("Tentando campo alternativo 'tipo_tre_namento'...");
      const value = currentPayload.tipo_treinamento;
      delete currentPayload.tipo_treinamento;
      currentPayload.tipo_tre_namento = value;
      response = await tryOperation(currentPayload);
    }
    
    // 3. Se ainda houver erro de coluna, tentar salvar sem NENHUM campo novo/suspeito
    if (response.error && response.error.code === '42703') {
       console.log("Tentativa final: Removendo todos os campos opcionais novos.");
       delete currentPayload.observacao;
       delete currentPayload.residual_hours_added;
       response = await tryOperation(currentPayload);
    }
  }

  if (response.error) {
    console.error(`Erro crítico no banco de dados (${operation}):`, response.error);
    throw response.error;
  }
  return true;
};

export const saveClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  return await performResilientClientOperation(payload, 'insert');
};

export const updateClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  return await performResilientClientOperation(payload, 'update', client.id);
};

export const deleteClient = async (clientId: string) => {
  if (!clientId) throw new Error("ID do registro não fornecido.");
  const client = getSupabase();
  const { error } = await client.from('clients').delete().eq('id', clientId);
  if (error) throw error;
  return true;
};

export const updateClientStatus = async (clientId: string, status: 'pending' | 'completed') => {
  const { error } = await supabase.from('clients').update({ status }).eq('id', clientId);
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

// --- INTEGRATIONS ---
export const getStoredIntegrations = async (): Promise<IntegrationSettings> => {
  const { data, error } = await supabase.from('integrations').select('*').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? { apiKey: data.api_key, webhookUrl: data.webhook_url } : { apiKey: '', webhookUrl: '' };
};

export const saveIntegrations = async (settings: IntegrationSettings) => {
  const { error } = await supabase.from('integrations').upsert({ 
    id: 1, 
    api_key: settings.apiKey, 
    webhook_url: settings.webhookUrl,
    updated_at: new Date().toISOString() 
  });
  if (error) throw error;
};
