/**
 * Mansas Moguls — Affiliate Match Engine
 *
 * Computes a 0–100 Brand Match Score between a creator and an affiliate program.
 * Revenue estimation uses actual audience data + historical EPC benchmarks.
 */

export type AffiliateProgram = {
  id: string;
  brand_name: string;
  niches: string[];
  commission_rate: string;
  commission_type: string;
  avg_order_value_usd: number;
  cookie_duration_days: number;
  tier: string;
  epc_usd: number | null;
  avg_conversion_rate: number | null;
  trending_score: number;
  demand_level: string;
  tags: string[];
  min_followers: number;
  monthly_revenue_potential_usd: Record<string, number | null>;
  requires_approval: boolean;
};

export type CreatorProfile = {
  niche: string | null;
  total_followers: number;
  avg_engagement_rate: number;
  top_platform: string | null;
  moguls_score: number;
  monthly_revenue_usd: number;
};

export type MatchResult = {
  affiliate_id: string;
  match_score: number;
  estimated_monthly_revenue_usd: number;
  match_reasons: string[];
  revenue_range: { low: number; high: number };
  confidence: "low" | "medium" | "high";
};

const NICHE_ADJACENCY: Record<string, string[]> = {
  fitness:    ["health", "lifestyle", "sports", "food"],
  beauty:     ["lifestyle", "fashion", "health"],
  fashion:    ["lifestyle", "luxury", "beauty"],
  tech:       ["gaming", "education", "business"],
  gaming:     ["tech", "music", "education"],
  crypto:     ["finance", "tech", "business"],
  finance:    ["business", "education", "crypto"],
  travel:     ["lifestyle", "food", "photography"],
  food:       ["health", "lifestyle", "travel"],
  music:      ["art", "education", "lifestyle"],
  art:        ["music", "education", "lifestyle"],
  education:  ["business", "tech", "finance"],
  business:   ["education", "finance", "tech"],
  luxury:     ["fashion", "travel", "lifestyle"],
  health:     ["fitness", "food", "lifestyle"],
  lifestyle:  ["fashion", "travel", "food", "fitness"],
  sports:     ["fitness", "health", "lifestyle"],
};

function nicheMatchScore(creatorNiche: string | null, programNiches: string[]): number {
  if (!creatorNiche) return 30;
  const cn = creatorNiche.toLowerCase();
  if (programNiches.includes(cn)) return 100;
  const adjacent = NICHE_ADJACENCY[cn] ?? [];
  const hasAdjacent = programNiches.some(n => adjacent.includes(n));
  if (hasAdjacent) return 60;
  if (programNiches.includes("lifestyle")) return 35;
  return 10;
}

function audienceFitScore(followers: number, program: AffiliateProgram): number {
  if (followers < program.min_followers) return 0;
  // Optimal band: 10K–500K for most programs
  if (followers >= 10_000 && followers <= 500_000) return 100;
  if (followers >= 1_000 && followers < 10_000) return 65;
  if (followers > 500_000) return 90; // mega creators still work, slightly less personal
  return 30;
}

function commissionQualityScore(program: AffiliateProgram): number {
  const tierScores: Record<string, number> = { exclusive: 100, premium: 85, standard: 65 };
  const trendingBonus = Math.min(15, (program.trending_score - 50) * 0.3);
  const demandBonus: Record<string, number> = { viral: 15, high: 10, medium: 5, low: 0 };
  return Math.min(100, (tierScores[program.tier] ?? 65) + trendingBonus + (demandBonus[program.demand_level] ?? 0));
}

function engagementMultiplier(engagementRate: number): number {
  // >3% is excellent, 1–3% good, <1% weak
  if (engagementRate >= 3) return 1.3;
  if (engagementRate >= 1) return 1.0;
  return 0.7;
}

export function computeMatchScore(creator: CreatorProfile, program: AffiliateProgram): MatchResult {
  const nicheScore    = nicheMatchScore(creator.niche, program.niches);
  const audienceScore = audienceFitScore(creator.total_followers, program);
  const commScore     = commissionQualityScore(program);
  const trendBonus    = program.trending_score > 80 ? 10 : program.trending_score > 60 ? 5 : 0;

  const matchScore = Math.min(100, Math.round(
    nicheScore    * 0.40 +
    audienceScore * 0.30 +
    commScore     * 0.20 +
    trendBonus    * 0.10
  ));

  // Revenue estimation
  const followersBracket =
    creator.total_followers >= 100_000 ? "100k" :
    creator.total_followers >= 10_000  ? "10k" : "1k";

  const basePotential = program.monthly_revenue_potential_usd?.[followersBracket];
  const engMult = engagementMultiplier(creator.avg_engagement_rate);
  const estimatedRevenue = basePotential ? Math.round(basePotential * engMult) : 0;

  const matchReasons: string[] = [];
  if (nicheScore >= 80) matchReasons.push(`Your ${creator.niche} niche aligns perfectly with ${program.brand_name}'s audience`);
  else if (nicheScore >= 50) matchReasons.push(`Adjacent niche overlap — ${program.brand_name} reaches your audience type`);
  if (program.trending_score >= 85) matchReasons.push(`${program.brand_name} is trending right now — high conversion momentum`);
  if (program.epc_usd && program.epc_usd > 1.0) matchReasons.push(`Above-average earnings per click ($${program.epc_usd.toFixed(2)} EPC)`);
  if (program.cookie_duration_days >= 30) matchReasons.push(`${program.cookie_duration_days}-day cookie gives you full credit on delayed purchases`);
  if (program.tier === "exclusive") matchReasons.push("Exclusive program — limited creator access = less competition");
  if (program.avg_conversion_rate && program.avg_conversion_rate > 4) matchReasons.push(`High ${program.avg_conversion_rate}% conversion rate in your niche`);
  if (creator.avg_engagement_rate >= 3) matchReasons.push("Your high engagement rate will drive above-average conversion");

  const confidence: MatchResult["confidence"] = basePotential ? "high" : program.epc_usd ? "medium" : "low";

  return {
    affiliate_id: program.id,
    match_score: matchScore,
    estimated_monthly_revenue_usd: estimatedRevenue,
    match_reasons: matchReasons.slice(0, 3),
    revenue_range: {
      low: Math.round(estimatedRevenue * 0.6),
      high: Math.round(estimatedRevenue * 1.8),
    },
    confidence,
  };
}

export function rankPrograms(creator: CreatorProfile, programs: AffiliateProgram[]): MatchResult[] {
  return programs
    .map(p => computeMatchScore(creator, p))
    .sort((a, b) => {
      // Sort by: match_score first, then estimated revenue
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      return b.estimated_monthly_revenue_usd - a.estimated_monthly_revenue_usd;
    });
}
