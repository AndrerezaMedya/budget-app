alter table public.profiles
  add column if not exists locale text not null default 'en';

do $$
begin
  alter table public.profiles
    add constraint profiles_locale_check
    check (locale in ('en', 'id'));
exception
  when duplicate_object then null;
end $$;
