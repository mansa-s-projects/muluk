// POST /api/signals/refresh
// Generate fresh signals for a given niche using AI + mock trend data.
// In production this would fan-out to TikTok/Twitter/Google Trends APIs.
// Protected: only callable with the service-role key or from a cron job.
// Creators can also trigger a manual refresh (rate-limited to once per hour).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

// ---------------------------------------------------------------------------
// Mock trend sources — replace with real API calls in production
// ---------------------------------------------------------------------------

type RawTrend = {
  topic: string;
  source: "tiktok" | "twitter" | "google";
  velocity: number; // 0–100
};

const MOCK_TRENDS: Record<string, RawTrend[]> = {
  fitness: [
    { topic: "cortisol detox morning routine", source: "tiktok",  velocity: 88 },
    { topic: "zone 2 cardio for fat loss",     source: "twitter", velocity: 74 },
    { topic: "creatine for women",             source: "google",  velocity: 91 },
    { topic: "90-day body recomp",             source: "tiktok",  velocity: 65 },
    { topic: "mouth taping sleep hack",        source: "tiktok",  velocity: 82 },
  ],
  finance: [
    { topic: "high yield savings 2026",        source: "google",  velocity: 95 },
    { topic: "cash stuffing budgeting",        source: "tiktok",  velocity: 78 },
    { topic: "index fund vs ETF debate",       source: "twitter", velocity: 61 },
    { topic: "credit card travel hacking",     source: "tiktok",  velocity: 72 },
    { topic: "real estate vs stocks 2026",     source: "google",  velocity: 84 },
  ],
  gaming: [
    { topic: "AI NPCs in open world games",    source: "twitter", velocity: 90 },
    { topic: "$10k gaming tournament prizes",  source: "tiktok",  velocity: 76 },
    { topic: "mobile gaming monetization",     source: "google",  velocity: 68 },
    { topic: "Roblox creator economy 2026",    source: "tiktok",  velocity: 85 },
    { topic: "vintage console collecting",     source: "twitter", velocity: 55 },
  ],
  fashion: [
    { topic: "quiet luxury vs loud fashion",   source: "tiktok",  velocity: 93 },
    { topic: "Dubai modest fashion brands",    source: "google",  velocity: 79 },
    { topic: "vintage Hermès flipping",        source: "twitter", velocity: 88 },
    { topic: "AI-designed streetwear drops",   source: "tiktok",  velocity: 70 },
    { topic: "sneaker investment 2026",        source: "google",  velocity: 82 },
  ],
  tech: [
    { topic: "vibe coding tools for founders", source: "twitter", velocity: 96 },
    { topic: "local AI vs cloud AI debate",    source: "twitter", velocity: 88 },
    { topic: "no-code SaaS success stories",   source: "tiktok",  velocity: 75 },
    { topic: "AI agents replacing VAs",        source: "google",  velocity: 91 },
    { topic: "crypto DeFi yield 2026",         source: "google",  velocity: 67 },
  ],
  education: [
    { topic: "AI tutors replacing teachers",   source: "twitter", velocity: 89 },
    { topic: "learn to code in 30 days",       source: "tiktok",  velocity: 74 },
    { topic: "micro credentials vs degrees",   source: "google",  velocity: 82 },
    { topic: "Mandarin in 90 days challenge",  source: "tiktok",  velocity: 63 },
    { topic: "homeschool curriculum hack",     source: "google",  velocity: 71 },
  ],
  luxury: [
    { topic: "ultra-high-net-worth investing", source: "google",  velocity: 77 },
    { topic: "private members club culture",   source: "twitter", velocity: 68 },
    { topic: "luxury watch market 2026",       source: "google",  velocity: 85 },
    { topic: "Rolls Royce vs Bentley debate",  source: "tiktok",  velocity: 79 },
    { topic: "concierge medicine trending",    source: "twitter", velocity: 62 },
  ],
  music: [
    { topic: "AI music royalty debate",        source: "twitter", velocity: 94 },
    { topic: "beat leasing vs exclusive 2026", source: "tiktok",  velocity: 81 },
    { topic: "vinyl revival among Gen Z",      source: "google",  velocity: 73 },
    { topic: "live looping performance art",   source: "tiktok",  velocity: 60 },
    { topic: "stem file selling business",     source: "twitter", velocity: 85 },
  ],
};

const DEFAULT_TRENDS: RawTrend[] = [
  { topic: "personal brand monetization",  source: "twitter", velocity: 80 },
  { topic: "creator economy 2026 income",  source: "google",  velocity: 87 },
  { topic: "exclusive community pricing",  source: "tiktok",  velocity: 75 },
];

function getTrends(niche: string): RawTrend[] {
  return MOCK_TRENDS[niche] ?? DEFAULT_TRENDS;
}

// ---------------------------------------------------------------------------
// AI signal generation
// ---------------------------------------------------------------------------

type GeneratedSignal = {
  title: string;
  summary: string;
  suggested_product: string;
  suggested_price: number;
  offer_type: string;
  action_suggestion: string;
  demand_level: "low" | "medium" | "high" | "viral";
  score: number;
};

function fallbackSignal(trend: RawTrend, niche: string): GeneratedSignal {
  const score = Math.round(trend.velocity);
  const demand: GeneratedSignal["demand_level"] =
    score >= 90 ? "viral" : score >= 75 ? "high" : score >= 55 ? "medium" : "low";

  const prices: Record<string, number> = {
    course: 79, coaching: 199, drop: 39, community: 29, digital: 49,
  };
  const offerTypes = ["course", "coaching", "drop", "community", "digital"];
  const offer_type = offerTypes[Math.floor(Math.random() * offerTypes.length)];
  const price = prices[offer_type];

  return {
    title:              `${trend.topic.charAt(0).toUpperCase() + trend.topic.slice(1)} is trending`,
    summary:            `"${trend.topic}" is gaining momentum in the ${niche} space. Early creators who build around this are positioned for fast conversions.`,
    suggested_product:  `${trend.topic.split(" ").slice(0, 3).join(" ")} ${offer_type}`,
    suggested_price:    price,
    offer_type,
    action_suggestion:  `Post about "${trend.topic}" immediately — tease your product before the trend peaks.`,
    demand_level:       demand,
    score,
  };
}

async function generateSignalWithAI(trend: RawTrend, niche: string): Promise<GeneratedSignal> {
  const prompt = `You are a creator monetization signal analyzer.

TREND:
- Topic: "${trend.topic}"
- Source: ${trend.source}
- Momentum velocity: ${trend.velocity}/100
- Creator niche: ${niche}

Generate a monetization signal in EXACT format:

TITLE: [headline explaining why this matters for a ${niche} creator]
SUMMARY: [2 sentences: what the trend is + why it converts to sales]
PRODUCT: [specific product/service idea]
PRICE: $[number — realistic for the audience]
OFFER_TYPE: [one of: course, coaching, drop, community, digital]
ACTION: [one sentence — what to post or create TODAY]
DEMAND: [one of: low, medium, high, viral]
SCORE: [number 0-100 based on velocity and monetization potential]

Be specific and avoid generic advice.`;

  const { stream } = await aiRouter.streamCompletion("content_strategy", prompt);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  const extract = (key: string) => {
    const m = text.match(new RegExp(`${key}:\\s*([^\\n]+)`, "i"));
    return m?.[1]?.trim() ?? "";
  };

  const priceMatch = extract("PRICE").match(/\$?([\d.]+)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : fallbackSignal(trend, niche).suggested_price;
  const rawScore = parseInt(extract("SCORE"), 10);
  const score = isNaN(rawScore) ? Math.round(trend.velocity) : Math.min(100, Math.max(0, rawScore));
  const rawDemand = extract("DEMAND").toLowerCase();
  const demand: GeneratedSignal["demand_level"] =
    ["low", "medium", "high", "viral"].includes(rawDemand)
      ? (rawDemand as GeneratedSignal["demand_level"])
      : fallbackSignal(trend, niche).demand_level;
  const offer_type = extract("OFFER_TYPE").toLowerCase() || fallbackSignal(trend, niche).offer_type;

  return {
    title:              extract("TITLE")   || fallbackSignal(trend, niche).title,
    summary:            extract("SUMMARY") || fallbackSignal(trend, niche).summary,
    suggested_product:  extract("PRODUCT") || fallbackSignal(trend, niche).suggested_product,
    suggested_price:    price,
    offer_type,
    action_suggestion:  extract("ACTION")  || fallbackSignal(trend, niche).action_suggestion,
    demand_level:       demand,
    score,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

const VALID_NICHES = [
  "luxury", "fitness", "music", "art", "fashion", "gaming",
  "education", "tech", "food", "travel", "finance", "health",
  "beauty", "sports", "crypto", "business",
];

// Rate-limit map: user_id -> last refresh timestamp
const refreshCooldown = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { niche?: string; force?: boolean };
    const niche = body.niche && VALID_NICHES.includes(body.niche) ? body.niche : null;
    if (!niche) return NextResponse.json({ error: "Valid niche required" }, { status: 400 });

    // Rate limit per user (skip if force=true for admin/dev use)
    if (!body.force) {
      const last = refreshCooldown.get(user.id);
      if (last && Date.now() - last < COOLDOWN_MS) {
        const retryAfter = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 60000);
        return NextResponse.json(
          { error: `Rate limited. Try again in ${retryAfter} minutes.` },
          { status: 429, headers: { "Retry-After": String(retryAfter * 60) } }
        );
      }
    }

    refreshCooldown.set(user.id, Date.now());

    // Expire old signals for this niche
    await supabase
      .from("signals")
      .update({ is_active: false })
      .eq("niche", niche)
      .eq("is_active", true);

    // Fetch trends
    const trends = getTrends(niche);

    // Generate signals — try AI, fall back gracefully per signal
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const signalRows = await Promise.all(
      trends.map(async (trend) => {
        let generated: GeneratedSignal;
        try {
          generated = await generateSignalWithAI(trend, niche);
        } catch {
          generated = fallbackSignal(trend, niche);
        }

        return {
          niche,
          source:          trend.source,
          topic:           trend.topic,
          title:           generated.title,
          summary:         generated.summary,
          score:           generated.score,
          demand_level:    generated.demand_level,
          velocity:        trend.velocity,
          suggested_product: generated.suggested_product,
          suggested_price:   generated.suggested_price,
          offer_type:        generated.offer_type,
          action_suggestion: generated.action_suggestion,
          keywords:          trend.topic.split(" "),
          is_active:         true,
          expires_at:        expiresAt,
          updated_at:        new Date().toISOString(),
        };
      })
    );

    const { error: insertErr } = await supabase.from("signals").insert(signalRows);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      niche,
      generated: signalRows.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
