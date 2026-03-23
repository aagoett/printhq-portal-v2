export type ProofState = {
  state: 'none' | 'pending' | 'approved' | 'changes_requested';
  pending: boolean;
  approved: boolean;
  changesRequested: boolean;
  hasProof: boolean;
  latest?: any;
};

export type ProofRollup = {
  itemStates: Record<string, ProofState>;
  jobLevel: ProofState;
  counts: {
    pending: number;
    approved: number;
    changesRequested: number;
    withProof: number;
  };
  rollup: 'none' | 'pending' | 'partial_pending' | 'changes_requested' | 'all_approved';
  label: string;
  detail: string;
  pendingItemIds: string[];
  changeItemIds: string[];
  approvedItemIds: string[];
  scope: 'none' | 'job' | 'item';
};

const deriveState = (assets: any[] = []): ProofState => {
  const list = [...assets].sort((a, b) => new Date(b.created_at || b.inserted_at || 0).getTime() - new Date(a.created_at || a.inserted_at || 0).getTime());
  const pending = list.some((a) => a.status === 'pending');
  const approved = list.some((a) => a.status === 'approved');
  const changesRequested = list.some((a) => a.status === 'changes_requested');
  const hasProof = list.length > 0;
  let state: ProofState['state'] = 'none';
  if (changesRequested) state = 'changes_requested';
  else if (pending) state = 'pending';
  else if (approved) state = 'approved';
  return { state, pending, approved, changesRequested, hasProof, latest: list[0] };
};

export const summarizeProofRollup = (items: any[] = [], assets: any[] = []): ProofRollup => {
  const proofs = (assets || []).filter((a) => a.asset_type === 'proof' && a.status !== 'archived');
  const jobLevelAssets = proofs.filter((p) => !p.job_item_id);
  const jobLevel = deriveState(jobLevelAssets);

  const itemStates: Record<string, ProofState> = {};
  (items || []).forEach((item: any) => {
    const scoped = proofs.filter((p) => p.job_item_id === item.id);
    itemStates[item.id] = deriveState(scoped);
  });

  const pendingItemIds = Object.entries(itemStates)
    .filter(([, state]) => state.state === 'pending')
    .map(([id]) => id);
  const changeItemIds = Object.entries(itemStates)
    .filter(([, state]) => state.state === 'changes_requested')
    .map(([id]) => id);
  const approvedItemIds = Object.entries(itemStates)
    .filter(([, state]) => state.state === 'approved')
    .map(([id]) => id);
  const withProof = Object.values(itemStates).filter((state) => state.hasProof).length;

  let rollup: ProofRollup['rollup'] = 'none';
  if (changeItemIds.length > 0 || jobLevel.state === 'changes_requested') {
    rollup = 'changes_requested';
  } else if ((pendingItemIds.length > 0 || jobLevel.state === 'pending') && (approvedItemIds.length > 0 || jobLevel.approved)) {
    rollup = 'partial_pending';
  } else if (pendingItemIds.length > 0 || jobLevel.state === 'pending') {
    rollup = 'pending';
  } else if ((approvedItemIds.length > 0 || jobLevel.approved) && (withProof > 0 || jobLevel.hasProof)) {
    rollup = 'all_approved';
  }

  const scope: ProofRollup['scope'] = withProof > 0 ? 'item' : jobLevel.hasProof ? 'job' : 'none';
  const counts = {
    pending: pendingItemIds.length + (jobLevel.state === 'pending' ? 1 : 0),
    approved: approvedItemIds.length + (jobLevel.state === 'approved' ? 1 : 0),
    changesRequested: changeItemIds.length + (jobLevel.state === 'changes_requested' ? 1 : 0),
    withProof,
  };

  const labelMap: Record<ProofRollup['rollup'], string> = {
    none: 'No proofs shared yet',
    pending: 'Proof approval needed',
    partial_pending: 'Partial approvals',
    changes_requested: 'Changes requested',
    all_approved: 'All proofs approved',
  };
  const detail = (() => {
    if (rollup === 'all_approved') return 'All shared proofs are approved.';
    if (rollup === 'changes_requested') return 'At least one item has requested changes.';
    if (rollup === 'partial_pending') return `${counts.approved} approved • ${counts.pending} waiting`;
    if (rollup === 'pending') return `${counts.pending} approval${counts.pending === 1 ? '' : 's'} outstanding`;
    return 'Waiting for the first proof to be shared.';
  })();

  return {
    itemStates,
    jobLevel,
    counts,
    rollup,
    label: labelMap[rollup],
    detail,
    pendingItemIds,
    changeItemIds,
    approvedItemIds,
    scope,
  };
};

export const deriveJobStatusFromProofRollup = (
  rollup: ProofRollup,
  opts: { hasBlocking?: boolean } = {}
) => {
  if (!rollup) return {} as any;
  if (rollup.rollup === 'changes_requested') {
    return {
      status: 'Changes Requested',
      customer_action_required: false,
      customer_action_type: null,
      customer_action_note: null,
    } as const;
  }
  if (rollup.rollup === 'all_approved') {
    return {
      status: opts.hasBlocking ? 'Proof Approved - Waiting Release' : 'Proof Approved - Waiting Release',
      customer_action_required: false,
      customer_action_type: null,
      customer_action_note: null,
    } as const;
  }
  if (rollup.rollup === 'partial_pending') {
    return {
      status: 'Proofs Partially Approved',
      customer_action_required: true,
      customer_action_type: 'approve_proof',
      customer_action_note: `${rollup.counts.pending} item${rollup.counts.pending === 1 ? '' : 's'} still need approval`,
    } as const;
  }
  if (rollup.rollup === 'pending') {
    return {
      status: 'Proof Sent - Awaiting Approval',
      customer_action_required: true,
      customer_action_type: 'approve_proof',
      customer_action_note: 'Review and approve the latest proof.',
    } as const;
  }
  return {} as const;
};
