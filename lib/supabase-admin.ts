import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
      );
    }

    _supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Lazy-access proxy — only connects when a property is actually accessed at runtime
export const supabaseAdmin: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSupabaseAdmin() as any)[prop];
    },
  }
);
