do $$
begin
  create policy "Profiles insertable by owner" on public.profiles
    for insert
    with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;
