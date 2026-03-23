'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  PauseCircle,
  PlayCircle,
  User,
  Users,
  MessageSquare,
  Send,
  UploadCloud,
} from 'lucide-react';

// Lightweight board view for shop floor queues
// Jobs are pre-filtered before being passed here

type BoardJob = any;
type BoardColumn = { queueName: string; jobs: BoardJob[] };
type BoardStats = {
  total: number;
  blocked: number;
  waiting: number;
  ready: number;
  readyUnclaimed?: number;
  unassigned: number;
  orphaned: number;
  agingWaits: number;
  splitOwner: number;
};
type StaffOption = { id: string; first_name?: string; email?: string };
type OwnerLoadRow = {
  id: string;
  name: string;
  jobs: number;
  activeItems: number;
  blockedJobs: number;
  dueTodayJobs: number;
  status?: string;
  reason?: string;
  jobIds?: string[];
  reassignmentNeeded?: boolean;
  suggestedMoves?: number;
  unclaimedReady?: number;
};

type BulkAuditContext = {
  reason?: string;
  mode?: 'assign' | 'clear';
  selection?: {
    jobs: number;
    items: number;
    owners: number;
    ready: number;
    blocked: number;
    waiting: number;
    inherited: number;
    splitOwnerJobs: number;
    scope: 'jobs' | 'items' | 'both';
  };
  risky?: boolean;
  source?: 'shop-floor-bulk';
};

type CsrActionKey = 'waiting_customer' | 'request_art' | 'send_proof' | 'message_customer';

type Props = {
  columns: BoardColumn[];
  boardStats: BoardStats;
  ownerLoadRows: OwnerLoadRow[];
  staffLookup: Record<string, string>;
  staffOptions: StaffOption[];
  currentUserId?: string | null;
  onAssignJob: (jobId: string, staffId: string, audit?: BulkAuditContext) => void;
  onAssignItem?: (itemId: string, staffId: string | null, extraUpdates?: Record<string, any>, audit?: BulkAuditContext) => void;
  onOpenItemDrawer: (itemId: string) => void;
  formatDate: (value?: string | null) => string;
  readOnly?: boolean;
  showOwnerLoad?: boolean;
  enableReassignmentPanel?: boolean;
  lensId?: string;
  csrShortcutsEnabled?: boolean;
  onCsrAction?: (job: any, action: CsrActionKey) => void;
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

const getOwnerLabel = (staffId: string | null | undefined, staffLookup: Record<string, string>) => {
  if (!staffId) return 'Unassigned';
  return staffLookup[staffId] || 'Assigned';
};

const deriveOwnerSignal = (owner: OwnerLoadRow) => {
  const derivedStatus = owner.activeItems >= 8 || owner.blockedJobs >= 3 ? 'overloaded' : owner.activeItems >= 5 || owner.blockedJobs >= 1 ? 'stretched' : 'healthy';
  const status = (owner.status === 'overloaded' || owner.status === 'stretched' || owner.status === 'healthy' ? owner.status : derivedStatus) as 'healthy' | 'stretched' | 'overloaded';
  const reassignmentNeeded = owner.reassignmentNeeded ?? (status !== 'healthy' && owner.activeItems >= 5);
  const suggestedMoves = owner.suggestedMoves ?? (status === 'overloaded' ? Math.max(1, owner.activeItems - 6) : status === 'stretched' ? 1 : 0);
  const unclaimedReady = owner.unclaimedReady ?? 0;
  return { status, reassignmentNeeded, suggestedMoves, unclaimedReady };
};

const SelectionCheckbox = ({ checked, onChange, ariaLabel, disabled = false }: { checked: boolean; onChange: () => void; ariaLabel: string; disabled?: boolean }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={checked}
    onClick={disabled ? undefined : onChange}
    disabled={disabled}
    className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${checked ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-transparent hover:border-gray-500'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    <span className="text-[11px] font-black">✓</span>
  </button>
);

const QueueOwnershipBar = ({
  job,
  staffLookup,
  staffOptions,
  currentUserId,
  onAssignJob,
  readOnly = false,
  lensId,
}: {
  job: any;
  staffLookup: Record<string, string>;
  staffOptions: StaffOption[];
  currentUserId?: string | null;
  onAssignJob: (jobId: string, staffId: string) => void;
  readOnly?: boolean;
  lensId?: string;
}) => {
  const allowActions = !readOnly;
  const assignedTo = job?.assigned_to || '';
  const ownerName = getOwnerLabel(assignedTo, staffLookup);
  const canClaim = allowActions && Boolean(currentUserId) && assignedTo !== currentUserId;
  const canUnclaim = allowActions && Boolean(assignedTo);
  const queueItems = Array.isArray(job?.activeItems) && job.activeItems.length ? job.activeItems : Array.isArray(job?.job_items) ? job.job_items : [];
  const distinctVisibleOwners = new Set(queueItems.map((item: any) => item?.assigned_to).filter(Boolean)).size;
  const ownerStatus = job?.ownerLoadStatus as 'healthy' | 'stretched' | 'overloaded' | undefined;
  const needsReassignment = Boolean(job?.needsReassignment);

  return (
    <div className={`rounded-xl border p-3 ${needsReassignment ? 'border-amber-300 bg-amber-50/80' : 'border-gray-200 bg-gray-50/80'}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Queue ownership</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-gray-700 border border-gray-200">
              <User size={12} /> {ownerName}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-gray-600 border border-gray-200">
              {queueItems.length} active item{queueItems.length === 1 ? '' : 's'}
            </span>
            {ownerStatus && ownerStatus !== 'healthy' ? (
              <span className={`rounded-full px-2.5 py-1 font-semibold border ${ownerStatus === 'overloaded' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {ownerStatus === 'overloaded' ? 'Owner overloaded' : 'Owner stretched'}
              </span>
            ) : null}
            {distinctVisibleOwners > 1 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                <Users size={12} /> Mixed item ownership visible
              </span>
            ) : null}
            {needsReassignment ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800">
                <AlertTriangle size={12} /> Reassignment recommended
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canClaim ? (
            <button
              type="button"
              onClick={() => onAssignJob(job.id, currentUserId || '')}
              className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white hover:bg-gray-800"
            >
              <User size={12} /> Claim
            </button>
          ) : null}
          {canUnclaim ? (
            <button
              type="button"
              onClick={() => onAssignJob(job.id, '')}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-gray-700 hover:border-gray-300 hover:text-black"
            >
              <PauseCircle size={12} /> Unclaim
            </button>
          ) : null}
          {allowActions ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
              <ArrowRightLeft size={12} className="text-gray-400" />
              <select
                value={assignedTo}
                onChange={(e) => onAssignJob(job.id, e.target.value)}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide text-gray-700 focus:ring-0 border-none pr-6"
                aria-label={`Assign owner for ${job?.title || 'job'}`}
                disabled={!allowActions}
              >
                <option value="">Unassigned</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name || s.email?.split('@')[0] || 'Staff'}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const JobCard = ({
  job,
  staffLookup,
  staffOptions,
  currentUserId,
  onAssignJob,
  onAssignItem,
  onOpenItemDrawer,
  formatDate,
  isSelected,
  selectedItemIds,
  onToggleJob,
  onToggleItem,
  readOnly = false,
  csrShortcutsEnabled = false,
  onCsrAction,
  lensId,
}: {
  job: any;
  staffLookup: Record<string, string>;
  staffOptions: StaffOption[];
  currentUserId?: string | null;
  onAssignJob: (jobId: string, staffId: string, audit?: BulkAuditContext) => void;
  onAssignItem?: (itemId: string, staffId: string | null, extraUpdates?: Record<string, any>, audit?: BulkAuditContext) => void;
  onOpenItemDrawer: (itemId: string) => void;
  formatDate: (value?: string | null) => string;
  isSelected: boolean;
  selectedItemIds: Set<string>;
  onToggleJob: (jobId: string) => void;
  onToggleItem: (itemId: string) => void;
  readOnly?: boolean;
  csrShortcutsEnabled?: boolean;
  onCsrAction?: (job: any, action: CsrActionKey) => void;
  lensId?: string;
}) => {
  const allowOwnershipActions = !readOnly;
  const allowItemActions = !readOnly;
  const allowBulkSelection = !readOnly;
  const items = Array.isArray(job?.job_items) ? job.job_items : job?.activeItems || [];
  const visibleItems = items.slice(0, 3);
  const isCsrLens = lensId === 'csr';
  const csrActionState = job?.csrActionState || { label: 'No customer action', tone: 'slate', group: 'clear' };
  const csrToneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  } as const;
  const customerActionMeta: Record<string, { label: string; tone: keyof typeof csrToneClasses }> = {
    upload_artwork: { label: 'Need artwork', tone: 'amber' },
    approve_proof: { label: 'Waiting for proof approval', tone: 'blue' },
    review_quote: { label: 'Customer review needed', tone: 'violet' },
    provide_info: { label: 'Need info', tone: 'amber' },
    other: { label: 'Customer action', tone: 'slate' },
  };
  const bucket = getBucketForJob(job);
  const dueLabel = job?.dueStatus?.label || '--';
  const dueColor = job?.dueStatus?.color || 'text-gray-500';
  const owner = job?.assigned_to ? staffLookup[job.assigned_to] || 'Assigned' : 'Unassigned';
  const brand = job?.orders?.brands?.name || job?.brand || 'PrintHQ';
  const activeItems = Array.isArray(job?.activeItems) ? job.activeItems : items.filter((item: any) => item?.status !== 'Completed');
  const queueItems = activeItems.filter((item: any) => item?.status === job?.current_step);
  const inheritedItemCount = visibleItems.filter((item: any) => !item?.assigned_to && job?.assigned_to).length;
  const lastTouchedDays = typeof job?.lastTouchedDays === 'number' ? job.lastTouchedDays : null;
  const lastTouchedLabel = lastTouchedDays != null ? (lastTouchedDays === 0 ? 'Touched today' : `${lastTouchedDays}d ago`) : null;
  const proofBadge = job?.portal_visibility === 'proof_live' ? 'Proof live' : (job?.proofStatus || '').trim();
  const customerActionTone = job?.customer_action_required ? customerActionMeta[job?.customer_action_type || 'other'] || customerActionMeta.other : null;
  const followUpState = job?.followUpState;
  const followUpToneClass = followUpState?.displayStatus === 'overdue'
    ? 'border-red-200 bg-red-50 text-red-800'
    : followUpState?.displayStatus === 'today'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : followUpState?.displayStatus === 'scheduled'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : followUpState?.summary
          ? 'border-gray-200 bg-white text-gray-700'
          : 'border-red-200 bg-red-50 text-red-800';

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${bucketMeta[bucket].color} ${isSelected ? 'ring-2 ring-black/80' : ''}`}>
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 gap-3">
          <div className="pt-1">
            {allowBulkSelection ? (
              <SelectionCheckbox checked={isSelected} onChange={() => onToggleJob(job.id)} ariaLabel={`Select ${job?.title || 'job'}`} disabled={!allowBulkSelection} />
            ) : null}
          </div>
          <div className="space-y-1 min-w-0">
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
              <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">{job?.customerName || 'Customer'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-600">
                <User size={12} /> {owner}
              </span>
              <span className="rounded-full bg-gray-50 px-2 py-1 font-semibold text-gray-600 border border-gray-200">
                {activeItems.length} active item{activeItems.length === 1 ? '' : 's'}
              </span>
              {queueItems.length > 0 && queueItems.length !== activeItems.length ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                  {queueItems.length} in this queue now
                </span>
              ) : null}
              {job?.isOrphaned ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
                  Orphaned work
                </span>
              ) : null}
              {job?.isAgingWait ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                  Waiting {job?.ageDays}+d
                </span>
              ) : null}
              {job?.isSplitOwner ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                  Split owner
                </span>
              ) : null}
              {job?.needsReassignment ? (
                <span className="rounded-full border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-800">
                  Reassign to protect flow
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${bucketMeta[bucket].badge}`}>
          {bucketMeta[bucket].label}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
          {proofBadge ? (<span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-800">Proof: {proofBadge}</span>) : null}
          {customerActionTone ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${csrToneClasses[customerActionTone.tone]}`}>
              Customer: {customerActionTone.label}
            </span>
          ) : null}
          {followUpState ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${followUpToneClass}`}>
              Follow-up: {followUpState.displayAt ? `${followUpState.badgeLabel} · ${followUpState.displayValue}` : followUpState.summary}
            </span>
          ) : null}
          {lastTouchedLabel ? (<span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">{lastTouchedLabel}</span>) : null}
          {job?.waitingItems?.length ? (<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">Waiting items: {job.waitingItems.length}</span>) : null}
        </div>
        {followUpState ? (
          <div className={`rounded-xl border px-3 py-2 text-[11px] ${followUpToneClass}`}>
            <p className="font-black uppercase tracking-[0.16em]">{followUpState.displayLabel}</p>
            <p className="mt-1 font-semibold">{followUpState.summary}</p>
            <p className="mt-1 opacity-80">{followUpState.displayAt ? `${followUpState.displayValue} · ${followUpState.helperText}` : followUpState.helperText}</p>
          </div>
        ) : null}
        {csrShortcutsEnabled && onCsrAction ? (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button type="button" onClick={() => onCsrAction(job, 'waiting_customer')} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-black uppercase tracking-wide text-gray-700 hover:border-black"><PauseCircle size={12} /> Wait on customer</button>
            <button type="button" onClick={() => onCsrAction(job, 'request_art')} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-black uppercase tracking-wide text-gray-700 hover:border-black"><UploadCloud size={12} /> Request art</button>
            <button type="button" onClick={() => onCsrAction(job, 'send_proof')} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-black uppercase tracking-wide text-gray-700 hover:border-black"><Send size={12} /> Send proof</button>
            <button type="button" onClick={() => onCsrAction(job, 'message_customer')} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-black uppercase tracking-wide text-gray-700 hover:border-black"><MessageSquare size={12} /> Message</button>
          </div>
        ) : null}
        {isCsrLens ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">CSR view</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className={`rounded-full border px-2.5 py-1 ${csrToneClasses[(csrActionState.tone || 'slate') as keyof typeof csrToneClasses] || csrToneClasses.slate}`}>{csrActionState.label}</span>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">Customer: {job?.customerName || 'Customer'}</span>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">Brand: {job?.brandName || 'PrintHQ'}</span>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">Owner: {owner}</span>
                  {String(job?.status || '').toLowerCase().includes('proof approved') ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">Proof approved</span> : null}
                  {String(job?.status || '').toLowerCase().includes('changes requested') ? <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-800">Changes requested</span> : null}
                </div>
              </div>
              <Link href={`/dashboard/jobs/${job?.id || ''}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-gray-700 border border-gray-200 hover:border-black">
                Open CSR detail <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ) : null}

        <QueueOwnershipBar
          job={job}
          staffLookup={staffLookup}
          staffOptions={staffOptions}
          currentUserId={currentUserId}
          onAssignJob={onAssignJob}
          readOnly={readOnly}
        />

        {inheritedItemCount > 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-500">
            {inheritedItemCount} visible item{inheritedItemCount === 1 ? '' : 's'} currently inheriting the queue owner because item-level owner is blank.
          </div>
        ) : null}

        {visibleItems.map((item: any) => {
          const waiting = item?.waitingOnArt || item?.artwork_status === 'Waiting on Art' || item?.artworkStatus === 'Waiting on Art';
          const { nextStep, completed, total } = getItemProgress(item);
          const itemOwner = getOwnerLabel(item?.assigned_to || job?.assigned_to, staffLookup);
          const itemOwnerSource = item?.assigned_to ? 'Item owner' : job?.assigned_to ? 'Inherited from queue owner' : 'Needs claim';
          const statusLabel = item?.status || nextStep || 'Pending';
          const isOffQueue = job?.current_step && item?.status && item.status !== job.current_step && item.status !== 'Completed';
          const isItemSelected = selectedItemIds.has(item.id);
          return (
            <div key={item?.id} className={`rounded-lg border p-3 ${isItemSelected ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 gap-3">
                  <div className="pt-0.5">
                    {allowBulkSelection ? (
                      <SelectionCheckbox checked={isItemSelected} onChange={() => onToggleItem(item.id)} ariaLabel={`Select ${item?.description || 'item'}`} disabled={!allowBulkSelection} />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item?.description || 'Item'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                      {item?.quantity ? <span className="font-bold">Qty {Number(item.quantity).toLocaleString()}</span> : null}
                      {item?.size ? <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">{item.size}</span> : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold text-gray-700 border border-gray-200">
                        <User size={11} /> {itemOwner}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-500 border border-gray-200">
                        {itemOwnerSource}
                      </span>
                      {waiting ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-black uppercase tracking-wide text-amber-800">
                          <AlertTriangle size={12} /> Waiting on art
                        </span>
                      ) : null}
                      {isOffQueue ? (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                          Working in {item.status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-700 border border-gray-200">
                  {statusLabel}
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
                {allowItemActions && onAssignItem ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
                    <Users size={11} className="text-gray-400" />
                    <select
                      value={item?.assigned_to || ''}
                      onChange={(e) => onAssignItem(item.id, e.target.value || null)}
                      className="bg-transparent text-[11px] font-black uppercase tracking-wide text-gray-700 focus:ring-0 border-none pr-6"
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name || s.email?.split('@')[0] || 'Staff'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {allowItemActions && currentUserId ? (
                  <button
                    type="button"
                    onClick={() => onAssignItem?.(item.id, item?.assigned_to === currentUserId ? null : currentUserId)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide border ${item?.assigned_to === currentUserId ? 'bg-white text-gray-700 border-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'}`}
                  >
                    {item?.assigned_to === currentUserId ? <PauseCircle size={12} /> : <User size={12} />}
                    {item?.assigned_to === currentUserId ? 'Unclaim' : 'Claim'}
                  </button>
                ) : null}
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

export default function ShopFloorBoard({ columns, boardStats, ownerLoadRows, staffLookup, staffOptions, currentUserId, onAssignJob, onAssignItem, onOpenItemDrawer, formatDate, readOnly = false, showOwnerLoad = true, enableReassignmentPanel = true, lensId, csrShortcutsEnabled = false, onCsrAction }: Props) {
  const safeColumns = columns && columns.length ? columns : [{ queueName: 'All Work', jobs: [] }];
  const bucketOrder: BucketKey[] = ['blocked', 'waiting', 'ready', 'progress'];
  const safeReadOnly = Boolean(readOnly);
  const allowBulkSelection = !safeReadOnly;
  const allowOwnerInsights = showOwnerLoad;
  const allowReassignmentPanel = enableReassignmentPanel && !safeReadOnly;
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkScope, setBulkScope] = useState<'jobs' | 'items' | 'both'>('both');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'assign' | 'clear'; staffId: string | null } | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  const ownerStatusMap = useMemo(
    () =>
      ownerLoadRows.reduce((acc, owner) => {
        acc[owner.id] = { ...owner, ...deriveOwnerSignal(owner) };
        return acc;
      }, {} as Record<string, OwnerLoadRow & { status: 'healthy' | 'stretched' | 'overloaded'; reassignmentNeeded: boolean; suggestedMoves: number; unclaimedReady: number }>),
    [ownerLoadRows]
  );

  const jobsWithSignals = useMemo(
    () =>
      safeColumns.map((column) => ({
        ...column,
        jobs: (column.jobs || []).map((job: any) => {
          const ownerSignal = job?.assigned_to ? ownerStatusMap[job.assigned_to] : undefined;
          const activeItems = Array.isArray(job?.activeItems) ? job.activeItems : [];
          const actionableItems = activeItems.filter((item: any) => !item?.isBlocked && !item?.waitingOnArt && item?.status !== 'Completed');
          const needsReassignment = Boolean(
            ownerSignal?.reassignmentNeeded && actionableItems.length > 0 && (job?.isReady || !job?.isBlocked)
          );
          return {
            ...job,
            ownerLoadStatus: ownerSignal?.status,
            ownerSuggestedMoves: ownerSignal?.suggestedMoves || 0,
            needsReassignment,
          };
        }),
      })),
    [safeColumns, ownerStatusMap]
  );

  const reassignmentCandidates = useMemo(() => {
    const jobs = jobsWithSignals.flatMap((column) => column.jobs || []);
    return jobs
      .filter((job: any) => job?.needsReassignment)
      .sort((a: any, b: any) => {
        const aRisk = Number(Boolean(a?.isLate)) * 4 + Number(Boolean(a?.isDueToday)) * 2 + (a?.ownerSuggestedMoves || 0);
        const bRisk = Number(Boolean(b?.isLate)) * 4 + Number(Boolean(b?.isDueToday)) * 2 + (b?.ownerSuggestedMoves || 0);
        return bRisk - aRisk;
      })
      .slice(0, 6);
  }, [jobsWithSignals]);

  const selectedJobEntries = useMemo(() => {
    const jobs = jobsWithSignals.flatMap((column) => column.jobs || []);
    return jobs.filter((job: any) => selectedJobs.has(job.id));
  }, [jobsWithSignals, selectedJobs]);

  const selectedItemEntries = useMemo(() => {
    const jobs = jobsWithSignals.flatMap((column) => column.jobs || []);
    return jobs.flatMap((job: any) => {
      const items = Array.isArray(job?.job_items) ? job.job_items : job?.activeItems || [];
      return items
        .filter((item: any) => selectedItems.has(item.id))
        .map((item: any) => ({ item, job }));
    });
  }, [jobsWithSignals, selectedItems]);

  const selectionRisk = useMemo(() => {
    const sourceOwners = new Set<string>();
    let readyJobs = 0;
    let blockedJobs = 0;
    let waitingJobs = 0;
    let inheritedItems = 0;
    let splitOwnerJobs = 0;

    selectedJobEntries.forEach((job: any) => {
      if (job?.assigned_to) sourceOwners.add(job.assigned_to);
      if (job?.isReady) readyJobs += 1;
      if (job?.isBlocked) blockedJobs += 1;
      if (job?.isWaiting) waitingJobs += 1;
      if (job?.isSplitOwner) splitOwnerJobs += 1;
    });

    selectedItemEntries.forEach(({ item, job }: any) => {
      if (item?.assigned_to) sourceOwners.add(item.assigned_to);
      else if (job?.assigned_to) {
        sourceOwners.add(job.assigned_to);
        inheritedItems += 1;
      }
      if (job?.isSplitOwner) splitOwnerJobs += 1;
    });

    return {
      sourceOwnerCount: sourceOwners.size,
      readyJobs,
      blockedJobs,
      waitingJobs,
      inheritedItems,
      splitOwnerJobs,
      risky:
        sourceOwners.size > 1 ||
        readyJobs > 0 ||
        blockedJobs > 0 ||
        waitingJobs > 0 ||
        inheritedItems > 0 ||
        splitOwnerJobs > 0,
    };
  }, [selectedItemEntries, selectedJobEntries]);

  const selectedJobCount = selectedJobs.size;
  const selectedItemCount = selectedItems.size;
  const hasSelection = allowBulkSelection && (selectedJobCount + selectedItemCount > 0);

  const riskBullets = useMemo(() => {
    const notes: string[] = [];
    if (selectionRisk.sourceOwnerCount > 1) notes.push(`Selection spans ${selectionRisk.sourceOwnerCount} owners.`);
    if (selectionRisk.readyJobs > 0) notes.push(`${selectionRisk.readyJobs} ready job${selectionRisk.readyJobs === 1 ? '' : 's'} could be disrupted.`);
    if (selectionRisk.blockedJobs > 0) notes.push(`${selectionRisk.blockedJobs} blocked job${selectionRisk.blockedJobs === 1 ? '' : 's'} still need accountable ownership.`);
    if (selectionRisk.waitingJobs > 0) notes.push(`${selectionRisk.waitingJobs} waiting job${selectionRisk.waitingJobs === 1 ? '' : 's'} rely on follow-up.`);
    if (selectionRisk.inheritedItems > 0) notes.push(`${selectionRisk.inheritedItems} item${selectionRisk.inheritedItems === 1 ? '' : 's'} inherit owners and may create mixed ownership.`);
    if (selectionRisk.splitOwnerJobs > 0) notes.push(`${selectionRisk.splitOwnerJobs} selected record${selectionRisk.splitOwnerJobs === 1 ? '' : 's'} already have split ownership.`);
    return notes;
  }, [selectionRisk]);

  const buildAuditContext = (mode: 'assign' | 'clear', reason?: string): BulkAuditContext => ({
    reason: reason?.trim() || undefined,
    mode,
    selection: {
      jobs: selectedJobCount,
      items: selectedItemCount,
      owners: selectionRisk.sourceOwnerCount,
      ready: selectionRisk.readyJobs,
      blocked: selectionRisk.blockedJobs,
      waiting: selectionRisk.waitingJobs,
      inherited: selectionRisk.inheritedItems,
      splitOwnerJobs: selectionRisk.splitOwnerJobs,
      scope: bulkScope,
    },
    risky: selectionRisk.risky,
    source: 'shop-floor-bulk',
  });

  const toggleJobSelection = (jobId: string) => {
    if (!allowBulkSelection) return;
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleItemSelection = (itemId: string) => {
    if (!allowBulkSelection) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const clearSelection = () => {
    if (!allowBulkSelection) return;
    setSelectedJobs(new Set());
    setSelectedItems(new Set());
    setBulkScope('both');
  };

  const applyBulkAssignment = async (staffId: string | null, audit?: BulkAuditContext) => {
    if (!hasSelection || applyingBulk || !allowBulkSelection) return;

    setApplyingBulk(true);
    try {
      if ((bulkScope === 'jobs' || bulkScope === 'both') && selectedJobs.size > 0) {
        for (const jobId of Array.from(selectedJobs)) {
          await Promise.resolve(onAssignJob(jobId, staffId || '', audit));
        }
      }
      if ((bulkScope === 'items' || bulkScope === 'both') && selectedItems.size > 0 && onAssignItem) {
        for (const itemId of Array.from(selectedItems)) {
          await Promise.resolve(onAssignItem(itemId, staffId, {}, audit));
        }
      }
      clearSelection();
      setBulkAssignee('');
      setBulkReason('');
      setPendingAction(null);
      setReasonError(null);
    } finally {
      setApplyingBulk(false);
    }
  };

  const requestBulkAction = (type: 'assign' | 'clear') => {
    if (type === 'assign' && !bulkAssignee) return;
    const staffId = type === 'assign' ? bulkAssignee : null;
    setPendingAction({ type, staffId });
    setReasonError(null);
  };

  const confirmBulkAction = async () => {
    if (!pendingAction) return;
    const needsReason = selectionRisk.risky;
    if (needsReason && !bulkReason.trim()) {
      setReasonError('Reason or code is required for risky bulk moves.');
      return;
    }

    const audit = buildAuditContext(pendingAction.type, bulkReason);
    await applyBulkAssignment(pendingAction.staffId, audit);
  };

  const cancelBulkFlow = () => {
    clearSelection();
    setPendingAction(null);
    setReasonError(null);
    setBulkReason('');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
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
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-700">Orphaned work</p>
          <p className="mt-2 text-3xl font-black text-red-800">{boardStats.orphaned}</p>
          <p className="text-sm text-red-700">Active work with no owner chain</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Aging waits</p>
          <p className="mt-2 text-3xl font-black text-amber-800">{boardStats.agingWaits}</p>
          <p className="text-sm text-amber-700">Waiting 2+ days</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">Split owners</p>
          <p className="mt-2 text-3xl font-black text-violet-800">{boardStats.splitOwner}</p>
          <p className="text-sm text-violet-700">Job owner and item owners disagree</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Manager load scan</p>
            <h3 className="text-lg font-black text-gray-900">Owner load at a glance</h3>
            <p className="text-sm text-gray-500">Soft WIP signals only matter if the floor lead can move work. Bulk select jobs/items below, then reassign from one bar.</p>
          </div>
          <div className="text-xs font-semibold text-gray-500">Sorted by active item load, then blocked jobs.</div>
        </div>

        {hasSelection ? (
          <div className="mt-4 rounded-2xl border border-black bg-gray-900 p-4 text-white shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Bulk reassignment</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedJobCount} job{selectedJobCount === 1 ? '' : 's'} and {selectedItemCount} item{selectedItemCount === 1 ? '' : 's'} selected.</p>
                <p className="text-xs text-gray-300">Use jobs for queue-owner shifts. Use items for partial offloads when the whole job should stay put.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {selectionRisk.readyJobs > 0 ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-900">{selectionRisk.readyJobs} ready</span> : null}
                  {selectionRisk.blockedJobs > 0 ? <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-red-900">{selectionRisk.blockedJobs} blocked</span> : null}
                  {selectionRisk.waitingJobs > 0 ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900">{selectionRisk.waitingJobs} waiting</span> : null}
                  {selectionRisk.sourceOwnerCount > 1 ? <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-violet-900">{selectionRisk.sourceOwnerCount} source owners</span> : null}
                  {selectionRisk.inheritedItems > 0 ? <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-white">{selectionRisk.inheritedItems} inherited items</span> : null}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Audit trail should explain why ownership moved. Risky moves trigger a manager confirmation before anything changes.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkScope}
                  onChange={(e) => setBulkScope(e.target.value as 'jobs' | 'items' | 'both')}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
                >
                  <option value="both">Apply to jobs + items</option>
                  <option value="jobs">Jobs only</option>
                  <option value="items">Items only</option>
                </select>
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
                >
                  <option value="">Choose owner…</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name || s.email?.split('@')[0] || 'Staff'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkAssignee || applyingBulk}
                  onClick={() => requestBulkAction('assign')}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applyingBulk ? 'Applying…' : 'Reassign selected'}
                </button>
                <button
                  type="button"
                  disabled={applyingBulk}
                  onClick={() => requestBulkAction('clear')}
                  className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear owner
                </button>
                <button
                  type="button"
                  disabled={applyingBulk}
                  onClick={cancelBulkFlow}
                  className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
            {pendingAction ? (
              <div className="mt-3 rounded-xl border border-white/30 bg-white/5 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">Manager confirmation</p>
                      <p className="text-sm font-semibold text-white">
                        {pendingAction.type === 'assign'
                          ? `Reassign to ${getOwnerLabel(pendingAction.staffId, staffLookup)}`
                          : 'Clear owner on selection'}
                      </p>
                      <p className="text-[11px] text-gray-300">Risk summary will be recorded in the audit log.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${selectionRisk.risky ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                      {selectionRisk.risky ? 'Risk review required' : 'Low risk'}
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-black/30 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-gray-100">Reason or code</p>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Required when risky</span>
                    </div>
                    <input
                      value={bulkReason}
                      onChange={(e) => { setBulkReason(e.target.value); setReasonError(null); }}
                      placeholder="e.g. Load balance to digital team / Owner on leave / Rush hotfix"
                      className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-white focus:outline-none"
                    />
                    {reasonError ? <p className="text-[11px] font-semibold text-red-200">{reasonError}</p> : null}
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-200">
                      {riskBullets.length === 0 ? <span className="rounded-full bg-white/10 px-2.5 py-1">Low-risk selection</span> : riskBullets.map((note) => (
                        <span key={note} className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1">{note}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={confirmBulkAction}
                      disabled={applyingBulk}
                      className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {applyingBulk ? 'Applying…' : 'Confirm bulk move'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPendingAction(null); setReasonError(null); }}
                      disabled={applyingBulk}
                      className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {allowReassignmentPanel && reassignmentCandidates.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Reassignment needed</p>
                <h4 className="mt-1 text-base font-black text-gray-900">Move these first before adding new work</h4>
                <p className="text-sm text-gray-600">These jobs sit under stretched/overloaded owners and still look movable.</p>
              </div>
              <div className="text-xs font-semibold text-amber-800">Tip: select the job card to move the whole queue owner, or select item rows for partial relief.</div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {reassignmentCandidates.map((job: any) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => toggleJobSelection(job.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${selectedJobs.has(job.id) ? 'border-black bg-white shadow-sm' : 'border-amber-200 bg-white/80 hover:border-amber-400'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{job.title || 'Untitled job'}</p>
                      <p className="mt-1 text-[11px] text-gray-600">{job.queueName || job.current_step || 'Queue pending'} • {getOwnerLabel(job.assigned_to, staffLookup)}</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                      {job.ownerLoadStatus === 'overloaded' ? 'Hot' : 'Watch'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {allowOwnerInsights ? (
          ownerLoadRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-400">No owner load to show yet.</div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ownerLoadRows.map((owner) => {
                const signal = deriveOwnerSignal(owner);
                const status = signal.status;
                const tone = status === 'overloaded' ? 'bg-red-100 text-red-700' : status === 'stretched' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                const fillWidth = Math.min(100, Math.round((owner.activeItems / 8) * 100));
                return (
                  <div key={owner.id} className={`rounded-2xl border p-4 ${signal.reassignmentNeeded ? 'border-amber-300 bg-amber-50/60' : 'border-gray-200 bg-gray-50/70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{owner.name}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Owner load</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${tone}`}>
                        {status === 'overloaded' ? 'Overloaded' : status === 'stretched' ? 'Watch' : 'Stable'}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white border border-gray-200">
                      <div className={`h-full rounded-full ${status === 'overloaded' ? 'bg-red-500' : status === 'stretched' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillWidth}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white px-3 py-2 border border-gray-200">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Items</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{owner.activeItems}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 border border-gray-200">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Jobs</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{owner.jobs}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 border border-gray-200">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">At risk</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{owner.blockedJobs + owner.dueTodayJobs}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">{owner.blockedJobs} blocked</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">{owner.dueTodayJobs} due now</span>
                      {signal.unclaimedReady > 0 ? <span className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-gray-700">{signal.unclaimedReady} unclaimed ready</span> : null}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-gray-600">
                      {signal.reassignmentNeeded
                        ? `Reassign ${signal.suggestedMoves || 1} ${signal.suggestedMoves === 1 ? 'item' : 'items'} to get this lane back under control.`
                        : status === 'stretched'
                          ? 'Watch this owner. One more rush or block will tip the lane.'
                          : 'Load looks workable right now.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {jobsWithSignals.map((column) => {
          const columnJobs = column.jobs || [];
          const dueToday = columnJobs.filter((job: any) => job?.isDueToday).length;
          const overdue = columnJobs.filter((job: any) => job?.isLate).length;
          const unassigned = columnJobs.filter((job: any) => !job?.assigned_to).length;
          const activeItemCount = columnJobs.reduce((sum: number, job: any) => sum + (Array.isArray(job?.activeItems) ? job.activeItems.length : 0), 0);
          const reassignmentCount = columnJobs.filter((job: any) => job?.needsReassignment).length;

          return (
            <div key={column.queueName} className="min-w-[360px] flex-1 rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Queue</p>
                    <h3 className="text-xl font-black text-gray-900">{column.queueName}</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold uppercase text-gray-700">{columnJobs.length} jobs</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">{activeItemCount} active items</span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">{overdue} overdue</span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">{dueToday} due today</span>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">{unassigned} unassigned</span>
                  {reassignmentCount > 0 ? <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-amber-800">{reassignmentCount} rebalance</span> : null}
                </div>
              </div>

              {bucketOrder.map((bucket) => {
                const jobs = columnJobs.filter((job: any) => getBucketForJob(job) === bucket);
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
                            staffOptions={staffOptions}
                            currentUserId={currentUserId}
                            onAssignJob={onAssignJob}
                            onAssignItem={onAssignItem}
                            onOpenItemDrawer={onOpenItemDrawer}
                            formatDate={formatDate}
                            isSelected={selectedJobs.has(job.id)}
                            selectedItemIds={selectedItems}
                            onToggleJob={toggleJobSelection}
                            onToggleItem={toggleItemSelection}
                            readOnly={safeReadOnly}
                            csrShortcutsEnabled={csrShortcutsEnabled}
                            onCsrAction={onCsrAction}
                            lensId={lensId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
