export const HANDOFF_CONTENT = `
# EX1LES — Project Handoff / Context Dump

Paste this whole thing as your first message to a new AI coding agent working
on this repo. It's a snapshot of everything built and decided so far, written
from the assistant's side, so the new session doesn't have to rediscover any
of it. Contains no secrets — only structure and decisions.

## What this is

EX1LES ("EX1LES / EXILES") is a small Nigerian streetwear/fashion storefront.
Next.js (App Router, v16), Tailwind v4, Supabase for the database/auth/storage.
No customer accounts — checkout is name/email/phone/address collected in a
form, payment is manual bank transfer confirmed over WhatsApp (there's a
dormant Paystack integration, see "Dead code" below).

## Design system

- Light/white glass theme (was originally dark zinc — flipped to white this
  session on request). Utility classes in app/globals.css: \`.glass\`,
  \`.glass-strong\`, \`.glass-nav\`, \`.glass-input\` — frosted panels against
  ambient blurred color blobs (\`.ambient-bg\` / \`.ambient-blob-*\` in
  app/layout.tsx). Amber accent color (\`text-amber-700\`) used on small
  uppercase eyebrow labels throughout so the page isn't wall-to-wall black
  text on white.
- Fonts: Raleway (body, \`--font-raleway\`) + Bebas Neue (brand wordmark /
  hero headline, \`--font-display\`, applied via the \`.font-brand\` class).
  Coolvetica (local font file) still exists but is no longer the primary
  font — kept as a fallback in the \`.font-brand\` stack.
- Logo: the actual stamped brand mark the user provided (an oval badge with
  an open "E"/"C" glyph + floating crossbar), NOT an AI redraw — downloaded
  from the user's imgur link into public/logo-original.jpg, then denoised
  with \`sharp\` (median filter + threshold) to strip the paper grain into
  public/logo-white.png and public/logo-black.png. app/components/Logo.tsx
  renders it: default \`variant="white"\` wraps the white PNG in a dark
  rounded badge (\`bg-zinc-900\`) so it stays visible on any background —
  this was an explicit user request ("keep logo white"). Favicon
  (app/icon.png, app/apple-icon.png) is the same mark, white badge + black
  ink, generated via a one-off sharp script (not kept in the repo).

## Admin auth — read this before touching anything under app/Admin or app/api/admin

- Real Supabase Auth (email/password), replacing an old shared
  \`NEXT_PUBLIC_ADMIN_PASSWORD\` env var (insecure — client-bundled password,
  no per-user identity). Table \`admins\` (id = auth.users.id, email, role
  \`'god' | 'admin'\`) — see supabase/schema.sql.
- **Critical gotcha already hit and fixed once**: do NOT write an RLS policy
  on \`admins\` that queries \`admins\` from inside its own policy (e.g. "let
  god see every row" via \`exists (select 1 from admins where role='god' and
  id=auth.uid())\` as a policy ON \`admins\`) — Postgres re-evaluates that
  same policy for the inner query, forever, and throws "infinite recursion
  detected in policy for relation admins". This happened once already
  (supabase/fix-admins-recursion.sql is the fix that shipped). The current,
  correct policy on \`admins\` is just \`using (id = auth.uid())\` — self-read
  only, no recursion possible.
- Because client-side RLS-gated reads of \`admins\` turned out to be
  unreliable on this project for reasons never fully root-caused (possibly
  something specific to how this hosted project resolves \`auth.uid()\` for
  that table — the recursion bug above was A cause but not the only
  suspected one), **the admin-is-this-user-actually-an-admin check does NOT
  rely on client-side RLS reads at all anymore.** It goes through
  \`GET /api/admin/me\`, which uses the service-role client (bypasses RLS
  entirely) via \`lib/verifyAdmin.ts\`'s \`getRequestingAdmin(req)\`. Every
  \`/api/admin/*\` route calls that helper first. Follow this pattern for any
  new admin-gated route — don't add a new client-side \`.from("admins")\`
  read and assume RLS will behave.
- \`lib/supabaseAdmin.ts\` exports the service-role client. It imports the
  \`server-only\` package and must never be imported from a "use client" file.
- God vs admin: god can do everything an admin can (product CRUD) PLUS
  manage other admins (create/list/remove via \`/api/admin/create-admin\`,
  \`/list-admins\`, \`/remove-admin\`, all god-gated server-side, not just in
  the UI). A "god" account cannot be created through the app's own UI by
  design — see supabase/create-god-user.sql for the bootstrap process
  (direct SQL against \`auth.users\`/\`auth.identities\`, since the officially
  supported path is the Supabase Dashboard's "Add user").
- Never put a real password in a committed file. When bootstrapping/fixing
  the god account this session, SQL files were shipped with placeholder
  tokens (\`REPLACE_WITH_EMAIL\` etc.) for the user to fill in directly in the
  Supabase SQL editor, never in the repo.

## Checkout / orders

- app/cart/page.tsx's checkout writes an \`orders\` + \`order_items\` row
  (status \`'pending'\`) via the anon Supabase client directly — RLS on
  \`orders\` allows public INSERT (see supabase/add-orders-and-metrics.sql)
  because there are no customer accounts, same trust level the app already
  operated at. Redirects to /pay (bank transfer instructions).
- app/pay/page.tsx: clicking "I've Made Payment" (opens WhatsApp) also
  fires a best-effort client update flipping that order from \`pending\` to
  \`paid\` — narrowly scoped RLS policy only allows that exact transition
  (\`using (status='pending') with check (status='paid')\`), nothing else.
- Money is stored in kobo everywhere in the DB and in \`cartProvider\`/cart
  state (\`item.price\`); the cart page's \`deliveryFee\` local variable is the
  one exception — it's in naira and gets \`* 100\`'d before being persisted
  or added into totals. Watch for this if touching pricing code.
- Order status ('pending'|'paid'|'fulfilled'|'cancelled') is otherwise only
  mutable by an admin, via \`POST /api/admin/orders/status\`.

## Admin dashboard (app/Admin/dashboard/page.tsx + app/api/admin/dashboard/route.ts)

- Single \`GET /api/admin/dashboard\` endpoint returns stock data + order
  list to any admin; the \`revenue\` key (total revenue, 14-day chart data,
  avg order value, top products) is only present in the JSON payload at all
  for \`role === 'god'\` — enforced server-side, not just hidden in the UI.
- Stock tracker reads from the \`product_stock_summary\` SQL view (per-product
  aggregated stock/low-stock/out-of-stock counts, joined with categories).
  Revenue chart reads from the \`daily_revenue\` view (paid+fulfilled orders
  only, grouped by day).
- Filters: category chips (computed from \`stock.categories\`), a text search,
  and an in-stock/low-stock/out-of-stock pill filter — all client-side over
  the already-fetched product list (small catalog, no pagination needed yet).

## Image uploads

- Replaced "paste an imgur URL" with real uploads. \`lib/uploadImage.ts\`
  uploads to a public Supabase Storage bucket \`product-images\` (created by
  supabase/setup-storage.sql) using the browser's authenticated Supabase
  session — storage policies gate writes to \`authenticated\` role, which is
  equivalent to "is an admin" here since customers never get Auth accounts.
  \`app/components/ImageUploadField.tsx\` is the shared input+preview+upload
  component used in both app/Admin/page.tsx (add product) and
  app/Admin/edit/page.tsx (edit product), for both the main image and each
  gallery image slot. The plain URL text field is still there too (upload
  just fills it in) so pasting an external URL still works.

## Required env vars (see .env.example — names only, no real values ever committed)

NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY (server-only, powers every /api/admin/* route —
missing this on a deployment surfaces as "Admin check failed: Supabase admin
client is not configured on the server", which is the actual error message
that already happened once and was diagnosed via that text), PAYSTACK_SECRET_KEY,
NEXT_PUBLIC_SITE_URL, RESEND_API_KEY, YOUR_EMAIL.

## SQL files in supabase/ — run once each, in roughly this order, on a fresh project

1. schema.sql — categories/products/variants/product_images/admins + RLS +
   seed categories + god-account promotion (keyed to a specific email,
   safe/no-op until that auth user exists).
2. setup-storage.sql — product-images bucket + policies.
3. add-orders-and-metrics.sql — orders/order_items + RLS + the two views
   (product_stock_summary, daily_revenue) the dashboard reads.
4. create-god-user.sql — only needed if the Supabase Dashboard "Add user"
   route is being awkward; creates the auth.users + auth.identities rows
   directly via SQL (placeholders for email/password, fill in the SQL
   editor only, never save real values back to this file).
5. diagnose-admin.sql / check-and-fix-admin-rls.sql / fix-admins-recursion.sql
   — troubleshooting scripts from actually debugging a live "not an admin"
   / recursion incident this session. Safe to keep around for reference;
   fix-admins-recursion.sql is the one that matters if this ever
   resurfaces elsewhere.

All files are idempotent (drop-if-exists / on-conflict-do-nothing) — safe to
paste and re-run.

## Dead code / known rough edges

- app/api/paystack/route.ts + app/api/webhook/paystack/route.ts exist and
  are functional but NOT wired to any button in the current UI — the cart
  always goes through the bank-transfer flow. Either finish wiring Paystack
  in, or remove these if asked to clean up.
- app/Admin/edit/page.tsx's save flow deletes all variants/images for a
  product and reinserts them fresh rather than diffing — simple and correct
  but not transactional across the delete+reinsert steps. Acceptable at
  current scale; flag if it ever needs to be bulletproof.
- No pagination anywhere yet (products, orders, stock tracker) — fine at
  small-shop scale, would need it if the catalog/order volume grows a lot.
- This file is a static snapshot, not live-generated — if you make
  significant changes, consider updating it (or ask the user if they still
  want it kept current).
`.trim();
