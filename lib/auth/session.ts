import { createClient } from '@/utils/supabase/server'
import { normalizeRole, type NormalizedRole } from './roles'

export async function resolveServerSession() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, profile: null, role: 'customer' as NormalizedRole, error: userError }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = normalizeRole((profile as any)?.role, user.email)

  return { supabase, user, profile, role, error: profileError }
}
