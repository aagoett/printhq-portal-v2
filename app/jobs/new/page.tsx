'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type JobForm = {
  title: string;
  product_type: string;
  quantity: string;
  size: string;
  paper: string;
  color: string;
  due_date: string;
  notes: string;
};

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<JobForm>({
    title: '',
    product_type: 'postcard',
    quantity: '',
    size: '',
    paper: '',
    color: '4/4',
    due_date: '',
    notes: '',
  });

  const [files, setFiles] = useState<FileList | null>(null);

  function set<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);

    if (!form.title.trim()) return setError('Job name is required.');
    if (!files || files.length === 0) return setError('Please upload at least 1 file.');

    setLoading(true);
    try {
      // 1) Auth user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('Not signed in.');

      // 2) Create the order/job FIRST
      const specs = {
        product_type: form.product_type,
        quantity: form.quantity ? Number(form.quantity) : null,
        size: form.size || null,
        paper: form.paper || null,
        color: form.color || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
      };

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          title: form.title.trim(),
          status: 'submitted',
          specs,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (orderErr) throw orderErr;
      if (!order?.id) throw new Error('Order create failed (no id).');

      const jobId = order.id as string;

      // 3) Upload files to Storage
      // Store under: job-files/<jobId>/<timestamp>_<originalName>
      const uploadsToInsert: Array<{ bucket: string; path: string; job_id: string; user_id: string }> = [];

      for (const f of Array.from(files)) {
        const safeName = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${jobId}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from('job-files')
          .upload(path, f, { upsert: false });

        if (uploadErr) throw uploadErr;

        uploadsToInsert.push({
          bucket: 'job-files',
          path,
          job_id: jobId,
          user_id: user.id,
        });
      }

      // 4) Insert job_files rows
      const { error: jfErr } = await supabase.from('job_files').insert(uploadsToInsert);
      if (jfErr) throw jfErr;

      // 5) Done → go to job page
      router.push(`/jobs/${jobId}`);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Submit failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Submit New Job</h1>
      <p className="mt-1 text-sm text-gray-500">Create the job, upload files, and send it to production.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Job name *</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g., INS postcard drop"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Product</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={form.product_type}
              onChange={(e) => set('product_type', e.target.value)}
            >
              <option value="postcard">Postcard</option>
              <option value="brochure">Brochure</option>
              <option value="flyer">Flyer</option>
              <option value="booklet">Booklet</option>
              <option value="signage">Signage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="e.g., 5000"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Size</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={form.size}
              onChange={(e) => set('size', e.target.value)}
              placeholder='e.g., 6" x 11"'
            />
          </div>

          <div>
            <label className="text-sm font-medium">Paper</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={form.paper}
              onChange={(e) => set('paper', e.target.value)}
              placeholder="e.g., 100# dull cover"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Color</label>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
            >
              <option value="4/4">4/4</option>
              <option value="4/0">4/0</option>
              <option value="1/1">1/1</option>
              <option value="1/0">1/0</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Due date</label>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            className="mt-1 w-full rounded-lg border p-2"
            rows={4}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything we should know?"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Upload files *</label>
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
          <p className="mt-1 text-xs text-gray-500">PDF preferred. Multiple files allowed.</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit Job'}
        </button>
      </div>
    </div>
  );
}
