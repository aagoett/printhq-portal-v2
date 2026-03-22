-- Phase 3B: customer action loop for portal-visible jobs
-- Add explicit customer action requirement fields and customer upload marker

alter table public.jobs
  add column if not exists customer_action_required boolean not null default false,
  add column if not exists customer_action_type text,
  add column if not exists customer_action_note text;

-- constrain to known action types (null allowed)
alter table public.jobs
  drop constraint if exists jobs_customer_action_type_check;
alter table public.jobs
  add constraint jobs_customer_action_type_check
  check (
    customer_action_type is null
    or customer_action_type in ('upload_artwork','approve_proof','review_quote','provide_info','other')
  );

-- mark jobs with live proofs as requiring approval
update public.jobs j
set customer_action_required = true,
    customer_action_type = 'approve_proof'
where coalesce(j.customer_action_type, '') = ''
  and j.portal_visibility = 'proof_live'
  and exists (
    select 1 from public.job_assets a
    where a.job_id = j.id and a.asset_type = 'proof' and a.status = 'pending' and coalesce(a.portal_visible, false) = true
  );

-- add uploaded_by_customer flag for job assets so we can distinguish artwork uploads
alter table public.job_assets
  add column if not exists uploaded_by_customer boolean not null default false;
