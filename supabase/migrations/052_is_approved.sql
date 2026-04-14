-- ─────────────────────────────────────────────────────────────
-- 052 — is_approved gate
--
-- Adds an explicit is_approved flag to users so the login flow
-- can gate access before checking roles.
-- Synced to JWT app_metadata via trigger (same pattern as role).
-- ─────────────────────────────────────────────────────────────

-- 1. Column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_approved ON public.users (is_approved);

-- 2. Backfill: anyone already with creator/admin/super_admin role is approved
UPDATE public.users
SET is_approved = true
WHERE role IN ('creator', 'admin', 'super_admin');

-- 3. Trigger function — pushes is_approved into JWT app_metadata
CREATE OR REPLACE FUNCTION public.sync_approval_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('is_approved', NEW.is_approved)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_sync_approval ON public.users;
CREATE TRIGGER trg_users_sync_approval
  AFTER INSERT OR UPDATE OF is_approved ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_approval_to_jwt();

-- 4. Backfill JWT metadata for all existing users
UPDATE auth.users au
SET raw_app_meta_data =
  COALESCE(au.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('is_approved', COALESCE(pu.is_approved, false))
FROM public.users pu
WHERE au.id = pu.id;
