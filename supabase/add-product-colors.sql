-- ============================================================================
-- Adds color as a real, selectable product attribute (alongside size) so an
-- order actually records which color the customer picked.
-- ============================================================================

-- Admin-defined list of colors available for a product (e.g. {Black,White}).
-- Empty array = no color choice needed, same as today.
alter table products add column if not exists colors text[] not null default '{}';

-- The color the customer picked for that line item, if the product has any.
alter table order_items add column if not exists color text;
