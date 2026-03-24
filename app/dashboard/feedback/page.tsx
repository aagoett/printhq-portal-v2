"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerPortalShell from '@/components/CustomerPortalShell';
import { AlertTriangle, ClipboardList, Loader2, Mail, MessageCircle, Rocket, ShieldX, Sparkles } from 'lucide-react';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  new: { label: 'New', tone: 'bg-red-50 text-red-800 border-red-200' },
  triaged: { label: 'Triaged', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'Approved', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  rejected: { label: 'Rejected', tone: 'bg-gray-100 text-gray-700 border-gray-200' },
  shipped: { label: 'Shipped', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

type FeedbackRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  status: keyof typeof STATUS_META;
  page_type: 'job' | 'quote' | 'other';
  page_id?: string | null;
  page_url?: string | null;
  audience: string;
  feedback_type: string;
  impact: string;
  summary: string;
  details?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  triage_note?: string | null;
  metadata?: any;
};

const isInternalRole = (role?: string | null) => {
  const key = (role || '').toLowerCase();
  if (!key) return false;
  return ['admin', 'manager', 'staff', 'staff-production', 'csr', 'owner', 'production'].some((k) => key.includes(k));
};

export default function FeedbackReviewPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');
  const [entries, setEntries] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | keyof typeof STATUS_META>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setRole(profile?.role || 'customer');

    const { data } = await supabase
      .from('portal_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    setEntries((data as FeedbackRow[]) || []);
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, status: FeedbackRow['status']) => {
    setSavingId(id);
    const note = noteDrafts[id] ?? entries.find((e) => e.id === id)?.triage_note ?? null;
    const { error } = await supabase
      .from('portal_feedback')
      .update({ status, triage_note: note || null, handled_by: userId || null })
      .eq('id', id);

    if (!error) {
      setEntries((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, status, triage_note: note || null, updated_at: new Date().toISOString() } : row
        )
      );
    } else {
      alert(error.message || 'Could not update status');
    }
    setSavingId('');
  };

  const filteredEntries = entries.filter((entry) =>
    statusFilter === 'all' ? true : entry.status === statusFilter
  );

  const statusCounts = entries.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const internal = isInternalRole(role);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!internal) {
    return (
      <CustomerPortalShell
        title="Feedback review"
        description="This queue is staff-only."
        activeHref="/dashboard/feedback"
        eyebrow="Internal"
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <ShieldX size={18} /> This view is restricted to internal roles.
          </div>
          <p className="mt-2 text-sm text-amber-800">Sign in with a staff account to triage feedback.</p>
        </div>
      </CustomerPortalShell>
    );
  }

  return (
    <CustomerPortalShell
      title="Feedback triage"
      description="Central queue for portal/app feedback with statuses."
      activeHref="/dashboard/feedback"
      eyebrow="Internal surface"
      actions={
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-700 border border-red-200">New {statusCounts['new'] || 0}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 border border-amber-200">Triaged {statusCounts['triaged'] || 0}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800 border border-blue-200">Approved {statusCounts['approved'] || 0}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 border border-emerald-200">Shipped {statusCounts['shipped'] || 0}</span>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: 'all', label: 'All' }, ...Object.keys(STATUS_META).map((key) => ({ key }))].map((option) => {
          const key = option.key as 'all' | keyof typeof STATUS_META;
          const meta = STATUS_META[key as keyof typeof STATUS_META];
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
                statusFilter === key
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-black'
              }`}
            >
              {key === 'all' ? 'All' : meta?.label || key}
              {key !== 'all' ? ` (${statusCounts[key] || 0})` : ''}
            </button>
          );
        })}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
          <ClipboardList className="mx-auto mb-3 text-gray-300" size={28} />
          No feedback in this bucket.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const statusMeta = STATUS_META[entry.status] || STATUS_META['new'];
            return (
              <div key={entry.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                        {entry.feedback_type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                        Impact: {entry.impact}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                        {entry.page_type} {entry.page_id ? entry.page_id.slice(0, 8).toUpperCase() : '—'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                        {entry.audience === 'portal' ? <MessageCircle size={12} /> : <Sparkles size={12} />} {entry.audience}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900">{entry.summary}</h3>
                    {entry.details ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{entry.details}</p>
                    ) : (
                      <p className="text-sm text-gray-500">No extra detail.</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>Submitted {new Date(entry.created_at).toLocaleString()}</span>
                      {entry.page_url ? (
                        <a
                          href={entry.page_url}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          Open page
                        </a>
                      ) : null}
                      {entry.contact_email ? (
                        <a
                          href={`mailto:${entry.contact_email}`}
                          className="inline-flex items-center gap-1 text-gray-700 hover:text-black"
                        >
                          <Mail size={12} /> {entry.contact_email}
                        </a>
                      ) : null}
                      {entry.contact_name ? <span>Contact: {entry.contact_name}</span> : null}
                      {entry.metadata?.brandName ? <span>Brand: {entry.metadata.brandName}</span> : null}
                    </div>
                  </div>

                  <div className="w-full max-w-xs space-y-3">
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Triage note</label>
                    <textarea
                      value={noteDrafts[entry.id] ?? entry.triage_note ?? ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                      placeholder="What did we decide to do?"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-black"
                    />

                    <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                      <button
                        onClick={() => handleStatusUpdate(entry.id, 'triaged')}
                        disabled={savingId === entry.id}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 hover:border-amber-300"
                      >
                        <AlertTriangle size={14} className="inline mr-1" /> Triaged
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(entry.id, 'approved')}
                        disabled={savingId === entry.id}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 hover:border-blue-300"
                      >
                        <Sparkles size={14} className="inline mr-1" /> Approved
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(entry.id, 'rejected')}
                        disabled={savingId === entry.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 hover:border-gray-300"
                      >
                        <ShieldX size={14} className="inline mr-1" /> Reject
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(entry.id, 'shipped')}
                        disabled={savingId === entry.id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 hover:border-emerald-300"
                      >
                        <Rocket size={14} className="inline mr-1" /> Shipped
                      </button>
                    </div>

                    <button
                      onClick={() => handleStatusUpdate(entry.id, entry.status)}
                      disabled={savingId === entry.id}
                      className="w-full rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {savingId === entry.id ? 'Saving…' : 'Update note only'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CustomerPortalShell>
  );
}
