-- Phase 4I: structured follow-up discipline
-- Add explicit follow-up fields so CSRs are not forced to encode promises in freeform notes

alter table public.jobs
  add column if not exists follow_up_note text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists follow_up_owner uuid references public.profiles(id) on delete set null,
  add column if not exists follow_up_status text not null default 'open',
  add column if not exists follow_up_completed_at timestamptz;

alter table public.jobs
  drop constraint if exists jobs_follow_up_status_check;
alter table public.jobs
  add constraint jobs_follow_up_status_check
  check (follow_up_status in ('open','done'));

create index if not exists idx_jobs_follow_up_at on public.jobs(follow_up_at);
create index if not exists idx_jobs_follow_up_owner on public.jobs(follow_up_owner);
