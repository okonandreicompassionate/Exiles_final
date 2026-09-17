-- 1) See what's actually in the categories table right now.
select id, name, slug from categories order by name;

-- ============================================================================
-- If that returned zero rows, run the insert below (safe to re-run —
-- on-conflict no-ops for any that already exist).
-- ============================================================================
insert into categories (name, slug) values
  ('Hoodies', 'hoodies'),
  ('Jackets', 'jackets'),
  ('Tees', 'tees'),
  ('Trousers', 'trousers'),
  ('Accessories', 'accessories')
on conflict (slug) do nothing;
