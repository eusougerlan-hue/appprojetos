
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

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
