export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** When Supabase env vars are missing the app runs in demo mode (no login, in-memory data). */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
