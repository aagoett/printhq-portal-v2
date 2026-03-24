'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, MessageSquareWarning } from 'lucide-react';

type FeedbackEntry = {
  id: string;
  job_id?: string | null;
  action?: string | null;
  created_at?: string | null;
  payload?: any;
  job?: {
    title?: string | null;
    status?: string | null;
    current_step?: string | null;
  } | null;
  senderName?: string;
};

type Props = {
  items: FeedbackEntry[];
};

const impactTone: Record<string, string> = {
  blocking: 'border-red-200 bg-red-50 text-red-800',
  slows_me_down: 'border-amber-200 bg-amber-50 text-amber-800',
  minor: 'border-slate-200 bg-slate-50 text-slate-700',
};

const typeLabel: Record<string, string> = {
  bug: 'Bug',
  confusing: 'Confusing',
  request: 'Request',
  praise: 'Worked well',
};

export default function FeedbackTriagePanel({ items }: Props) {
  const blocking = items.filter((item) => item.payload?.impact === 'blocking').length;
  const customer = items.filter((item) => item.payload?.source === 'customer').length;
  const internal = items.filter((item) => item.payload?.source === 'internal').length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Feedback inbox</p>
          <h3 className="mt-1 text-lg font-bold text-gray-900">Context-rich issues from live job pages</h3>
          <p className="mt-1 text-sm text-gray-500">Use this as the first-pass review lane: blocking pain first, confusion second, nice-to-haves last.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1">Blocking {blocking}</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1">Customer {customer}</span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">Internal {internal}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            No feedback logged yet. Once people submit from a job page, it lands here with severity, page context, and the exact job.
          </div>
        ) : (
          items.map((item) => {
            const payload = item.payload || {};
            const impactClass = impactTone[payload.impact || 'minor'] || impactTone.minor;
            const submittedAt = item.created_at ? new Date(item.created_at).toLocaleString() : '--';
            return (
              <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${impactClass}`}>
                        {payload.impact === 'blocking' ? <AlertTriangle className="mr-1 inline" size={12} /> : payload.impact === 'slows_me_down' ? <Clock3 className="mr-1 inline" size={12} /> : <CheckCircle2 className="mr-1 inline" size={12} />}
                        {payload.impact?.replace('_', ' ') || 'minor'}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">
                        {typeLabel[payload.type || 'request'] || payload.type}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700">
                        {payload.source === 'customer' ? 'Customer' : 'Internal'}
                      </span>
                    </div>

                    <p className="mt-3 text-base font-bold text-gray-900">{payload.summary || 'Untitled feedback'}</p>
                    {payload.details ? <p className="mt-2 text-sm leading-6 text-gray-600">{payload.details}</p> : null}

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                      {payload.page ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Page: {payload.page}</span> : null}
                      {payload.currentStep ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Step: {payload.currentStep}</span> : null}
                      {item.job?.status ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Job status: {item.job.status}</span> : null}
                      {item.job?.current_step ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Queue: {item.job.current_step}</span> : null}
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Submitted: {submittedAt}</span>
                      {item.senderName ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">From: {item.senderName}</span> : null}
                    </div>
                  </div>

                  <div className="xl:pl-4">
                    {item.job_id ? (
                      <Link href={`/dashboard/jobs/${item.job_id}`} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
                        Open job <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600">
                        <MessageSquareWarning size={14} /> No job link
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
