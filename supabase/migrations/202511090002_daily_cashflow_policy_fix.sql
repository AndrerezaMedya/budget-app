-- Allow summary refresh triggers to insert/update rows without session context

drop policy if exists "Daily cashflow accessible by owner" on public.daily_cashflow_summaries;
create policy "Daily cashflow accessible by owner" on public.daily_cashflow_summaries
  using (auth.uid() = user_id or auth.uid() is null)
  with check (auth.uid() = user_id or auth.uid() is null);
