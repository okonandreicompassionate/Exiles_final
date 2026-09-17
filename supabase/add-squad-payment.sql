-- ============================================================================
-- Adds Squad as a payment method on `orders`, alongside the existing
-- bank_transfer / paystack values. Safe to re-run.
-- ============================================================================

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('bank_transfer', 'paystack', 'squad'));

-- Generic gateway reference (Squad's transaction_ref — we set this to the
-- order's own id when initiating, so the webhook can look the order back up
-- without guessing at exact payload field names).
alter table orders add column if not exists gateway_reference text;
create index if not exists idx_orders_gateway_reference on orders (gateway_reference);
