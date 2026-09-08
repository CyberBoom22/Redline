import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client.
 *
 * Only the anon key belongs here. The `VITE_` prefix is what tells Vite to
 * inline a variable into the client bundle, so a service role key must never
 * carry it — that key lives in GitHub Actions secrets and nowhere else.
 *
 * Configuration is checked once, at module load. A missing variable produces a
 * named error the admin screens surface verbatim, rather than a client built
 * from `undefined` that fails later with something unreadable. The public app
 * does not import this module, so an unconfigured deployment still serves the
 * planner, catalog and the rest normally.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const missing = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean) as string[];

export const supabaseConfigError: string | null =
  missing.length === 0
    ? null
    : `Supabase is not configured. Missing ${missing.join(' and ')}. ` +
      `Copy .env.example to .env.local and fill in the Project URL and anon key ` +
      `from your Supabase dashboard under Settings → API, then restart the dev server.`;

export const supabase: SupabaseClient | null =
  supabaseConfigError === null ? createClient(url as string, anonKey as string) : null;

/** Use inside admin code paths, where a configured client is a precondition. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  return supabase;
}
