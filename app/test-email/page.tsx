'use client';

import { sendTestEmail } from '../actions/send-test-email';
import { useState } from 'react';

export default function TestEmailPage() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleSubmit(formData: FormData) {
    const result = await sendTestEmail(formData);
    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      alert(result.error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Test Email Delivery</h1>
        
        {status === 'success' ? (
          <div className="rounded-lg bg-green-50 p-4 text-green-700">
            ✅ Email sent! Check your inbox.
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Send to:</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-md border p-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                *Must be your verified Resend account email
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              Send Test Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
