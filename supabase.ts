
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================================================
// CONFIGURAÇÃO CLOUD FIXA (OPCIONAL)
// Preencha as constantes abaixo se desejar que o app já venha configurado
// para todos os usuários em qualquer navegador.
// ==============================================================================
const HARDCODED_URL = 'https://zvxremuxmaqbsyucafjl.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eHJlbXV4bWFxYnN5dWNhZmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjQyMzcsImV4cCI6MjA4MzU0MDIzN30.kIBIKZqoM4GQam0JotVAUv6gI7SF-dRW8-jha5bV80U';
// ==============================================================================

let supabaseInstance: SupabaseClient | null = null;

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

export const getSupabase = (): SupabaseClient => {
  // PRIORIDADE: LocalStorage (configuração do usuário) > Hardcoded (valor padrão)
  const url = localStorage.getItem('SUPABASE_URL') || HARDCODED_URL;
  const key = localStorage.getItem('SUPABASE_ANON_KEY') || HARDCODED_KEY;

  if (!url || !key) {
    throw new Error('Supabase não configurado.');
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }

  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop: keyof SupabaseClient) => {
    try {
      const client = getSupabase();
      const value = (client as any)[prop];
      if (typeof value === 'function') return value.bind(client);
      return value;
    } catch (e) {
      return undefined;
    }
  }
});

export const isSupabaseConfigured = () => {
  const url = localStorage.getItem('SUPABASE_URL') || HARDCODED_URL;
  const key = localStorage.getItem('SUPABASE_ANON_KEY') || HARDCODED_KEY;
  return !!url && !!key;
};
