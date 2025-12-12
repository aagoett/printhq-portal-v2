'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, signInCustomer } from '../../lib/supabase';
import { Lock, Mail, Building, User, Zap } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactName: '',
  });

  // ✅ IMPORTANT: always use e.target.value here, never pass e directly into auth funcs
  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e?.target?.value ?? '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const email = String(formData.email ?? '').trim();
      const password = String(formData.password ?? '');

      if (!email) throw new Error('Email is missing');
      if (!password) throw new Error('Password is missing');

      if (mode === 'login') {
        // ✅ MUST pass strings only
        await signInCustomer(email, password);
        router.push('/dashboard');
        return;
      }

      // signup
      await createCustomer({
        email,
        password,
        companyName: String(formData.companyName ?? '').trim(),
        contactName: String(formData.contactName ?? '').trim(),
      });

      setSuccess('Account created! You can log in now.');
      setMode('login');
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">PRINTHQ</h1>
            <p className="text-sm text-slate-300">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex w-full rounded-xl bg-slate-800/50 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={handleChange('companyName')}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="PrintedUnion"
                    autoComplete="organization"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contact Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={handleChange('contactName')}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Andrew Goett"
                    autoComplete="name"
                  />
                </div>
              </div>
            </>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 py-2.5 pl-10 pr-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Working…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
              setSuccess('');
            }}
            className="text-slate-200 hover:text-white underline underline-offset-4"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
