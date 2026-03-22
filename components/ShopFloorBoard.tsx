import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, User, Layers, ChevronRight, PauseCircle, PlayCircle, FileText } from 'lucide-react';

// Lightweight board view for shop floor queues
// Jobs are pre-filtered before being passed here

type BoardJob = any;
type BoardColumn = { queueName: string; jobs: BoardJob[] };
type BoardStats = { total: number; blocked: number; waiting: number; ready: number; unassigned: number };

type Props = {
  columns: BoardColumn[];
  boardStats: BoardStats;
  staffLookup: Record<string, string>;
  onOpenItemDrawer: (itemId: string) => void;
  formatDate: (value?: string | null) => string;
};

type BucketKey = 'blocked' | 'waiting' | 'ready' | 'progress';

const bucketMeta: Record<BucketKey, { label: string; color: string; badge: string }> = {
  blocked: {
    label: 'Blocked / Hold',
    color: 'border-red-200 bg-red-50/60',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  waiting: {
    label: 'Waiting on Customer',
    color: 'border-amber-200 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  ready: {
    label: 'Ready Now',
    color: 'border-emerald-200 bg-emerald-50/60',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  progress: {
    label: 'In Progress',
    color: 'border-blue-200 bg-blue-50/60',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
};

const getBucketForJob = (job: any): BucketKey => {
  const statusText = String(job?.status || '').toLowerCase();
  const stepText = String(job?.current_step || '').toLowerCase();
  const waiting = Boolean(job?.isWaiting) || statusText.includes('waiting') || statusText.includes('customer');
  const hold = statusText.includes('hold') || statusText.includes('blocked') || stepText.includes('hold');
  if (hold || job?.isBlocked) return 'blocked';
  if (waiting) return 'waiting';
  if (job?.isReady || statusText.includes('ready')) return 'ready';
  return 'progress';
};

const getItemProgress = (item: any) => {
  const steps = Array.isArray(item?.job_item_steps)
    ? [...item.job_item_steps].sort(
        (a, b) => new Date(a.created_at || a.inserted_at || 0).getTime() - new Date(b.created_at || b.inserted_at || 0).getTime()
      )
    : [];
  const nextStep = steps.find((s) => s.status !== 'Completed')?.step_name || 'Complete';
  const completed = steps.filter((s) => s.status === 'Completed').length;
  const total = steps.length;
  return { nextStep, completed, total };
};

const JobCard = ({ job, staffLookup, onOpenItemDrawer, formatDate }: { job: any; staffLookup: Record<string, string>; onOpenItemDrawer: (itemId: string) => void; formatDate: (value?: string | null) => string }) => {
  const items = Array.isArray(job?.job_items) ? job.job_items : job?.activeItems || [];
  const visibleItems = items.slice(0, 3);
  const bucket = getBucketForJob(job);
  const dueLabel = job?.dueStatus?.label || '--';
  const dueColor = job?.dueStatus?.color || 'text-gray-500';
  const owner = job?.assigned_to ? staffLookup[job.assigned_to] || 'Assigned' : 'Unassigned';
  const brand = job?.orders?.brands?.name || job?.brand || 'PrintHQ';

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${bucketMeta[bucket].color}`}>
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
            <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-white">{brand}</span>
            <span className="text-gray-500">{formatDate(job?.created_at)}</span>
          </div>
          <Link href={`/dashboard/jobs/${job?.id || ''}`} className="text-base font-bold text-gray-900 hover:text-blue-700">
            {job?.title || 'Untitled job'}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className={`font-bold ${dueColor}`}>Due: {dueLabel}</span>
            <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">#{String(job?.id || '').substring(0, 6).toUpperCase()}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-600">
              <User size={12} /> {owner}
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${bucketMeta[bucket].badge}`}>
          {bucketMeta[bucket].label}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        {visibleItems.map((item: any) => {
          const waiting = item?.waitingOnArt || item?.artwork_status === 'Waiting on Art' || item?.artworkStatus === 'Waiting on Art';
          const { nextStep, completed, total } = getItemProgress(item);
          return (
            <div key={item?.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item?.description || 'Item'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                    {item?.quantity ? <span className="font-bold">Qty {Number(item.quantity).toLocaleString()}</span> : null}
                    {item?.size ? <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">{item.size}</span> : null}
                    {waiting ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-black uppercase tracking-wide text-amber-800">
                        <AlertTriangle size={12} /> Waiting on art
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-700 border border-gray-200">
                  {item?.status || nextStep || 'Pending'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">
                  <Layers size={11} /> Next: {nextStep}
                </span>
                {total > 0 && (
                  <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">
                    {completed}/{total} steps
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenItemDrawer(item.id)}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white hover:bg-gray-800"
                >
                  <FileText size={12} /> Details
                </button>
              </div>
            </div>
          );
        })}
        {items.length > visibleItems.length && (
          <div className="text-[11px] font-semibold text-gray-500">+{items.length - visibleItems.length} more item(s)</div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-[11px] font-semibold text-gray-500">
        <div className="flex items-center gap-2">
          <Clock size={12} /> Entered {formatDate(job?.created_at)}
        </div>
        <Link href={`/dashboard/jobs/${job?.id || ''}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-bold text-gray-700 hover:text-black">
          Open <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
};

export default function ShopFloorBoard({ columns, boardStats, staffLookup, onOpenItemDrawer, formatDate }: Props) {
  const safeColumns = columns && columns.length ? columns : [{ queueName: 'All Work', jobs: [] }];
  const bucketOrder: BucketKey[] = ['blocked', 'waiting', 'ready', 'progress'];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Total</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{boardStats.total}</p>
          <p className="text-sm text-gray-500">Jobs visible in this view</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-700">Blocked</p>
          <p className="mt-2 text-3xl font-black text-red-800">{boardStats.blocked}</p>
          <p className="text-sm text-red-700">Late or on hold</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Waiting</p>
          <p className="mt-2 text-3xl font-black text-amber-800">{boardStats.waiting}</p>
          <p className="text-sm text-amber-700">Customer dependency</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Ready</p>
          <p className="mt-2 text-3xl font-black text-emerald-800">{boardStats.ready}</p>
          <p className="text-sm text-emerald-700">Ready to run</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Unassigned</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{boardStats.unassigned}</p>
          <p className="text-sm text-gray-500">Needs owner</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {safeColumns.map((column) => (
          <div key={column.queueName} className="min-w-[360px] flex-1 rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Queue</p>
                <h3 className="text-xl font-black text-gray-900">{column.queueName}</h3>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold uppercase text-gray-700">{column.jobs.length} jobs</span>
            </div>

            {bucketOrder.map((bucket) => {
              const jobs = (column.jobs || []).filter((job: any) => getBucketForJob(job) === bucket);
              return (
                <div key={`${column.queueName}-${bucket}`} className={`border-b border-gray-100 px-5 py-4 last:border-b-0 ${bucketMeta[bucket].color}`}>
                  <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                    <div className="flex items-center gap-2">
                      {bucket === 'blocked' ? <PauseCircle size={14} className="text-red-600" /> : null}
                      {bucket === 'waiting' ? <AlertTriangle size={14} className="text-amber-600" /> : null}
                      {bucket === 'ready' ? <PlayCircle size={14} className="text-emerald-600" /> : null}
                      {bucket === 'progress' ? <Layers size={14} className="text-blue-600" /> : null}
                      {bucketMeta[bucket].label}
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black text-gray-700">{jobs.length}</span>
                  </div>
                  {jobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 p-4 text-[11px] font-semibold text-gray-400">
                      Nothing here right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job: any) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          staffLookup={staffLookup}
                          onOpenItemDrawer={onOpenItemDrawer}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
