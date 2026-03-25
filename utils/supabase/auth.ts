import { redirect } from 'next/navigation';
import { normalizeRole, isInternalRole, type NormalizedRole } from '@/lib/auth/roles';
import { createClient } from './server';

export type UserRole = NormalizedRole;

/**
 * Fetches the current user + their profile role from the server.
 * Returns { user, profile, role } or redirects to /login if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const role: UserRole = normalizeRole((profile as any)?.role, user.email);

  return { user, profile, role };
}

/**
 * Requires the user to be admin, staff, or csr/bindery.
 * Redirects to /dashboard if they are only a customer.
 */
export async function requireInternal() {
  const auth = await getAuthUser();
  if (!isInternalRole(auth.role)) {
    redirect('/dashboard');
  }
  return auth;
}

/**
 * Requires the user to be an admin specifically.
 * Redirects to /dashboard for staff/customers.
 */
export async function requireAdmin() {
  const auth = await getAuthUser();
  if (auth.role !== 'admin') {
    redirect('/dashboard');
  }
  return auth;
}

export function isInternal(role: UserRole) {
  return isInternalRole(role);
}
