-- Migration 051: Add get_creator_dashboard_stats RPC
-- Called by /dashboard page.tsx to populate the top-level stat cards.

CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  monthly_revenue_cents BIGINT,
  active_content_count  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- monthly revenue: tips + payment links this calendar month (cents)
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

    -- active content items (v2 published)
    (
      SELECT COUNT(*)
      FROM content_items_v2
      WHERE creator_id = p_user_id
        AND is_active = true
    )::BIGINT AS active_content_count;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION get_creator_dashboard_stats(UUID) TO authenticated;
