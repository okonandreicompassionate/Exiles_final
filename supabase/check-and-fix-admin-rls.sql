-- 1) See what RLS policies actually exist on `admins` right now.
select policyname, cmd, roles, qual
from pg_policies
where tablename = 'admins';

-- 2) Confirm RLS is actually turned on for the table.
select relname, relrowsecurity
from pg_class
where relname = 'admins';

-- ============================================================================
-- If step 1 returned no row for a SELECT policy (or step 2 shows
-- relrowsecurity = false), that's the bug: the app queries `admins` through
-- PostgREST as the logged-in user, which IS subject to RLS — unlike the SQL
-- editor, which runs as an elevated role and bypasses it entirely. That's why
-- the row is visible here but the app still says "not an admin".
--
-- This block is safe to re-run regardless — it (re)creates the policy.
-- ============================================================================

-- NOTE: an earlier version of this file created a policy that queried
-- `admins` from inside a policy on `admins` itself — that recurses forever
-- ("infinite recursion detected in policy for relation admins"). Fixed below.

alter table admins enable row level security;

drop policy if exists "admins_self_or_god_read" on admins;
drop policy if exists "admins_self_read" on admins;
create policy "admins_self_read" on admins for select
  using (id = auth.uid());
