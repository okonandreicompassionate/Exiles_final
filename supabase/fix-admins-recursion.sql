-- ============================================================================
-- Fixes: "infinite recursion detected in policy for relation admins"
-- ============================================================================
-- The old policy checked "is this user a god" by querying `admins` from
-- INSIDE a policy defined ON `admins` — which re-triggers that same policy
-- for the inner query, forever. Nothing in the app actually relies on that
-- cross-admin visibility through the client anymore (the dashboard and
-- login checks all go through /api/admin/* routes using the service-role
-- key, which bypasses RLS entirely) — so the fix is just to simplify this
-- to "you can see your own row," which can't recurse.
-- ============================================================================

drop policy if exists "admins_self_or_god_read" on admins;

drop policy if exists "admins_self_read" on admins;
create policy "admins_self_read" on admins for select
  using (id = auth.uid());
