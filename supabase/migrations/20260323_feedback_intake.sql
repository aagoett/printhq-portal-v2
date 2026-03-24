-- Phase 5A: Portal + app feedback intake and triage
-- Structured feedback store with status flow and page context

create table if not exists public.portal_feedback (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  page_type text not null default 'other',
  page_id text,
  page_url text,
  audience text not null default 'portal',
  feedback_type text not null default 'request',
  impact text not null default 'slows_me_down',
  summary text not null,
  details text,
  contact_email text,
  contact_name text,
  triage_note text,
  handled_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.portal_feedback
  drop constraint if exists portal_feedback_status_check;
alter table public.portal_feedback
  add constraint portal_feedback_status_check
  check (status in ('new','triaged','approved','rejected','shipped'));

alter table public.portal_feedback
  drop constraint if exists portal_feedback_page_type_check;
alter table public.portal_feedback
  add constraint portal_feedback_page_type_check
  check (page_type in ('job','quote','other'));

alter table public.portal_feedback
  drop constraint if exists portal_feedback_audience_check;
alter table public.portal_feedback
  add constraint portal_feedback_audience_check
  check (audience in ('portal','internal'));

alter table public.portal_feedback
  drop constraint if exists portal_feedback_type_check;
alter table public.portal_feedback
  add constraint portal_feedback_type_check
  check (feedback_type in ('bug','confusing','request','praise','other'));

alter table public.portal_feedback
  drop constraint if exists portal_feedback_impact_check;
alter table public.portal_feedback
  add constraint portal_feedback_impact_check
  check (impact in ('blocking','slows_me_down','minor'));

create index if not exists idx_portal_feedback_status on public.portal_feedback(status);
create index if not exists idx_portal_feedback_created_at on public.portal_feedback(created_at desc);
create index if not exists idx_portal_feedback_page on public.portal_feedback(page_type, page_id);

create or replace function public.set_portal_feedback_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_portal_feedback_updated_at on public.portal_feedback;
create trigger trg_portal_feedback_updated_at
before update on public.portal_feedback
for each row execute procedure public.set_portal_feedback_updated_at();
