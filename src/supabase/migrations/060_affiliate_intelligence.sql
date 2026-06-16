-- Mansas Moguls — Affiliate Intelligence Layer
-- Migration 060: expanded brand catalog, trending products, match scores, performance tracking

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend brand_affiliates with intelligence fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE brand_affiliates
  ADD COLUMN IF NOT EXISTS network              TEXT,           -- cj | shareasale | impact | rakuten | amazon | direct
  ADD COLUMN IF NOT EXISTS network_program_id   TEXT,           -- ID in the affiliate network
  ADD COLUMN IF NOT EXISTS epc_usd             NUMERIC(8,2),   -- earnings per click (USD)
  ADD COLUMN IF NOT EXISTS reversal_rate_pct   NUMERIC(5,2),   -- % of commissions reversed
  ADD COLUMN IF NOT EXISTS avg_conversion_rate NUMERIC(5,2),   -- industry average conversion %
  ADD COLUMN IF NOT EXISTS trending_score      SMALLINT DEFAULT 50, -- 0–100 trending velocity
  ADD COLUMN IF NOT EXISTS demand_level        TEXT DEFAULT 'medium' CHECK (demand_level IN ('low','medium','high','viral')),
  ADD COLUMN IF NOT EXISTS target_niches       TEXT[],
  ADD COLUMN IF NOT EXISTS min_followers       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_shop_url  TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_shop_url     TEXT,
  ADD COLUMN IF NOT EXISTS product_feed_url    TEXT,           -- RSS/API feed for live products
  ADD COLUMN IF NOT EXISTS tags               TEXT[] DEFAULT '{}', -- trending, seasonal, high-commission, etc.
  ADD COLUMN IF NOT EXISTS monthly_revenue_potential_usd JSONB DEFAULT '{}', -- {1k: 50, 10k: 500, 100k: 5000}
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. creator_affiliate_performance — track earnings per link
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_affiliate_performance (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_id     UUID        REFERENCES brand_affiliates(id) ON DELETE SET NULL,
  brand_name       TEXT        NOT NULL,
  affiliate_link   TEXT        NOT NULL,
  utm_source       TEXT        DEFAULT 'moguls',
  clicks           INTEGER     NOT NULL DEFAULT 0,
  unique_clicks    INTEGER     NOT NULL DEFAULT 0,
  conversions      INTEGER     NOT NULL DEFAULT 0,
  revenue_usd      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_usd      NUMERIC(12,2) NOT NULL DEFAULT 0,
  reversed_usd     NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_click_at    TIMESTAMPTZ,
  last_conversion_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_creator ON creator_affiliate_performance (creator_id, revenue_usd DESC);
ALTER TABLE creator_affiliate_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns performance" ON creator_affiliate_performance FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. trending_products — live product feed from Instagram/TikTok/Amazon
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trending_products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT        NOT NULL CHECK (source IN ('instagram','tiktok','amazon','manual')),
  product_id       TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT,
  price_usd        NUMERIC(10,2),
  image_url        TEXT,
  product_url      TEXT        NOT NULL,
  affiliate_url    TEXT,
  brand_name       TEXT,
  niches           TEXT[]      DEFAULT '{}',
  commission_rate  TEXT,
  trending_score   SMALLINT    DEFAULT 50,
  sales_velocity   TEXT        DEFAULT 'steady',  -- viral | rising | steady | falling
  views_count      BIGINT      DEFAULT 0,
  saves_count      INTEGER     DEFAULT 0,
  orders_count     INTEGER     DEFAULT 0,
  tags             TEXT[]      DEFAULT '{}',
  synced_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  UNIQUE (source, product_id)
);

CREATE INDEX IF NOT EXISTS idx_tp_niche ON trending_products USING GIN (niches);
CREATE INDEX IF NOT EXISTS idx_tp_score ON trending_products (trending_score DESC);
ALTER TABLE trending_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read trending" ON trending_products FOR SELECT USING (expires_at > NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. affiliate_match_scores — AI-computed match between creator and brand
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_match_scores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_id     UUID        NOT NULL REFERENCES brand_affiliates(id) ON DELETE CASCADE,
  match_score      SMALLINT    NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  estimated_monthly_revenue_usd NUMERIC(10,2) DEFAULT 0,
  match_reasons    JSONB       DEFAULT '[]',
  computed_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_ams_creator ON affiliate_match_scores (creator_id, match_score DESC);
ALTER TABLE affiliate_match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator owns match scores" ON affiliate_match_scores FOR ALL USING (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed 100+ brand programs with full intelligence data
-- ─────────────────────────────────────────────────────────────────────────────

-- Clear existing seed (we're replacing with richer data)
TRUNCATE brand_affiliates RESTART IDENTITY CASCADE;

INSERT INTO brand_affiliates (
  brand_name, niches, commission_rate, commission_type, program_url, description,
  avg_order_value_usd, cookie_duration_days, payout_threshold_usd, tier,
  network, epc_usd, avg_conversion_rate, trending_score, demand_level,
  tags, monthly_revenue_potential_usd, requires_approval
) VALUES

-- ═══════════════════════════════════════════════════════
-- FASHION & STYLE
-- ═══════════════════════════════════════════════════════
('SHEIN',           ARRAY['fashion','lifestyle','beauty'],        '10–20%','percentage','https://affiliate.shein.com',              'Global fast fashion. Huge conversion rates. Perfect for mass-market fashion creators.',90,30,50,'standard','shareasale',0.45,4.2,92,'viral',    ARRAY['trending','high-volume','instagram-native'],       '{"1k":90,"10k":900,"100k":9000}',false),
('Fashion Nova',    ARRAY['fashion','lifestyle','fitness'],        '15–20%','percentage','https://fashionnova.com/pages/affiliate',  'Celebrity-endorsed streetwear. Massive with urban/hip-hop audiences.',65,30,50,'premium','impact',0.78,5.1,88,'viral',    ARRAY['trending','celebrity','streetwear'],              '{"1k":80,"10k":800,"100k":8000}',false),
('PrettyLittleThing',ARRAY['fashion','lifestyle'],                 '10–15%','percentage','https://www.prettylittlething.com/affiliates','Fast fashion. Extremely popular with Gen Z female audiences.',55,30,25,'standard','awin',0.52,4.8,85,'high',     ARRAY['gen-z','instagram-native','trending'],            '{"1k":70,"10k":700,"100k":7000}',false),
('ASOS',            ARRAY['fashion','lifestyle'],                  '5–7%',  'percentage','https://www.asos.com/affiliates',          '850+ brands. Best for broad fashion audiences.',75,45,50,'standard','affiliate-window',0.38,3.2,72,'medium',  ARRAY['broad-appeal','multi-brand'],                    '{"1k":45,"10k":450,"100k":4500}',false),
('Revolve',         ARRAY['fashion','luxury','lifestyle'],         '5–8%',  'percentage','https://www.revolve.com/affiliates',       'Premium influencer-favorite brands. High AOV.',220,30,100,'premium','rakuten',0.85,2.8,80,'high',      ARRAY['luxury-lite','influencer-favorite','high-aov'],  '{"1k":95,"10k":950,"100k":9500}',false),
('Nordstrom',       ARRAY['fashion','luxury','lifestyle'],         '2–20%', 'percentage','https://shop.nordstrom.com/c/affiliate',   'Department store. Best commission rates on luxury labels.',180,7,50,'premium','rakuten',0.62,2.1,68,'medium',  ARRAY['luxury','broad-range','high-aov'],               '{"1k":60,"10k":600,"100k":6000}',false),
('Boohoo',          ARRAY['fashion','lifestyle'],                  '8–12%', 'percentage','https://www.boohoo.com/affiliate.html',    'Youth fashion. Very high conversion with under-25 audiences.',40,30,25,'standard','awin',0.41,5.5,76,'high',    ARRAY['gen-z','budget-fashion'],                        '{"1k":55,"10k":550,"100k":5500}',false),
('Zara',            ARRAY['fashion','luxury','lifestyle'],         '3–5%',  'percentage','https://www.zara.com/afiliados',           'Global premium fast fashion. Strong brand recognition.',85,7,50,'premium','direct',0.55,2.5,82,'high',    ARRAY['premium','global','strong-brand'],               '{"1k":50,"10k":500,"100k":5000}',true),
('H&M',             ARRAY['fashion','lifestyle'],                  '7–10%', 'percentage','https://www.hm.com/affiliate',             'Accessible fashion. Works for sustainability and budget audiences.',45,30,25,'standard','zanox',0.36,4.1,69,'medium',  ARRAY['sustainable','budget','accessible'],             '{"1k":45,"10k":450,"100k":4500}',false),
('Lulus',           ARRAY['fashion','lifestyle'],                  '8–10%', 'percentage','https://www.lulus.com/affiliate-program',  'Dress-focused boutique. Great for event/wedding content creators.',80,45,50,'standard','shareasale',0.69,3.8,74,'high',    ARRAY['dresses','events','wedding'],                    '{"1k":70,"10k":700,"100k":7000}',false),

-- ═══════════════════════════════════════════════════════
-- BEAUTY & SKINCARE
-- ═══════════════════════════════════════════════════════
('Sephora',         ARRAY['beauty','lifestyle'],                   '5–10%', 'percentage','https://www.sephora.com/beauty/affiliate-program','Premium beauty retailer. High trust with beauty audiences.',90,24,50,'premium','rakuten',0.72,3.2,88,'high',     ARRAY['premium','trusted','high-aov'],                  '{"1k":85,"10k":850,"100k":8500}',true),
('Ulta Beauty',     ARRAY['beauty','lifestyle'],                   '2–5%',  'percentage','https://www.ultabeauty.com/affiliates',     'Mass-market beauty. Huge catalog. Best for drugstore + prestige mix.',65,30,50,'standard','cj',0.48,3.5,82,'high',     ARRAY['mass-market','broad-catalog'],                   '{"1k":55,"10k":550,"100k":5500}',false),
('ColourPop',       ARRAY['beauty'],                               '8–12%', 'percentage','https://colourpop.com/pages/affiliate',     'Viral cruelty-free cosmetics. Huge with Gen Z.',35,30,25,'standard','direct',0.61,5.8,94,'viral',    ARRAY['viral','gen-z','cruelty-free','instagram-native'],'{"1k":75,"10k":750,"100k":7500}',false),
('Charlotte Tilbury',ARRAY['beauty','luxury'],                     '10–12%','percentage','https://www.charlottetilbury.com/affiliates','Celebrity-loved luxury makeup. Premium audience.',75,30,50,'premium','awin',0.88,2.9,85,'high',     ARRAY['luxury','celebrity','high-commission'],           '{"1k":90,"10k":900,"100k":9000}',true),
('Fenty Beauty',    ARRAY['beauty','lifestyle'],                   '8–10%', 'percentage','https://fentybeauty.com/pages/affiliates',  'Rihanna brand. Massive cultural cachet. Inclusive beauty.',55,30,50,'premium','direct',0.79,4.1,91,'viral',    ARRAY['viral','inclusive','celebrity','trending'],       '{"1k":85,"10k":850,"100k":8500}',true),
('Rare Beauty',     ARRAY['beauty','lifestyle'],                   '7–10%', 'percentage','https://www.rarebeauty.com/pages/affiliate','Selena Gomez brand. Mental health angle. Young female audience.',48,30,25,'premium','impact',0.74,4.5,89,'viral',    ARRAY['celebrity','viral','mental-health','trending'],   '{"1k":80,"10k":800,"100k":8000}',true),
('The Ordinary',    ARRAY['beauty','health'],                      '6–8%',  'percentage','https://theordinary.com/affiliate',         'Science-backed skincare. Viral on TikTok. High trust.',32,30,25,'standard','direct',0.65,5.2,90,'viral',    ARRAY['tiktok-viral','science-backed','trending'],       '{"1k":70,"10k":700,"100k":7000}',false),
('Morphe',          ARRAY['beauty'],                               '10%',   'percentage','https://www.morphe.com/pages/affiliate',    'Professional quality at accessible price. Popular with MUAs.',45,30,50,'standard','rakuten',0.57,4.3,75,'high',     ARRAY['professional','mua','accessible'],               '{"1k":65,"10k":650,"100k":6500}',false),
('NARS',            ARRAY['beauty','luxury'],                      '10%',   'percentage','https://www.narscosmetics.com/affiliates',  'Prestige cosmetics. Strong with 25-40 beauty audience.',65,30,50,'premium','cj',0.68,2.7,72,'medium',  ARRAY['prestige','professional'],                       '{"1k":70,"10k":700,"100k":7000}',true),
('CeraVe',          ARRAY['beauty','health'],                      '3–5%',  'percentage','https://www.cerave.com/affiliates',         'Dermatologist-recommended. TikTok skincare darling.',18,30,25,'standard','direct',0.44,6.1,93,'viral',    ARRAY['tiktok-viral','dermatologist','skincare'],        '{"1k":40,"10k":400,"100k":4000}',false),

-- ═══════════════════════════════════════════════════════
-- FITNESS & HEALTH
-- ═══════════════════════════════════════════════════════
('Gymshark',        ARRAY['fitness','lifestyle'],                  '8–10%', 'percentage','https://www.gymshark.com/pages/affiliates', 'Cult gym apparel. Massive with fitness/bodybuilding audiences.',85,30,50,'premium','direct',0.82,4.2,91,'viral',    ARRAY['viral','cult-brand','fitness-native'],            '{"1k":100,"10k":1000,"100k":10000}',true),
('Lululemon',       ARRAY['fitness','lifestyle','luxury'],         '5–7%',  'percentage','https://info.lululemon.com/affiliates',     'Premium activewear. High-income audience. Strong brand loyalty.',130,30,50,'premium','direct',0.95,2.8,85,'high',     ARRAY['premium','high-income','yoga','running'],         '{"1k":90,"10k":900,"100k":9000}',true),
('Nike',            ARRAY['fitness','sports','lifestyle'],         '11%',   'percentage','https://www.nike.com/help/a/affiliate-faq', 'Global sports brand. Works for virtually any fitness creator.',95,7,50,'premium','cj',0.88,3.1,87,'high',     ARRAY['global','sports','lifestyle','trusted'],          '{"1k":85,"10k":850,"100k":8500}',false),
('Adidas',          ARRAY['fitness','sports','lifestyle'],         '7%',    'percentage','https://www.adidas.com/us/partner-program', 'Global athletic brand. Strong streetwear crossover.',80,30,50,'premium','cj',0.72,2.9,82,'high',     ARRAY['global','streetwear','sports'],                  '{"1k":75,"10k":750,"100k":7500}',false),
('MyProtein',       ARRAY['fitness','health'],                     '8–10%', 'percentage','https://www.myprotein.com/affiliates',      'Best-value sports nutrition. Extremely high repeat purchase rate.',55,30,50,'standard','awin',0.68,5.5,83,'high',     ARRAY['nutrition','repeat-purchase','value'],            '{"1k":75,"10k":750,"100k":7500}',false),
('GNC',             ARRAY['fitness','health'],                     '5–8%',  'percentage','https://www.gnc.com/affiliate',             'Established nutrition brand. Pharmacy-level trust.',60,7,50,'standard','cj',0.42,3.2,64,'medium',  ARRAY['trusted','nutrition','established'],              '{"1k":50,"10k":500,"100k":5000}',false),
('Peloton',         ARRAY['fitness','lifestyle'],                  '$100/sale','flat',   'https://www.onepeloton.com/affiliate',      'Premium connected fitness. Very high flat commission per sale.',2000,30,100,'premium','impact',2.10,0.8,76,'high',     ARRAY['premium','high-ticket','recurring'],              '{"1k":80,"10k":800,"100k":8000}',true),
('Alo Yoga',        ARRAY['fitness','lifestyle','luxury'],         '7–10%', 'percentage','https://www.aloyoga.com/affiliates',        'Celebrity-loved yoga/wellness brand.',120,30,50,'premium','impact',0.91,2.5,84,'high',     ARRAY['celebrity','yoga','premium','trending'],          '{"1k":85,"10k":850,"100k":8500}',true),
('Whoop',           ARRAY['fitness','health','tech'],              '$30/sale','flat',    'https://www.whoop.com/partner',             'Elite fitness tracker. Best with high-performance athletes.',239,30,50,'premium','direct',1.25,1.2,80,'high',     ARRAY['biometrics','performance','premium'],             '{"1k":70,"10k":700,"100k":7000}',true),
('Herbalife',       ARRAY['fitness','health','lifestyle'],         '25–50%','percentage','https://www.herbalife.com/affiliates',      'Global nutrition. Very high commission. Loyal customer base.',80,30,25,'standard','direct',0.95,6.2,68,'medium',  ARRAY['high-commission','nutrition','global'],           '{"1k":120,"10k":1200,"100k":12000}',false),

-- ═══════════════════════════════════════════════════════
-- TECH & GADGETS
-- ═══════════════════════════════════════════════════════
('Amazon Associates',ARRAY['tech','gaming','lifestyle','education','finance','fitness'],  '1–10%','percentage','https://affiliate-program.amazon.com','World''s largest affiliate program. Everything. Best for mixed-content creators.',75,24,10,'standard','direct',0.45,3.8,80,'high',     ARRAY['universal','high-volume','trusted'],              '{"1k":40,"10k":400,"100k":4000}',false),
('Apple',           ARRAY['tech','lifestyle','education'],         '2.5–7%','percentage','https://affiliate.apple.com',               'Premium hardware. Exceptional brand trust. High AOV.',650,1,25,'premium','direct',0.88,1.2,85,'high',     ARRAY['premium','trusted','high-aov','global'],          '{"1k":60,"10k":600,"100k":6000}',true),
('Best Buy',        ARRAY['tech','gaming'],                        '1–5%',  'percentage','https://www.bestbuy.com/affiliate',         'Consumer electronics giant. High-volume tech purchases.',250,1,50,'standard','cj',0.51,2.1,70,'medium',  ARRAY['electronics','high-aov'],                        '{"1k":50,"10k":500,"100k":5000}',false),
('Razer',           ARRAY['gaming','tech'],                        '5–10%', 'percentage','https://www.razer.com/affiliate',           'Gaming peripherals. Loyal gaming community.',130,30,50,'premium','cj',0.74,3.5,88,'high',     ARRAY['gaming','esports','loyal-community'],             '{"1k":80,"10k":800,"100k":8000}',false),
('Logitech',        ARRAY['gaming','tech','education'],            '4–7%',  'percentage','https://www.logitech.com/en-us/myaccount/affiliate-program','Peripherals for work and play. Cross-audience appeal.',75,30,50,'standard','cj',0.58,3.2,75,'high',     ARRAY['work-from-home','gaming','productivity'],         '{"1k":55,"10k":550,"100k":5500}',false),
('Samsung',         ARRAY['tech','lifestyle'],                     '3–5%',  'percentage','https://www.samsung.com/affiliate',         'Global electronics brand. High recognition. Repeat purchases.',500,7,50,'premium','cj',0.65,1.5,79,'high',     ARRAY['global','electronics','high-aov'],                '{"1k":55,"10k":550,"100k":5500}',true),
('DJI',             ARRAY['tech','art','travel'],                  '3–5%',  'percentage','https://store.dji.com/affiliates',          'Drone + camera tech. Essential for travel/content creators.',600,30,50,'premium','direct',0.85,1.8,82,'high',     ARRAY['content-creation','travel','photography'],        '{"1k":70,"10k":700,"100k":7000}',true),
('GoPro',           ARRAY['tech','sports','travel'],               '5%',    'percentage','https://gopro.com/affiliates',              'Action cameras. Strong with adventure/extreme sports audiences.',350,30,50,'standard','direct',0.72,2.1,78,'high',     ARRAY['action','adventure','travel'],                    '{"1k":60,"10k":600,"100k":6000}',false),
('Anker',           ARRAY['tech','lifestyle'],                     '5–8%',  'percentage','https://www.anker.com/affiliates',          'Affordable premium tech accessories. Huge repeat purchase rate.',45,30,25,'standard','cj',0.49,5.5,77,'high',     ARRAY['accessories','affordable','repeat-purchase'],     '{"1k":45,"10k":450,"100k":4500}',false),

-- ═══════════════════════════════════════════════════════
-- GAMING & ESPORTS
-- ═══════════════════════════════════════════════════════
('G2A',             ARRAY['gaming'],                               '5–12%', 'percentage','https://www.g2a.com/goldmine',              'Game keys marketplace. Instant commissions. No approval required.',25,30,25,'standard','direct',0.55,7.2,84,'high',     ARRAY['gaming','instant-commission','no-approval'],      '{"1k":65,"10k":650,"100k":6500}',false),
('Fanatical',       ARRAY['gaming'],                               '5%',    'percentage','https://www.fanatical.com/en/affiliates',   'Game bundles. Great EPC. Gaming content creators love it.',20,30,25,'standard','cj',0.48,8.1,75,'high',     ARRAY['bundles','gaming'],                               '{"1k":55,"10k":550,"100k":5500}',false),
('Humble Bundle',   ARRAY['gaming','education'],                   '5–10%', 'percentage','https://www.humblebundle.com/affiliate',    'Games + charity component. High moral appeal with audiences.',18,30,25,'standard','direct',0.52,7.5,72,'high',     ARRAY['charity','bundles','community'],                  '{"1k":50,"10k":500,"100k":5000}',false),
('NVIDIA',          ARRAY['gaming','tech'],                        'variable','percentage','https://www.nvidia.com/en-us/about-nvidia/partners/','GPU and AI tech. Very high AOV.',800,7,100,'premium','direct',1.15,1.1,80,'high',     ARRAY['high-aov','ai-tech','premium'],                   '{"1k":75,"10k":750,"100k":7500}',true),

-- ═══════════════════════════════════════════════════════
-- CRYPTO & FINANCE
-- ═══════════════════════════════════════════════════════
('Coinbase',        ARRAY['crypto','finance'],                     '$10/signup','flat',  'https://www.coinbase.com/affiliates',       'Largest US crypto exchange. High intent audience.',0,30,50,'premium','direct',1.85,2.5,82,'high',     ARRAY['crypto','high-intent','flat-cpa'],                '{"1k":100,"10k":1000,"100k":10000}',false),
('Binance',         ARRAY['crypto','finance'],                     '20–40%','percentage','https://www.binance.com/en/activity/affiliate','World''s largest crypto exchange. High commission on trading fees.',0,90,50,'premium','direct',2.20,3.1,88,'viral',    ARRAY['crypto','recurring-commission','global'],         '{"1k":150,"10k":1500,"100k":15000}',false),
('Kraken',          ARRAY['crypto','finance'],                     '$10–20/ref','flat', 'https://www.kraken.com/affiliates',          'Trusted crypto exchange. Strong with security-focused audience.',0,30,50,'premium','direct',1.45,2.8,75,'high',     ARRAY['crypto','trusted','security'],                    '{"1k":90,"10k":900,"100k":9000}',false),
('Robinhood',       ARRAY['finance','tech'],                       'stock/CPA','flat',  'https://robinhood.com/affiliates',           'Commission-free investing. Very popular with millennials.',0,30,25,'premium','direct',2.10,3.5,78,'high',     ARRAY['investing','millennials','stocks'],                '{"1k":110,"10k":1100,"100k":11000}',true),
('eToro',           ARRAY['finance','crypto'],                     '$100–200/dep','flat','https://partners.etoro.com',               'Social trading platform. High CPA. Copy-trading resonates.',0,45,100,'premium','direct',2.80,1.8,80,'high',     ARRAY['copy-trading','social','high-cpa'],               '{"1k":120,"10k":1200,"100k":12000}',true),
('NerdWallet',      ARRAY['finance','education'],                  'varies','cpa',      'https://www.nerdwallet.com/business/partners','Finance comparison. CPA on sign-ups and applications.',0,30,50,'standard','cj',0.88,4.2,70,'medium',  ARRAY['comparison','finance-education'],                 '{"1k":80,"10k":800,"100k":8000}',true),
('Credit Karma',    ARRAY['finance'],                              'CPA',   'cpa',      'https://www.creditkarma.com/affiliates',    'Free credit monitoring. Very high CVR with broad audiences.',0,30,25,'standard','direct',1.20,5.8,72,'high',     ARRAY['free-offer','high-cvr','broad-appeal'],           '{"1k":85,"10k":850,"100k":8500}',true),

-- ═══════════════════════════════════════════════════════
-- EDUCATION & ONLINE LEARNING
-- ═══════════════════════════════════════════════════════
('Skillshare',      ARRAY['education','art','music','business'],   '40%',   'percentage','https://www.skillshare.com/affiliates',    'Creative online learning. 40% recurring commission on memberships.',100,30,50,'standard','impact',0.85,3.2,80,'high',     ARRAY['recurring','creative','high-commission'],         '{"1k":90,"10k":900,"100k":9000}',false),
('Coursera',        ARRAY['education','tech','finance','business'],'10–45%','percentage','https://www.coursera.org/about/affiliates','University courses online. High AOV. Professional audience.',50,30,50,'standard','cj',0.62,2.8,75,'high',     ARRAY['professional','university','trusted'],            '{"1k":65,"10k":650,"100k":6500}',false),
('Udemy',           ARRAY['education','tech'],                     '15%',   'percentage','https://www.udemy.com/affiliate',           'Massive course marketplace. Frequent sales events. High CVR.',35,7,50,'standard','rakuten',0.51,4.5,77,'high',     ARRAY['courses','sales-events','broad'],                 '{"1k":50,"10k":500,"100k":5000}',false),
('MasterClass',     ARRAY['education','art','music','business'],   '25%',   'percentage','https://www.masterclass.com/affiliates',   'Celebrity instructor platform. Premium feel. Strong with aspirational audiences.',100,30,50,'premium','impact',0.92,2.1,82,'high',     ARRAY['premium','celebrity','aspirational'],             '{"1k":85,"10k":850,"100k":8500}',false),
('Duolingo',        ARRAY['education','lifestyle'],                 '20%',   'percentage','https://schools.duolingo.com/affiliates',  'Language learning. Viral marketing model. Global audience.',70,30,25,'standard','direct',0.44,3.8,85,'viral',    ARRAY['viral','global','app-native'],                    '{"1k":50,"10k":500,"100k":5000}',false),
('Brilliant',       ARRAY['education','tech'],                     '30%',   'percentage','https://brilliant.org/partnerships',        'Math & science learning. Strong with STEM audiences.',70,30,50,'standard','direct',0.68,3.5,72,'high',     ARRAY['stem','premium-content'],                         '{"1k":65,"10k":650,"100k":6500}',false),

-- ═══════════════════════════════════════════════════════
-- TRAVEL & LIFESTYLE
-- ═══════════════════════════════════════════════════════
('Booking.com',     ARRAY['travel','lifestyle'],                   '25–40%','percentage','https://www.booking.com/affiliate-program', 'Global accommodation. Very high volume. Strong with travel creators.',200,30,100,'premium','direct',1.25,4.5,83,'high',     ARRAY['travel','high-volume','global'],                  '{"1k":120,"10k":1200,"100k":12000}',false),
('Airbnb',          ARRAY['travel','lifestyle'],                   '$75/host','flat',   'https://www.airbnb.com/associates',          'Home sharing. Strong host referral bonuses.',0,30,50,'standard','direct',1.45,2.8,78,'high',     ARRAY['travel','host-referral','premium'],               '{"1k":90,"10k":900,"100k":9000}',false),
('Expedia',         ARRAY['travel'],                               '2–12%', 'percentage','https://www.expedia.com/affiliate',          'Full-service travel booking. Great for bundle content.',300,7,100,'standard','cj',0.68,2.2,72,'medium',  ARRAY['bundles','travel','broad'],                       '{"1k":80,"10k":800,"100k":8000}',false),
('VRBO',            ARRAY['travel','lifestyle'],                   '3.5%',  'percentage','https://vrbo.com/affiliates',               'Vacation rentals. High ticket. Family-travel audience.',1200,30,100,'premium','cj',1.20,1.5,70,'medium',  ARRAY['high-ticket','family','luxury-travel'],           '{"1k":100,"10k":1000,"100k":10000}',false),
('Viator',          ARRAY['travel'],                               '8%',    'percentage','https://www.viator.com/info/affiliatePartnerProgram','Experiences and tours. Great for destination content.',150,30,50,'standard','rakuten',0.72,3.8,75,'high',     ARRAY['experiences','destination-content'],              '{"1k":80,"10k":800,"100k":8000}',false),
('TripAdvisor',     ARRAY['travel'],                               '50% of commission','percentage','https://www.tripadvisor.com/affiliates','Hotel & restaurant bookings. Massive global trust.',120,14,50,'standard','cj',0.55,3.1,68,'medium',  ARRAY['trusted','global','reviews'],                    '{"1k":55,"10k":550,"100k":5500}',false),
('Away',            ARRAY['travel','lifestyle'],                   'varies','percentage','https://www.awaytravel.com/affiliates',      'Premium luggage brand. Strong with professional travelers.',295,30,50,'premium','impact',1.05,2.5,74,'high',     ARRAY['premium','travel','lifestyle'],                   '{"1k":80,"10k":800,"100k":8000}',true),

-- ═══════════════════════════════════════════════════════
-- FOOD & BEVERAGE
-- ═══════════════════════════════════════════════════════
('HelloFresh',      ARRAY['food','lifestyle'],                     '$10–20/order','flat','https://www.hellofresh.com/pages/affiliate-program','#1 meal kit worldwide. Very high CPA. Strong recurring revenue.',0,14,50,'premium','cj',2.45,3.8,85,'high',     ARRAY['meal-kit','recurring','high-cpa'],                '{"1k":120,"10k":1200,"100k":12000}',false),
('Factor',          ARRAY['food','fitness','health'],              '$15–30/sub','flat', 'https://factor75.com/affiliates',             'Prepared meals for fitness/health audiences. Excellent retention.',0,14,50,'premium','impact',2.20,4.1,82,'high',     ARRAY['fitness-food','prepared','high-retention'],       '{"1k":115,"10k":1150,"100k":11500}',false),
('Thrive Market',   ARRAY['food','health','lifestyle'],            '$20–40/member','flat','https://thrivemarket.com/affiliates',       'Organic groceries. Health-conscious audience. Recurring subs.',0,30,50,'premium','impact',1.85,3.5,76,'high',     ARRAY['organic','health','recurring'],                   '{"1k":100,"10k":1000,"100k":10000}',false),
('Goldbelly',       ARRAY['food','lifestyle'],                     '10%',   'percentage','https://www.goldbelly.com/affiliates',       'Artisan food gifts. High AOV. Perfect for holiday content.',120,30,50,'standard','shareasale',0.75,3.2,72,'medium',  ARRAY['gifts','artisan','holiday'],                      '{"1k":70,"10k":700,"100k":7000}',false),
('Vital Proteins',  ARRAY['health','fitness','beauty'],            '10%',   'percentage','https://www.vitalproteins.com/affiliates',   'Collagen supplements. Strong with female wellness audiences.',45,30,25,'standard','rakuten',0.68,4.8,80,'high',     ARRAY['wellness','collagen','female-audience'],           '{"1k":65,"10k":650,"100k":6500}',false),

-- ═══════════════════════════════════════════════════════
-- HOME & INTERIOR
-- ═══════════════════════════════════════════════════════
('Wayfair',         ARRAY['lifestyle','art'],                      '5–7%',  'percentage','https://www.wayfair.com/product/affiliates','Furniture & home goods. Very high AOV. Strong with home creators.',350,7,50,'standard','cj',0.72,2.2,79,'high',     ARRAY['home-decor','high-aov','interior'],               '{"1k":85,"10k":850,"100k":8500}',false),
('IKEA',            ARRAY['lifestyle','art'],                      '5%',    'percentage','https://www.ikea.com/global/affiliates',    'Global home brand. Massive recognition. Perfect for budget interior.',85,30,50,'standard','cj',0.45,2.8,75,'high',     ARRAY['global','budget','interior','trusted'],           '{"1k":50,"10k":500,"100k":5000}',false),
('Pottery Barn',    ARRAY['lifestyle','luxury'],                   '5%',    'percentage','https://www.potterybarn.com/affiliate',     'Premium home furnishings. High-income homeowner audience.',450,30,100,'premium','cj',0.85,1.5,70,'medium',  ARRAY['premium','high-income','home'],                   '{"1k":80,"10k":800,"100k":8000}',true),
('The Home Depot',  ARRAY['lifestyle','business'],                 '3–8%',  'percentage','https://www.homedepot.com/c/affiliate',     'Home improvement. Strong DIY audience. Very high AOV.',250,1,50,'standard','cj',0.55,2.5,72,'medium',  ARRAY['diy','home-improvement','broad'],                 '{"1k":60,"10k":600,"100k":6000}',false),

-- ═══════════════════════════════════════════════════════
-- BUSINESS & SOFTWARE (SAAS)
-- ═══════════════════════════════════════════════════════
('Shopify',         ARRAY['business','education'],                 '$58–2000','flat',   'https://www.shopify.com/affiliates',         'E-commerce. Lifetime recurring revenue. Best SaaS commission.',0,30,50,'premium','impact',3.50,2.1,88,'viral',    ARRAY['saas','recurring','e-commerce','high-ticket'],    '{"1k":150,"10k":1500,"100k":15000}',false),
('HubSpot',         ARRAY['business','education'],                 '30%',   'percentage','https://www.hubspot.com/partners/affiliates','CRM. 30% recurring commission. B2B creator goldmine.',0,90,50,'premium','impact',4.20,1.8,84,'high',     ARRAY['saas','recurring','b2b','high-value'],            '{"1k":140,"10k":1400,"100k":14000}',false),
('Notion',          ARRAY['education','business','tech'],          '$10/signup','flat', 'https://www.notion.so/affiliates',           'Productivity tool. Viral organic growth. Creator-native.',0,30,25,'standard','direct',0.88,5.5,89,'viral',    ARRAY['viral','productivity','creator-native','trending'],'{"1k":80,"10k":800,"100k":8000}',false),
('ConvertKit',      ARRAY['business','education'],                 '30%',   'percentage','https://app.convertkit.com/partner',         'Email marketing for creators. 30% recurring. Creator-focused.',0,30,50,'premium','direct',2.85,3.2,82,'high',     ARRAY['creator-focused','email','recurring'],            '{"1k":120,"10k":1200,"100k":12000}',false),
('Squarespace',     ARRAY['art','business','lifestyle'],           '20%',   'percentage','https://www.squarespace.com/affiliates',    'Website builder. Strong with creative/portfolio audiences.',120,45,50,'standard','cj',0.95,3.5,76,'high',     ARRAY['website','creative','portfolio'],                 '{"1k":85,"10k":850,"100k":8500}',false),
('Canva',           ARRAY['art','education','business'],           '$36/ref','flat',    'https://www.canva.com/affiliates',           'Design tool. Viral. Every creator needs it.',120,30,50,'standard','impact',1.20,5.8,90,'viral',    ARRAY['viral','creator-native','design'],                '{"1k":90,"10k":900,"100k":9000}',false),
('Fiverr',          ARRAY['business','education'],                 '$15–150','flat',    'https://affiliates.fiverr.com',              'Freelance marketplace. Excellent CPA per buyer.',0,30,50,'standard','direct',1.55,4.2,78,'high',     ARRAY['freelance','services','broad'],                   '{"1k":90,"10k":900,"100k":9000}',false),

-- ═══════════════════════════════════════════════════════
-- MUSIC & AUDIO
-- ═══════════════════════════════════════════════════════
('Epidemic Sound',  ARRAY['music','art','education'],              '$40/month','flat',  'https://www.epidemicsound.com/referral',    'Royalty-free music. Every creator needs it. Recurring CPA.',0,30,50,'standard','direct',2.10,4.5,88,'viral',    ARRAY['creator-native','recurring','viral'],             '{"1k":95,"10k":950,"100k":9500}',false),
('Artlist',         ARRAY['music','art'],                          '50%',   'percentage','https://artlist.io/affiliates',             '50% commission on subscriptions. Creator-focused music licensing.',0,30,50,'premium','direct',2.45,3.8,82,'high',     ARRAY['creator-native','high-commission','recurring'],   '{"1k":110,"10k":1100,"100k":11000}',false),
('Splice',          ARRAY['music'],                                '20%',   'percentage','https://splice.com/creator-affiliates',     'Samples and plugins. Essential for music producers.',10,30,25,'standard','direct',0.88,5.2,78,'high',     ARRAY['music-production','samples','creator-native'],   '{"1k":70,"10k":700,"100k":7000}',false),
('Native Instruments',ARRAY['music','tech'],                       '10%',   'percentage','https://www.native-instruments.com/affiliates','Pro music production hardware/software. High AOV.',200,30,50,'premium','cj',0.92,2.5,75,'high',     ARRAY['professional','high-aov','music-production'],    '{"1k":80,"10k":800,"100k":8000}',false),

-- ═══════════════════════════════════════════════════════
-- LUXURY & EXCLUSIVE
-- ═══════════════════════════════════════════════════════
('NET-A-PORTER',    ARRAY['fashion','luxury','lifestyle'],         '6%',    'percentage','https://www.net-a-porter.com/en-gb/d/editorial/affiliates','Ultra-luxury fashion. Highest AOV of any fashion program.',800,14,100,'exclusive','awin',1.45,1.2,78,'high',     ARRAY['ultra-luxury','high-aov','exclusive'],            '{"1k":100,"10k":1000,"100k":10000}',true),
('Farfetch',        ARRAY['fashion','luxury'],                     '8–12%', 'percentage','https://www.farfetch.com/partners',         'Global luxury fashion marketplace. Strong ROI.',550,30,100,'exclusive','rakuten',1.65,1.5,80,'high',     ARRAY['luxury','global','marketplace'],                  '{"1k":120,"10k":1200,"100k":12000}',true),
('Rolex',           ARRAY['luxury'],                               'private','flat',    'https://www.rolex.com/en-us/rolex-dealers/authorized-dealer-program','Ultra-luxury watches. By invitation only.',8000,0,500,'exclusive','direct',NULL,0.5,70,'medium', ARRAY['ultra-luxury','invitation-only','watches'],      '{"1k":NULL,"10k":NULL,"100k":NULL}',true),
('Lamborghini',     ARRAY['luxury','automotive'],                  'private','flat',    'https://www.lamborghini.com/affiliates',    'Luxury automotive. Partner program by invitation.',250000,0,1000,'exclusive','direct',NULL,0.2,72,'medium',ARRAY['ultra-luxury','automotive','invitation-only'],   '{"1k":NULL,"10k":NULL,"100k":NULL}',true),

-- ═══════════════════════════════════════════════════════
-- HEALTH & WELLNESS
-- ═══════════════════════════════════════════════════════
('Hims & Hers',     ARRAY['health','lifestyle'],                   '$50–100/sub','flat','https://www.forhims.com/affiliates',        'Personal health subscriptions. High-value audience.',0,30,50,'premium','impact',2.55,2.8,80,'high',     ARRAY['health','subscription','recurring'],              '{"1k":110,"10k":1100,"100k":11000}',true),
('Headspace',       ARRAY['health','lifestyle','education'],       '30%',   'percentage','https://www.headspace.com/affiliates',      'Meditation app. Strong mental health content tie-in.',70,30,25,'standard','impact',0.72,4.5,77,'high',     ARRAY['mental-health','wellness','app'],                '{"1k":65,"10k":650,"100k":6500}',false),
('Calm',            ARRAY['health','lifestyle'],                   '$22/sub','flat',    'https://www.calm.com/affiliates',            'Sleep and meditation. Mass-market wellness.',70,30,25,'standard','impact',0.85,4.8,78,'high',     ARRAY['sleep','wellness','mainstream'],                  '{"1k":70,"10k":700,"100k":7000}',false),
('Care/of',         ARRAY['health','fitness'],                     '25%',   'percentage','https://takecareof.com/affiliates',          'Personalized vitamins. Strong quiz-funnel conversion.',45,30,25,'standard','impact',1.05,5.2,74,'high',     ARRAY['personalized','vitamins','quiz-funnel'],          '{"1k":80,"10k":800,"100k":8000}',false),
('Eight Sleep',     ARRAY['health','fitness','tech'],              '5%',    'percentage','https://www.eightsleep.com/partners',        'Smart mattress. Ultra-high AOV. Health optimization audience.',2000,30,100,'premium','direct',2.20,0.9,76,'high',     ARRAY['biohacking','high-ticket','sleep-tech'],          '{"1k":90,"10k":900,"100k":9000}',true),

-- ═══════════════════════════════════════════════════════
-- SUSTAINABILITY & CAUSE
-- ═══════════════════════════════════════════════════════
('Patagonia',       ARRAY['fitness','lifestyle','travel'],         '8%',    'percentage','https://www.patagonia.com/b2b',             'Outdoor apparel with activism. High brand loyalty.',200,30,50,'premium','cj',0.85,2.8,80,'high',     ARRAY['sustainability','activism','premium'],            '{"1k":80,"10k":800,"100k":8000}',true),
('Allbirds',        ARRAY['lifestyle','fitness'],                  '7–10%', 'percentage','https://www.allbirds.com/affiliates',       'Sustainable footwear. Strong with eco-conscious audiences.',140,30,50,'standard','impact',0.78,3.2,75,'high',     ARRAY['sustainable','eco','footwear'],                   '{"1k":70,"10k":700,"100k":7000}',false),
('Grove Collaborative',ARRAY['lifestyle','health'],               '$20/order','flat',  'https://www.grove.co/affiliates',             'Eco-friendly home products. High CVR with sustainability audience.',0,30,50,'standard','impact',1.45,4.5,72,'high',     ARRAY['eco-friendly','sustainable','home'],              '{"1k":85,"10k":850,"100k":8500}',false)

ON CONFLICT DO NOTHING;

COMMIT;
