type ProofAsset = {
  asset_type?: string | null;
  status?: string | null;
  job_item_id?: string | null;
  portal_visible?: boolean | null;
};

type JobItem = {
  id: string;
};

const pluralize = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : plural || `${singular}s`}`;

const dedupe = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]));

export function getProofApprovalRollup({
  items = [],
  assets = [],
  jobStatus,
}: {
  items?: JobItem[];
  assets?: ProofAsset[];
  jobStatus?: string | null;
}) {
  const normalizedStatus = String(jobStatus || '').toLowerCase();
  const isChangesRequested = normalizedStatus === 'changes requested';

  const proofAssets = (assets || []).filter((asset) => asset?.asset_type === 'proof' && asset?.status !== 'archived');
  const itemScopedProofs = proofAssets.filter((asset) => !!asset?.job_item_id);
  const jobLevelProofs = proofAssets.filter((asset) => !asset?.job_item_id);

  const itemIdsWithProof = dedupe(itemScopedProofs.map((asset) => asset.job_item_id));
  const approvedItemIds = dedupe(itemScopedProofs.filter((asset) => asset.status === 'approved').map((asset) => asset.job_item_id));
  const pendingItemIds = dedupe(
    itemScopedProofs
      .filter((asset) => asset.status === 'pending' && !approvedItemIds.includes(asset.job_item_id || ''))
      .map((asset) => asset.job_item_id)
  );

  const totalItems = items.length;
  const proofedItemCount = itemIdsWithProof.length;
  const approvedItemCount = approvedItemIds.length;
  const waitingItemCount = pendingItemIds.length;
  const unproofedItemCount = Math.max(totalItems - proofedItemCount, 0);
  const hasItemScopedProofs = proofedItemCount > 0;
  const allProofedItemsApproved = hasItemScopedProofs && waitingItemCount === 0 && approvedItemCount === proofedItemCount;
  const allItemsApproved = totalItems > 0 && approvedItemCount === totalItems && waitingItemCount === 0 && unproofedItemCount === 0;
  const hasMixedItemState = approvedItemCount > 0 && (waitingItemCount > 0 || isChangesRequested || unproofedItemCount > 0);

  const portalStatus = (() => {
    if (!hasItemScopedProofs) {
      if (jobLevelProofs.some((asset) => asset.status === 'approved')) {
        return {
          label: 'Approved proof on file',
          detail: 'This order has one job-wide approved proof on file.',
          tone: 'green',
        };
      }
      if (jobLevelProofs.some((asset) => asset.status === 'pending')) {
        return {
          label: 'Proof ready for review',
          detail: 'This order is waiting on one job-wide proof approval.',
          tone: 'blue',
        };
      }
      return {
        label: assets.length > 0 ? 'Shared file posted' : 'No proof shared yet',
        detail: assets.length > 0 ? 'A customer-safe file is visible, but no active proof approval state is attached yet.' : 'We will post the first customer-safe file here when it is ready.',
        tone: 'gray',
      };
    }

    if (allItemsApproved) {
      return {
        label: `All ${pluralize(approvedItemCount, 'item')} approved`,
        detail: 'Every line item with a customer-visible proof is approved, so the order can move once any non-proof holds clear.',
        tone: 'green',
      };
    }

    if (isChangesRequested && approvedItemCount > 0) {
      return {
        label: 'Partially approved · revisions open',
        detail: `${pluralize(approvedItemCount, 'item')} approved. Revisions were requested on the remaining proofed item${proofedItemCount - approvedItemCount === 1 ? '' : 's'}.`,
        tone: 'amber',
      };
    }

    if (hasMixedItemState) {
      const remainingParts = [];
      if (waitingItemCount > 0) remainingParts.push(`${pluralize(waitingItemCount, 'item')} waiting on approval`);
      if (unproofedItemCount > 0) remainingParts.push(`${pluralize(unproofedItemCount, 'item')} still needs a proof`);
      return {
        label: `Partially approved · ${approvedItemCount}/${totalItems || proofedItemCount} approved`,
        detail: remainingParts.join(' · ') || 'Some items are approved, but the full order is not cleared yet.',
        tone: 'blue',
      };
    }

    if (isChangesRequested) {
      return {
        label: 'Revisions requested',
        detail: 'A proof revision is in progress. Previously approved items remain approved unless we replace their proof.',
        tone: 'amber',
      };
    }

    return {
      label: `${pluralize(waitingItemCount || proofedItemCount, 'item')} proof${(waitingItemCount || proofedItemCount) === 1 ? '' : 's'} waiting`,
      detail: `${pluralize(proofedItemCount, 'item')} currently has a customer-visible proof. Approve each item independently.`,
      tone: 'blue',
    };
  })();

  const internalStatus = (() => {
    if (!hasItemScopedProofs) return portalStatus;
    if (allItemsApproved) {
      return {
        label: 'All proofed items approved',
        detail: `${pluralize(approvedItemCount, 'item')} approved · no open proof gate on customer-visible items`,
        tone: 'green',
      };
    }
    if (isChangesRequested && approvedItemCount > 0) {
      return {
        label: 'Mixed approval state',
        detail: `${pluralize(approvedItemCount, 'item')} already approved · revisions open on ${pluralize(Math.max(proofedItemCount - approvedItemCount, 0), 'item')}`,
        tone: 'amber',
      };
    }
    if (hasMixedItemState) {
      const detailBits = [`${pluralize(approvedItemCount, 'item')} approved`];
      if (waitingItemCount > 0) detailBits.push(`${pluralize(waitingItemCount, 'item')} waiting`);
      if (unproofedItemCount > 0) detailBits.push(`${pluralize(unproofedItemCount, 'item')} without proof`);
      return {
        label: 'Partial item approval',
        detail: detailBits.join(' · '),
        tone: 'blue',
      };
    }
    if (isChangesRequested) {
      return {
        label: 'Revision cycle open',
        detail: 'Customer asked for edits. Keep the rollup truthful until the next proof is shared.',
        tone: 'amber',
      };
    }
    return {
      label: 'Waiting on item approvals',
      detail: `${pluralize(proofedItemCount, 'item')} proofed · ${pluralize(waitingItemCount || proofedItemCount, 'item')} still needs approval`,
      tone: 'purple',
    };
  })();

  return {
    hasItemScopedProofs,
    isChangesRequested,
    counts: {
      totalItems,
      proofedItemCount,
      approvedItemCount,
      waitingItemCount,
      unproofedItemCount,
    },
    states: {
      allItemsApproved,
      hasMixedItemState,
    },
    portalStatus,
    internalStatus,
  };
}
