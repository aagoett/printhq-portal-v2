-- Add item-level ownership/claim support
alter table public.job_items
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists queue_override text;

create index if not exists job_items_assigned_to_idx on public.job_items(assigned_to);
