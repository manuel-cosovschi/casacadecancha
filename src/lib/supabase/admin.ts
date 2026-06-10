import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con SERVICE ROLE KEY. Ignora RLS.
 * USAR SÓLO EN EL SERVIDOR (server actions / route handlers).
 * Nunca importar desde un componente cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role no configurado.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
