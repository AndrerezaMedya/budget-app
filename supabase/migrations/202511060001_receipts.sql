-- Receipt ingestion schema additions

-- Buckets
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Custom enums
create type receipt_job_status as enum ('pending', 'processing', 'succeeded', 'failed');

-- Jobs
create table public.receipt_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status receipt_job_status not null default 'pending',
  source_filename text,
  storage_path text,
  image_hash text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index receipt_ingestion_jobs_user_status_idx
  on public.receipt_ingestion_jobs (user_id, status, created_at desc);

create trigger receipt_ingestion_jobs_updated_at
before update on public.receipt_ingestion_jobs
for each row execute procedure public.set_current_timestamp_updated_at();

-- Receipts
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.receipt_ingestion_jobs(id) on delete set null,
  storage_path text not null,
  image_hash text not null,
  merchant_name text not null,
  merchant_address text,
  purchase_at timestamptz,
  currency char(3) not null default 'IDR',
  subtotal_minor bigint,
  tax_minor bigint,
  discount_minor bigint,
  total_minor bigint not null,
  payment_method text,
  notes text,
  model_response jsonb not null,
  ocr_text text,
  confidence numeric(4,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index receipts_user_hash_unique
  on public.receipts (user_id, image_hash);

create index receipts_user_created_idx
  on public.receipts (user_id, created_at desc);

create trigger receipts_updated_at
before update on public.receipts
for each row execute procedure public.set_current_timestamp_updated_at();

-- Receipt line items
create table public.receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  description text not null,
  category text,
  quantity numeric(12,3) not null default 1,
  unit_price_minor bigint,
  line_total_minor bigint not null
);

create index receipt_line_items_receipt_idx
  on public.receipt_line_items (receipt_id);

-- RLS enablement
alter table public.receipt_ingestion_jobs enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_line_items enable row level security;

-- Policies
create policy "Receipt jobs accessible by owner" on public.receipt_ingestion_jobs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Receipts accessible by owner" on public.receipts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Receipt line items accessible by owner" on public.receipt_line_items
  using (
    auth.uid() = (
      select r.user_id from public.receipts r where r.id = receipt_id
    )
  )
  with check (
    auth.uid() = (
      select r.user_id from public.receipts r where r.id = receipt_id
    )
  );
