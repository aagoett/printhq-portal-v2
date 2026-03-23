create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  industry text,
  employee_count integer,
  revenue_band text,
  hq_city text,
  hq_state text,
  status text not null default 'prospect',
  account_owner_id uuid references public.profiles(id) on delete set null,
  strategic_priority text not null default 'medium',
  print_profile text,
  pain_points text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  title text,
  email text,
  phone text,
  linkedin_url text,
  buyer_role text not null default 'unknown',
  relationship_strength text not null default 'cold',
  status text not null default 'active',
  source text,
  notes text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_products text,
  likely_needs text,
  seasonality text,
  competitor_notes text,
  current_strategy text,
  next_best_action text,
  warm_intro_paths text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  type text not null default 'note',
  subject text,
  detail text,
  occurred_at timestamptz not null default now(),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_card_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  source_filename text,
  raw_text text,
  parsed_json jsonb,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_organizations_name on public.organizations(name);
create index if not exists idx_contacts_org on public.contacts(organization_id);
create index if not exists idx_contacts_email on public.contacts(email);
create index if not exists idx_org_activities_org on public.organization_activities(organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger trg_org_plans_updated_at
before update on public.organization_plans
for each row execute function public.set_updated_at();
