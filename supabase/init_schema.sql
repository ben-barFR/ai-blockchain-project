-- BLDCRT greenfield schema for a new Supabase project.
-- Idempotent: safe to re-run. Does not include legacy chat tables.
-- Apply with: npm run init:supabase

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_type text;
begin
  next_type := coalesce(new.raw_user_meta_data->>'user_type', 'owner');
  if next_type not in ('issuer', 'owner', 'admin') then
    next_type := 'owner';
  end if;

  insert into public.profiles (id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    next_type
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        user_type = excluded.user_type;
  return new;
end;
$$;

create or replace function public.protect_profile_user_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and new.user_type = 'admin'
     and old.user_type is distinct from 'admin' then
    new.user_type := old.user_type;
  end if;
  return new;
end;
$$;

create or replace function public.protect_issuance_credits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.issuance_credits is distinct from old.issuance_credits
     and auth.role() <> 'service_role' then
    raise exception 'Issuance credits are billed in fiat and can only be changed by the platform';
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_profile_user_type() from public, anon, authenticated;
revoke execute on function public.protect_issuance_credits() from public, anon, authenticated;
grant execute on function public.handle_updated_at() to postgres, service_role;
grant execute on function public.handle_new_user() to postgres, service_role;
grant execute on function public.protect_profile_user_type() to postgres, service_role;
grant execute on function public.protect_issuance_credits() to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  user_type text not null default 'owner'
    check (user_type in ('issuer', 'owner', 'admin')),
  wallet_address text,
  generated_wallet_key text,
  wallet_source text not null default 'generated'
    check (wallet_source in ('generated', 'linked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issuers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  company_name text not null,
  country_code text not null,
  company_identifier text not null,
  website_url text,
  accreditation_url text,
  wallet_address text not null,
  issuance_credits integer not null default 100 check (issuance_credits >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_at timestamptz,
  onchain_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, company_identifier)
);

create table if not exists public.issuer_customers (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.issuers (id) on delete cascade,
  full_name text,
  email text,
  wallet_address text,
  user_id uuid references auth.users (id) on delete set null,
  onboard_token text unique,
  onboard_sent_at timestamptz,
  onboard_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issuer_customers_contact check (
    (email is not null and length(trim(email)) > 0)
    or (wallet_address is not null and length(trim(wallet_address)) > 0)
  )
);

create table if not exists public.customer_buildings (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.issuers (id) on delete cascade,
  customer_id uuid not null references public.issuer_customers (id) on delete cascade,
  building_identifier text not null default '',
  postal_address text not null,
  country_code text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_issuances (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.issuers (id) on delete cascade,
  customer_id uuid references public.issuer_customers (id) on delete set null,
  customer_building_id uuid references public.customer_buildings (id) on delete set null,
  token_id text,
  tx_hash text,
  building_id text not null default '',
  country_code text not null,
  postal_address text not null,
  has_electrical boolean not null default false,
  has_energy boolean not null default false,
  has_planning boolean not null default false,
  status text not null default 'minted'
    check (status in ('minted', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_reports (
  id uuid primary key default gen_random_uuid(),
  issuance_id uuid not null references public.certificate_issuances (id) on delete cascade,
  token_id text not null,
  component text not null
    check (component in ('electrical', 'energy', 'planning')),
  storage_path text not null,
  content_hash text not null,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (issuance_id, component)
);

create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  full_name text,
  user_type text,
  wallet_addresses text[] not null default '{}',
  deleted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists issuer_customers_issuer_id_idx
  on public.issuer_customers (issuer_id);
create unique index if not exists issuer_customers_issuer_email_idx
  on public.issuer_customers (issuer_id, lower(email))
  where email is not null;
create index if not exists customer_buildings_issuer_id_idx
  on public.customer_buildings (issuer_id);
create index if not exists customer_buildings_customer_id_idx
  on public.customer_buildings (customer_id);
create index if not exists certificate_issuances_customer_building_id_idx
  on public.certificate_issuances (customer_building_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists protect_profile_user_type on public.profiles;
create trigger protect_profile_user_type
  before update on public.profiles
  for each row execute function public.protect_profile_user_type();

drop trigger if exists issuers_updated_at on public.issuers;
create trigger issuers_updated_at
  before update on public.issuers
  for each row execute function public.handle_updated_at();

drop trigger if exists protect_issuance_credits on public.issuers;
create trigger protect_issuance_credits
  before update on public.issuers
  for each row execute function public.protect_issuance_credits();

drop trigger if exists issuer_customers_updated_at on public.issuer_customers;
create trigger issuer_customers_updated_at
  before update on public.issuer_customers
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.issuers enable row level security;
alter table public.issuer_customers enable row level security;
alter table public.customer_buildings enable row level security;
alter table public.certificate_issuances enable row level security;
alter table public.certificate_reports enable row level security;
alter table public.deleted_accounts enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Issuers can view own application" on public.issuers;
create policy "Issuers can view own application"
  on public.issuers for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Approved issuer public profile is readable" on public.issuers;
create policy "Approved issuer public profile is readable"
  on public.issuers for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Issuers can insert own application" on public.issuers;
create policy "Issuers can insert own application"
  on public.issuers for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Issuers can update pending application" on public.issuers;
create policy "Issuers can update pending application"
  on public.issuers for update to authenticated
  using (auth.uid() = user_id and status in ('pending', 'rejected'))
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Issuers can view own customers" on public.issuer_customers;
create policy "Issuers can view own customers"
  on public.issuer_customers for select to public
  using (issuer_id in (select id from public.issuers where user_id = auth.uid()));

drop policy if exists "Issuers can insert own customers" on public.issuer_customers;
create policy "Issuers can insert own customers"
  on public.issuer_customers for insert to public
  with check (issuer_id in (select id from public.issuers where user_id = auth.uid()));

drop policy if exists "Issuers can update own customers" on public.issuer_customers;
create policy "Issuers can update own customers"
  on public.issuer_customers for update to public
  using (issuer_id in (select id from public.issuers where user_id = auth.uid()))
  with check (issuer_id in (select id from public.issuers where user_id = auth.uid()));

drop policy if exists "issuers manage own customer buildings" on public.customer_buildings;
create policy "issuers manage own customer buildings"
  on public.customer_buildings for all to public
  using (issuer_id in (select id from public.issuers where user_id = auth.uid()))
  with check (issuer_id in (select id from public.issuers where user_id = auth.uid()));

drop policy if exists "Issuers can view own issuances" on public.certificate_issuances;
create policy "Issuers can view own issuances"
  on public.certificate_issuances for select to authenticated
  using (
    exists (
      select 1 from public.issuers i
      where i.id = certificate_issuances.issuer_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "Minted issuances are publicly readable" on public.certificate_issuances;
create policy "Minted issuances are publicly readable"
  on public.certificate_issuances for select to anon, authenticated
  using (status = 'minted');

drop policy if exists "Issuers can view own report metadata" on public.certificate_reports;
create policy "Issuers can view own report metadata"
  on public.certificate_reports for select to authenticated
  using (uploaded_by = auth.uid());

-- deleted_accounts: no client policies; service_role only (RLS on, bypass for service role)

-- ---------------------------------------------------------------------------
-- Storage bucket for private PDF reports
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('certificate-reports', 'certificate-reports', false)
on conflict (id) do update set public = excluded.public;
