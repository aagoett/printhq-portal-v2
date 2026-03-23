export type CustomerJob = {
  status?: string | null;
  current_step?: string | null;
  due_date?: string | null;
  portal_visibility?: string | null;
  [key: string]: any;
};

const CUSTOMER_VISIBLE_STATUSES = new Set([
  'pending review',
  'pending',
  'draft',
  'new',
  'active',
  'in progress',
  'in production',
  'press',
  'bindery',
  'qc',
  'ready for pickup',
  'ready for pickup/ship',
  'approved',
  'changes requested',
  'completed',
]);

const HIDDEN_STATUSES = new Set(['cancelled', 'archived']);
const PORTAL_VISIBLE_STATES = new Set(['shell', 'proof_live', 'shared']);

export const normalizeStatus = (status?: string | null) =>
  (status || '').trim().toLowerCase();

export const normalizePortalVisibility = (visibility?: string | null) =>
  (visibility || '').trim().toLowerCase() || 'internal';

export const isPortalVisible = (job?: CustomerJob) => {
  const portalState = normalizePortalVisibility(job?.portal_visibility);
  if (portalState === 'hidden') return false;
  if (PORTAL_VISIBLE_STATES.has(portalState)) return true;
  // legacy fallback: allow older jobs that relied on status-only visibility
  return false;
};

export const filterCustomerVisibleJobs = <T extends CustomerJob = CustomerJob>(
  jobs: T[] = []
) => {
  return (jobs || []).filter((job) => {
    const portalState = normalizePortalVisibility(job?.portal_visibility);
    if (portalState === 'hidden' || portalState === 'internal') return false;
    if (PORTAL_VISIBLE_STATES.has(portalState)) return true;

    // Legacy behavior: fall back to status if portal state not set
    const normalized = normalizeStatus(job?.status);
    if (!normalized) return true; // keep legacy/null/early records visible
    if (HIDDEN_STATUSES.has(normalized)) return false;
    if (CUSTOMER_VISIBLE_STATUSES.has(normalized)) return true;
    // If we have a production step tracked, still surface it
    if (job?.current_step) return true;
    return false;
  });
};
