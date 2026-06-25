// Mock file to support compilation after migrating to full PostgreSQL.
// All database queries are now proxied secure-and-direct through the backend.

export const resetSupabaseClient = () => {};

export const getSupabase = () => {
  return {} as any;
};

export const supabase = {} as any;

export const isSupabaseConfigured = () => {
  return true; // PostgreSQL is always configured and active on the backend!
};
