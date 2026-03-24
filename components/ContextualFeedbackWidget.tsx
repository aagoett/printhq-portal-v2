'use client';

import { createBrowserClient } from '@supabase/ssr';
import { AlertTriangle, CheckCircle2, MessageSquarePlus, Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type FeedbackType = 'bug' | 'confusing' | 'request' | 'praise';
type FeedbackImpact = 'blocking' | 'slows_me_down' | 'minor';

type Props = {
  jobId: string;
  userId?: string | null;
  audience: 'customer' | 'internal';
  jobTitle?: string | null;
  currentStep?: string | null;
  compact?: boolean;
};

const feedbackTypeOptions: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Something broke' },
  { value: 'confusing', label: 'This was confusing' },
  { value: 'request', label: 'Need a better workflow' },
  { value: 'praise', label: 'This worked well' },
];

const impactOptions: { value: FeedbackImpact; label: string }[] = [
  { value: 'blocking', label: 'Blocking' },
  { value: 'slows_me_down', label: 'Slows me down' },
  { value: 'minor', label: 'Minor' },
];

export default function ContextualFeedbackWidget({
  jobId,
  userId,
  audience,
  jobTitle,
  currentStep,
  compact = false,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [impact, setImpact] = useState<FeedbackImpact>('slows_me_down');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [contactOk, setContactOk] = useState(true);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const actionLabel = audience === 'customer' ? 'Customer Feedback' : 'Internal Feedback';
  const triggerLabel = audience === 'customer' ? 'Was anything unclear?' : 'Spot friction or a broken step?';
  const triggerBody = audience === 'customer'
    ? 'Send quick feedback tied to this job page so the shop can fix confusion fast.'
    : 'Capture the exact pain point while you are on the job instead of losing it in chat.';

  const reset = () => {
    setType('bug');
    setImpact('slows_me_down');
    setSummary('');
    setDetails('');
    setContactOk(true);
  };

  const handleSubmit = async () => {
    if (!summary.trim()) {
      alert('Add a one-line summary first.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      kind: 'feedback',
      version: 1,
      source: audience,
      type,
      impact,
      summary: summary.trim(),
      details: details.trim(),
      contactOk,
      page: pathname,
      currentStep: currentStep || null,
      jobTitle: jobTitle || null,
      submittedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('job_logs').insert({
      job_id: jobId,
      job_item_id: null,
      user_id: userId || null,
      action: actionLabel,
      details: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message || 'Could not send feedback.');
      return;
    }

    setSubmitted(true);
    reset();
    window.setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
    }, 1500);
  };

  return (
    <>
      <div className={compact ? '' : 'mt-8'}>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Page feedback</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{triggerLabel}</p>
              <p className="mt-1 text-sm text-gray-500">{triggerBody}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              <MessageSquarePlus size={16} /> Leave feedback
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Contextual feedback</p>
                <h3 className="mt-1 text-lg font-black text-gray-900">What failed, confused, or slowed you down?</h3>
                <p className="mt-1 text-sm text-gray-500">This gets attached to the current job so the team can triage it with context.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSubmitted(false);
                }}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-black"
                aria-label="Close feedback modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              {submitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-emerald-800">
                  <CheckCircle2 className="mx-auto mb-3" size={24} />
                  <p className="text-sm font-bold">Feedback logged.</p>
                  <p className="mt-1 text-sm">Now the team has the page, job, and severity with it.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">Job {jobId.slice(0, 8).toUpperCase()}</span>
                      {jobTitle ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">{jobTitle}</span> : null}
                      {currentStep ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">Step: {currentStep}</span> : null}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">What kind of feedback is this?</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {feedbackTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setType(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${type === option.value ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-black'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Impact</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {impactOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setImpact(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${impact === option.value ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-black'}`}
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
                      placeholder={audience === 'customer' ? 'Example: I could not tell whether the proof was final.' : 'Example: Approval button is too easy to miss in the right rail.'}
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">What happened?</label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="What were you trying to do? What did you expect? What actually happened?"
                      className="mt-2 h-28 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} className="mt-1" />
                    <span>
                      It is okay to contact me about this if the team needs clarification.
                    </span>
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <AlertTriangle size={14} /> Stored with page + job context for triage.
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-black">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={14} /> {isSubmitting ? 'Sending…' : 'Send feedback'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
