-- Product templates + size library to keep Quick Order product-first and admin editable
create table if not exists public.product_templates (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  key text not null unique,
  name text not null,
  description text,
  sizes jsonb default '[]'::jsonb,
  fields jsonb default '[]'::jsonb,
  allow_custom boolean default true,
  requires_page_count boolean,
  sort_order int default 10,
  is_active boolean default true
);

create index if not exists product_templates_key_idx on public.product_templates (lower(key));
