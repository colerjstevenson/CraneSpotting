create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index users_username_lower_unique on public.users (lower(username));

alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant select on table public.users to anon, authenticated;
create policy "Public profiles are readable"
  on public.users for select
  to anon, authenticated
  using (true);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    lower(trim(new.raw_user_meta_data ->> 'username')),
    trim(new.raw_user_meta_data ->> 'display_name')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();