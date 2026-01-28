
export enum UserRole {
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  password?: string;
  role: UserRole;
  active?: boolean;
  usuarioMovidesk?: string;
}

export interface BrandingConfig {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
}

export interface TrainingTypeEntity {
  id: string;
  name: string;
}

export interface SystemModule {
  id: string;
  name: string;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface Customer {
  id: string;
  razãoSocial: string;
  cnpj: string;
  refMovidesk?: string;
  contacts?: Contact[];
}

export interface Client {
  id: string;
  customerId: string; // Link com o Customer
  razãoSocial: string; // Mantido para facilidade de consulta nos relatórios
  protocolo: string;
  modulos: string[];
  tipoTreinamento: string;
  duracaoHoras: number;
  residualHoursAdded?: number; // ANALÍTICO: Horas migradas de contratos anteriores
  dataInicio: string;
  dataFim?: string; // NOVO: Data de finalização do treinamento
  valorImplantacao: number;
  comissaoPercent: number;
  status: 'pending' | 'completed';
  responsavelTecnico: string;
  commissionPaid?: boolean;
  observacao?: string; // NOVO: Campo para observações do contrato
}

export interface IntegrationSettings {
  apiKey: string;
  webhookUrl: string;
}

export enum TransportType {
  UBER = 'Uber',
  OWN_VEHICLE = 'Veículo Próprio',
  ONLINE = 'Online'
}

export interface TrainingLog {
  id: string;
  clientId: string;
  numeroProtocolo: string; // NOVO: Persistência do protocolo no log
  employeeId: string;
  employeeName: string;
  date: string;
  startTime1: string;
  endTime1: string;
  startTime2?: string;
  endTime2?: string;
  receivedBy?: Contact[]; // Objetos completos de quem recebeu o treinamento
  observation: string;
  transportType: TransportType;
  uberIda?: number;
  uberVolta?: number;
  uberTotal?: number;
  ownVehicleKm?: number;
  ownVehicleKmValue?: number;
  ownVehicleTotal?: number;
  createdAt: string;
  horasCalculadas: number;
}

export type ViewState = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'NEW_TRAINING' 
  | 'CLIENT_REG' 
  | 'TRAINING_PURCHASE'
  | 'EMPLOYEE_REG' 
  | 'PENDING_LIST' 
  | 'CLIENT_LIST' 
  | 'HOURS_MANAGEMENT'
  | 'MODULE_MANAGEMENT'
  | 'TRAINING_TYPE_MGMT'
  | 'PROFITABILITY'
  | 'COMMISSION_PAYMENT'
  | 'INTEGRATIONS';