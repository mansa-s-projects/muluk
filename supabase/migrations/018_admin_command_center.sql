-- CIPHER Platform - Migration 018: Admin Command Center (God Mode)
-- Full platform monitoring, moderation, and control tables

-- ── admin_audit_logs ─────────────────────────────────────────────────────────
-- Every admin action is logged here for accountability
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view_creator', 'ban_creator', 'delete_content', 'view_messages', etc.
  target_type TEXT NOT NULL, -- 'creator', 'fan', 'content', 'transaction', 'message'
  target_id TEXT, -- UUID of the target entity
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own logs (or superadmins can view all)
DROP POLICY IF EXISTS "admin_audit_logs_admin_select" ON admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_select"
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert (via API)
DROP POLICY IF EXISTS "admin_audit_logs_service_insert" ON admin_audit_logs;
CREATE POLICY "admin_audit_logs_service_insert"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (true); -- Service role only

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action, created_at DESC);

-- ── creator_bans ────────────────────────────────────────────────────────────
-- Tracks suspended/banned creators
CREATE TABLE IF NOT EXISTS creator_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent', 'shadow')),
  expires_at TIMESTAMPTZ, -- NULL for permanent bans
  is_active BOOLEAN NOT NULL DEFAULT true,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES auth.users(id),
  lift_reason TEXT,
  evidence JSONB DEFAULT '{}'::jsonb, -- Screenshots, reports, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_bans ENABLE ROW LEVEL SECURITY;

-- Admins can view all bans
DROP POLICY IF EXISTS "creator_bans_admin_select" ON creator_bans;
CREATE POLICY "creator_bans_admin_select"
  ON creator_bans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Service role for inserts
DROP POLICY IF EXISTS "creator_bans_service_insert" ON creator_bans;
CREATE POLICY "creator_bans_service_insert"
  ON creator_bans FOR INSERT
  WITH CHECK (true);

-- Service role for updates (lifting bans)
DROP POLICY IF EXISTS "creator_bans_service_update" ON creator_bans;
CREATE POLICY "creator_bans_service_update"
  ON creator_bans FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_creator_bans_creator ON creator_bans(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_bans_active ON creator_bans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_creator_bans_expires ON creator_bans(expires_at);

-- ── admin_notes ─────────────────────────────────────────────────────────────
-- Private admin notes on creators, fans, content
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'creator', 'fan', 'content', 'transaction'
  target_id TEXT NOT NULL,
  note TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD notes
DROP POLICY IF EXISTS "admin_notes_admin_all" ON admin_notes;
CREATE POLICY "admin_notes_admin_all"
  ON admin_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_notes_target ON admin_notes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_priority ON admin_notes(priority) WHERE priority IN ('high', 'critical');

-- ── platform_analytics_cache ───────────────────────────────────────────────
-- Pre-computed analytics for fast dashboard loading
CREATE TABLE IF NOT EXISTS platform_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  metric_value JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

ALTER TABLE platform_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Admins can view
DROP POLICY IF EXISTS "platform_analytics_cache_admin_select" ON platform_analytics_cache;
CREATE POLICY "platform_analytics_cache_admin_select"
  ON platform_analytics_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_platform_analytics_name ON platform_analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_platform_analytics_expires ON platform_analytics_cache(expires_at);

-- ── admin_realtime_events ──────────────────────────────────────────────────
-- Real-time feed of platform activity for live monitoring
CREATE TABLE IF NOT EXISTS admin_realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'signup', 'payment', 'content_created', 'message_sent', 'login', 'ban'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_type TEXT NOT NULL, -- 'creator', 'fan', 'admin'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_realtime_events ENABLE ROW LEVEL SECURITY;

-- Admins can view
DROP POLICY IF EXISTS "admin_realtime_events_admin_select" ON admin_realtime_events;
CREATE POLICY "admin_realtime_events_admin_select"
  ON admin_realtime_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Service role can insert
DROP POLICY IF EXISTS "admin_realtime_events_service_insert" ON admin_realtime_events;
CREATE POLICY "admin_realtime_events_service_insert"
  ON admin_realtime_events FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_realtime_events_type ON admin_realtime_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_realtime_events_user ON admin_realtime_events(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_realtime_events_created ON admin_realtime_events(created_at DESC);

-- Enable realtime for admin_realtime_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_realtime_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_realtime_events;
  END IF;
END $$;

-- ── admin_sessions ──────────────────────────────────────────────────────────
-- Track admin login sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_sessions_admin_select" ON admin_sessions;
CREATE POLICY "admin_sessions_admin_select"
  ON admin_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = true;

-- ── Add admin roles ─────────────────────────────────────────────────────────
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing admin_users to have role if not set
UPDATE admin_users SET role = 'admin' WHERE role IS NULL;

-- Comments
COMMENT ON TABLE admin_audit_logs IS 'Audit trail of all admin actions for compliance';
COMMENT ON TABLE creator_bans IS 'Creator suspension/ban records';
COMMENT ON TABLE admin_notes IS 'Private notes admins leave on users/content';
COMMENT ON TABLE admin_realtime_events IS 'Real-time activity feed for live monitoring';
COMMENT ON TABLE admin_sessions IS 'Active admin session tracking';

-- Function to check if a creator is banned
CREATE OR REPLACE FUNCTION is_creator_banned(p_creator_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM creator_bans 
    WHERE creator_id = p_creator_id 
    AND is_active = true 
    AND (ban_type = 'permanent' OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
