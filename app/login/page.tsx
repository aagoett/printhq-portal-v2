'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

// Supabase Helper
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage({ text: error.message, type: 'error' });
        setIsLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ text: 'Check your email for the confirmation link!', type: 'success' });
        setEmail('');
        setPassword('');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      
      {/* LEFT SIDE: The "Inspiring" Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center overflow-hidden">
        {/* Background Image - Abstract CMYK/Print Vibe */}
        <div 
          className="absolute inset-0 z-0 opacity-80"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

        {/* Hero Text */}
        <div className="relative z-20 p-12 text-white max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Bring your ideas <br/> to <span className="text-blue-400">life.</span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Welcome to the PrintHQ Portal. Streamline your workflow, track your jobs, and deliver perfection every time.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: The Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {mode === 'signin' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'signin' ? 'Enter your details to access your workspace.' : 'Get started with your free PrintHQ account.'}
            </p>
          </div>

          {/* GOOGLE BUTTON */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 text-gray-400">Or using email</span>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleEmailAuth} className="space-y-5">
            {message && (
              <div className={`p-4 rounded-lg text-sm flex items-center ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {message.type === 'error' && <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />}
                {message.text}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-end">
                <Link href="/forgot-password" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-gray-900/30 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-70 transition-all duration-200"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </form>

          {/* FOOTER */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'signin' ? "New to PrintHQ? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setMessage(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                {mode === 'signin' ? 'Get started' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
