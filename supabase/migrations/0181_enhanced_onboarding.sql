-- CIPHER Platform - Migration 018: Enhanced onboarding flow
-- Adds launch blueprint, first drop, and completion tracking

-- Add new columns for enhanced onboarding flow
ALTER TABLE creator_onboarding
  ADD COLUMN IF NOT EXISTS launch_blueprint JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS first_drop JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add profiles table if not exists (for onboarding completion flag)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_owner_all" ON profiles;
CREATE POLICY "profiles_owner_all" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_onboarding_completed
  ON creator_onboarding(completed_at)
  WHERE completed_at IS NOT NULL;
