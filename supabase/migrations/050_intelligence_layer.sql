-- ═══════════════════════════════════════════════════════════════════════════════
-- 050_intelligence_layer.sql
-- Intelligence Layer: Behavior Scoring v2, Churn Detection, Revenue Triggers,
-- Today's Action Engine, Radar View Upgrades, Performance Indexes
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: EXTEND EVENT TYPES
-- New high-signal events for intent detection.
-- ALTER TYPE ADD VALUE cannot run in a transaction on PG < 12;
-- Supabase Cloud uses PG14+, so this is safe.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'profile_view';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'asset_view';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'price_click';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'message_open';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'message_reply';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'offer_sent';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'offer_open';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'drop_claim';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'page_join';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: EXTEND BEHAVIOR_STATUS ENUM
-- 'at_risk' = previously-paying member showing churn signals.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.behavior_status ADD VALUE IF NOT EXISTS 'at_risk';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: EXTEND BEHAVIOR_SCORES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.behavior_scores
  ADD COLUMN IF NOT EXISTS last_event_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS churn_label      TEXT
    CHECK (churn_label IN ('healthy', 'cooling', 'silent', 'churning'));

CREATE INDEX IF NOT EXISTS idx_bs_creator_status_churn
  ON public.behavior_scores (creator_id, status, churn_label);

CREATE INDEX IF NOT EXISTS idx_bs_creator_last_event
  ON public.behavior_scores (creator_id, last_event_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_bs_creator_last_purchase
  ON public.behavior_scores (creator_id, last_purchase_at DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: REPLACE SCORING FUNCTION
-- Full weight table, 3/7-day decay, 14-day high-spender penalty,
-- churn label (healthy/cooling/silent/churning), at_risk status.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_behavior_score(
  p_fan_id     UUID,
  p_creator_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_score           INT := 0;
  v_status          behavior_status;
  v_churn_label     TEXT;
  v_last_event_at   TIMESTAMPTZ;
  v_last_purchase_at TIMESTAMPTZ;
  v_total_spent     NUMERIC;
  v_days_inactive   NUMERIC;
BEGIN
  -- ── 4.1 Sum weighted events from the last 30 days ──────────────────────────
  SELECT COALESCE(SUM(
    CASE e.type
      WHEN 'login'          THEN 1
      WHEN 'profile_view'   THEN 2
      WHEN 'view'           THEN 2
      WHEN 'page_join'      THEN 3
      WHEN 'message'        THEN 3
      WHEN 'message_open'   THEN 3
      WHEN 'asset_view'     THEN 5
      WHEN 'open_asset'     THEN 5
      WHEN 'drop_view'      THEN 6
      WHEN 'referral_click' THEN 2
      WHEN 'message_reply'  THEN 8
      WHEN 'drop_click'     THEN 8
      WHEN 'offer_sent'     THEN 2
      WHEN 'price_click'    THEN 10
      WHEN 'click'          THEN 10
      WHEN 'offer_open'     THEN 12
      WHEN 'drop_claim'     THEN 14
      WHEN 'purchase'       THEN 25
      ELSE 0
    END
  ), 0)
  INTO v_score
  FROM public.events e
  WHERE e.user_id    = p_fan_id
    AND e.creator_id = p_creator_id
    AND e.created_at > NOW() - INTERVAL '30 days';

  -- ── 4.2 Recency anchors ────────────────────────────────────────────────────
  SELECT MAX(created_at) INTO v_last_event_at
  FROM public.events
  WHERE user_id    = p_fan_id
    AND creator_id = p_creator_id;

  SELECT MAX(completed_at) INTO v_last_purchase_at
  FROM public.purchases
  WHERE fan_id     = p_fan_id
    AND creator_id = p_creator_id
    AND status     = 'completed';

  SELECT COALESCE(total_spent, 0) INTO v_total_spent
  FROM public.memberships
  WHERE fan_id     = p_fan_id
    AND creator_id = p_creator_id;

  v_days_inactive := CASE
    WHEN v_last_event_at IS NULL
      THEN 999
    ELSE EXTRACT(EPOCH FROM (NOW() - v_last_event_at)) / 86400.0
  END;

  -- ── 4.3 Decay penalties ────────────────────────────────────────────────────
  -- 3-day silence: -10
  IF v_days_inactive >= 3 AND v_days_inactive < 7 THEN
    v_score := v_score - 10;
  END IF;
  -- 7-day silence: -20 (cumulative with 3-day band when >= 7)
  IF v_days_inactive >= 7 THEN
    v_score := v_score - 20;
  END IF;
  -- High-spender with no purchase in 14+ days: additional -25
  IF v_total_spent > 50
     AND (v_last_purchase_at IS NULL
          OR v_last_purchase_at < NOW() - INTERVAL '14 days')
  THEN
    v_score := v_score - 25;
  END IF;

  v_score := GREATEST(v_score, 0);

  -- ── 4.4 Churn label ───────────────────────────────────────────────────────
  v_churn_label := CASE
    WHEN v_days_inactive <= 3  THEN 'healthy'
    WHEN v_days_inactive <= 7  THEN 'cooling'
    WHEN v_days_inactive <= 14 THEN 'silent'
    ELSE                            'churning'
  END;

  -- ── 4.5 Status ─────────────────────────────────────────────────────────────
  -- at_risk: has paid before AND now showing churn signals (not just cold)
  v_status := CASE
    WHEN v_score >= 60
      THEN 'hot'::behavior_status
    WHEN v_score >= 30
      THEN 'warm'::behavior_status
    WHEN v_last_purchase_at IS NOT NULL
         AND v_churn_label IN ('cooling', 'silent', 'churning')
      THEN 'at_risk'::behavior_status
    ELSE 'cold'::behavior_status
  END;

  -- ── 4.6 Upsert ────────────────────────────────────────────────────────────
  INSERT INTO public.behavior_scores
    (fan_id, creator_id, score, status, churn_label,
     last_event_at, last_purchase_at, last_calculated)
  VALUES
    (p_fan_id, p_creator_id, v_score, v_status, v_churn_label,
     v_last_event_at, v_last_purchase_at, NOW())
  ON CONFLICT (fan_id, creator_id) DO UPDATE SET
    score            = EXCLUDED.score,
    status           = EXCLUDED.status,
    churn_label      = EXCLUDED.churn_label,
    last_event_at    = EXCLUDED.last_event_at,
    last_purchase_at = EXCLUDED.last_purchase_at,
    last_calculated  = NOW();
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: UPGRADE RADAR VIEWS
-- All views now include churn_label, last_event_at, last_purchase_at.
-- v_at_risk broadened to cover the new 'at_risk' status + hot/warm with churn.
-- v_likely_to_convert now requires recent high-intent events (last 72h).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_top_spenders AS
SELECT
  m.creator_id,
  m.fan_id,
  p.display_name,
  p.avatar_url,
  m.total_spent,
  m.purchase_count,
  m.last_active_at,
  bs.score,
  bs.status,
  bs.churn_label,
  bs.last_event_at,
  bs.last_purchase_at
FROM public.memberships m
LEFT JOIN public.profiles p    ON p.user_id    = m.fan_id
LEFT JOIN public.behavior_scores bs
  ON bs.fan_id = m.fan_id AND bs.creator_id = m.creator_id
WHERE m.is_active = TRUE
ORDER BY m.total_spent DESC;

CREATE OR REPLACE VIEW public.v_most_active AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  bs.churn_label,
  bs.last_event_at,
  bs.last_purchase_at,
  m.total_spent,
  m.purchase_count,
  m.last_active_at
FROM public.behavior_scores bs
LEFT JOIN public.profiles p    ON p.user_id    = bs.fan_id
LEFT JOIN public.memberships m
  ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
ORDER BY bs.score DESC;

-- v_at_risk: status = at_risk  OR  still scored hot/warm but showing churn
CREATE OR REPLACE VIEW public.v_at_risk AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  bs.churn_label,
  bs.last_event_at,
  bs.last_purchase_at,
  m.total_spent,
  m.purchase_count,
  m.last_active_at
FROM public.behavior_scores bs
LEFT JOIN public.profiles p    ON p.user_id    = bs.fan_id
LEFT JOIN public.memberships m
  ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
WHERE bs.status = 'at_risk'
   OR (
     bs.status IN ('hot', 'warm')
     AND bs.churn_label IN ('cooling', 'silent', 'churning')
   )
ORDER BY m.total_spent DESC NULLS LAST;

-- v_likely_to_convert: high-score, no purchases yet, recent high-intent events
CREATE OR REPLACE VIEW public.v_likely_to_convert AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  bs.churn_label,
  bs.last_event_at,
  COALESCE(m.purchase_count, 0) AS purchase_count,
  COALESCE(m.total_spent, 0)    AS total_spent,
  m.last_active_at
FROM public.behavior_scores bs
LEFT JOIN public.profiles p    ON p.user_id    = bs.fan_id
LEFT JOIN public.memberships m
  ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
WHERE bs.score >= 20
  AND bs.status IN ('hot', 'warm')
  AND bs.churn_label IN ('healthy', 'cooling')
  AND (m.purchase_count IS NULL OR m.purchase_count = 0)
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.user_id    = bs.fan_id
      AND e.creator_id = bs.creator_id
      AND e.type IN ('price_click', 'click', 'offer_open', 'drop_view', 'drop_click', 'asset_view')
      AND e.created_at > NOW() - INTERVAL '72 hours'
  )
ORDER BY bs.score DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: REVENUE TRIGGERS TABLE
-- One row per creator per trigger_type. Expires automatically.
-- generate_revenue_triggers() upserts into this table on demand.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.revenue_triggers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID        NOT NULL,
  trigger_type TEXT        NOT NULL
    CHECK (trigger_type IN (
      'best_day_gap',
      'hot_member_online',
      'at_risk_vip',
      'drop_expiring',
      'no_active_drop',
      'likely_to_convert',
      'unread_messages',
      'no_recent_content'
    )),
  message      TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  priority     INT         NOT NULL DEFAULT 50,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_triggers_creator_type_unique UNIQUE (creator_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_revenue_triggers_creator_priority
  ON public.revenue_triggers (creator_id, priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_triggers_expires
  ON public.revenue_triggers (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.revenue_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_triggers_creator_read" ON public.revenue_triggers;
CREATE POLICY "revenue_triggers_creator_read" ON public.revenue_triggers
  FOR SELECT USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: GENERATE REVENUE TRIGGERS
-- Idempotent. Deletes expired rows, upserts current signals.
-- Runs in-band (called by get_today_action) or from an edge function/cron.
-- SECURITY DEFINER so it can read across tables regardless of caller RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_revenue_triggers(p_creator_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_revenue    NUMERIC;
  v_best_day_revenue NUMERIC;
  v_gap              NUMERIC;
  v_hot_active       INT;
  v_at_risk_vip      INT;
  v_likely_convert   INT;
  v_unread_count     INT;
  v_has_active_drop  BOOLEAN;
  v_no_recent_asset  BOOLEAN;
  v_expiring_drop    RECORD;
BEGIN
  -- Remove expired triggers (stale signals have no value)
  DELETE FROM public.revenue_triggers
  WHERE creator_id = p_creator_id
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- ── SIGNAL: best_day_gap ─────────────────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0) INTO v_today_revenue
  FROM public.purchases
  WHERE creator_id = p_creator_id
    AND status     = 'completed'
    AND created_at >= date_trunc('day', NOW());

  SELECT COALESCE(MAX(day_total), 0) INTO v_best_day_revenue
  FROM (
    SELECT SUM(amount) AS day_total
    FROM public.purchases
    WHERE creator_id = p_creator_id AND status = 'completed'
    GROUP BY date_trunc('day', created_at)
  ) sub;

  v_gap := v_best_day_revenue - v_today_revenue;
  IF v_gap > 0 AND v_best_day_revenue > 0 THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'best_day_gap',
      'You are $' || round(v_gap, 2)::text || ' from your best day',
      jsonb_build_object('gap', v_gap, 'best_day', v_best_day_revenue, 'today', v_today_revenue),
      75,
      date_trunc('day', NOW()) + INTERVAL '1 day'
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'best_day_gap';
  END IF;

  -- ── SIGNAL: hot_member_online ─────────────────────────────────────────────
  -- Proxy: behavior_score 'hot' AND event in last 10 minutes
  SELECT COUNT(DISTINCT e.user_id) INTO v_hot_active
  FROM public.events e
  JOIN public.behavior_scores bs
    ON bs.fan_id = e.user_id AND bs.creator_id = e.creator_id
  WHERE e.creator_id  = p_creator_id
    AND e.created_at  > NOW() - INTERVAL '10 minutes'
    AND bs.status     = 'hot';

  IF v_hot_active > 0 THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'hot_member_online',
      v_hot_active::text || ' high-value member'
        || CASE WHEN v_hot_active > 1 THEN 's are' ELSE ' is' END || ' active right now',
      jsonb_build_object('count', v_hot_active),
      90,
      NOW() + INTERVAL '15 minutes'
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      priority   = EXCLUDED.priority,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'hot_member_online';
  END IF;

  -- ── SIGNAL: at_risk_vip ───────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_at_risk_vip
  FROM public.behavior_scores bs
  JOIN public.memberships m
    ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
  WHERE bs.creator_id = p_creator_id
    AND bs.status     = 'at_risk'
    AND m.total_spent >= 50;

  IF v_at_risk_vip > 0 THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'at_risk_vip',
      v_at_risk_vip::text || ' high-value member'
        || CASE WHEN v_at_risk_vip > 1 THEN 's have' ELSE ' has' END
        || ' not paid in over a week',
      jsonb_build_object('count', v_at_risk_vip),
      85,
      NOW() + INTERVAL '12 hours'
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'at_risk_vip';
  END IF;

  -- ── SIGNAL: drop_expiring ─────────────────────────────────────────────────
  SELECT * INTO v_expiring_drop
  FROM public.drops
  WHERE creator_id = p_creator_id
    AND is_active  = TRUE
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
  ORDER BY expires_at ASC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'drop_expiring',
      'Your drop "' || v_expiring_drop.title || '" closes in less than 2 hours',
      jsonb_build_object(
        'drop_id',   v_expiring_drop.id,
        'slots_left', (v_expiring_drop.max_slots - v_expiring_drop.slots_taken),
        'expires_at', v_expiring_drop.expires_at
      ),
      95,
      v_expiring_drop.expires_at
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      priority   = EXCLUDED.priority,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'drop_expiring';
  END IF;

  -- ── SIGNAL: likely_to_convert ─────────────────────────────────────────────
  SELECT COUNT(*) INTO v_likely_convert
  FROM public.v_likely_to_convert
  WHERE creator_id = p_creator_id;

  IF v_likely_convert > 0 THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'likely_to_convert',
      v_likely_convert::text || ' member'
        || CASE WHEN v_likely_convert > 1 THEN 's' ELSE '' END
        || ' showing strong buying signals',
      jsonb_build_object('count', v_likely_convert),
      80,
      NOW() + INTERVAL '6 hours'
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'likely_to_convert';
  END IF;

  -- ── SIGNAL: unread_messages ───────────────────────────────────────────────
  SELECT COUNT(*) INTO v_unread_count
  FROM public.messages
  WHERE recipient_id = p_creator_id AND is_read = FALSE;

  IF v_unread_count > 0 THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'unread_messages',
      v_unread_count::text || ' unread message'
        || CASE WHEN v_unread_count > 1 THEN 's' ELSE '' END || ' from members',
      jsonb_build_object('count', v_unread_count),
      70,
      NOW() + INTERVAL '6 hours'
    )
    ON CONFLICT (creator_id, trigger_type) DO UPDATE SET
      message    = EXCLUDED.message,
      metadata   = EXCLUDED.metadata,
      expires_at = EXCLUDED.expires_at;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'unread_messages';
  END IF;

  -- ── SIGNAL: no_active_drop ────────────────────────────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM public.drops
    WHERE creator_id = p_creator_id
      AND is_active  = TRUE
      AND expires_at > NOW()
  ) INTO v_has_active_drop;

  IF NOT v_has_active_drop THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'no_active_drop',
      'No active drop — create a timed offer to drive conversions',
      '{}', 55,
      NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (creator_id, trigger_type) DO NOTHING;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'no_active_drop';
  END IF;

  -- ── SIGNAL: no_recent_content ─────────────────────────────────────────────
  SELECT NOT EXISTS(
    SELECT 1 FROM public.assets
    WHERE creator_id = p_creator_id
      AND created_at > NOW() - INTERVAL '7 days'
  ) INTO v_no_recent_asset;

  IF v_no_recent_asset THEN
    INSERT INTO public.revenue_triggers
      (creator_id, trigger_type, message, metadata, priority, expires_at)
    VALUES (
      p_creator_id, 'no_recent_content',
      'No new content in 7 days — upload to re-engage members',
      '{}', 45,
      NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (creator_id, trigger_type) DO NOTHING;
  ELSE
    DELETE FROM public.revenue_triggers
    WHERE creator_id = p_creator_id AND trigger_type = 'no_recent_content';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: TODAY'S ACTION ENGINE
-- Returns the single highest-priority active trigger for the creator dashboard.
-- Internally calls generate_revenue_triggers to ensure freshness.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_today_action(p_creator_id UUID)
RETURNS TABLE (
  action_type    TEXT,
  label          TEXT,
  reason         TEXT,
  priority_score INT,
  cta_target     TEXT,
  metadata       JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  PERFORM public.generate_revenue_triggers(p_creator_id);

  SELECT t.trigger_type, t.message, t.metadata, t.priority
  INTO v_row
  FROM public.revenue_triggers t
  WHERE t.creator_id = p_creator_id
    AND (t.expires_at IS NULL OR t.expires_at > NOW())
  ORDER BY t.priority DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'idle'::TEXT,
      'All clear — no urgent signals'::TEXT,
      'You are ahead of schedule. No action required right now.'::TEXT,
      0::INT,
      '/dashboard'::TEXT,
      '{}'::JSONB;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_row.trigger_type,
    v_row.message,
    CASE v_row.trigger_type
      WHEN 'drop_expiring'      THEN 'Time-sensitive — push it to your members now'
      WHEN 'hot_member_online'  THEN 'Highest conversion window — act while they are active'
      WHEN 'at_risk_vip'        THEN 'High-value members going cold — personal outreach converts 4x better'
      WHEN 'best_day_gap'       THEN 'You are within reach of your best revenue day'
      WHEN 'likely_to_convert'  THEN 'These members clicked pricing — send a direct offer now'
      WHEN 'unread_messages'    THEN 'Unanswered messages signal intent — reply to convert'
      WHEN 'no_active_drop'     THEN 'Timed drops convert 3-5x better than static offers'
      WHEN 'no_recent_content'  THEN 'Fresh content drives re-engagement and new purchases'
      ELSE                           'Take action now to maximize today'
    END,
    v_row.priority,
    CASE v_row.trigger_type
      WHEN 'drop_expiring'      THEN '/dashboard/vault'
      WHEN 'hot_member_online'  THEN '/dashboard/direct-line'
      WHEN 'at_risk_vip'        THEN '/dashboard/members'
      WHEN 'best_day_gap'       THEN '/dashboard/direct-line'
      WHEN 'likely_to_convert'  THEN '/dashboard/direct-line'
      WHEN 'unread_messages'    THEN '/dashboard/direct-line'
      WHEN 'no_active_drop'     THEN '/dashboard/vault'
      WHEN 'no_recent_content'  THEN '/dashboard/vault'
      ELSE                           '/dashboard'
    END,
    v_row.metadata;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Events: composite scan for scoring and radar queries
CREATE INDEX IF NOT EXISTS idx_events_creator_type_at
  ON public.events (creator_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_user_creator_at
  ON public.events (user_id, creator_id, created_at DESC);

-- Purchases: best-day aggregation and VIP inactivity detection
CREATE INDEX IF NOT EXISTS idx_purchases_creator_completed
  ON public.purchases (creator_id, status, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_purchases_fan_creator_completed
  ON public.purchases (fan_id, creator_id, completed_at DESC)
  WHERE status = 'completed';

-- Memberships: VIP threshold scans
CREATE INDEX IF NOT EXISTS idx_memberships_creator_spent_desc
  ON public.memberships (creator_id, total_spent DESC);

-- Messages: unread count per recipient
CREATE INDEX IF NOT EXISTS idx_messages_unread_recipient
  ON public.messages (recipient_id, is_read)
  WHERE is_read = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 10: GRANTS
-- authenticated role calls these functions on their own creator_id.
-- SECURITY DEFINER ensures RLS is bypassed for cross-table reads.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.generate_revenue_triggers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_revenue_triggers(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_today_action(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_action(UUID) TO authenticated;
