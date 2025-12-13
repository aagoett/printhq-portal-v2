'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, signInCustomer } from '@/lib/supabase';
import { Lock, Mail, Building, User, Zap } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactName: '',
  });

  const onChange = (key) => (e) => {
    setFormData((p) => ({ ...p, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const email = String(formData.email || '').trim();
      const password = String(formData.password || '');

      if (!email) throw new Error('Email is required');
      if (!password) throw new Error('Password is required');

      if (mode === 'signup') {
        const companyName = String(formData.companyName || '').trim();
        const contactName = String(formData.contactName || '').trim();

        if (!companyName) throw new Error('Company name is required');
        if (!contactName) throw new Error('Contact name is required');

        await createCustomer({
          email,
          password,
          companyName,
          contactName,
        });

        setSuccess('Account created. You can log in now.');
        setMode('login');
        setLoading(false);
        return;
      }

      await signInCustomer(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B1A] via-[#050B1A] to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-400 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">PRINTHQ</div>
            <div className="text-sm text-white/60">Create your account</div>
          </div>
        </div>

        <div className="flex rounded-xl bg-white/5 p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg py-2 text-sm transition ${
              mode === 'login' ? 'bg-white/10' : 'text-white/70 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm transition ${
              mode === 'signup' ? 'bg-white/10' : 'text-white/70 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <Field
                icon={<Building className="h-4 w-4" />}
                label="Company Name"
                value={formData.companyName}
                onChange={onChange('companyName')}
                placeholder="Pacific Printing"
              />
              <Field
                icon={<User className="h-4 w-4" />}
                label="Contact Name"
                value={formData.contactName}
                onChange={onChange('contactName')}
                placeholder="Andrew Goett"
              />
            </>
          )}

          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email Address"
            value={formData.email}
            onChange={onChange('email')}
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
          />

          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Password"
            value={formData.password}
            onChange={onChange('password')}
            placeholder="••••••••"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 font-medium bg-gradient-to-r from-indigo-500 to-emerald-400 text-black hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Working…' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-xs text-white/50">
          Tip: if login breaks again, it’s almost always because a non-string is being passed as
          <code className="px-1">email</code>/<code className="px-1">password</code>.
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, ...props }) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <div className="text-white/60">{icon}</div>
        <input
          {...props}
          className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
        />
      </div>
    </label>
  );
}
