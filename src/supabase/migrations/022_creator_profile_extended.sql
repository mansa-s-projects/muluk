-- CIPHER Platform - Migration 022: Creator Profile Extended Fields
-- Adds identity and CTA fields to creator_applications for the profile onboarding step

ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS main_specialty      TEXT,
  ADD COLUMN IF NOT EXISTS primary_cta_label   TEXT,
  ADD COLUMN IF NOT EXISTS primary_cta_url     TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN creator_applications.main_specialty      IS 'Creator primary expertise, e.g. "Streetwear Styling"';
COMMENT ON COLUMN creator_applications.primary_cta_label   IS 'CTA button label on public profile, e.g. "Book a Call"';
COMMENT ON COLUMN creator_applications.primary_cta_url     IS 'CTA destination URL';
COMMENT ON COLUMN creator_applications.profile_completed_at IS 'Timestamp when creator completed the profile onboarding step';
