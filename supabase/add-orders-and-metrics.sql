-- ============================================================================
-- EX1LES — orders, revenue metrics, and stock tracking
-- Paste this whole thing into the Supabase SQL editor and run once.
-- Depends on schema.sql already having been run (products/variants/admins).
-- ============================================================================

-- ── ORDERS ───────────────────────────────────────────────────────────────────
-- One row per checkout. The storefront has no customer accounts, so this is
-- written by anonymous visitors at checkout — same trust level the app
-- already operates at (it currently just trusts whatever they type into the
-- cart form and send over WhatsApp). Money columns are all in kobo.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_whatsapp text,
  address text not null,
  city text,
  state text not null,
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null default 0,
  payment_method text not null default 'bank_transfer' check (payment_method in ('bank_transfer', 'paystack')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  paystack_reference text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references variants(id) on delete set null,
  name text not null,
  size text,
  price integer not null default 0, -- kobo, per unit
  quantity integer not null default 1
);

-- ============================================================================
-- INDEXES — Postgres doesn't auto-index foreign keys, and the dashboard
-- filters/sorts by these constantly.
-- ============================================================================
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_order_items_order_id on order_items (order_id);
create index if not exists idx_order_items_product_id on order_items (product_id);
create index if not exists idx_variants_product_id on variants (product_id);
create index if not exists idx_product_images_product_id on product_images (product_id);
create index if not exists idx_products_category_id on products (category_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table orders enable row level security;
alter table order_items enable row level security;

-- Anyone can place an order (anonymous checkout, no customer accounts) —
-- but nobody can read, edit, or delete orders except admins. A customer
-- can't even read back the row they just inserted.
drop policy if exists "orders_public_insert" on orders;
create policy "orders_public_insert" on orders for insert
  with check (true);

drop policy if exists "order_items_public_insert" on order_items;
create policy "order_items_public_insert" on order_items for insert
  with check (true);

-- A customer can flip THEIR just-placed order from pending -> paid when they
-- confirm on the /pay page (the WhatsApp message is still what the admin
-- actually verifies before fulfilling — this just gets it out of "pending").
-- Scoped narrowly: only pending rows, only landing on 'paid', nothing else.
drop policy if exists "orders_public_confirm_payment" on orders;
create policy "orders_public_confirm_payment" on orders for update
  using (status = 'pending')
  with check (status = 'paid');

drop policy if exists "orders_admin_all" on orders;
create policy "orders_admin_all" on orders for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

drop policy if exists "order_items_admin_all" on order_items;
create policy "order_items_admin_all" on order_items for all
  using (exists (select 1 from admins where admins.id = auth.uid()))
  with check (exists (select 1 from admins where admins.id = auth.uid()));

-- Note: the /Admin dashboard reads through /api/admin/dashboard using the
-- service-role key server-side (bypasses RLS) rather than these policies —
-- same reason the login check moved server-side: it can't silently
-- disagree with what you see in the SQL editor. These policies are still
-- here as defense-in-depth for any direct client reads.

-- ============================================================================
-- STOCK SUMMARY VIEW — one row per product with aggregated stock, used by
-- the admin stock tracker (all-categories view + per-product breakdown).
-- ============================================================================
create or replace view product_stock_summary as
select
  p.id            as product_id,
  p.name          as product_name,
  p.image_url,
  p.is_featured,
  c.id            as category_id,
  c.name          as category_name,
  coalesce(sum(v.stock), 0)              as total_stock,
  count(v.id)                            as variant_count,
  count(v.id) filter (where v.stock = 0) as out_of_stock_variants,
  count(v.id) filter (where v.stock > 0 and v.stock <= 3) as low_stock_variants
from products p
left join categories c on c.id = p.category_id
left join variants v on v.product_id = p.id
group by p.id, p.name, p.image_url, p.is_featured, c.id, c.name;

-- ============================================================================
-- REVENUE SUMMARY VIEW — one row per calendar day with paid/fulfilled orders.
-- "Paid" here covers both a confirmed bank transfer and a Paystack charge —
-- pending orders (unconfirmed WhatsApp claims) don't count as revenue yet.
-- ============================================================================
create or replace view daily_revenue as
select
  date_trunc('day', created_at)::date as day,
  count(*)                            as order_count,
  sum(total)                          as revenue
from orders
where status in ('paid', 'fulfilled')
group by 1
order by 1 desc;
