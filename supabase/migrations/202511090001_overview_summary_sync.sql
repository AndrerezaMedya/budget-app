-- Materialised summaries and constraints for robust overview charts

create table if not exists public.daily_cashflow_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  income_minor bigint not null default 0,
  expense_minor bigint not null default 0,
  net_minor bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_cashflow_summaries enable row level security;

drop policy if exists "Daily cashflow accessible by owner" on public.daily_cashflow_summaries;
create policy "Daily cashflow accessible by owner" on public.daily_cashflow_summaries
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.refresh_daily_cashflow_summary(
  p_user_id uuid,
  p_date date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_income bigint := 0;
  v_expense bigint := 0;
begin
  if p_user_id is null or p_date is null then
    return;
  end if;

  select
    coalesce(sum(case when type = 'income' then amount_minor else 0 end), 0),
    coalesce(sum(case when type = 'expense' then amount_minor else 0 end), 0)
  into v_income, v_expense
  from public.transactions
  where user_id = p_user_id
    and occurred_at::date = p_date;

  if v_income = 0 and v_expense = 0 then
    delete from public.daily_cashflow_summaries
    where user_id = p_user_id
      and date = p_date;
  else
    insert into public.daily_cashflow_summaries (user_id, date, income_minor, expense_minor, net_minor, updated_at)
    values (p_user_id, p_date, v_income, v_expense, v_income - v_expense, timezone('utc', now()))
    on conflict (user_id, date) do update
      set income_minor = excluded.income_minor,
          expense_minor = excluded.expense_minor,
          net_minor = excluded.net_minor,
          updated_at = excluded.updated_at;
  end if;
end;
$$;

create or replace function public.refresh_category_monthly_summary(
  p_user_id uuid,
  p_category_id uuid,
  p_period text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_income bigint := 0;
  v_expense bigint := 0;
  v_budget bigint := 0;
  v_available bigint := 0;
begin
  if p_user_id is null or p_category_id is null or p_period is null then
    return;
  end if;

  select coalesce(sum(amount_minor), 0)
    into v_income
  from public.transactions
  where user_id = p_user_id
    and category_id = p_category_id
    and type = 'income'
    and to_char(occurred_at, 'YYYY-MM') = p_period;

  select coalesce(sum(amount_minor), 0)
    into v_expense
  from public.transactions
  where user_id = p_user_id
    and category_id = p_category_id
    and type = 'expense'
    and to_char(occurred_at, 'YYYY-MM') = p_period;

  select coalesce(sum(amount_minor), 0)
    into v_budget
  from public.budgets
  where user_id = p_user_id
    and category_id = p_category_id
    and period = p_period;

  v_available := v_budget - v_expense + v_income;

  if v_income = 0 and v_expense = 0 and v_budget = 0 then
    delete from public.category_monthly_summaries
    where user_id = p_user_id
      and category_id = p_category_id
      and period = p_period;
  else
    insert into public.category_monthly_summaries (
      user_id,
      category_id,
      period,
      income_minor,
      expense_minor,
      budget_minor,
      available_minor,
      updated_at
    ) values (
      p_user_id,
      p_category_id,
      p_period,
      v_income,
      v_expense,
      v_budget,
      v_available,
      timezone('utc', now())
    )
    on conflict (user_id, category_id, period) do update
      set income_minor = excluded.income_minor,
          expense_minor = excluded.expense_minor,
          budget_minor = excluded.budget_minor,
          available_minor = excluded.available_minor,
          updated_at = excluded.updated_at;
  end if;
end;
$$;

create or replace function public.handle_transaction_summary_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_period text;
  v_old_period text;
begin
  if TG_OP = 'INSERT' then
    if new.type in ('income', 'expense') and new.category_id is not null then
      v_new_period := to_char(new.occurred_at, 'YYYY-MM');
      perform public.refresh_category_monthly_summary(new.user_id, new.category_id, v_new_period);
    end if;
    perform public.refresh_daily_cashflow_summary(new.user_id, new.occurred_at::date);
    return new;
  elsif TG_OP = 'UPDATE' then
    if new.type in ('income', 'expense') and new.category_id is not null then
      v_new_period := to_char(new.occurred_at, 'YYYY-MM');
      perform public.refresh_category_monthly_summary(new.user_id, new.category_id, v_new_period);
    end if;
    perform public.refresh_daily_cashflow_summary(new.user_id, new.occurred_at::date);

    if old.type in ('income', 'expense') and old.category_id is not null then
      if old.category_id <> new.category_id
        or to_char(old.occurred_at, 'YYYY-MM') <> to_char(new.occurred_at, 'YYYY-MM')
        or old.user_id <> new.user_id then
        v_old_period := to_char(old.occurred_at, 'YYYY-MM');
        perform public.refresh_category_monthly_summary(old.user_id, old.category_id, v_old_period);
      end if;
    end if;

    if old.user_id <> new.user_id or old.occurred_at::date <> new.occurred_at::date then
      perform public.refresh_daily_cashflow_summary(old.user_id, old.occurred_at::date);
    end if;

    return new;
  elsif TG_OP = 'DELETE' then
    if old.type in ('income', 'expense') and old.category_id is not null then
      v_old_period := to_char(old.occurred_at, 'YYYY-MM');
      perform public.refresh_category_monthly_summary(old.user_id, old.category_id, v_old_period);
    end if;
    perform public.refresh_daily_cashflow_summary(old.user_id, old.occurred_at::date);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists transactions_summary_sync on public.transactions;
create trigger transactions_summary_sync
after insert or update or delete on public.transactions
for each row execute procedure public.handle_transaction_summary_sync();

create or replace function public.handle_budget_summary_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.refresh_category_monthly_summary(new.user_id, new.category_id, new.period);
    return new;
  elsif TG_OP = 'UPDATE' then
    perform public.refresh_category_monthly_summary(new.user_id, new.category_id, new.period);
    if old.category_id <> new.category_id or old.period <> new.period or old.user_id <> new.user_id then
      perform public.refresh_category_monthly_summary(old.user_id, old.category_id, old.period);
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    perform public.refresh_category_monthly_summary(old.user_id, old.category_id, old.period);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists budgets_summary_sync on public.budgets;
create trigger budgets_summary_sync
after insert or update or delete on public.budgets
for each row execute procedure public.handle_budget_summary_sync();

alter table public.transactions
  add constraint transactions_category_required
  check (
    (type in ('income', 'expense') and category_id is not null)
    or type = 'transfer'
  ) not valid;

-- Backfill existing data into summaries

do $$
declare
  r record;
begin
  for r in (
    select distinct user_id, occurred_at::date as day
    from public.transactions
  ) loop
    perform public.refresh_daily_cashflow_summary(r.user_id, r.day);
  end loop;

  for r in (
    select distinct user_id, category_id, to_char(occurred_at, 'YYYY-MM') as period
    from public.transactions
    where category_id is not null
      and type in ('income', 'expense')
  ) loop
    perform public.refresh_category_monthly_summary(r.user_id, r.category_id, r.period);
  end loop;

  for r in (
    select distinct user_id, category_id, period
    from public.budgets
  ) loop
    perform public.refresh_category_monthly_summary(r.user_id, r.category_id, r.period);
  end loop;
end;
$$;
