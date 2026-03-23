-- Add optional media path and ingest attribution to organization_card_imports
alter table if exists public.organization_card_imports
  add column if not exists image_path text,
  add column if not exists ingested_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_org_card_imports_status on public.organization_card_imports(review_status, created_at);
create index if not exists idx_org_card_imports_ingested_by on public.organization_card_imports(ingested_by);
