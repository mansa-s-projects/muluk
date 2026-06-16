-- Security hardening: enforce caller ownership for get_creator_dashboard_stats.
-- Prevents authenticated users from querying dashboard stats for other users.

CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  monthly_revenue_cents BIGINT,
  active_content_count  BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (
      COALESCE((
        SELECT SUM(amount_cents)
        FROM tips
        WHERE creator_id = p_user_id
          AND created_at >= date_trunc('month', NOW())
      ), 0)
      +
      COALESCE((
        SELECT SUM(price)
        FROM payment_links
        WHERE creator_id = p_user_id
          AND created_at >= date_trunc('month', NOW())
          AND is_live = true
      ), 0)
    )::BIGINT AS monthly_revenue_cents,
    (
      SELECT COUNT(*)
      FROM content_items_v2
      WHERE creator_id = p_user_id
        AND is_active = true
    )::BIGINT AS active_content_count;
END;
$$;

REVOKE ALL ON FUNCTION get_creator_dashboard_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_creator_dashboard_stats(UUID) TO authenticated;
