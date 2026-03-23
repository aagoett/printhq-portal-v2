-- Dedicated paper catalog table so paper-specific fields don't live on pricing_components
create table if not exists public.paper_catalog (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  brand text,
  sku text,
  parent_sheet_width numeric,
  parent_sheet_height numeric,
  weight numeric,
  caliper numeric,
  cost_amount numeric not null default 0,
  price_override numeric,
  cost_unit text default 'per_sheet',
  price_unit text default 'per_sheet',
  notes text
);

create index if not exists paper_catalog_name_idx on public.paper_catalog (lower(name));
create index if not exists paper_catalog_sku_idx on public.paper_catalog (lower(coalesce(sku, '')));

-- Backfill existing paper rows from pricing_components if present
insert into public.paper_catalog (id, created_at, name, brand, sku, parent_sheet_width, parent_sheet_height, weight, caliper, cost_amount, price_override, cost_unit, price_unit, notes)
select id, created_at, name, brand, sku, parent_sheet_width, parent_sheet_height, weight, caliper, cost_amount, price_amount, coalesce(cost_unit, 'per_sheet'), coalesce(price_unit, cost_unit, 'per_sheet'), notes
from public.pricing_components
where type = 'paper'
on conflict (id) do nothing;
