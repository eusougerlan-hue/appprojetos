import { User, Client, TrainingLog, UserRole, SystemModule, Customer, IntegrationSettings, TrainingTypeEntity, BrandingConfig, Contact, TimeManagementConfig } from './types';

const BRANDING_LOCAL_KEY = 'TM_BRANDING_DATA';

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
  id: user.id,
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
  id: customer.id,
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
  modulos: Array.isArray(db.modulos) ? db.modulos : parseContacts(db.modulos).map((x: any) => String(x)),
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
  observacao: brToNewline(db.observacao || ''),
  comentario: brToNewline(db.comentario || '')
});

const mapClientToDB = (client: Client) => {
  return {
    id: client.id,
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
    observacao: newlineToBr(client.observacao || ''),
    comentario: newlineToBr(client.comentario || '')
  };
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
  id: log.id,
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

// Generic API helpers
const fetchJSON = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// --- USERS ---
export const getStoredUsers = async (): Promise<User[]> => {
  const data = await fetchJSON("/api/users");
  return (data || []).map(mapUserFromDB);
};

export const saveUser = async (user: User) => {
  const data = mapUserToDB(user);
  await fetchJSON("/api/users", {
    method: "POST",
    body: JSON.stringify(data)
  });
};

export const updateUser = async (user: User) => {
  const data = mapUserToDB(user);
  await fetchJSON(`/api/users/${user.id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
  return true;
};

export const deleteUser = async (id: string) => {
  await fetchJSON(`/api/users/${id}`, {
    method: "DELETE"
  });
  return true;
};

// --- CUSTOMERS ---
export const getStoredCustomers = async (): Promise<Customer[]> => {
  const data = await fetchJSON("/api/customers");
  return (data || []).map(mapCustomerFromDB);
};

export const saveCustomer = async (customer: Customer) => {
  const payload = mapCustomerToDB(customer);
  await fetchJSON("/api/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateCustomer = async (customer: Customer) => {
  const payload = mapCustomerToDB(customer);
  await fetchJSON(`/api/customers/${customer.id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return true;
};

export const deleteCustomer = async (id: string) => {
  await fetchJSON(`/api/customers/${id}`, {
    method: "DELETE"
  });
  return true;
};

// --- CLIENTS ---
export const getStoredClients = async (): Promise<Client[]> => {
  const data = await fetchJSON("/api/clients");
  return (data || []).map(mapClientFromDB);
};

export const saveClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  await fetchJSON("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return true;
};

export const updateClient = async (client: Client) => {
  const payload = mapClientToDB(client);
  await fetchJSON(`/api/clients/${client.id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return true;
};

export const deleteClient = async (clientId: string) => {
  await fetchJSON(`/api/clients/${clientId}`, {
    method: "DELETE"
  });
  return true;
};

export const updateClientStatus = async (clientId: string, status: 'pending' | 'completed', dataFim: string | null = null, residualHours: number | null = null) => {
  await fetchJSON(`/api/clients/${clientId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, data_fim: dataFim, residual_hours_added: residualHours })
  });
  return true;
};

export const updateCommissionStatus = async (clientId: string, paid: boolean) => {
  await fetchJSON(`/api/clients/${clientId}/commission`, {
    method: "PATCH",
    body: JSON.stringify({ commission_paid: paid })
  });
  return true;
};

export const updateClientComment = async (clientId: string, comentario: string) => {
  await fetchJSON(`/api/clients/${clientId}/comment`, {
    method: "PATCH",
    body: JSON.stringify({ comentario: newlineToBr(comentario) })
  });
  return true;
};

// --- LOGS ---
export const getStoredLogs = async (): Promise<TrainingLog[]> => {
  const data = await fetchJSON("/api/logs");
  return (data || []).map(mapLogFromDB);
};

export const saveLog = async (log: TrainingLog) => {
  const payload = mapLogToDB(log);
  await fetchJSON("/api/logs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateLog = async (log: TrainingLog) => {
  const payload = mapLogToDB(log);
  await fetchJSON(`/api/logs/${log.id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return true;
};

export const deleteLog = async (logId: string) => {
  await fetchJSON(`/api/logs/${logId}`, {
    method: "DELETE"
  });
};

// --- MODULES ---
export const getStoredModules = async (): Promise<SystemModule[]> => {
  const data = await fetchJSON("/api/modules");
  return data || [];
};

export const saveModule = async (module: SystemModule) => {
  await fetchJSON("/api/modules", {
    method: "POST",
    body: JSON.stringify(module)
  });
};

export const updateModule = async (module: SystemModule) => {
  await fetchJSON(`/api/modules/${module.id}`, {
    method: "PUT",
    body: JSON.stringify(module)
  });
  return true;
};

export const deleteModule = async (id: string) => {
  await fetchJSON(`/api/modules/${id}`, {
    method: "DELETE"
  });
};

// --- TRAINING TYPES ---
export const getStoredTrainingTypes = async (): Promise<TrainingTypeEntity[]> => {
  const data = await fetchJSON("/api/training-types");
  return data || [];
};

export const saveTrainingType = async (type: TrainingTypeEntity) => {
  await fetchJSON("/api/training-types", {
    method: "POST",
    body: JSON.stringify(type)
  });
};

export const updateTrainingType = async (type: TrainingTypeEntity) => {
  await fetchJSON(`/api/training-types/${type.id}`, {
    method: "PUT",
    body: JSON.stringify(type)
  });
  return true;
};

export const deleteTrainingType = async (id: string) => {
  await fetchJSON(`/api/training-types/${id}`, {
    method: "DELETE"
  });
};

// --- TIME MANAGEMENT ---
export const getStoredTimeConfig = async (monthYear: string): Promise<TimeManagementConfig | null> => {
  try {
    const data = await fetchJSON(`/api/time-configs/${monthYear}`);
    if (data) {
      return { id: data.id, dias: Number(data.dias || 0), horasPorDia: Number(data.horas_por_dia || 0) };
    }
  } catch (err) {
    console.error("Erro ao buscar time config:", err);
  }
  return null;
};

export const saveTimeConfig = async (config: TimeManagementConfig) => {
  await fetchJSON("/api/time-configs", {
    method: "POST",
    body: JSON.stringify({
      id: config.id,
      dias: config.dias,
      horas_por_dia: config.horasPorDia
    })
  });
};

// --- INTEGRATIONS & BRANDING ---
export const getStoredIntegrations = async (): Promise<IntegrationSettings> => {
  try {
    const data = await fetchJSON("/api/central-config");
    if (!data) return { apiKey: '', webhookUrl: '' };
    return { apiKey: data.integrationApiKey, webhookUrl: data.webhookUrl };
  } catch (err) {
    console.error("Erro ao buscar integracoes:", err);
    return { apiKey: '', webhookUrl: '' };
  }
};

export const saveIntegrations = async (settings: IntegrationSettings) => {
  try {
    const current = await fetchJSON("/api/central-config").catch(() => null);
    await fetchJSON("/api/central-config", {
      method: "POST",
      body: JSON.stringify({
        appName: current?.appName || 'TrainMaster',
        webhookUrl: settings.webhookUrl,
        integrationApiKey: settings.apiKey,
        appSubtitle: current?.appSubtitle || 'SISTEMA PRO',
        logoUrl: current?.logoUrl || ''
      })
    });
  } catch (err) {
    console.error("Erro ao salvar integracoes:", err);
  }
};

export const getStoredBranding = async (): Promise<BrandingConfig> => {
  try {
    const config = await fetchJSON("/api/central-config").catch(() => null);
    if (config) {
      const branding = {
        appName: config.appName,
        appSubtitle: config.appSubtitle,
        logoUrl: config.logoUrl
      };
      localStorage.setItem(BRANDING_LOCAL_KEY, JSON.stringify(branding));
      return branding;
    }
  } catch (e) {
    console.error("Erro ao buscar branding:", e);
  }

  const local = localStorage.getItem(BRANDING_LOCAL_KEY);
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }

  return { appName: 'TrainMaster', appSubtitle: 'SISTEMA PRO', logoUrl: '' };
};

export const saveBranding = async (config: BrandingConfig) => {
  try {
    const current = await fetchJSON("/api/central-config").catch(() => null);
    await fetchJSON("/api/central-config", {
      method: "POST",
      body: JSON.stringify({
        appName: config.appName,
        webhookUrl: current?.webhookUrl || '',
        integrationApiKey: current?.integrationApiKey || '',
        appSubtitle: config.appSubtitle,
        logoUrl: config.logoUrl
      })
    });
    localStorage.setItem(BRANDING_LOCAL_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error("Erro ao salvar branding:", err);
    return false;
  }
};

export const getStoredCloudConfig = async () => {
  try {
    return await fetchJSON("/api/cloud-config");
  } catch (err) {
    return null;
  }
};

export const saveCloudConfigToDB = async (url: string, key: string) => {
  try {
    localStorage.setItem('SUPABASE_URL', url);
    localStorage.setItem('SUPABASE_ANON_KEY', key);
    await fetchJSON("/api/cloud-config", {
      method: "POST",
      body: JSON.stringify({ url, key })
    });
  } catch (err) {
    console.error("Falha ao persistir cloud config no DB:", err);
  }
};
