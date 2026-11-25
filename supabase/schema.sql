-- VendorFlow AI — Supabase PostgreSQL schema
-- Run in the Supabase SQL editor. Multi-tenant: every row belongs to an organization,
-- and Row Level Security restricts access to members of that organization.

create extension if not exists "pgcrypto";

-- ───────────────────────── Organizations & members ─────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter' check (plan in ('starter','growth','business','enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','reviewer','member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ───────────────────────── Locations & requirements ─────────────────────────
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Which documents each vendor category must provide (optionally per location).
create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  vendor_category text not null,
  document_type text not null,
  min_coverage_amount numeric,
  requires_endorsement boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Vendors & documents ─────────────────────────
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  name text not null,
  category text not null,
  contact_name text,
  contact_email text,
  status text not null default 'pending'
    check (status in ('compliant','at_risk','non_compliant','pending')),
  created_at timestamptz not null default now()
);

create table if not exists vendor_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  doc_type text not null,
  file_name text not null,
  storage_path text,
  version int not null default 1,
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','expired')),
  expiry_date date,
  extracted jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

-- ───────────────────────── Gap resolution ─────────────────────────
create table if not exists compliance_gaps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  document_id uuid references vendor_documents(id) on delete set null,
  gap_type text not null check (gap_type in ('missing','expired','expiring','incomplete','coverage','endorsement')),
  title text not null,
  reason text not null,
  status text not null default 'open'
    check (status in ('open','awaiting_vendor','in_review','resolved')),
  due_date date,
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  gap_id uuid not null references compliance_gaps(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  subject text not null,
  body text not null,
  sent_to text,
  sent_at timestamptz not null default now()
);

-- ───────────────────────── Audit trail ─────────────────────────
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendors_org on vendors(org_id);
create index if not exists idx_docs_vendor on vendor_documents(vendor_id);
create index if not exists idx_gaps_org_status on compliance_gaps(org_id, status);
create index if not exists idx_audit_org_time on audit_events(org_id, created_at desc);

-- ───────────────────────── Row Level Security ─────────────────────────
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table locations enable row level security;
alter table requirements enable row level security;
alter table vendors enable row level security;
alter table vendor_documents enable row level security;
alter table compliance_gaps enable row level security;
alter table follow_ups enable row level security;
alter table audit_events enable row level security;

create policy "org members read org" on organizations
  for select using (public.is_org_member(id));
create policy "own memberships" on memberships
  for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['locations','requirements','vendors','vendor_documents','compliance_gaps','follow_ups']
  loop
    execute format('create policy "members select" on %I for select using (public.is_org_member(org_id))', t);
    execute format('create policy "members insert" on %I for insert with check (public.is_org_member(org_id))', t);
    execute format('create policy "members update" on %I for update using (public.is_org_member(org_id))', t);
    execute format('create policy "members delete" on %I for delete using (public.is_org_member(org_id))', t);
  end loop;
end $$;

-- Audit log is append-only: members can read and insert, never update or delete.
create policy "members read audit" on audit_events
  for select using (public.is_org_member(org_id));
create policy "members append audit" on audit_events
  for insert with check (public.is_org_member(org_id));

-- ───────────────────────── Storage ─────────────────────────
-- Create a private bucket named "vendor-documents" in Supabase Storage and store files
-- under "<org_id>/<vendor_id>/<file>". Add a storage policy that only allows access when
-- (storage.foldername(name))[1] is an org the user belongs to.

-- ───────────────────────── Bootstrap helper ─────────────────────────
-- Call after sign-up: select create_organization('Acme Property Group');
create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_org uuid;
begin
  insert into organizations (name) values (org_name) returning id into new_org;
  insert into memberships (org_id, user_id, role) values (new_org, auth.uid(), 'owner');
  return new_org;
end;
$$;
