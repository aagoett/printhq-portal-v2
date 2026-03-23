import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
