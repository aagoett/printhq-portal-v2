'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

// If you already have this component, keep the import path correct for YOUR repo:
import UploadFilesButton from '../../../components/UploadFilesButton';

export default function NewJobPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Minimal MVP fields. Expand later.
  const [form, setForm] = useState({
    job_name: '',
    product: 'Postcard',
    quantity: 1000,
    due_date: '',
    notes: '',
  });

  const onChange = (key) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((p) => ({ ...p, [key]: val }));
  };

  async function handleCreateJob() {
    setError('');
    setSaving(true);

    try {
      // Must be signed in
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Not signed in.');

      // Create the job (status defaults to WAITING_FOR_FILES)
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .insert([
          {
            job_name: form.job_name.trim(),
            product: form.product,
            quantity: form.quantity,
            due_date: form.due_date || null,
            notes: form.notes || null,
            status: 'WAITING_FOR_FILES',
            user_id: userId,
          },
        ])
        .select('*')
        .single();

      if (jobErr) throw jobErr;
      if (!job?.id) throw new Error('Job created but no id returned.');

      // Go to job detail page (you can build this next)
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to create job.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Submit a New Job</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Create the job first, then upload files on the next screen.
      </p>

      {error ? (
        <div
          style={{
            background: '#3b0d0d',
            border: '1px solid #7f1d1d',
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            color: '#fecaca',
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 16,
          borderRadius: 14,
        }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Job name *</span>
          <input
            value={form.job_name}
            onChange={onChange('job_name')}
            placeholder="e.g., INS Card - Front"
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Product</span>
            <select value={form.product} onChange={onChange('product')} style={inputStyle}>
              <option>Postcard</option>
              <option>Flyer</option>
              <option>Brochure</option>
              <option>Booklet</option>
              <option>Business Card</option>
              <option>Poster</option>
              <option>Other</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={onChange('quantity')}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Due date</span>
          <input type="date" value={form.due_date} onChange={onChange('due_date')} style={inputStyle} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Notes</span>
          <textarea
            value={form.notes}
            onChange={onChange('notes')}
            placeholder="Paper, finishing, special instructions..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <button
          onClick={handleCreateJob}
          disabled={saving || !form.job_name.trim()}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: saving ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.9)',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          {saving ? 'Creating…' : 'Create Job'}
        </button>
      </div>

      <div style={{ marginTop: 20, opacity: 0.8, fontSize: 13 }}>
        Next: we build <code>/jobs/[id]</code> where the customer uploads files + sees proof status.
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.25)',
  color: 'white',
  outline: 'none',
};
