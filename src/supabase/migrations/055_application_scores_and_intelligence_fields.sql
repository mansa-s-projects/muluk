-- Creator intelligence v2: normalized score snapshots and richer application fields.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS offer_description TEXT,
  ADD COLUMN IF NOT EXISTS audience_size TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_joining TEXT,
  ADD COLUMN IF NOT EXISTS confidence TEXT,
  ADD COLUMN IF NOT EXISTS strengths TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weaknesses TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_path TEXT,
  ADD COLUMN IF NOT EXISTS reasoning_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_recommendation_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_recommendation_check
  CHECK (
    recommendation IN (
      'approved',
      'waitlist',
      'rejected',
      'APPROVE_PRIORITY',
      'APPROVE',
      'WAITLIST',
      'REJECT'
    )
  );

CREATE TABLE IF NOT EXISTS public.application_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  audience_score INTEGER NOT NULL CHECK (audience_score >= 0 AND audience_score <= 100),
  engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
  niche_score INTEGER NOT NULL CHECK (niche_score >= 0 AND niche_score <= 100),
  offer_readiness_score INTEGER NOT NULL CHECK (offer_readiness_score >= 0 AND offer_readiness_score <= 100),
  brand_quality_score INTEGER NOT NULL CHECK (brand_quality_score >= 0 AND brand_quality_score <= 100),
  growth_potential_score INTEGER NOT NULL CHECK (growth_potential_score >= 0 AND growth_potential_score <= 100),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('APPROVE_PRIORITY', 'APPROVE', 'WAITLIST', 'REJECT')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  onboarding_path TEXT NOT NULL,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS application_scores_recommendation_idx
  ON public.application_scores (recommendation, overall_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS application_scores_onboarding_path_idx
  ON public.application_scores (onboarding_path, created_at DESC);

ALTER TABLE public.application_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_scores_admin_all ON public.application_scores;
CREATE POLICY application_scores_admin_all
  ON public.application_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

DROP POLICY IF EXISTS application_scores_owner_select ON public.application_scores;
CREATE POLICY application_scores_owner_select
  ON public.application_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a.id = application_id
      AND a.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_application_scores_updated_at ON public.application_scores;
CREATE TRIGGER trg_application_scores_updated_at
  BEFORE UPDATE ON public.application_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_creator_intelligence_updated_at();
