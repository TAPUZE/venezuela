// Centralized env access + "mock mode" detection.
// The platform runs fully without secrets (mock mode); drop real keys in .env.local to go live.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  pdfServiceUrl: process.env.PDF_SERVICE_URL ?? "http://127.0.0.1:8000",
  cronSecret: process.env.CRON_SECRET,
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnon);
export const hasSupabaseService = Boolean(env.supabaseUrl && env.supabaseService);
export const hasLLM = Boolean(env.anthropicKey || env.openaiKey);

/** True when core integrations are missing — UI shows a banner and uses canned data. */
export const MOCK_MODE = !hasSupabase || !hasLLM;
