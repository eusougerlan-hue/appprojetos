
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Retorna a instância única do cliente Supabase.
 * Se as chaves mudarem, o reload da página garantirá a reinicialização.
 */
export const getSupabase = (): SupabaseClient => {
  const url = localStorage.getItem('SUPABASE_URL');
  const key = localStorage.getItem('SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error('Supabase não configurado. Por favor, configure a URL e a Anon Key.');
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }

  return supabaseInstance;
};

/**
 * Proxy para o cliente Supabase que resolve a instância sob demanda.
 * O uso de bind é crucial para que métodos encadeados (.from().select()) funcionem.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop: keyof SupabaseClient) => {
    const client = getSupabase();
    const value = (client as any)[prop];
    
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});

export const isSupabaseConfigured = () => {
  return !!localStorage.getItem('SUPABASE_URL') && !!localStorage.getItem('SUPABASE_ANON_KEY');
};
