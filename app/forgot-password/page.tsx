'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/update-password`, // This is the page we will create next
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setIsSent(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        <Link href="/login" className="flex items-center text-sm text-gray-500 hover:text-black mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-2">Enter your email to receive reset instructions.</p>
        </div>

        {isSent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-in fade-in zoom-in">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-bold text-green-800">Check your email</h3>
            <p className="text-sm text-green-700 mt-2">We have sent a password reset link to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-black transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
