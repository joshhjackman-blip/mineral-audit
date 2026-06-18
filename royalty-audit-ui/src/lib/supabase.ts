import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singletons so module load doesn't crash when env vars are absent
// (e.g. during `next build` page-data collection). Real env values are
// resolved at first call, which happens at request time.

let _browserClient: SupabaseClient | undefined;

// Browser client — uses anon key, safe to expose
export function getSupabase(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browserClient;
}

// Server client — uses service role key, never exposed to browser
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
