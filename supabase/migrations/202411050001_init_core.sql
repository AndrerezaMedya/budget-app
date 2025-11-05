-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper function for updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Custom enums
create type account_type as enum (
  'bank',
  'cash',
  'wallet',
  'credit',
  'investment',
  'savings',
  'other'
);

create type transaction_type as enum (
  'income',
  'expense',
  'transfer'
);

create type transfer_direction as enum ('in', 'out');

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  default_currency char(3) default 'IDR',
  time_zone text default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_current_timestamp_updated_at();

-- Accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  currency char(3) not null default 'IDR',
  opening_balance_minor bigint not null default 0,
  order_index integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);
create unique index accounts_user_name_unique on public.accounts (user_id, lower(name)) where archived_at is null;

create trigger accounts_updated_at
before update on public.accounts
for each row execute procedure public.set_current_timestamp_updated_at();

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  color text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_id_idx on public.categories (parent_id);
create unique index categories_user_name_unique on public.categories (user_id, lower(name)) where parent_id is null;

create trigger categories_updated_at
before update on public.categories
for each row execute procedure public.set_current_timestamp_updated_at();

-- Tags
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tags_user_name_unique on public.tags (user_id, lower(name));

create trigger tags_updated_at
before update on public.tags
for each row execute procedure public.set_current_timestamp_updated_at();

-- Payees
create table public.payees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payees_user_name_unique on public.payees (user_id, lower(name));

create trigger payees_updated_at
before update on public.payees
for each row execute procedure public.set_current_timestamp_updated_at();

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  payee_id uuid references public.payees(id) on delete set null,
  transfer_group_id uuid,
  transfer_direction transfer_direction,
  type transaction_type not null,
  description text,
  amount_minor bigint not null,
  currency char(3) not null default 'IDR',
  occurred_at timestamptz not null,
  booked_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add constraint transfer_direction_required
    check (
      (type = 'transfer' and transfer_direction is not null and transfer_group_id is not null)
      or (type <> 'transfer' and transfer_direction is null)
    );

create index transactions_user_id_idx on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id, occurred_at desc);
create index transactions_category_idx on public.transactions (category_id, occurred_at desc);
create index transactions_transfer_group_idx on public.transactions (transfer_group_id);

create trigger transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_current_timestamp_updated_at();

-- Transaction Tags pivot
create table public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  period text not null, -- format YYYY-MM
  amount_minor bigint not null,
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create trigger budgets_updated_at
before update on public.budgets
for each row execute procedure public.set_current_timestamp_updated_at();

-- Materialized summary tables
create table public.category_monthly_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  period text not null,
  income_minor bigint not null default 0,
  expense_minor bigint not null default 0,
  budget_minor bigint not null default 0,
  available_minor bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id, period)
);

create table public.account_daily_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  net_change_minor bigint not null default 0,
  closing_balance_minor bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id, date)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.payees enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.category_monthly_summaries enable row level security;
alter table public.account_daily_summaries enable row level security;

-- RLS Policies
create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Accounts accessible by owner" on public.accounts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Categories accessible by owner" on public.categories
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Tags accessible by owner" on public.tags
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Payees accessible by owner" on public.payees
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Transactions accessible by owner" on public.transactions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Transaction tags accessible by owner" on public.transaction_tags
  using (
    auth.uid() = (
      select t.user_id from public.transactions t where t.id = transaction_id
    )
  )
  with check (
    auth.uid() = (
      select t.user_id from public.transactions t where t.id = transaction_id
    )
  );

create policy "Budgets accessible by owner" on public.budgets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Category summaries accessible by owner" on public.category_monthly_summaries
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Account summaries accessible by owner" on public.account_daily_summaries
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workspace bootstrap helper
create or replace function public.create_workspace_seed(p_user_id uuid)
returns void as $$
declare
  checking_account_id uuid;
  wallet_account_id uuid;
  income_category_id uuid;
  groceries_category_id uuid;
  transport_category_id uuid;
  now_utc timestamptz := timezone('utc', now());
begin
  -- basic accounts
  insert into public.accounts (user_id, name, type, currency, opening_balance_minor)
  values (p_user_id, 'Primary Checking', 'bank', 'IDR', 100000000)
  returning id into checking_account_id;

  insert into public.accounts (user_id, name, type, currency, opening_balance_minor)
  values (p_user_id, 'Cash Wallet', 'cash', 'IDR', 15000000)
  returning id into wallet_account_id;

  -- categories
  insert into public.categories (user_id, name, icon, order_index)
  values (p_user_id, 'Income', 'lucide:piggy-bank', 0)
  returning id into income_category_id;

  insert into public.categories (user_id, name, icon, order_index)
  values (p_user_id, 'Groceries', 'lucide:shopping-cart', 1)
  returning id into groceries_category_id;

  insert into public.categories (user_id, name, icon, order_index)
  values (p_user_id, 'Transport', 'lucide:bus', 2)
  returning id into transport_category_id;

  -- initial transactions
  insert into public.transactions (
    user_id, account_id, category_id, type, description, amount_minor,
    currency, occurred_at, booked_at
  )
  values
    (p_user_id, checking_account_id, income_category_id, 'income', 'Initial deposit', 75000000, 'IDR', now_utc, now_utc),
    (p_user_id, wallet_account_id, groceries_category_id, 'expense', 'Fresh market run', 2500000, 'IDR', now_utc - interval '1 day', now_utc - interval '1 day'),
    (p_user_id, checking_account_id, transport_category_id, 'expense', 'Fuel top up', 500000, 'IDR', now_utc - interval '2 day', now_utc - interval '2 day');

  -- starter budget
  insert into public.budgets (user_id, category_id, period, amount_minor, rollover)
  values
    (
      p_user_id,
      groceries_category_id,
      to_char(now_utc, 'YYYY-MM'),
      35000000,
      true
    )
  on conflict do nothing;
end;
$$ language plpgsql security definer;

