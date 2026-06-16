-- Migration 050: Add missing columns to referrals table
-- The referrals table was created before migration 049 introduced these columns.

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS signup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_purchase_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_revenue_generated BIGINT NOT NULL DEFAULT 0;

-- Backfill referral_code from creator_referral_codes where possible
UPDATE referrals r
SET referral_code = crc.referral_code
FROM creator_referral_codes crc
WHERE crc.creator_id = r.referrer_id
  AND r.referral_code IS NULL;

-- For any remaining rows without a code, generate a placeholder
UPDATE referrals
SET referral_code = 'unknown-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE referral_code IS NULL;

-- Now add the constraint now that all rows have a value
ALTER TABLE referrals
  ALTER COLUMN referral_code SET NOT NULL;

-- Recreate index if needed
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals (referral_code);
