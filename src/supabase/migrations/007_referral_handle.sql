-- CIPHER Platform - Migration 007: Custom Referral Handle
-- Adds support for customizable referral links unlocked at earnings threshold

-- Add referral_handle column to creator_applications
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS referral_handle VARCHAR(30) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creator_applications_referral_handle
  ON creator_applications (referral_handle)
  WHERE referral_handle IS NOT NULL;

-- Add comment explaining the feature
COMMENT ON COLUMN creator_applications.referral_handle IS 
  'Custom referral handle for personalized links. Unlocked at $1000 total earnings. Format: 3-30 chars, alphanumeric + hyphens + underscores.';
