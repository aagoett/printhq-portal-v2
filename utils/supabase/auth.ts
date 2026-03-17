import { createClient } from './server';
import { redirect } from 'next/navigation';

export type UserRole = 'admin' | 'staff' | 'customer';

/**
 * Fetches the current user + their profile role from the server.
 * Returns { user, profile, role } or redirects to /login if not authenticated.
 */
export async function getAuthUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const role: UserRole = profile?.role ?? 'customer';

  return { user, profile, role };
}

/**
 * Requires the user to be admin or staff.
 * Redirects to /dashboard if they are only a customer.
 */
export async function requireInternal() {
  const auth = await getAuthUser();
  if (auth.role !== 'admin' && auth.role !== 'staff') {
    redirect('/dashboard');
  }
  return auth;
}

/**
 * Requires the user to be an admin specifically.
 * Redirects to /dashboard for staff and customers.
 */
export async function requireAdmin() {
  const auth = await getAuthUser();
  if (auth.role !== 'admin') {
    redirect('/dashboard');
  }
  return auth;
}

export function isInternal(role: UserRole) {
  return role === 'admin' || role === 'staff';
}
