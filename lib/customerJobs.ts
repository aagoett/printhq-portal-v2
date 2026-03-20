export type CustomerJob = {
  status?: string | null;
  current_step?: string | null;
  due_date?: string | null;
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

export const normalizeStatus = (status?: string | null) =>
  (status || '').trim().toLowerCase();

export const filterCustomerVisibleJobs = <T extends CustomerJob = CustomerJob>(
  jobs: T[] = []
) => {
  return (jobs || []).filter((job) => {
    const normalized = normalizeStatus(job?.status);
    if (!normalized) return true; // keep legacy/null/early records visible
    if (HIDDEN_STATUSES.has(normalized)) return false;
    if (CUSTOMER_VISIBLE_STATUSES.has(normalized)) return true;
    // If we have a production step tracked, still surface it
    if (job?.current_step) return true;
    return false;
  });
};
