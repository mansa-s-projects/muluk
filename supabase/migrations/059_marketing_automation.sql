-- Mansas Moguls — Marketing Automation Engine
-- Migration 059: campaigns, email sequences, content queue, events, lead scores

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. marketing_campaigns — top-level campaign records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  type              TEXT        NOT NULL CHECK (type IN ('email','social','referral','push','sms')),
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','active','paused','completed')),
  target_segment    TEXT,  -- 'waitlist','new_creator','inactive','all'
  subject           TEXT,
  content           TEXT,
  ai_generated      BOOLEAN     DEFAULT false,
  sent_count        INTEGER     DEFAULT 0,
  open_rate         NUMERIC(5,2) DEFAULT 0,
  click_rate        NUMERIC(5,2) DEFAULT 0,
  conversion_rate   NUMERIC(5,2) DEFAULT 0,
  scheduled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
-- Service-role only — no public policies

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. email_sequence_steps — drip email steps per named sequence
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name TEXT    NOT NULL,  -- 'waitlist_nurture','creator_activation','re_engagement'
  step_number   INTEGER NOT NULL,
  delay_hours   INTEGER NOT NULL DEFAULT 0,
  subject       TEXT    NOT NULL,
  preview_text  TEXT,
  body_html     TEXT    NOT NULL,
  cta_text      TEXT,
  cta_url       TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sequence_name, step_number)
);

ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
-- Service-role only — no public policies

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. email_sequence_enrollments — who is in which sequence and where
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  sequence_name TEXT        NOT NULL,
  current_step  INTEGER     NOT NULL DEFAULT 0,
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  next_send_at  TIMESTAMPTZ,
  completed     BOOLEAN     DEFAULT false,
  unsubscribed  BOOLEAN     DEFAULT false,
  metadata      JSONB       DEFAULT '{}',
  UNIQUE (email, sequence_name)
);

CREATE INDEX IF NOT EXISTS idx_ese_due
  ON email_sequence_enrollments (next_send_at)
  WHERE completed = false AND unsubscribed = false;

CREATE INDEX IF NOT EXISTS idx_ese_email ON email_sequence_enrollments (email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. marketing_content_queue — AI-generated content awaiting publish
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_content_queue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT        NOT NULL,  -- twitter, linkedin, instagram, email
  content          TEXT        NOT NULL,
  hashtags         TEXT[],
  scheduled_at     TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  status           TEXT        DEFAULT 'pending'
                               CHECK (status IN ('pending','published','failed','skipped')),
  engagement_score INTEGER     DEFAULT 0,
  ai_model         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcq_status_platform
  ON marketing_content_queue (status, platform, scheduled_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. marketing_events — audit log for all marketing actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT        NOT NULL,
  email      TEXT,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_me_type_created
  ON marketing_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_me_email
  ON marketing_events (email)
  WHERE email IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. lead_scores — composite lead scoring for every waitlist / user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_scores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  score         INTEGER     DEFAULT 0,
  tier          TEXT        DEFAULT 'cold'
                            CHECK (tier IN ('cold','warm','hot','vip')),
  signals       JSONB       DEFAULT '[]',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_tier_score ON lead_scores (tier, score DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Seed: waitlist_nurture email sequence (3 steps)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO email_sequence_steps
  (sequence_name, step_number, delay_hours, subject, preview_text, body_html, cta_text, cta_url, is_active)
VALUES
(
  'waitlist_nurture', 1, 0,
  'Your spot is reserved — here''s what''s coming',
  'You''re one of the first. Here''s what that means.',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;}
  .wrap{max-width:560px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden;}
  .hdr{background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:32px;text-align:center;}
  .logo{font-size:20px;font-weight:700;color:#000;letter-spacing:6px;}
  .bod{padding:40px 32px;line-height:1.8;color:#ccc;font-size:14px;}
  .bod h2{color:#c8a96e;margin:0 0 20px;font-size:22px;font-weight:400;}
  .bod p{margin:0 0 16px;}
  .btn{display:inline-block;background:linear-gradient(135deg,#8a6530,#c8a96e);color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin:8px 0 24px;}
  .box{background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:20px;margin:16px 0 24px;}
  .ftr{background:#0a0a0a;padding:24px 32px;text-align:center;color:#444;font-size:11px;}
</style></head>
<body><div class="wrap">
  <div class="hdr"><div class="logo">MANSAS MOGULS</div></div>
  <div class="bod">
    <h2>Your spot is locked in.</h2>
    <p>You''re among the first people we''re building this for. That means founding creator status, the lowest fees we''ll ever offer, and a direct line to our team.</p>
    <div class="box">
      <p style="margin:0 0 8px;font-size:10px;color:#555;letter-spacing:0.18em;text-transform:uppercase;">What you''re getting</p>
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.6);">→ 88% payouts — the highest in the industry</p>
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.6);">→ Anonymous fan codes, no accounts required</p>
      <p style="margin:0 0 8px;color:rgba(255,255,255,0.6);">→ Crypto rails to 190 countries from day one</p>
      <p style="margin:0;color:rgba(255,255,255,0.6);">→ Personal onboarding from our founding team</p>
    </div>
    <p>We open to founding creators in waves. You''re in the first wave.</p>
    <a href="{{SITE_URL}}" class="btn">See the Platform →</a>
  </div>
  <div class="ftr">Mansas Moguls · <a href="{{UNSUBSCRIBE_URL}}" style="color:#444;text-decoration:none;">Unsubscribe</a></div>
</div></body></html>',
  'See the Platform',
  '{{SITE_URL}}',
  true
),
(
  'waitlist_nurture', 2, 24,
  '88% to you. Zero compromise. Here''s how it works.',
  'A deep look at what makes this platform different.',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;}
  .wrap{max-width:560px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden;}
  .hdr{background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:32px;text-align:center;}
  .logo{font-size:20px;font-weight:700;color:#000;letter-spacing:6px;}
  .bod{padding:40px 32px;line-height:1.8;color:#ccc;font-size:14px;}
  .bod h2{color:#c8a96e;margin:0 0 20px;font-size:22px;font-weight:400;}
  .bod p{margin:0 0 16px;}
  .btn{display:inline-block;background:linear-gradient(135deg,#8a6530,#c8a96e);color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin:8px 0 24px;}
  .stat{background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:20px;margin:8px 0;}
  .stat-num{font-size:36px;font-weight:300;color:#c8a96e;line-height:1;}
  .stat-lbl{font-size:11px;color:#555;letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;}
  .ftr{background:#0a0a0a;padding:24px 32px;text-align:center;color:#444;font-size:11px;}
</style></head>
<body><div class="wrap">
  <div class="hdr"><div class="logo">MANSAS MOGULS</div></div>
  <div class="bod">
    <h2>How 88% actually works.</h2>
    <p>Most platforms take 20–40% before you see a cent. We take 12%. That gap is yours.</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="48%" style="padding-right:4px;">
        <div class="stat"><div class="stat-num">88%</div><div class="stat-lbl">Your payout rate</div></div>
      </td>
      <td width="48%" style="padding-left:4px;">
        <div class="stat"><div class="stat-num">190</div><div class="stat-lbl">Countries supported</div></div>
      </td>
    </tr></table>
    <p style="margin-top:24px;">Every payment — subscriptions, tips, vault unlocks, bookings — flows through one dashboard. You see earnings in real time. Withdrawals go out in 48 hours.</p>
    <p>We built anonymous fan codes because your supporters shouldn''t need an account to support you. That means less friction, higher conversion.</p>
    <a href="{{SITE_URL}}/apply" class="btn">Apply for Early Access →</a>
  </div>
  <div class="ftr">Mansas Moguls · <a href="{{UNSUBSCRIBE_URL}}" style="color:#444;text-decoration:none;">Unsubscribe</a></div>
</div></body></html>',
  'Apply for Early Access',
  '{{SITE_URL}}/apply',
  true
),
(
  'waitlist_nurture', 3, 72,
  'Founding spots are filling. Here''s what you''d be leaving on the table.',
  'Social proof + what early creators are already doing.',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;}
  .wrap{max-width:560px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden;}
  .hdr{background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:32px;text-align:center;}
  .logo{font-size:20px;font-weight:700;color:#000;letter-spacing:6px;}
  .bod{padding:40px 32px;line-height:1.8;color:#ccc;font-size:14px;}
  .bod h2{color:#c8a96e;margin:0 0 20px;font-size:22px;font-weight:400;}
  .bod p{margin:0 0 16px;}
  .btn{display:inline-block;background:linear-gradient(135deg,#8a6530,#c8a96e);color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;letter-spacing:0.08em;margin:8px 0 24px;}
  .quote{background:#0f0f0f;border-left:3px solid #c8a96e;padding:20px 24px;margin:20px 0;border-radius:0 6px 6px 0;}
  .quote p{margin:0 0 8px;font-style:italic;color:rgba(255,255,255,0.7);}
  .quote .attr{font-size:11px;color:#555;letter-spacing:0.12em;text-transform:uppercase;}
  .urgency{background:#1a0f00;border:1px solid rgba(200,169,110,0.2);border-radius:6px;padding:16px 20px;margin:20px 0;font-size:13px;color:#c8a96e;}
  .ftr{background:#0a0a0a;padding:24px 32px;text-align:center;color:#444;font-size:11px;}
</style></head>
<body><div class="wrap">
  <div class="hdr"><div class="logo">MANSAS MOGULS</div></div>
  <div class="bod">
    <h2>Founding spots are limited on purpose.</h2>
    <div class="urgency">We''re onboarding the first 500 creators personally. Once that wave closes, the founding fee lock-in closes with it.</div>
    <p>Creators who applied in the first week are already setting up their vaults, linking their socials, and running their first paid drops.</p>
    <div class="quote">
      <p>"I set my first offer live in 20 minutes. Three payments came in before I went to sleep."</p>
      <div class="attr">— Founding creator, wave 1</div>
    </div>
    <p>You''re still on the list. Your spot hasn''t been taken. But we close the founding wave when it''s full — not on a timer.</p>
    <p>If you''re serious about monetizing what you already do, this is the right move.</p>
    <a href="{{SITE_URL}}/apply" class="btn">Claim Your Founding Spot →</a>
    <p style="font-size:12px;color:#555;margin-top:8px;">No obligation. Your profile stays private until you choose to go live.</p>
  </div>
  <div class="ftr">Mansas Moguls · <a href="{{UNSUBSCRIBE_URL}}" style="color:#444;text-decoration:none;">Unsubscribe</a></div>
</div></body></html>',
  'Claim Your Founding Spot',
  '{{SITE_URL}}/apply',
  true
)
ON CONFLICT (sequence_name, step_number) DO NOTHING;

COMMIT;
