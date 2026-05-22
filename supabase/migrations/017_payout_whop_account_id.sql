-- CIPHER Platform - Migration 017: Payout column rename for Whop
-- Adds whop_account_id while keeping stripe_account_id for backward compatibility.

ALTER TABLE creator_payout_settings
  ADD COLUMN IF NOT EXISTS whop_account_id TEXT;

-- Backfill existing data.
UPDATE creator_payout_settings
SET whop_account_id = stripe_account_id
WHERE whop_account_id IS NULL
  AND stripe_account_id IS NOT NULL;

-- Update default payout method.
ALTER TABLE creator_payout_settings
  ALTER COLUMN method SET DEFAULT 'whop';

-- Normalize existing rows still marked as stripe.
UPDATE creator_payout_settings
SET method = 'whop'
WHERE method = 'stripe';
