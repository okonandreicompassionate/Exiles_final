-- ============================================================================
-- EX1LES — full schema for a fresh Supabase project
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DROP ... IF EXISTS.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── CATEGORIES ──────────────────────────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ── PRODUCTS ─────────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price integer not null default 0, -- kobo
  image_url text not null default '',
  category_id uuid references categories(id) on delete set null,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── VARIANTS (size/stock) ───────────────────────────────────────────────────
create table if not exists variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text not null,
  stock integer not null default 0
);

-- ── PRODUCT IMAGES (gallery) ────────────────────────────────────────────────
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  position integer not null default 0
);

-- ── ADMINS ───────────────────────────────────────────────────────────────────
-- One row per admin, keyed by their Supabase Auth user id. This table never
-- stores a password — auth.users (managed by Supabase Auth / GoTrue) already
-- holds the hashed credential. role='god' can manage other admins.
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('god', 'admin')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table categories enable row level security;
alter table products enable row level security;
alter table variants enable row level security;
alter table product_images enable row level security;
alter table admins enable row level security;

-- Storefront is public: anyone (including anonymous visitors) can read the
-- catalog. Only signed-in admins can write to it.
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read" on categories for select using (true);

drop policy if exists "products_public_read" on products;
create policy "products_public_read" on products for select using (true);

drop policy if exists "variants_public_read" on variants;
create policy "variants_public_read" on variants for select using (true);

drop policy if exists "product_images_public_read" on product_images;
create policy "product_images_public_read" on product_images for select using (true);

-- Write access requires a row in `admins` for the authenticated user.
drop policy if exists "categories_admin_write" on categories;
create policy "categories_admin_write" on categories for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "products_admin_write" on products;
create policy "products_admin_write" on products for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "variants_admin_write" on variants;
create policy "variants_admin_write" on variants for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "product_images_admin_write" on product_images;
create policy "product_images_admin_write" on product_images for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

-- Admins table: a signed-in admin can see their own row. The "god" role's
-- ability to see EVERY admin (for the admin-management screen) is handled
-- by /api/admin/list-admins using the service-role key, not RLS — checking
-- "is this user a god" by querying `admins` from inside a policy defined ON
-- `admins` recurses forever (Postgres re-runs that same policy for the
-- inner query). Nobody writes to this table directly from the browser
-- either way — creating/removing admins goes through the server-side
-- /api/admin/* routes, which bypass RLS entirely.
drop policy if exists "admins_self_or_god_read" on admins;
drop policy if exists "admins_self_read" on admins;
create policy "admins_self_read" on admins for select
  using (id = auth.uid());

-- ============================================================================
-- SEED CATEGORIES (safe to re-run — ON CONFLICT no-ops if they already exist)
-- ============================================================================
insert into categories (name, slug) values
  ('Hoodies', 'hoodies'),
  ('Jackets', 'jackets'),
  ('Tees', 'tees'),
  ('Trousers', 'trousers'),
  ('Accessories', 'accessories')
on conflict (slug) do nothing;

-- ============================================================================
-- PROMOTE THE GOD ACCOUNT
-- ============================================================================
-- This statement is safe to run right now, even before the account exists:
-- if no auth.users row matches yet, it just inserts zero rows and moves on.
--
-- It does NOT create the login itself — Supabase Auth (GoTrue) owns password
-- hashing, and a plaintext password sitting in this file would be a
-- permanent, committed secret the moment this gets pushed anywhere. So the
-- one manual step this script can't do for you:
--
--   Supabase Dashboard → Authentication → Users → "Add user"
--   Email: okoncompassionate@gmail.com
--   Password: (set it there directly — it never touches this file or the repo)
--
-- Do that once, before or after pasting this whole script — order doesn't
-- matter, since the insert below just no-ops until the user exists. Re-run
-- this file (or just this statement) after creating the user, and it'll
-- pick them up.
insert into admins (id, email, role)
select id, email, 'god'
from auth.users
where email = 'okoncompassionate@gmail.com'
on conflict (id) do update set role = 'god';

-- Once that account exists and is promoted, sign in at /Admin. As "god"
-- you'll see an "Admins" panel to create further admin accounts straight
-- from the UI — that flow creates both the Auth user and the admins row
-- for you via the service-role key, no manual SQL needed for admin #2+.
