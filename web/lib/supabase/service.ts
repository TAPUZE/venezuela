import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseService } from "@/lib/env";

/**
 * Service-role client for server-side agents/webhooks/cron.
 * BYPASSES RLS — use only in trusted server contexts, never in the browser.
 * Returns null in mock mode (no service key configured).
 */
export function createServiceClient() {
  if (!hasSupabaseService) return null;
  return createClient(env.supabaseUrl!, env.supabaseService!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
