-- PrintHQ production automation foundation. Run in Supabase SQL Editor after review.
-- Additive only: existing jobs/job_files are not altered.
create extension if not exists pgcrypto;

create table if not exists public.production_plants (
  id text primary key check (id in ('san_jose','dallas')),
  display_name text not null,
  enabled boolean not null default true
);
insert into public.production_plants(id,display_name)
values ('san_jose','San Jose'),('dallas','Dallas')
on conflict (id) do nothing;

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  plant_id text references public.production_plants(id),
  state text not null default 'needs_intake'
    check (state in ('needs_intake','preflight_pending','needs_review','ready','planned','approved','released','held')),
  quantity integer check (quantity > 0),
  stock_code text,
  due_at timestamptz,
  revision integer not null default 1,
  approved_revision integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'released' or (approved_revision = revision and plant_id is not null))
);

create table if not exists public.production_assets (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  source_file_id uuid not null unique references public.job_files(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  source_sha256 text,
  revision integer not null default 1,
  preflight_status text not null default 'pending'
    check (preflight_status in ('pending','processing','passed','review','blocked','error')),
  preflight_report jsonb,
  created_at timestamptz not null default now()
);
create index if not exists production_assets_pending_idx
  on public.production_assets(preflight_status,created_at);

create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  plant_id text not null references public.production_plants(id),
  status text not null default 'proposed'
    check (status in ('proposed','review','approved','invalidated','released')),
  plan jsonb not null default '{}'::jsonb,
  cost_estimate numeric(14,2),
  solo_baseline numeric(14,2),
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz
);

create table if not exists public.production_plan_jobs (
  plan_id uuid not null references public.production_plans(id) on delete cascade,
  production_job_id uuid not null references public.production_jobs(id) on delete cascade,
  job_revision integer not null,
  primary key (plan_id,production_job_id)
);

create table if not exists public.production_events (
  id bigint generated always as identity primary key,
  production_job_id uuid references public.production_jobs(id) on delete cascade,
  plan_id uuid references public.production_plans(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Each upload creates/updates a bucket record. No automatic press release.
-- This trigger intentionally does NOT infer quantity, stock or plant from freeform job notes.
create or replace function public.enqueue_print_file()
returns trigger language plpgsql security definer set search_path=public as $$
declare pjid uuid;
begin
  insert into public.production_jobs(job_id,state)
  values (new.job_id,'needs_intake')
  on conflict(job_id) do update
    set revision=production_jobs.revision+1,
        approved_revision=null,
        state='needs_intake',
        updated_at=now()
  returning id into pjid;

  if coalesce(to_jsonb(new)->>'path',to_jsonb(new)->>'storage_path') is null then
    raise exception 'job_files record has no storage path';
  end if;

  insert into public.production_assets
    (production_job_id,source_file_id,storage_bucket,storage_path)
  values (pjid,new.id,coalesce(new.bucket,'art-files'),coalesce(to_jsonb(new)->>'path',to_jsonb(new)->>'storage_path'))
  on conflict(source_file_id) do nothing;

  update public.production_plans set status='invalidated'
   where id in (select plan_id from public.production_plan_jobs where production_job_id=pjid)
   and status in ('proposed','review','approved');
  insert into public.production_events(production_job_id,event_type,details)
   values (pjid,'file_uploaded',jsonb_build_object('source_file_id',new.id));
  return new;
end $$;

drop trigger if exists print_file_to_production_bucket on public.job_files;
create trigger print_file_to_production_bucket
after insert on public.job_files
for each row execute function public.enqueue_print_file();

-- RLS: staff-only read; all mutation goes through audited server-side workers.
alter table public.production_plants enable row level security;
alter table public.production_jobs enable row level security;
alter table public.production_assets enable row level security;
alter table public.production_plans enable row level security;
alter table public.production_plan_jobs enable row level security;
alter table public.production_events enable row level security;

create or replace function public.is_production_staff()
returns boolean language sql stable security definer set search_path=public as $$
 select exists (
   select 1 from public.profiles
   where id=auth.uid() and lower(coalesce(role,'')) in
    ('admin','staff','csr','bindery')
 );
$$;
revoke all on function public.is_production_staff() from public;
grant execute on function public.is_production_staff() to authenticated;

drop policy if exists production_plants_read on public.production_plants;
create policy production_plants_read on public.production_plants
for select to authenticated using (public.is_production_staff());
drop policy if exists production_jobs_read on public.production_jobs;
create policy production_jobs_read on public.production_jobs
for select to authenticated using (public.is_production_staff());
drop policy if exists production_assets_read on public.production_assets;
create policy production_assets_read on public.production_assets
for select to authenticated using (public.is_production_staff());
drop policy if exists production_plans_read on public.production_plans;
create policy production_plans_read on public.production_plans
for select to authenticated using (public.is_production_staff());
drop policy if exists production_plan_jobs_read on public.production_plan_jobs;
create policy production_plan_jobs_read on public.production_plan_jobs
for select to authenticated using (public.is_production_staff());
drop policy if exists production_events_read on public.production_events;
create policy production_events_read on public.production_events
for select to authenticated using (public.is_production_staff());

-- Do not grant authenticated INSERT/UPDATE/DELETE on these tables.
-- Next milestone: transactional worker claim/lease RPC, signed agent identity,
-- hash verification, full PDF preflight, explicit approval and RIP release.
