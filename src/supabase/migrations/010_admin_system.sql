-- CIPHER Platform - Migration 010: Admin System
-- Adds admin users table and application review features

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin list
DROP POLICY IF EXISTS "admins see admin list" ON admin_users;
CREATE POLICY "admins see admin list"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Add status and review fields to creator_applications
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'cipher',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_creator_applications_status 
  ON creator_applications (status);

CREATE INDEX IF NOT EXISTS idx_creator_applications_reviewed 
  ON creator_applications (reviewed_by, reviewed_at);

-- Comments
COMMENT ON TABLE admin_users IS 'Admin users who can review applications and manage platform';
COMMENT ON COLUMN creator_applications.status IS 'Application status: pending, approved, rejected';
COMMENT ON COLUMN creator_applications.tier IS 'Assigned tier: cipher, legend, apex';
COMMENT ON COLUMN creator_applications.admin_notes IS 'Internal admin notes about application';

-- Insert first admin (replace with your user ID)
-- INSERT INTO admin_users (user_id, role) 
-- VALUES ('your-user-id-here', 'superadmin')
-- ON CONFLICT (user_id) DO NOTHING;
