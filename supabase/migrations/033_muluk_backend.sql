-- =============================================================
-- MULUK BACKEND — FULL PRODUCTION SCHEMA
-- Migration: 033_muluk_backend.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: EXTENSIONS & ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE event_type AS ENUM (
  'view',
  'click',
  'purchase',
  'login',
  'message',
  'open_asset',
  'drop_view',
  'drop_click',
  'referral_click'
);

CREATE TYPE behavior_status AS ENUM ('hot', 'warm', 'cold');

CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded', 'failed');

CREATE TYPE asset_type AS ENUM ('image', 'video', 'audio', 'document', 'link', 'drop');

CREATE TYPE referral_level AS ENUM ('1', '2', '3');

CREATE TYPE membership_tier AS ENUM ('free', 'basic', 'premium', 'vip');

-- ─────────────────────────────────────────────────────────────
-- STEP 2: CORE TABLES
-- ─────────────────────────────────────────────────────────────

-- 2.1 USERS (auth anchor — mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ,
  is_creator    BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_is_creator ON public.users (is_creator) WHERE is_creator = TRUE;

-- 2.2 PROFILES (display layer — one per user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  handle        TEXT UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  country       TEXT,
  timezone      TEXT DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_profiles_handle ON public.profiles (handle);
CREATE INDEX idx_profiles_user_id ON public.profiles (user_id);

-- 2.3 MEMBERSHIPS (fan ↔ creator relationship + aggregated state)
CREATE TABLE IF NOT EXISTS public.memberships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fan_id          UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  tier            membership_tier NOT NULL DEFAULT 'free',
  total_spent     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  purchase_count  INT NOT NULL DEFAULT 0,
  last_active_at  TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT memberships_fan_creator_unique UNIQUE (fan_id, creator_id)
);

CREATE INDEX idx_memberships_fan_id ON public.memberships (fan_id);
CREATE INDEX idx_memberships_creator_id ON public.memberships (creator_id);
CREATE INDEX idx_memberships_total_spent ON public.memberships (total_spent DESC);
CREATE INDEX idx_memberships_last_active ON public.memberships (last_active_at DESC NULLS LAST);

-- 2.4 ASSETS (content units)
CREATE TABLE IF NOT EXISTS public.assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type          asset_type NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  url           TEXT,
  thumbnail_url TEXT,
  price         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_creator_id ON public.assets (creator_id);
CREATE INDEX idx_assets_type ON public.assets (type);
CREATE INDEX idx_assets_created_at ON public.assets (created_at DESC);

-- 2.5 PURCHASES (financial truth — immutable records)
CREATE TABLE IF NOT EXISTS public.purchases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fan_id        UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  creator_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  asset_id      UUID REFERENCES public.assets (id) ON DELETE SET NULL,
  drop_id       UUID, -- FK added after drops table
  amount        NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        purchase_status NOT NULL DEFAULT 'pending',
  processor     TEXT, -- 'stripe', 'whop', 'crypto'
  processor_ref TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_purchases_fan_id ON public.purchases (fan_id);
CREATE INDEX idx_purchases_creator_id ON public.purchases (creator_id);
CREATE INDEX idx_purchases_created_at ON public.purchases (created_at DESC);
CREATE INDEX idx_purchases_status ON public.purchases (status);
CREATE INDEX idx_purchases_completed_at ON public.purchases (completed_at DESC NULLS LAST);

-- 2.6 MESSAGES (fan ↔ creator direct messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id     UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  body          TEXT,
  asset_id      UUID REFERENCES public.assets (id) ON DELETE SET NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages (recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at DESC);
CREATE INDEX idx_messages_unread ON public.messages (recipient_id, is_read) WHERE is_read = FALSE;

-- 2.7 EVENTS (raw behavior log — INSERT ONLY, never update, never delete)
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  creator_id    UUID REFERENCES public.users (id) ON DELETE SET NULL,
  type          event_type NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_id ON public.events (user_id);
CREATE INDEX idx_events_creator_id ON public.events (creator_id);
CREATE INDEX idx_events_type ON public.events (type);
CREATE INDEX idx_events_created_at ON public.events (created_at DESC);
CREATE INDEX idx_events_user_type ON public.events (user_id, type, created_at DESC);

-- Enforce immutability: block UPDATE and DELETE on events
CREATE OR REPLACE RULE events_no_update AS ON UPDATE TO public.events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE events_no_delete AS ON DELETE TO public.events DO INSTEAD NOTHING;

-- 2.8 BEHAVIOR_SCORES (computed engagement state per fan-creator pair)
CREATE TABLE IF NOT EXISTS public.behavior_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fan_id          UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  score           INT NOT NULL DEFAULT 0,
  status          behavior_status NOT NULL DEFAULT 'cold',
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT behavior_scores_fan_creator_unique UNIQUE (fan_id, creator_id)
);

CREATE INDEX idx_behavior_scores_creator ON public.behavior_scores (creator_id, score DESC);
CREATE INDEX idx_behavior_scores_status ON public.behavior_scores (creator_id, status);

-- 2.9 DROPS (scarcity system)
CREATE TABLE IF NOT EXISTS public.drops (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  asset_id      UUID REFERENCES public.assets (id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  max_slots     INT NOT NULL CHECK (max_slots > 0),
  slots_taken   INT NOT NULL DEFAULT 0 CHECK (slots_taken >= 0),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT drops_slots_not_exceeded CHECK (slots_taken <= max_slots)
);

CREATE INDEX idx_drops_creator_id ON public.drops (creator_id);
CREATE INDEX idx_drops_expires_at ON public.drops (expires_at);
CREATE INDEX idx_drops_active ON public.drops (is_active, expires_at) WHERE is_active = TRUE;

-- Add FK from purchases to drops (now that drops exists)
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_drop_id_fkey
  FOREIGN KEY (drop_id) REFERENCES public.drops (id) ON DELETE SET NULL;

-- 2.10 REFERRALS (multi-level network)
CREATE TABLE IF NOT EXISTS public.referrals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  invited_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  creator_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  level         referral_level NOT NULL DEFAULT '1',
  earnings      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_invited_unique UNIQUE (invited_id, creator_id)
);

CREATE INDEX idx_referrals_inviter_id ON public.referrals (inviter_id);
CREATE INDEX idx_referrals_creator_id ON public.referrals (creator_id);
CREATE INDEX idx_referrals_level ON public.referrals (creator_id, level);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: ONLINE PRESENCE (for real-time online status)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.presence (
  user_id       UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  online        BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presence_online ON public.presence (online) WHERE online = TRUE;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: NOTIFICATION QUEUE (database-level, consumed by frontend)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type          TEXT NOT NULL, -- 'high_value_online', 'purchase', 'drop_expiring', 'inactivity'
  payload       JSONB NOT NULL DEFAULT '{}',
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- STEP 5: HELPER — updated_at auto-update trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- STEP 6: PURCHASE FLOW — ATOMIC FUNCTION
-- ─────────────────────────────────────────────────────────────

-- Call this instead of inserting directly into purchases.
-- Handles: purchase insert → event insert → membership update → drop slot decrement

CREATE OR REPLACE FUNCTION public.process_purchase(
  p_fan_id      UUID,
  p_creator_id  UUID,
  p_asset_id    UUID,
  p_drop_id     UUID,
  p_amount      NUMERIC,
  p_currency    TEXT,
  p_processor   TEXT,
  p_processor_ref TEXT,
  p_metadata    JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase_id UUID;
  v_drop        RECORD;
BEGIN
  -- 1. Validate drop availability if this is a drop purchase
  IF p_drop_id IS NOT NULL THEN
    SELECT * INTO v_drop FROM public.drops
    WHERE id = p_drop_id
      AND is_active = TRUE
      AND expires_at > NOW()
      FOR UPDATE; -- row-level lock to prevent overselling

    IF NOT FOUND THEN
      RAISE EXCEPTION 'drop_unavailable: Drop is inactive or expired';
    END IF;

    IF v_drop.slots_taken >= v_drop.max_slots THEN
      RAISE EXCEPTION 'drop_sold_out: No slots remaining';
    END IF;
  END IF;

  -- 2. Insert purchase
  INSERT INTO public.purchases (
    fan_id, creator_id, asset_id, drop_id,
    amount, currency, status,
    processor, processor_ref, metadata, completed_at
  )
  VALUES (
    p_fan_id, p_creator_id, p_asset_id, p_drop_id,
    p_amount, p_currency, 'completed',
    p_processor, p_processor_ref, COALESCE(p_metadata, '{}'), NOW()
  )
  RETURNING id INTO v_purchase_id;

  -- 3. Log event
  INSERT INTO public.events (user_id, creator_id, type, metadata)
  VALUES (
    p_fan_id,
    p_creator_id,
    'purchase',
    jsonb_build_object(
      'purchase_id', v_purchase_id,
      'amount', p_amount,
      'currency', p_currency,
      'asset_id', p_asset_id,
      'drop_id', p_drop_id
    )
  );

  -- 4. Upsert membership totals
  INSERT INTO public.memberships (fan_id, creator_id, total_spent, purchase_count, last_active_at)
  VALUES (p_fan_id, p_creator_id, p_amount, 1, NOW())
  ON CONFLICT (fan_id, creator_id)
  DO UPDATE SET
    total_spent    = memberships.total_spent + EXCLUDED.total_spent,
    purchase_count = memberships.purchase_count + 1,
    last_active_at = NOW(),
    is_active      = TRUE;

  -- 5. Decrement drop slot (atomic, under row lock)
  IF p_drop_id IS NOT NULL THEN
    UPDATE public.drops
    SET slots_taken = slots_taken + 1
    WHERE id = p_drop_id;
  END IF;

  -- 6. Auto-deactivate drop if sold out
  IF p_drop_id IS NOT NULL THEN
    UPDATE public.drops
    SET is_active = FALSE
    WHERE id = p_drop_id AND slots_taken >= max_slots;
  END IF;

  RETURN v_purchase_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: BEHAVIOR SCORING SYSTEM
-- ─────────────────────────────────────────────────────────────

-- Score weights
-- view_asset     = +5
-- click_price    = +10  (click event on an asset)
-- open_message   = +3
-- purchase       = +20
-- login          = +1
-- inactivity 7d  = -10 (applied by recalculate function)

CREATE OR REPLACE FUNCTION public.recalculate_behavior_score(
  p_fan_id     UUID,
  p_creator_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_score       INT := 0;
  v_status      behavior_status;
  v_last_active TIMESTAMPTZ;
BEGIN
  -- Sum event-based scores from the last 30 days
  SELECT
    COALESCE(SUM(
      CASE e.type
        WHEN 'view'        THEN 5
        WHEN 'open_asset'  THEN 5
        WHEN 'click'       THEN 10
        WHEN 'message'     THEN 3
        WHEN 'login'       THEN 1
        WHEN 'purchase'    THEN 20
        WHEN 'drop_view'   THEN 3
        WHEN 'drop_click'  THEN 8
        ELSE 0
      END
    ), 0)
  INTO v_score
  FROM public.events e
  WHERE e.user_id    = p_fan_id
    AND e.creator_id = p_creator_id
    AND e.created_at > NOW() - INTERVAL '30 days';

  -- Inactivity penalty: -10 if no event in last 7 days
  SELECT MAX(created_at) INTO v_last_active
  FROM public.events
  WHERE user_id    = p_fan_id
    AND creator_id = p_creator_id;

  IF v_last_active IS NULL OR v_last_active < NOW() - INTERVAL '7 days' THEN
    v_score := v_score - 10;
  END IF;

  -- Clamp score to 0 minimum
  v_score := GREATEST(v_score, 0);

  -- Assign status
  IF v_score >= 50 THEN
    v_status := 'hot';
  ELSIF v_score >= 20 THEN
    v_status := 'warm';
  ELSE
    v_status := 'cold';
  END IF;

  -- Upsert behavior_scores
  INSERT INTO public.behavior_scores (fan_id, creator_id, score, status, last_calculated)
  VALUES (p_fan_id, p_creator_id, v_score, v_status, NOW())
  ON CONFLICT (fan_id, creator_id)
  DO UPDATE SET
    score           = EXCLUDED.score,
    status          = EXCLUDED.status,
    last_calculated = NOW();
END;
$$;

-- Trigger: recalculate score on every event insert
CREATE OR REPLACE FUNCTION public.trg_events_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only score if we have a creator context
  IF NEW.creator_id IS NOT NULL THEN
    PERFORM public.recalculate_behavior_score(NEW.user_id, NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_behavior_score
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_events_score_update();

-- ─────────────────────────────────────────────────────────────
-- STEP 8: NOTIFICATION TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- 8.1 Purchase notification → notify creator
CREATE OR REPLACE FUNCTION public.trg_purchase_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    INSERT INTO public.notifications (recipient_id, type, payload)
    VALUES (
      NEW.creator_id,
      'purchase',
      jsonb_build_object(
        'fan_id',      NEW.fan_id,
        'amount',      NEW.amount,
        'currency',    NEW.currency,
        'purchase_id', NEW.id,
        'asset_id',    NEW.asset_id,
        'drop_id',     NEW.drop_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchases_notify
  AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.trg_purchase_notify();

-- 8.2 High-value member online → notify creator
-- Fires when presence.online = TRUE and fan has behavior_status = 'hot'
CREATE OR REPLACE FUNCTION public.trg_presence_high_value_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF NEW.online = TRUE AND (OLD.online IS DISTINCT FROM TRUE) THEN
    -- Find all creators where this user is 'hot'
    FOR v_row IN
      SELECT bs.creator_id
      FROM public.behavior_scores bs
      WHERE bs.fan_id = NEW.user_id
        AND bs.status = 'hot'
    LOOP
      INSERT INTO public.notifications (recipient_id, type, payload)
      VALUES (
        v_row.creator_id,
        'high_value_online',
        jsonb_build_object('fan_id', NEW.user_id, 'online_at', NOW())
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_presence_high_value
  AFTER INSERT OR UPDATE ON public.presence
  FOR EACH ROW EXECUTE FUNCTION public.trg_presence_high_value_notify();

-- 8.3 Drop expiring soon → notify creator (scheduled, call via cron or edge function)
-- Returns drops expiring within 1 hour that haven't been notified
-- Frontend/edge function should call this and emit notifications
CREATE OR REPLACE FUNCTION public.get_expiring_drops(p_within_minutes INT DEFAULT 60)
RETURNS TABLE (
  drop_id       UUID,
  creator_id    UUID,
  title         TEXT,
  slots_left    INT,
  expires_at    TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    d.id,
    d.creator_id,
    d.title,
    (d.max_slots - d.slots_taken) AS slots_left,
    d.expires_at
  FROM public.drops d
  WHERE d.is_active = TRUE
    AND d.expires_at BETWEEN NOW() AND NOW() + (p_within_minutes || ' minutes')::INTERVAL
  ORDER BY d.expires_at ASC;
$$;

-- 8.4 Inactivity detection — fans not active in N days per creator
CREATE OR REPLACE FUNCTION public.get_inactive_fans(
  p_creator_id UUID,
  p_days       INT DEFAULT 7
)
RETURNS TABLE (
  fan_id          UUID,
  last_active_at  TIMESTAMPTZ,
  total_spent     NUMERIC,
  score           INT
)
LANGUAGE sql
AS $$
  SELECT
    m.fan_id,
    m.last_active_at,
    m.total_spent,
    COALESCE(bs.score, 0) AS score
  FROM public.memberships m
  LEFT JOIN public.behavior_scores bs
    ON bs.fan_id = m.fan_id AND bs.creator_id = m.creator_id
  WHERE m.creator_id = p_creator_id
    AND m.is_active   = TRUE
    AND (m.last_active_at IS NULL
         OR m.last_active_at < NOW() - (p_days || ' days')::INTERVAL)
  ORDER BY m.total_spent DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 9: HIGH VALUE RADAR VIEWS & QUERIES
-- ─────────────────────────────────────────────────────────────

-- 9.1 Top Spenders per creator
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
  bs.status
FROM public.memberships m
LEFT JOIN public.profiles p  ON p.user_id = m.fan_id
LEFT JOIN public.behavior_scores bs ON bs.fan_id = m.fan_id AND bs.creator_id = m.creator_id
ORDER BY m.total_spent DESC;

-- 9.2 Most Active Members (by behavior score)
CREATE OR REPLACE VIEW public.v_most_active AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  m.total_spent,
  m.last_active_at
FROM public.behavior_scores bs
LEFT JOIN public.profiles p  ON p.user_id = bs.fan_id
LEFT JOIN public.memberships m ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
ORDER BY bs.score DESC;

-- 9.3 At Risk Members (warm/hot but inactive 7+ days)
CREATE OR REPLACE VIEW public.v_at_risk AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  m.total_spent,
  m.last_active_at
FROM public.behavior_scores bs
LEFT JOIN public.profiles p  ON p.user_id = bs.fan_id
LEFT JOIN public.memberships m ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
WHERE bs.status IN ('hot', 'warm')
  AND (m.last_active_at IS NULL OR m.last_active_at < NOW() - INTERVAL '7 days')
ORDER BY m.total_spent DESC;

-- 9.4 Likely to Convert (high score, zero purchases)
CREATE OR REPLACE VIEW public.v_likely_to_convert AS
SELECT
  bs.creator_id,
  bs.fan_id,
  p.display_name,
  p.avatar_url,
  bs.score,
  bs.status,
  COALESCE(m.purchase_count, 0) AS purchase_count,
  COALESCE(m.total_spent, 0)    AS total_spent
FROM public.behavior_scores bs
LEFT JOIN public.profiles p  ON p.user_id = bs.fan_id
LEFT JOIN public.memberships m ON m.fan_id = bs.fan_id AND m.creator_id = bs.creator_id
WHERE bs.score >= 20
  AND (m.purchase_count IS NULL OR m.purchase_count = 0)
ORDER BY bs.score DESC;

-- ─────────────────────────────────────────────────────────────
-- STEP 10: REFERRAL NETWORK QUERIES
-- ─────────────────────────────────────────────────────────────

-- Total referral earnings per inviter per creator
CREATE OR REPLACE VIEW public.v_referral_earnings AS
SELECT
  r.inviter_id,
  r.creator_id,
  p.display_name,
  SUM(r.earnings)         AS total_earnings,
  COUNT(*)                AS total_referrals,
  SUM(CASE WHEN r.level = '1' THEN r.earnings ELSE 0 END) AS l1_earnings,
  SUM(CASE WHEN r.level = '2' THEN r.earnings ELSE 0 END) AS l2_earnings,
  SUM(CASE WHEN r.level = '3' THEN r.earnings ELSE 0 END) AS l3_earnings
FROM public.referrals r
LEFT JOIN public.profiles p ON p.user_id = r.inviter_id
GROUP BY r.inviter_id, r.creator_id, p.display_name
ORDER BY total_earnings DESC;

-- Expansion network: get full tree for an inviter up to 3 levels
CREATE OR REPLACE FUNCTION public.get_referral_network(
  p_inviter_id  UUID,
  p_creator_id  UUID
)
RETURNS TABLE (
  invited_id    UUID,
  display_name  TEXT,
  level         referral_level,
  earnings      NUMERIC,
  confirmed_at  TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    r.invited_id,
    p.display_name,
    r.level,
    r.earnings,
    r.confirmed_at
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.user_id = r.invited_id
  WHERE r.inviter_id  = p_inviter_id
    AND r.creator_id  = p_creator_id
  ORDER BY r.level::text, r.confirmed_at;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 11: REAL-TIME — SUPABASE PUBLICATION
-- ─────────────────────────────────────────────────────────────

-- Enable realtime for tables the frontend subscribes to.
-- Run in Supabase dashboard under Database → Replication, or:

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ─────────────────────────────────────────────────────────────
-- STEP 12: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- USERS: read own row only
CREATE POLICY users_self_read ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- PROFILES: public read, self write
CREATE POLICY profiles_public_read ON public.profiles
  FOR SELECT USING (TRUE);
CREATE POLICY profiles_self_write ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- MEMBERSHIPS: fan sees own, creator sees their fans
CREATE POLICY memberships_fan_read ON public.memberships
  FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- ASSETS: public assets open, others for creator
CREATE POLICY assets_public_read ON public.assets
  FOR SELECT USING (is_public = TRUE OR auth.uid() = creator_id);
CREATE POLICY assets_creator_write ON public.assets
  FOR ALL USING (auth.uid() = creator_id);

-- PURCHASES: fan or creator can read their own
CREATE POLICY purchases_parties_read ON public.purchases
  FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- MESSAGES: sender or recipient
CREATE POLICY messages_parties_read ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY messages_sender_insert ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- EVENTS: user sees own, creator sees events targeting them
CREATE POLICY events_user_read ON public.events
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);
CREATE POLICY events_user_insert ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BEHAVIOR_SCORES: creator sees their scores
CREATE POLICY bs_creator_read ON public.behavior_scores
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = fan_id);

-- DROPS: public read, creator write
CREATE POLICY drops_public_read ON public.drops
  FOR SELECT USING (TRUE);
CREATE POLICY drops_creator_write ON public.drops
  FOR ALL USING (auth.uid() = creator_id);

-- REFERRALS: inviter or creator can read
CREATE POLICY referrals_read ON public.referrals
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = creator_id OR auth.uid() = invited_id);

-- PRESENCE: public read (online status), self write
CREATE POLICY presence_public_read ON public.presence
  FOR SELECT USING (TRUE);
CREATE POLICY presence_self_write ON public.presence
  FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS: recipient only
CREATE POLICY notifications_recipient_read ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY notifications_recipient_update ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 13: EXAMPLE RADAR QUERIES (copy-paste ready)
-- ─────────────────────────────────────────────────────────────

-- Top 10 spenders for a creator:
-- SELECT * FROM v_top_spenders WHERE creator_id = '<uuid>' LIMIT 10;

-- Most active members:
-- SELECT * FROM v_most_active WHERE creator_id = '<uuid>' LIMIT 20;

-- At risk members:
-- SELECT * FROM v_at_risk WHERE creator_id = '<uuid>';

-- Likely to convert:
-- SELECT * FROM v_likely_to_convert WHERE creator_id = '<uuid>' LIMIT 20;

-- Inactive fans (7 days):
-- SELECT * FROM get_inactive_fans('<creator_uuid>', 7);

-- Drops expiring in 30 minutes:
-- SELECT * FROM get_expiring_drops(30);

-- Referral network for an inviter:
-- SELECT * FROM get_referral_network('<inviter_uuid>', '<creator_uuid>');

-- Process a purchase atomically:
-- SELECT process_purchase(
--   '<fan_uuid>',
--   '<creator_uuid>',
--   '<asset_uuid_or_null>',
--   '<drop_uuid_or_null>',
--   29.99,
--   'USD',
--   'stripe',
--   'pi_xxxx',
--   '{}'::jsonb
-- );
