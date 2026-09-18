-- Optional: harden trigger functions (fixes Supabase security advisors)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
grant execute on function public.handle_updated_at() to postgres, service_role;
grant execute on function public.handle_new_user() to postgres, service_role;
