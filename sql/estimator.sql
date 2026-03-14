-- Estimator core tables
create extension if not exists "pgcrypto";

create table if not exists presses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'offset',
  impressions_per_hour numeric default 8000,
  max_sheet_width numeric,
  max_sheet_height numeric,
  setup_minutes numeric default 20,
  makeready_waste_sheets numeric default 100,
  hourly_rate numeric default 250,
  click_rate numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sheet_width numeric,
  sheet_height numeric,
  basis_weight numeric,
  cost_per_sheet numeric default 0,
  price_per_sheet numeric default 0,
  grain text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists finishing_ops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  setup_minutes numeric default 10,
  run_minutes_per_thousand numeric default 5,
  cost_per_hour numeric default 75,
  price_per_hour numeric default 125,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists markups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  percent numeric default 20,
  applies_to text default 'total',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists product_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  finished_width numeric,
  finished_height numeric,
  pages integer default 1,
  default_press_id uuid references presses(id),
  default_stock_id uuid references stocks(id),
  default_markup_id uuid references markups(id),
  finishing_op_ids uuid[] default '{}',
  waste_percent numeric default 5,
  setup_waste_sheets numeric default 50,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  title text,
  contact text,
  template_id uuid references product_templates(id),
  press_id uuid references presses(id),
  stock_id uuid references stocks(id),
  markup_id uuid references markups(id),
  total_cost numeric,
  total_price numeric,
  quantities integer[],
  breakdown jsonb,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  label text,
  quantity integer,
  cost numeric,
  price numeric,
  detail text,
  created_at timestamptz default now()
);

-- Seed minimal data
insert into presses (id, name, type, impressions_per_hour, max_sheet_width, max_sheet_height, setup_minutes, makeready_waste_sheets, hourly_rate, click_rate)
values
  ('00000000-0000-0000-0000-000000000101', 'HP Indigo 7900', 'digital', 6000, 13, 19, 10, 25, 300, 0.08),
  ('00000000-0000-0000-0000-000000000102', 'Heidelberg SM74', 'offset', 12000, 20, 29, 30, 150, 250, 0)
on conflict (id) do update set name = excluded.name;

insert into stocks (id, name, sheet_width, sheet_height, basis_weight, cost_per_sheet, price_per_sheet)
values
  ('00000000-0000-0000-0000-000000000201', '80# Text Gloss 23x35', 23, 35, 80, 0.12, 0.22),
  ('00000000-0000-0000-0000-000000000202', '100# Cover Silk 19x25', 19, 25, 100, 0.18, 0.32)
on conflict (id) do update set name = excluded.name;

insert into finishing_ops (id, name, setup_minutes, run_minutes_per_thousand, cost_per_hour, price_per_hour)
values
  ('00000000-0000-0000-0000-000000000301', 'Cut / Trim', 5, 6, 60, 95),
  ('00000000-0000-0000-0000-000000000302', 'Fold (letter)', 8, 8, 70, 110)
on conflict (id) do update set name = excluded.name;

insert into markups (id, name, percent, applies_to)
values
  ('00000000-0000-0000-0000-000000000401', 'Standard 30%', 30, 'total'),
  ('00000000-0000-0000-0000-000000000402', 'Trade 15%', 15, 'total')
on conflict (id) do update set name = excluded.name;

insert into product_templates (id, name, finished_width, finished_height, pages, default_press_id, default_stock_id, default_markup_id, finishing_op_ids, waste_percent, setup_waste_sheets)
values
  ('00000000-0000-0000-0000-000000000501', '8.5x11 Flyer', 8.5, 11, 1, '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000401', array['00000000-0000-0000-0000-000000000301'], 5, 50),
  ('00000000-0000-0000-0000-000000000502', 'Tri-fold Brochure', 11, 8.5, 2, '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000401', array['00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302'], 7, 75)
on conflict (id) do update set name = excluded.name;
