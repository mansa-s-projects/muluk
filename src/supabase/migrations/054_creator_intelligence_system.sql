-- Creator intelligence system for gated onboarding and qualification.
-- Adaptive version for existing MULUK production schema.

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.creators
SET handle = COALESCE(handle, username)
WHERE handle IS NULL;

UPDATE public.creators
SET updated_at = COALESCE(updated_at, NOW());

CREATE UNIQUE INDEX IF NOT EXISTS creators_email_unique ON public.creators (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS creators_handle_unique ON public.creators (lower(handle)) WHERE handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS creators_status_idx ON public.creators (status, score DESC, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'creators_email_key'
      AND conrelid = 'public.creators'::regclass
  ) THEN
    ALTER TABLE public.creators
      ADD CONSTRAINT creators_email_key UNIQUE (email);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  secondary_platforms TEXT[] NOT NULL DEFAULT '{}',
  niche TEXT,
  niche_custom TEXT,
  short_description TEXT,
  audience_size_self_reported TEXT,
  audience_size_numeric INTEGER NOT NULL DEFAULT 0,
  monthly_earnings TEXT,
  why_join_muluk TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  niche_score INTEGER NOT NULL DEFAULT 0,
  monetization_score INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT NOT NULL DEFAULT 'waitlist' CHECK (recommendation IN ('approved', 'waitlist', 'rejected')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waitlist', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_email_unique ON public.applications (lower(email));
CREATE INDEX IF NOT EXISTS applications_recommendation_idx ON public.applications (recommendation, overall_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_creator_idx ON public.applications (creator_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_email_key'
      AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_email_key UNIQUE (email);
  END IF;
END $$;

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creators_owner_select ON public.creators;
CREATE POLICY creators_owner_select
  ON public.creators FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS applications_owner_select ON public.applications;
CREATE POLICY applications_owner_select
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS applications_owner_insert ON public.applications;
CREATE POLICY applications_owner_insert
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS creators_admin_all ON public.creators;
CREATE POLICY creators_admin_all
  ON public.creators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

DROP POLICY IF EXISTS applications_admin_all ON public.applications;
CREATE POLICY applications_admin_all
  ON public.applications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_creator_intelligence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creators_updated_at ON public.creators;
CREATE TRIGGER trg_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_creator_intelligence_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_creator_intelligence_updated_at();
