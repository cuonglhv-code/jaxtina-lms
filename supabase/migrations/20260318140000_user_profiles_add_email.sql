-- =============================================================================
-- Add email column to user_profiles so enrolment and learner queries
-- can return email without requiring a service-role auth.users join.
-- =============================================================================

alter table public.user_profiles
  add column if not exists email text;

-- Backfill existing rows from auth.users
update public.user_profiles up
set email = au.email
from auth.users au
where up.id = au.id
  and up.email is null;

-- Update the handle_new_user trigger to also store email on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- Keep email in sync when auth.users.email is updated
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.user_profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

-- Drop if exists then recreate to make migration idempotent
drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.sync_user_email();
