-- Portal visibility controls for jobs, quotes, and proofs

-- Jobs: explicit portal visibility state + metadata
alter table public.jobs
  add column if not exists portal_visibility text not null default 'internal',
  add column if not exists portal_shared_at timestamptz,
  add column if not exists portal_shared_by uuid references public.profiles(id) on delete set null,
  add column if not exists portal_shell_summary text;

-- Normalize values to a constrained set
alter table public.jobs
drop constraint if exists jobs_portal_visibility_check;
alter table public.jobs
  add constraint jobs_portal_visibility_check
  check (portal_visibility in ('internal','shell','proof_live','hidden'));

-- Quotes: portal share state + metadata
alter table public.quotes
  add column if not exists portal_visibility text not null default 'internal',
  add column if not exists portal_shared_at timestamptz,
  add column if not exists portal_shared_by uuid references public.profiles(id) on delete set null;

alter table public.quotes
drop constraint if exists quotes_portal_visibility_check;
alter table public.quotes
  add constraint quotes_portal_visibility_check
  check (portal_visibility in ('internal','shared','hidden'));

-- Proof/asset sharing: explicit portal flag
alter table public.job_assets
  add column if not exists portal_visible boolean not null default false,
  add column if not exists portal_shared_at timestamptz;

-- Messages: allow hiding internal-only notes from the portal
alter table public.messages
  add column if not exists is_customer_visible boolean not null default true;

-- Backfill portal visibility based on existing proof assets
update public.job_assets
  set portal_visible = true,
      portal_shared_at = coalesce(portal_shared_at, created_at)
where asset_type = 'proof' and status != 'archived' and portal_visible = false;

update public.jobs j
set portal_visibility = case
    when exists (
      select 1 from public.job_assets a
      where a.job_id = j.id and a.asset_type = 'proof' and a.status != 'archived'
    ) then 'proof_live'
    else 'internal'
  end,
  portal_shared_at = coalesce(portal_shared_at, now())
where j.portal_visibility is null or j.portal_visibility = '';
