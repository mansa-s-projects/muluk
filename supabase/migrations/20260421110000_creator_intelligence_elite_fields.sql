-- Creator intelligence elite upgrade: persist explainability, risk flags, tags, and prescriptions.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opportunity_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_revenue_prescription JSONB,
  ADD COLUMN IF NOT EXISTS admin_decision_memo TEXT,
  ADD COLUMN IF NOT EXISTS score_explainability JSONB;

ALTER TABLE public.application_scores
  ADD COLUMN IF NOT EXISTS red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opportunity_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_revenue_prescription JSONB,
  ADD COLUMN IF NOT EXISTS admin_decision_memo TEXT,
  ADD COLUMN IF NOT EXISTS score_explainability JSONB;
