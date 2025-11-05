-- Seed script to bootstrap a demo workspace.
-- Run via: npx supabase db reset --seed

do $$
declare
  first_user uuid;
begin
  select id into first_user
  from auth.users
  order by created_at
  limit 1;

  if first_user is not null then
    perform public.create_workspace_seed(first_user);
  end if;
end;
$$;
