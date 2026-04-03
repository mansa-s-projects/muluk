-- CIPHER Platform - Migration 014: API rate limiting primitives
-- Durable, per-user, per-route rate limiting for high-risk endpoints.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at ON api_rate_limits(updated_at);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own rate limit windows" ON api_rate_limits;
CREATE POLICY "Users can read own rate limit windows"
  ON api_rate_limits FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_route TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit config';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO api_rate_limits (user_id, route, window_start, request_count, updated_at)
  VALUES (v_user, p_route, v_window_start, 1, v_now)
  ON CONFLICT (user_id, route, window_start)
  DO UPDATE
    SET request_count = api_rate_limits.request_count + 1,
        updated_at = EXCLUDED.updated_at
  RETURNING request_count INTO v_count;

  allowed := v_count <= p_limit;
  remaining := GREATEST(p_limit - v_count, 0);
  reset_at := v_window_start + make_interval(secs => p_window_seconds);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON TABLE api_rate_limits FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
