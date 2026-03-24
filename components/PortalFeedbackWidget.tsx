"use client";

import { createBrowserClient } from '@supabase/ssr';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageCircle, Send, X } from 'lucide-react';

export type PortalFeedbackType = 'bug' | 'confusing' | 'request' | 'praise' | 'other';
export type PortalFeedbackImpact = 'blocking' | 'slows_me_down' | 'minor';
export type PortalFeedbackAudience = 'portal' | 'internal';

const TYPE_OPTIONS: { value: PortalFeedbackType; label: string }[] = [
  { value: 'bug', label: 'Something broke' },
  { value: 'confusing', label: 'This was confusing' },
  { value: 'request', label: 'I need a better workflow' },
  { value: 'praise', label: 'This worked well' },
  { value: 'other', label: 'Other' },
];

const IMPACT_OPTIONS: { value: PortalFeedbackImpact; label: string; tone: string }[] = [
  { value: 'blocking', label: 'Blocking', tone: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'slows_me_down', label: 'Slows me down', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'minor', label: 'Minor', tone: 'bg-gray-50 text-gray-700 border-gray-200' },
];

export default function PortalFeedbackWidget({
  pageType,
  pageId,
  pageTitle,
  brandName,
  audience = 'portal',
}: {
  pageType: 'job' | 'quote' | 'other';
  pageId?: string;
  pageTitle?: string | null;
  brandName?: string | null;
  audience?: PortalFeedbackAudience;
}) {
  const pathname = usePathname();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PortalFeedbackType>('bug');
  const [impact, setImpact] = useState<PortalFeedbackImpact>('slows_me_down');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setType('bug');
    setImpact('slows_me_down');
    setSummary('');
    setDetails('');
    setContactEmail('');
    setContactName('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!summary.trim()) {
      setError('Add a quick headline so we know what to fix.');
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = {
      page_type: pageType,
      page_id: pageId || null,
      page_url: typeof window !== 'undefined' ? window.location.href : pathname,
      audience,
      feedback_type: type,
      impact,
      summary: summary.trim(),
      details: details.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_name: contactName.trim() || null,
      metadata: {
        pageTitle: pageTitle || null,
        brandName: brandName || null,
        path: pathname,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : null,
      },
    } as const;

    const { error: insertError } = await supabase.from('portal_feedback').insert(payload);
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message || 'Could not send feedback.');
      return;
    }

    setSubmitted(true);
    reset();
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
    }, 1400);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-gray-800"
      >
        <MessageCircle size={16} /> Feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Feedback</p>
                <h3 className="mt-1 text-lg font-black text-gray-900">What should we fix or improve on this page?</h3>
                <p className="mt-1 text-sm text-gray-500">We capture the page, job/quote ID, and browser automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSubmitted(false);
                }}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-black"
                aria-label="Close feedback"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              {submitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-emerald-800">
                  <CheckCircle2 className="mx-auto mb-3" size={24} />
                  <p className="text-sm font-bold">Saved.</p>
                  <p className="mt-1 text-sm">We saved this with context so the team can triage it.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">{pageType === 'job' ? 'Job' : pageType === 'quote' ? 'Quote' : 'Page'} {pageId ? pageId.slice(0, 8).toUpperCase() : '—'}</span>
                      {pageTitle ? (
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">{pageTitle}</span>
                      ) : null}
                      {brandName ? (
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">{brandName}</span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Type</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setType(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            type === option.value ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-black'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Impact</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {IMPACT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setImpact(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            impact === option.value ? option.tone : 'border-gray-200 bg-white text-gray-700 hover:border-black'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">One-line summary</label>
                    <input
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Example: Approval button feels hidden on mobile"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Details (optional)</label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="What were you trying to do? What happened instead?"
                      className="mt-2 h-28 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Email (optional)</label>
                      <input
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Name (optional)</label>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="So we can follow up"
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle size={14} /> {error}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <AlertTriangle size={14} /> Stored with page + device context for triage.
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={14} /> {submitting ? 'Sending…' : 'Send feedback'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
