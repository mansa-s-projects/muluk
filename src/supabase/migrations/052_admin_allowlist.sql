-- Migration 052: admin_allowlist table
-- Defence-in-depth gate for /admin/* routes.
-- Even if a user gains the admin JWT role, their email must be
-- explicitly allowlisted here before the middleware grants access.

CREATE TABLE IF NOT EXISTS admin_allowlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read/manage the allowlist (via service role in practice)
DROP POLICY IF EXISTS "super_admin_manage_allowlist" ON admin_allowlist;
CREATE POLICY "super_admin_manage_allowlist"
  ON admin_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

ALTER TABLE admin_allowlist ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_admin_allowlist_email ON admin_allowlist (email);
