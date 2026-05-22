-- CIPHER Platform - Migration 008: Settings Tables
-- Adds tables for payout settings, notification preferences, and privacy settings

-- Add new columns to creator_applications for privacy settings
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_earnings BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN DEFAULT true;

-- Create creator_payout_settings table
CREATE TABLE IF NOT EXISTS creator_payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL DEFAULT 'stripe',
  stripe_account_id TEXT,
  wise_email TEXT,
  crypto_wallet TEXT,
  paypal_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

-- Enable RLS on payout settings
ALTER TABLE creator_payout_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator manages own payout settings" ON creator_payout_settings;
CREATE POLICY "creator manages own payout settings"
  ON creator_payout_settings FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Create creator_notification_settings table
CREATE TABLE IF NOT EXISTS creator_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_new_fan BOOLEAN DEFAULT true,
  email_new_earning BOOLEAN DEFAULT true,
  email_weekly_report BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

-- Enable RLS on notification settings
ALTER TABLE creator_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator manages own notification settings" ON creator_notification_settings;
CREATE POLICY "creator manages own notification settings"
  ON creator_notification_settings FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Create storage bucket for creator assets if not exists
-- Note: Run this in Supabase dashboard SQL editor as it requires admin privileges
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('creator-assets', 'creator-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE creator_payout_settings IS 'Creator payout method and account details';
COMMENT ON TABLE creator_notification_settings IS 'Creator email and push notification preferences';
