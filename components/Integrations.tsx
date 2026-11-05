import React, { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings, BrandingConfig } from '../types';
import { getStoredIntegrations, saveIntegrations, getStoredBranding, saveBranding } from '../storage';
import { playNotificationSound } from '../sound';

interface IntegrationsProps {
  onBrandingChange?: () => void;
}

type DocEntity = 'CLIENTS' | 'CUSTOMERS' | 'LOGS' | 'USERS' | 'MODULES' | 'TYPES';
type DocMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const Integrations: React.FC<IntegrationsProps> = ({ onBrandingChange }) => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    apiKey: '',
    webhookUrl: ''
  });
  
  const [branding, setBranding] = useState<BrandingConfig>({
    appName: '',
    appSubtitle: '',
    logoUrl: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'CONFIG' | 'BRANDING' | 'API'>('API');
  const [docEntity, setDocEntity] = useState<DocEntity>('CLIENTS');
  const [docMethod, setDocMethod] = useState<DocMethod>('POST');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calcula a URL base HTTPS completa garantindo https:// em qualquer navegador
  const getCompleteHttpsBaseUrl = useCallback((): string => {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (origin.startsWith('https://')) {
        return origin;
      }
      if (origin.startsWith('http://')) {
        return origin.replace(/^http:\/\//i, 'https://');
      }
      if (window.location.host) {
        return `https://${window.location.host}`;
      }
    }
    return 'https://ais-dev-usdlyva63lvmtoaf3gy2ah-18437344611.us-east1.run.app';
  }, []);

  const [baseUrl, setBaseUrl] = useState<string>(getCompleteHttpsBaseUrl());

  useEffect(() => {
    setBaseUrl(getCompleteHttpsBaseUrl());
  }, [getCompleteHttpsBaseUrl]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [intData, brandData] = await Promise.all([
        getStoredIntegrations(),
        getStoredBranding()
      ]);
      setSettings(intData);
      setBranding(brandData);
    } catch (err) {
      console.error('Erro ao buscar integrações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveIntegrations(settings);
      setCopiedKey('config_saved');
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveBranding(branding);
      if (onBrandingChange) onBrandingChange();
      setCopiedKey('brand_saved');
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar identidade: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Definição dos endpoints REST mapeados diretamente no banco de dados PostgreSQL
  const entityConfig: Record<DocEntity, {
    label: string;
    sublabel: string;
    table: string;
    path: string;
    description: string;
    allowedMethods: DocMethod[];
    schema: { field: string; type: string; desc: string; required?: boolean }[];
    samples: {
      GET: { response: string; paramsDesc?: string };
      POST?: { request: string; response: string; notes?: string };
      PUT?: { request: string; response: string; pathParam: string };
      DELETE?: { response: string; pathParam: string };
    };
  }> = {
    CLIENTS: {
      label: 'Vendas / Treinamentos',
      sublabel: 'Contratos e Horas de Implantação',
      table: 'clients',
      path: '/api/clients',
      description: 'Gestão completa dos contratos de treinamento, horas contratadas, instrutor responsável, comissões e status no PostgreSQL.',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único do contrato no Postgres (gerado automaticamente se omitido)' },
        { field: 'customer_id', type: 'UUID / TEXT', desc: 'UUID da empresa cadastrada (relacionamento com tabela customers)', required: true },
        { field: 'razao_social', type: 'TEXT', desc: 'Nome ou Razão Social da empresa compradora', required: true },
        { field: 'protocolo', type: 'TEXT', desc: 'Número único de protocolo do treinamento (ex: 202611004476)', required: true },
        { field: 'modulos', type: 'JSONB (Array)', desc: 'Lista de módulos contratados (ex: ["Financeiro", "Estoque"])', required: true },
        { field: 'tipo_treinamento', type: 'TEXT', desc: 'Modalidade (ex: "Implantação Presencial", "Online")', required: true },
        { field: 'solicitante', type: 'TEXT', desc: 'Nome do contato / usuário-chave que solicitou o treinamento' },
        { field: 'duracao_horas', type: 'NUMERIC', desc: 'Carga horária total vendida em horas (ex: 20.0)', required: true },
        { field: 'residual_hours_added', type: 'NUMERIC', desc: 'Horas residuais remanescentes adicionadas (default: 0)' },
        { field: 'data_inicio', type: 'TEXT', desc: 'Data prevista de início (formato YYYY-MM-DD)' },
        { field: 'data_fim', type: 'TEXT', desc: 'Data de conclusão do treinamento (formato YYYY-MM-DD ou null)' },
        { field: 'valor_implantacao', type: 'NUMERIC', desc: 'Valor total do contrato de implantação em R$ (ex: 4500.00)' },
        { field: 'comissao_percent', type: 'NUMERIC', desc: 'Percentual de comissão técnica (ex: 10)' },
        { field: 'status', type: 'TEXT', desc: 'Status do contrato ("pending", "in_progress", "completed", "cancelled")' },
        { field: 'responsavel_tecnico', type: 'TEXT', desc: 'Nome do instrutor responsável pelo projeto' },
        { field: 'commission_paid', type: 'BOOLEAN', desc: 'Indicador se a comissão técnica já foi paga' },
        { field: 'observacao', type: 'TEXT', desc: 'Observações gerais do projeto' },
        { field: 'comentario', type: 'TEXT', desc: 'Anotações internas da equipe técnica' }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            customer_id: "c82b9a78-2d88-4663-95b8-53e34b1262d1",
            razao_social: "Comercial e Distribuidora Silva LTDA",
            protocolo: "202611004476",
            modulos: ["Faturamento", "Financeiro", "Estoque"],
            tipo_treinamento: "Implantação Presencial",
            solicitante: "Marcos Ribeiro (Gerente Geral)",
            duracao_horas: 24,
            data_inicio: "2026-11-15",
            responsavel_tecnico: "Gerlan Correia",
            valor_implantacao: 4800.00,
            comissao_percent: 10,
            status: "pending",
            observacao: "Venda sincronizada automaticamente via n8n / ERP"
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "e5a7b14c-687f-4c56-a790-2e3fc197b0a8"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            {
              id: "e5a7b14c-687f-4c56-a790-2e3fc197b0a8",
              customer_id: "c82b9a78-2d88-4663-95b8-53e34b1262d1",
              razao_social: "Comercial e Distribuidora Silva LTDA",
              protocolo: "202611004476",
              modulos: ["Faturamento", "Financeiro", "Estoque"],
              tipo_treinamento: "Implantação Presencial",
              solicitante: "Marcos Ribeiro (Gerente Geral)",
              duracao_horas: 24,
              residual_hours_added: 0,
              data_inicio: "2026-11-15",
              data_fim: null,
              valor_implantacao: 4800.00,
              comissao_percent: 10,
              status: "pending",
              responsavel_tecnico: "Gerlan Correia",
              commission_paid: false,
              observacao: "Venda sincronizada automaticamente via n8n / ERP",
              created_at: "2026-11-05T13:39:47.000Z"
            }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/clients/{id}",
          request: JSON.stringify({
            customer_id: "c82b9a78-2d88-4663-95b8-53e34b1262d1",
            razao_social: "Comercial e Distribuidora Silva LTDA",
            protocolo: "202611004476",
            modulos: ["Faturamento", "Financeiro", "Estoque", "NFe"],
            tipo_treinamento: "Implantação Presencial",
            solicitante: "Marcos Ribeiro (Gerente Geral)",
            duracao_horas: 30,
            residual_hours_added: 0,
            data_inicio: "2026-11-15",
            data_fim: null,
            valor_implantacao: 6000.00,
            comissao_percent: 10,
            status: "in_progress",
            responsavel_tecnico: "Gerlan Correia",
            commission_paid: false,
            observacao: "Ampliação de 6 horas solicitada pelo cliente",
            comentario: "Cronograma ajustado com o gestor"
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/clients/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    },
    CUSTOMERS: {
      label: 'Clientes / Empresas',
      sublabel: 'Cadastro Base de Empresas e Contatos',
      table: 'customers',
      path: '/api/customers',
      description: 'Cadastro mestre de empresas, CNPJ, contatos, código de referência no Movidesk e marcação de usuário-chave no PostgreSQL.',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único da empresa (gerado automaticamente se omitido)' },
        { field: 'razao_social', type: 'TEXT', desc: 'Razão Social ou Nome Fantasia da Empresa', required: true },
        { field: 'cnpj', type: 'TEXT', desc: 'CNPJ formatado ou apenas números (ex: 12.345.678/0001-99)' },
        { field: 'ref_movidesk', type: 'TEXT', desc: 'Código de integração com o Movidesk / CRM (ex: CLI-5402)' },
        { field: 'contacts', type: 'JSONB (Array)', desc: 'Lista de contatos [{ "name": "...", "phone": "...", "keyUser": true }]' },
        { field: 'usuario_chave', type: 'BOOLEAN', desc: 'Flag indicando se há usuário-chave designado' }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            razao_social: "Indústria Metalúrgica Progresso S/A",
            cnpj: "18.922.345/0001-88",
            ref_movidesk: "MOV-9042",
            contacts: [
              {
                name: "Juliana Santos",
                phone: "(11) 97123-4567",
                keyUser: true
              },
              {
                name: "Roberto Farias",
                phone: "(11) 98234-5678",
                keyUser: false
              }
            ]
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "c82b9a78-2d88-4663-95b8-53e34b1262d1"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            {
              id: "c82b9a78-2d88-4663-95b8-53e34b1262d1",
              razao_social: "Indústria Metalúrgica Progresso S/A",
              cnpj: "18.922.345/0001-88",
              ref_movidesk: "MOV-9042",
              contacts: [
                {
                  name: "Juliana Santos",
                  phone: "(11) 97123-4567",
                  keyUser: true
                }
              ],
              usuario_chave: true
            }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/customers/{id}",
          request: JSON.stringify({
            razao_social: "Indústria Metalúrgica Progresso S/A (Matriz)",
            cnpj: "18.922.345/0001-88",
            ref_movidesk: "MOV-9042",
            contacts: [
              {
                name: "Juliana Santos",
                phone: "(11) 97123-4567",
                keyUser: true
              }
            ]
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/customers/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    },
    LOGS: {
      label: 'Atendimentos / Sessões',
      sublabel: 'Apontamento de Horas e Deslocamento',
      table: 'training_logs',
      path: '/api/logs',
      description: 'Lançamento das sessões presenciais e remotas, horas trabalhadas, participantes e custos de deslocamento (Uber ou Veículo Próprio).',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único do atendimento (gerado automaticamente)' },
        { field: 'client_id', type: 'TEXT / UUID', desc: 'UUID da venda/contrato na tabela clients', required: true },
        { field: 'numero_protocolo', type: 'TEXT', desc: 'Número do protocolo do contrato para rastreio', required: true },
        { field: 'employee_id', type: 'TEXT / UUID', desc: 'UUID do instrutor na tabela users' },
        { field: 'employee_name', type: 'TEXT', desc: 'Nome do instrutor responsável pelo atendimento', required: true },
        { field: 'date', type: 'TEXT', desc: 'Data do atendimento (formato YYYY-MM-DD)', required: true },
        { field: 'start_time_1', type: 'TEXT', desc: 'Hora de início do 1º turno (HH:MM)', required: true },
        { field: 'end_time_1', type: 'TEXT', desc: 'Hora de término do 1º turno (HH:MM)', required: true },
        { field: 'start_time_2', type: 'TEXT', desc: 'Hora de início do 2º turno (HH:MM, opcional)' },
        { field: 'end_time_2', type: 'TEXT', desc: 'Hora de término do 2º turno (HH:MM, opcional)' },
        { field: 'received_by', type: 'JSONB (Array)', desc: 'Nomes dos usuários treinados na sessão' },
        { field: 'horas_calculadas', type: 'NUMERIC', desc: 'Total de horas apuradas na sessão (ex: 4.5)' },
        { field: 'transport_type', type: 'TEXT', desc: 'Meio de locomoção ("uber", "own_vehicle", "none")' },
        { field: 'uber_ida / uber_volta / uber_total', type: 'NUMERIC', desc: 'Valores caso tenha utilizado Uber' },
        { field: 'own_vehicle_km / own_vehicle_km_value', type: 'NUMERIC', desc: 'Quilometragem e valor por km reembolsado' },
        { field: 'observation', type: 'TEXT', desc: 'Resumo dos tópicos e conteúdos abordados na sessão' }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            client_id: "e5a7b14c-687f-4c56-a790-2e3fc197b0a8",
            numero_protocolo: "202611004476",
            employee_name: "Gerlan Correia",
            date: "2026-11-05",
            start_time_1: "08:30",
            end_time_1: "12:00",
            start_time_2: "13:30",
            end_time_2: "17:30",
            received_by: ["Juliana Santos", "Roberto Farias"],
            horas_calculadas: 7.5,
            transport_type: "own_vehicle",
            own_vehicle_km: 42,
            own_vehicle_km_value: 1.25,
            own_vehicle_total: 52.50,
            observation: "Treinamento presencial do módulo Financeiro: contas a pagar, conciliação e fluxo de caixa."
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "9f3c7e12-4211-4b19-9134-8c7a65b012e3"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            {
              id: "9f3c7e12-4211-4b19-9134-8c7a65b012e3",
              client_id: "e5a7b14c-687f-4c56-a790-2e3fc197b0a8",
              numero_protocolo: "202611004476",
              employee_name: "Gerlan Correia",
              date: "2026-11-05",
              horas_calculadas: 7.5,
              observation: "Treinamento presencial do módulo Financeiro.",
              created_at: "2026-11-05T17:40:00.000Z"
            }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/logs/{id}",
          request: JSON.stringify({
            client_id: "e5a7b14c-687f-4c56-a790-2e3fc197b0a8",
            numero_protocolo: "202611004476",
            employee_name: "Gerlan Correia",
            date: "2026-11-05",
            start_time_1: "08:30",
            end_time_1: "12:00",
            start_time_2: "13:30",
            end_time_2: "18:00",
            horas_calculadas: 8.0,
            received_by: ["Juliana Santos", "Roberto Farias", "Carlos Lima"],
            transport_type: "own_vehicle",
            own_vehicle_km: 42,
            own_vehicle_km_value: 1.25,
            own_vehicle_total: 52.50,
            observation: "Treinamento estendido para sanar dúvidas da diretoria."
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/logs/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    },
    USERS: {
      label: 'Equipe / Usuários',
      sublabel: 'Instrutores, Técnicos e Gestores',
      table: 'users',
      path: '/api/users',
      description: 'Controle de acesso dos instrutores e gestores no banco PostgreSQL (autenticação por CPF e perfil de permissão).',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único do usuário no Postgres' },
        { field: 'name', type: 'TEXT', desc: 'Nome completo do colaborador', required: true },
        { field: 'cpf', type: 'TEXT', desc: 'CPF único formatado (login de acesso ao app)', required: true },
        { field: 'password', type: 'TEXT', desc: 'Senha de acesso', required: true },
        { field: 'role', type: 'TEXT', desc: 'Perfil de permissão ("MANAGER" ou "EMPLOYEE")', required: true },
        { field: 'email', type: 'TEXT', desc: 'E-mail corporativo do colaborador' },
        { field: 'phone', type: 'TEXT', desc: 'Telefone para contato' },
        { field: 'active', type: 'BOOLEAN', desc: 'Status do usuário ativo no sistema' },
        { field: 'usuario_movidesk', type: 'TEXT', desc: 'Usuário do colaborador no Movidesk' }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            name: "Lucas Mendonça",
            cpf: "123.456.789-00",
            password: "senhaSegura123",
            role: "EMPLOYEE",
            email: "lucas.mendonca@empresa.com.br",
            phone: "(11) 99123-4455",
            active: true,
            usuario_movidesk: "lucas.mendonca"
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "b4c81a20-3344-48f1-a1b2-9d8e7f6a5b4c"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            {
              id: "b4c81a20-3344-48f1-a1b2-9d8e7f6a5b4c",
              name: "Lucas Mendonça",
              cpf: "123.456.789-00",
              role: "EMPLOYEE",
              email: "lucas.mendonca@empresa.com.br",
              active: true,
              usuario_movidesk: "lucas.mendonca"
            }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/users/{id}",
          request: JSON.stringify({
            name: "Lucas Mendonça",
            cpf: "123.456.789-00",
            role: "MANAGER",
            email: "lucas.mendonca@empresa.com.br",
            phone: "(11) 99123-4455",
            active: true,
            usuario_movidesk: "lucas.mendonca"
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/users/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    },
    MODULES: {
      label: 'Módulos do Sistema',
      sublabel: 'Catálogo de Módulos de Software',
      table: 'system_modules',
      path: '/api/modules',
      description: 'Catálogo oficial de módulos de software disponíveis para compor os contratos de treinamento.',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único do módulo' },
        { field: 'name', type: 'TEXT', desc: 'Nome oficial do módulo (único no sistema)', required: true }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            name: "Emissor Fiscal NF-e / NFC-e"
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "77a8b9c0-1234-4567-89ab-cdef01234567"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            { id: "77a8b9c0-1234-4567-89ab-cdef01234567", name: "Emissor Fiscal NF-e / NFC-e" },
            { id: "88b9c0d1-2345-5678-90bc-def012345678", name: "Controle Financeiro e Conciliação" }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/modules/{id}",
          request: JSON.stringify({
            name: "Emissor Fiscal e Documentos Eletrônicos (NF-e, NFC-e, MDF-e)"
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/modules/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    },
    TYPES: {
      label: 'Tipos de Treinamento',
      sublabel: 'Modalidades de Implantação',
      table: 'training_types',
      path: '/api/training-types',
      description: 'Categorias de atendimento cadastradas na base de dados (Presencial, Remoto, Reciclagem, etc.).',
      allowedMethods: ['POST', 'GET', 'PUT', 'DELETE'],
      schema: [
        { field: 'id', type: 'UUID', desc: 'Identificador único do tipo' },
        { field: 'name', type: 'TEXT', desc: 'Nome da categoria / modalidade', required: true }
      ],
      samples: {
        POST: {
          request: JSON.stringify({
            name: "Implantação Presencial VIP"
          }, null, 2),
          response: JSON.stringify({
            success: true,
            id: "55c6d7e8-9012-3456-789a-bcdef0123456"
          }, null, 2)
        },
        GET: {
          response: JSON.stringify([
            { id: "55c6d7e8-9012-3456-789a-bcdef0123456", name: "Implantação Presencial VIP" },
            { id: "66d7e8f9-0123-4567-89ab-cdef01234567", name: "Treinamento Remoto Ao Vivo" }
          ], null, 2)
        },
        PUT: {
          pathParam: "/api/training-types/{id}",
          request: JSON.stringify({
            name: "Implantação Presencial Dedicada"
          }, null, 2),
          response: JSON.stringify({ success: true }, null, 2)
        },
        DELETE: {
          pathParam: "/api/training-types/{id}",
          response: JSON.stringify({ success: true }, null, 2)
        }
      }
    }
  };

  const currentEntityConfig = entityConfig[docEntity];

  // Garante que o método selecionado seja suportado pela entidade
  const effectiveMethod: DocMethod = currentEntityConfig.allowedMethods.includes(docMethod) 
    ? docMethod 
    : currentEntityConfig.allowedMethods[0];

  // Monta a URL HTTPS completa do endpoint atual
  const endpointUrl = `${baseUrl}${currentEntityConfig.path}`;
  const fullEndpointWithParam = (effectiveMethod === 'PUT' || effectiveMethod === 'DELETE')
    ? `${endpointUrl}/{id_ou_uuid}`
    : endpointUrl;

  // Monta o payload e resposta para o método ativo
  const currentSample = currentEntityConfig.samples[effectiveMethod];
  const requestBody = (effectiveMethod === 'POST' || effectiveMethod === 'PUT') 
    ? (currentSample && 'request' in currentSample ? currentSample.request : '')
    : null;
  const responseBody = currentSample ? currentSample.response : '{}';

  // Gera o comando cURL completo com a URL HTTPS
  const generateCurlCommand = (): string => {
    let curl = `curl -X ${effectiveMethod} "${fullEndpointWithParam}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json"`;
    if (settings.apiKey) {
      curl += ` \\\n  -H "X-Api-Key: ${settings.apiKey}"`;
    }
    if (requestBody) {
      curl += ` \\\n  -d '${requestBody.replace(/\n/g, '\n  ')}'`;
    }
    return curl;
  };

  const curlCommand = generateCurlCommand();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header com identidade limpa */}
      <div className="px-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Painel de Integrações</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-widest">
              PostgreSQL Nativo, Conexão n8n e API REST
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">PostgreSQL Ativo</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner mx-1">
        <button 
          onClick={() => setActivePanel('API')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          API REST Reference
        </button>
        <button 
          onClick={() => setActivePanel('CONFIG')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'CONFIG' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Webhooks & n8n
        </button>
        <button 
          onClick={() => setActivePanel('BRANDING')} 
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePanel === 'BRANDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Identidade Visual
        </button>
      </div>

      {/* Main Content Area */}
      <div className="px-1">
        {/* PAINEL API REST REFERENCE COM POSTGRESQL E HTTPS COMPLETO */}
        {activePanel === 'API' && (
          <div className="space-y-6 animate-slideUp">
            {/* Bloco de Destaque da URL HTTPS Base */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2rem] p-6 text-white border border-slate-700 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        HTTPS Obrigatório
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                        PostgreSQL Direto
                      </span>
                    </div>
                    <h3 className="text-base font-black tracking-tight text-white mt-1">Servidor de Produção REST</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">URL Base Completa:</span>
                </div>
              </div>

              {/* Caixa com o HTTPS Completo da aplicação */}
              <div className="bg-black/60 rounded-2xl p-3.5 border border-slate-700/80 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-400 font-mono text-xs font-bold">🔒 https://</span>
                  <code className="text-xs text-blue-200 font-mono font-bold truncate select-all">
                    {baseUrl.replace(/^https?:\/\//i, '')}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(baseUrl, 'base_url')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 flex-shrink-0 shadow-md"
                >
                  {copiedKey === 'base_url' ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Copiar Base HTTPS</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-4 text-[9px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Porta 443 / SSL Ativo
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Respostas em JSON (UTF-8)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Autenticação via Webhook / n8n / API Key
                </span>
              </div>
            </div>

            {/* Seletor de Entidade (Tabelas do PostgreSQL) */}
            <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Selecione o Recurso do Banco de Dados</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tabelas sincronizadas no PostgreSQL</p>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase">
                  Tabela: <span className="font-mono text-blue-600 font-black">{currentEntityConfig.table}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(Object.keys(entityConfig) as DocEntity[]).map((entKey) => {
                  const cfg = entityConfig[entKey];
                  const isSelected = docEntity === entKey;
                  return (
                    <button
                      key={entKey}
                      type="button"
                      onClick={() => setDocEntity(entKey)}
                      className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-[1.02]' 
                          : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {cfg.table}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
                      </div>
                      <span className="text-[11px] font-black leading-tight line-clamp-1">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalhes do Endpoint Selecionado */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white border border-slate-800 shadow-2xl space-y-6">
              {/* Header do Endpoint */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      POSTGRES TABLE: {currentEntityConfig.table}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 font-bold uppercase">
                      {currentEntityConfig.sublabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{currentEntityConfig.label}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 max-w-2xl">{currentEntityConfig.description}</p>
                </div>

                {/* Seletor de Método HTTP */}
                <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 gap-1">
                  {currentEntityConfig.allowedMethods.map((m) => {
                    const isSelected = effectiveMethod === m;
                    const methodColors: Record<DocMethod, { bg: string; text: string }> = {
                      GET: { bg: 'bg-emerald-600', text: 'text-emerald-400' },
                      POST: { bg: 'bg-blue-600', text: 'text-blue-400' },
                      PUT: { bg: 'bg-amber-600', text: 'text-amber-400' },
                      DELETE: { bg: 'bg-rose-600', text: 'text-rose-400' }
                    };
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDocMethod(m)}
                        className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                          isSelected
                            ? `${methodColors[m].bg} text-white shadow-md`
                            : `text-slate-400 hover:text-white hover:bg-slate-700/50`
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL HTTPS Completa com botão de cópia */}
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Endpoint URL Completo (HTTPS)
                </label>
                <div className="bg-black/70 p-3 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider ${
                      effectiveMethod === 'GET' ? 'bg-emerald-600 text-white' :
                      effectiveMethod === 'POST' ? 'bg-blue-600 text-white' :
                      effectiveMethod === 'PUT' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {effectiveMethod}
                    </span>
                    <code className="text-xs font-mono font-bold text-emerald-300 truncate select-all">
                      {fullEndpointWithParam}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(fullEndpointWithParam, 'endpoint_url')}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-[9px] font-black uppercase tracking-widest transition-all border border-slate-600 flex-shrink-0"
                  >
                    {copiedKey === 'endpoint_url' ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-400">URL Copiada!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cabeçalhos HTTP Recomendados */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Cabeçalhos da Requisição (Headers)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-black/40 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400">Content-Type:</span>
                    <span className="text-blue-300 font-bold">application/json</span>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400">Accept:</span>
                    <span className="text-blue-300 font-bold">application/json</span>
                  </div>
                </div>
              </div>

              {/* Corpo da Requisição (quando aplicável: POST / PUT) */}
              {requestBody && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Corpo da Requisição (JSON Payload)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(requestBody, 'request_body')}
                      className="text-[8px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      {copiedKey === 'request_body' ? 'Copiado!' : 'Copiar JSON'}
                    </button>
                  </div>
                  <div className="bg-black/70 rounded-2xl p-4 border border-slate-700/80 overflow-hidden shadow-inner">
                    <pre className="text-[10px] font-mono text-blue-200 overflow-x-auto custom-scrollbar leading-relaxed">
                      {requestBody}
                    </pre>
                  </div>
                </div>
              )}

              {/* Exemplo de Resposta (JSON Response) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Exemplo de Resposta do PostgreSQL
                    </span>
                    <span className="text-[7px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      HTTP 200 OK
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(responseBody, 'response_body')}
                    className="text-[8px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {copiedKey === 'response_body' ? 'Copiado!' : 'Copiar Resposta'}
                  </button>
                </div>
                <div className="bg-black/70 rounded-2xl p-4 border border-slate-700/80 overflow-hidden shadow-inner max-h-64 overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-emerald-200 overflow-x-auto custom-scrollbar leading-relaxed">
                    {responseBody}
                  </pre>
                </div>
              </div>

              {/* Comando cURL Completo com HTTPS para Terminal / n8n / Postman */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Comando cURL (Pronto para Terminal / n8n)
                    </span>
                    <span className="text-[7px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                      HTTPS Completo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(curlCommand, 'curl_cmd')}
                    className="text-[8px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {copiedKey === 'curl_cmd' ? 'Comando Copiado!' : 'Copiar cURL'}
                  </button>
                </div>
                <div className="bg-black/80 rounded-2xl p-4 border border-slate-700/90 overflow-hidden shadow-inner">
                  <pre className="text-[10px] font-mono text-amber-200 overflow-x-auto custom-scrollbar leading-relaxed select-all">
                    {curlCommand}
                  </pre>
                </div>
              </div>

              {/* Tabela de Campos e Tipos no PostgreSQL */}
              <div className="space-y-2 pt-2">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Dicionário de Campos da Tabela {currentEntityConfig.table} (PostgreSQL)
                </span>
                <div className="bg-black/40 rounded-2xl border border-slate-700/70 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-700/80 bg-slate-800/60 text-slate-300 font-bold uppercase text-[8px] tracking-wider">
                          <th className="py-2.5 px-3">Campo</th>
                          <th className="py-2.5 px-3">Tipo Postgres</th>
                          <th className="py-2.5 px-3">Obrigatório</th>
                          <th className="py-2.5 px-3">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 font-mono">
                        {currentEntityConfig.schema.map((item) => (
                          <tr key={item.field} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-blue-300 font-bold">{item.field}</td>
                            <td className="py-2 px-3 text-amber-300 text-[9px]">{item.type}</td>
                            <td className="py-2 px-3">
                              {item.required ? (
                                <span className="text-[7px] font-sans font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                                  SIM
                                </span>
                              ) : (
                                <span className="text-[7px] font-sans text-slate-500">Opcional</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-300 text-[9px] leading-relaxed">
                              {item.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Dica de Integração com n8n e Webhooks */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 text-orange-600 font-black text-xs">
                  n8n
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Como integrar com o n8n ou ERP?</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    1. No n8n, utilize o nó <strong className="text-slate-700">HTTP Request</strong> com o método desejado (ex: <code className="text-blue-600 font-mono">POST</code> para criar contratos de implantação).<br />
                    2. Cole a URL completa com HTTPS: <code className="text-blue-600 font-mono font-bold">{baseUrl}/api/clients</code>.<br />
                    3. No corpo da requisição (<code className="text-slate-600 font-mono">Body Parameters</code>), envie o formato JSON correspondente. Os dados são persistidos imediatamente no banco de dados PostgreSQL do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAINEL DE CONFIGURAÇÕES DE WEBHOOKS & N8N */}
        {activePanel === 'CONFIG' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-slideUp">
            <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Conexão n8n / Webhooks de Saída</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Disparo de eventos e segurança</p>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                PostgreSQL Ativo
              </span>
            </div>
            
            <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                    Webhook URL (n8n / Endpoint Receptor)
                  </label>
                  <input 
                    type="url" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 bg-slate-50/50 focus:border-blue-500 outline-none transition-all text-xs" 
                    value={settings.webhookUrl} 
                    onChange={e => setSettings({...settings, webhookUrl: e.target.value})} 
                    placeholder="https://seu-fluxo-n8n.com/webhook/treinamentos" 
                  />
                  <p className="text-[8px] text-slate-400 mt-1 ml-1">
                    URL completa com HTTPS para onde o sistema enviará notificações de novos treinamentos e conclusões.
                  </p>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                    Chave Secreta (API Key / Token)
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 bg-slate-50/50 focus:border-blue-500 outline-none transition-all text-xs" 
                    value={settings.apiKey} 
                    onChange={e => setSettings({...settings, apiKey: e.target.value})} 
                    placeholder="Chave de segurança para autenticar requisições" 
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Alerta Sonoro de Nova Venda</h5>
                    <p className="text-[9px] text-slate-400 font-medium">Toca automaticamente quando uma nova venda é atribuída ao técnico responsável</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => playNotificationSound()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  Testar Alerta Sonoro
                </button>
              </div>

              {copiedKey === 'config_saved' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[10px] font-bold text-center animate-fadeIn">
                  Configurações gravadas com sucesso no PostgreSQL!
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4"
              >
                {loading ? 'Salvando...' : 'Gravar Conexão no PostgreSQL'}
              </button>
            </form>
          </div>
        )}

        {/* PAINEL DE IDENTIDADE VISUAL */}
        {activePanel === 'BRANDING' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-slideUp">
            <div className="p-6 pb-4 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Personalização Visual e Marca</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Nome do aplicativo, subtítulo e logotipo</p>
            </div>
            <form onSubmit={handleSaveBranding} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nome do Aplicativo</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 bg-slate-50/50 text-xs focus:border-blue-500 outline-none transition-all" 
                    value={branding.appName} 
                    onChange={e => setBranding({...branding, appName: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Subtítulo</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 bg-slate-50/50 text-xs focus:border-blue-500 outline-none transition-all" 
                    value={branding.appSubtitle} 
                    onChange={e => setBranding({...branding, appSubtitle: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Logo URL (Ícone)</label>
                  <input 
                    type="url" 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 bg-slate-50/50 text-xs focus:border-blue-500 outline-none transition-all" 
                    value={branding.logoUrl} 
                    onChange={e => setBranding({...branding, logoUrl: e.target.value})} 
                    placeholder="https://seu-dominio.com/logo.png" 
                  />
                </div>
              </div>

              {copiedKey === 'brand_saved' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[10px] font-bold text-center animate-fadeIn">
                  Identidade visual atualizada com sucesso no banco de dados!
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4"
              >
                {loading ? 'Sincronizando...' : 'Atualizar Identidade'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="text-center px-4">
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">TrainMaster REST Connect • PostgreSQL Edition</p>
      </div>
    </div>
  );
};

export default Integrations;
