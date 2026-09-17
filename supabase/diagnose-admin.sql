-- Read-only diagnostic — shows why /Admin might say "this account is not an admin".
-- Replace the email below and run in the Supabase SQL editor.

select
  u.id            as auth_user_id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  a.id             is not null as has_admin_row,
  a.role           as admin_role
from auth.users u
left join admins a on a.id = u.id
where u.email = 'REPLACE_WITH_EMAIL';
