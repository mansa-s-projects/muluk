-- ============================================================
-- 043_bookings_whop_checkout.sql
-- Add Whop checkout/payment tracking fields for bookings
-- ============================================================

BEGIN;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS whop_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_whop_checkout
  ON bookings(whop_checkout_id)
  WHERE whop_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_whop_payment_unique
  ON bookings(whop_payment_id)
  WHERE whop_payment_id IS NOT NULL;

COMMIT;
