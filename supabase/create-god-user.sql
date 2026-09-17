-- ============================================================================
-- Create (or fix) the god login directly via SQL — bootstrap path
-- ============================================================================
-- Use this if Dashboard → Authentication → Users → "Add user" isn't working,
-- or if you're not sure what state that account is in (unconfirmed, wrong
-- password, etc). This script creates the auth user AND its identity row AND
-- promotes it to "god" in one go — or, if a user with this email already
-- exists, it just resets the password and makes sure it's confirmed.
--
-- HOW TO USE
--   1. Open this file, edit the two lines below (target_email / target_password)
--      with your real values, directly in the Supabase SQL editor.
--   2. Run it.
--   3. Do NOT save the edited version with your real password back into this
--      file or commit it anywhere — keep the placeholders in the repo copy.
--
-- This is not Supabase's officially documented API (that's the Dashboard or
-- the Admin API — which is exactly what the in-app "Admins" panel uses for
-- every admin after this first one). It writes to Supabase Auth's internal
-- schema directly, which works today but isn't guaranteed stable long-term.
-- Treat it as a one-time bootstrap, not something to run repeatedly.
-- ============================================================================

do $$
declare
  target_email    text := 'REPLACE_WITH_EMAIL';
  target_password text := 'REPLACE_WITH_PASSWORD';
  existing_id     uuid;
  target_id       uuid;
begin
  select id into existing_id from auth.users where email = target_email;

  if existing_id is not null then
    -- Account already exists (e.g. a previous dashboard attempt that didn't
    -- fully work) — reset its password and make sure it's confirmed rather
    -- than erroring on a duplicate email.
    update auth.users
    set encrypted_password = crypt(target_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = existing_id;

    target_id := existing_id;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), target_id,
           jsonb_build_object('sub', target_id::text, 'email', target_email),
           'email', target_id::text, now(), now(), now()
    where not exists (
      select 1 from auth.identities where user_id = target_id and provider = 'email'
    );
  else
    target_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      target_id, 'authenticated', 'authenticated', target_email,
      crypt(target_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), target_id,
      jsonb_build_object('sub', target_id::text, 'email', target_email),
      'email', target_id::text, now(), now(), now()
    );
  end if;

  insert into admins (id, email, role)
  values (target_id, target_email, 'god')
  on conflict (id) do update set role = 'god';
end $$;

-- Sign in at /Admin with target_email / target_password once this runs clean.
