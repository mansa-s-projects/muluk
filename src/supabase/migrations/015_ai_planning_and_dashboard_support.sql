-- CIPHER Platform - Migration 015: AI planning, onboarding, and dashboard support

-- Persisted onboarding analysis
CREATE TABLE IF NOT EXISTS creator_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  interests TEXT[] NOT NULL DEFAULT '{}',
  content_types TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_onboarding_owner_all" ON creator_onboarding;
CREATE POLICY "creator_onboarding_owner_all" ON creator_onboarding
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Persisted AI daily briefs
CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_briefs_owner_all" ON daily_briefs;
CREATE POLICY "daily_briefs_owner_all" ON daily_briefs
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_briefs_creator_date
  ON daily_briefs(creator_id, date);

-- Persisted AI pricing recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_recommendations_owner_all" ON pricing_recommendations;
CREATE POLICY "pricing_recommendations_owner_all" ON pricing_recommendations
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_creator_created
  ON pricing_recommendations(creator_id, created_at DESC);

-- Creator planning board for AI ideas + manual scheduling
CREATE TABLE IF NOT EXISTS content_plans_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL DEFAULT 'unlock',
  planned_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('idea', 'planned', 'scheduled', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai', 'onboarding')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE content_plans_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_plans_v2_owner_all" ON content_plans_v2;
CREATE POLICY "content_plans_v2_owner_all" ON content_plans_v2
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_content_plans_v2_creator
  ON content_plans_v2(creator_id);

CREATE INDEX IF NOT EXISTS idx_content_plans_v2_planned_for
  ON content_plans_v2(planned_for DESC);

-- Creator broadcast log for dashboard blast tool
CREATE TABLE IF NOT EXISTS creator_broadcasts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('draft', 'queued', 'sent', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_broadcasts_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_broadcasts_v2_owner_all" ON creator_broadcasts_v2;
CREATE POLICY "creator_broadcasts_v2_owner_all" ON creator_broadcasts_v2
  FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_creator_broadcasts_v2_creator_created
  ON creator_broadcasts_v2(creator_id, created_at DESC);