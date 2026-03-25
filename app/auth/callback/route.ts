import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { normalizeRole, resolveLandingPath } from '@/lib/auth/roles';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).single() : { data: null } as any;
      const role = normalizeRole((profile as any)?.role, user?.email);
      const landing = resolveLandingPath(role);
      const target = requestedNext || landing;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  // return the user to an error page with instructions if it fails
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
