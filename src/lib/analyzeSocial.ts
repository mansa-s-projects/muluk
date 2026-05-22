/**
 * analyzeSocial — rule-based audience + content signal analysis engine.
 * Pure function: no DB calls, no side effects.
 */

export type SocialPost = {
  caption: string | null;
  like_count: number;
  comments_count: number;
  media_type: string | null;
  posted_at: string | null;
};

export type SocialAnalysisInput = {
  posts: SocialPost[];
  followers_count: number;
  profile_data?: {
    username?: string;
    bio?: string;
  };
};

export type SocialAnalysisResult = {
  engagement_rate: number;
  best_posting_times: string[];
  top_content_patterns: string[];
  high_intent_signals: string[];
  high_intent_signal_count: number;
  recommended_offer_type: "private_community" | "premium_content" | "coaching" | "tutorials" | "vault";
  recommended_price_range: { min: number; max: number };
  confidence_score: number; // 0-100
  summary: string;
};

// ─── High-intent comment/caption signals ─────────────────────────────────────

const COMMENT_INTENT_WORDS = [
  "how", "where", "link", "dm", "teach", "help", "need",
  "price", "buy", "cost", "much", "get", "join", "access",
  "want", "course", "tutorial", "drop", "sell", "available",
];

const CAPTION_INTENT_PHRASES = [
  "dm me", "link in bio", "comment below", "message me",
  "want part 2", "should i drop this", "drop the link",
  "dropping soon", "exclusive", "private", "members only",
  "join now", "limited spots", "early access", "founding",
  "secret", "inner circle", "vip", "unlock",
];

// ─── Content pattern detection ───────────────────────────────────────────────

const CONTENT_PATTERNS: Record<string, RegExp> = {
  "Behind-the-scenes access":   /\b(bts|behind[\s-]the[\s-]scenes|behind scenes|backstage|raw|unfiltered)\b/i,
  "Tutorial demand":            /\b(tutorial|how[\s-]to|step[\s-]by[\s-]step|guide|teach|lesson|walk[\s-]through)\b/i,
  "Exclusive drop signals":     /\b(exclusive|limited|drop|rare|only \d+|founding|first look)\b/i,
  "Community/access requests":  /\b(community|group|join|access|member|circle|inner)\b/i,
  "Product/offer curiosity":    /\b(link|price|cost|buy|available|sale|offer|course|program)\b/i,
  "Personal/coaching calls":    /\b(coaching|1:1|one.on.one|consult|personaliz|mentor|advice)\b/i,
};

// ─── Offer type scoring ───────────────────────────────────────────────────────

function scoreOfferType(posts: SocialPost[], followers: number): Record<string, number> {
  const scores: Record<string, number> = {
    private_community: 0,
    premium_content: 0,
    coaching: 0,
    tutorials: 0,
    vault: 0,
  };

  for (const post of posts) {
    const text = (post.caption ?? "").toLowerCase();
    if (/community|group|join|circle|member/.test(text))   scores.private_community += 2;
    if (/exclusive|behind|raw|unfiltered|personal/.test(text)) scores.premium_content += 2;
    if (/coach|mentor|1:1|consult|advice/.test(text))      scores.coaching += 3;
    if (/\b(?:tutorial|how[\s.-]?to|guide|teach|lesson)\b/i.test(text))   scores.tutorials += 3;
    if (/vault|archive|library|collection|resource/.test(text)) scores.vault += 2;
  }

  // Follower-count adjustments
  if (followers < 5_000)   scores.coaching += 5;
  if (followers >= 5_000 && followers < 50_000)  scores.private_community += 4;
  if (followers >= 50_000) { scores.premium_content += 3; scores.vault += 3; }

  return scores;
}

// ─── Price range by followers + engagement ───────────────────────────────────

function priceRange(followers: number, engagement_rate: number): { min: number; max: number } {
  // Base prices in dollars
  let min = 9;
  let max = 29;

  if (followers >= 100_000) { min = 19; max = 97; }
  else if (followers >= 50_000) { min = 15; max = 67; }
  else if (followers >= 10_000) { min = 12; max = 49; }
  else if (followers >= 5_000) { min = 9; max = 39; }

  // High engagement lifts price
  if (engagement_rate >= 8)  { min = Math.round(min * 1.4); max = Math.round(max * 1.5); }
  else if (engagement_rate >= 5) { min = Math.round(min * 1.2); max = Math.round(max * 1.3); }

  return { min, max };
}

// ─── Best posting times from posted_at timestamps ────────────────────────────

function extractBestPostingTimes(posts: SocialPost[]): string[] {
  const hourBuckets: Record<string, number[]> = {};

  for (const post of posts) {
    if (!post.posted_at) continue;
    const d = new Date(post.posted_at);
    if (isNaN(d.getTime())) continue;
    const hour = d.getUTCHours();
    const engagement = post.like_count + post.comments_count * 3;
    const bucket = `${hour}:00 UTC`;
    if (!hourBuckets[bucket]) hourBuckets[bucket] = [];
    hourBuckets[bucket].push(engagement);
  }

  const sorted = Object.entries(hourBuckets)
    .map(([h, vals]) => ({ hour: h, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(e => e.hour);

  return sorted.length ? sorted : ["6:00–9:00 PM local", "12:00–1:00 PM local"];
}

// ─── High-intent signals from captions ───────────────────────────────────────

function detectHighIntentSignals(posts: SocialPost[]): string[] {
  const found = new Set<string>();

  for (const post of posts) {
    const text = (post.caption ?? "").toLowerCase();
    for (const phrase of CAPTION_INTENT_PHRASES) {
      if (text.includes(phrase)) {
        found.add(`Caption contains "${phrase}"`);
      }
    }
    for (const word of COMMENT_INTENT_WORDS) {
      const re = new RegExp(`\\b${word}\\b`, "i");
      if (re.test(text)) {
        found.add(`High-intent word: "${word}" in caption`);
      }
    }
  }

  return Array.from(found).slice(0, 8);
}

// ─── Top content patterns ─────────────────────────────────────────────────────

function detectContentPatterns(posts: SocialPost[]): string[] {
  const matches: Record<string, number> = {};
  for (const [label, re] of Object.entries(CONTENT_PATTERNS)) {
    for (const post of posts) {
      if (re.test(post.caption ?? "")) {
        matches[label] = (matches[label] ?? 0) + 1;
      }
    }
  }
  return Object.entries(matches)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function analyzeSocial(input: SocialAnalysisInput): SocialAnalysisResult {
  const { posts, followers_count } = input;

  // Engagement rate: (total likes + comments * 3) / followers / postCount * 100
  const totalEngagement = posts.reduce(
    (sum, p) => sum + p.like_count + p.comments_count * 3,
    0
  );
  const engagement_rate =
    posts.length > 0 && followers_count > 0
      ? Math.min(100, (totalEngagement / posts.length / followers_count) * 100)
      : 0;

  const signals      = detectHighIntentSignals(posts);
  const patterns     = detectContentPatterns(posts);
  const offerScores  = scoreOfferType(posts, followers_count);
  const bestType     = Object.entries(offerScores).sort((a, b) => b[1] - a[1])[0][0] as
    SocialAnalysisResult["recommended_offer_type"];
  const priceR       = priceRange(followers_count, engagement_rate);
  const postingTimes = extractBestPostingTimes(posts);

  // Confidence: boosted by post count, follower count, and signal richness
  const baseConf = Math.min(50, posts.length * 2);
  const followerBonus = followers_count >= 10_000 ? 20 : followers_count >= 1_000 ? 10 : 5;
  const signalBonus   = signals.length * 3;
  const confidence_score = Math.min(100, baseConf + followerBonus + signalBonus);

  const summary =
    `${followers_count.toLocaleString()} followers · ${engagement_rate.toFixed(1)}% engagement · ` +
    `${signals.length} high-intent signals · Recommended: ${bestType.replace(/_/g, " ")} at $${priceR.min}–$${priceR.max}`;

  return {
    engagement_rate:           parseFloat(engagement_rate.toFixed(2)),
    best_posting_times:        postingTimes,
    top_content_patterns:      patterns,
    high_intent_signals:       signals,
    high_intent_signal_count:  signals.length,
    recommended_offer_type:    bestType,
    recommended_price_range:   priceR,
    confidence_score,
    summary,
  };
}
