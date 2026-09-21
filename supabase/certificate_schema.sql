-- Applied remotely: issuers, issuances, private report storage.
-- Electrical/energy expire in 5 years on-chain; planning is indefinite until invalidated.

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
  status text not null default 'pending',
  review_notes text,
  reviewed_at timestamptz,
  onchain_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, company_identifier)
);

-- Applied remotely: issuer customers + issuance customer_id.
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
  updated_at timestamptz not null default now()
);

-- Applied remotely: customer buildings (fixed ID + address; certificates hang off the building).
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

-- Applied remotely: archive of wallets from deleted platform accounts.
create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  full_name text,
  user_type text,
  wallet_addresses text[] not null default '{}',
  deleted_at timestamptz not null default now()
);
