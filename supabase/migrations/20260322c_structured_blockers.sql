-- Phase 4B: structured blockers + release gating

create table if not exists public.job_blockers (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  job_item_id uuid references public.job_items(id) on delete cascade,
  blocker_type text not null,
  severity text not null default 'block',
  status text not null default 'open',
  reason text not null,
  next_step text,
  created_by uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_blockers
  drop constraint if exists job_blockers_type_check;
alter table public.job_blockers
  add constraint job_blockers_type_check
  check (blocker_type in ('artwork','proof','customer','spec','payment','inventory','scheduling','other'));

alter table public.job_blockers
  drop constraint if exists job_blockers_severity_check;
alter table public.job_blockers
  add constraint job_blockers_severity_check
  check (severity in ('block','hold','warn'));

alter table public.job_blockers
  drop constraint if exists job_blockers_status_check;
alter table public.job_blockers
  add constraint job_blockers_status_check
  check (status in ('open','resolved'));

create index if not exists idx_job_blockers_job on public.job_blockers(job_id, status);
create index if not exists idx_job_blockers_item on public.job_blockers(job_item_id, status);

create or replace function public.set_job_blockers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_job_blockers_updated_at on public.job_blockers;
create trigger trg_job_blockers_updated_at
before update on public.job_blockers
for each row execute procedure public.set_job_blockers_updated_at();
