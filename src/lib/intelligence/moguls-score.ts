/**
 * Moguls Score Engine
 * Proprietary composite intelligence scoring (0–1000 scale).
 *
 * Scores:
 *   Moguls Score     = weighted composite of all sub-scores
 *   Influence Score  = reach × follower quality × platform diversity
 *   Authority Score  = consistency × engagement depth × niche relevance
 *   Growth Score     = velocity × momentum × trajectory
 *   Revenue Score    = monetization efficiency × ARPU × conversion
 *   Engagement Score = rate × quality × depth × retention
 *   Audience Quality = authentic followers × demographics fit × LTV proxy
 *   Content Score    = virality × shareability × retention × diversity
 *   Consistency      = posting frequency × schedule regularity
 *   Virality Score   = avg views/followers ratio × share rate
 */

export type MogulsScoreInput = {
  connections: Array<{
    platform: string;
    followers: number;
    following: number;
    posts_count: number;
    avg_views: number;
    avg_likes: number;
    avg_comments: number;
    avg_shares: number;
    engagement_rate: number;
    growth_pct_7d: number;
    growth_pct_30d: number;
    reach: number;
    impressions: number;
  }>;
  total_revenue_usd: number;
  transactions_90d: number;
  avg_order_value_usd: number;
  days_active: number;
};

export type MogulsScoreOutput = {
  moguls_score: number;
  influence_score: number;
  authority_score: number;
  growth_score: number;
  revenue_score: number;
  engagement_score: number;
  audience_quality: number;
  content_score: number;
  consistency_score: number;
  virality_score: number;
  total_followers: number;
  total_reach: number;
  avg_engagement_rate: number;
  top_platform: string | null;
  growth_pct_7d: number;
  growth_pct_30d: number;
  breakdown: Record<string, {
    followers: number;
    engagement_rate: number;
    health: number;
    contribution_pct: number;
  }>;
};

const PLATFORM_WEIGHTS: Record<string, number> = {
  youtube: 1.4,    // highest authority signal
  tiktok: 1.3,     // highest viral potential
  instagram: 1.2,
  twitter: 1.1,
  linkedin: 1.2,   // high authority for B2B
  telegram: 0.9,
  website: 1.0,
  newsletter: 1.1, // owned audience premium
  podcast: 1.15,
};

function clamp(v: number, min = 0, max = 1000): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function logScale(value: number, ceiling: number, outputMax = 1000): number {
  if (value <= 0) return 0;
  return Math.min(outputMax, (Math.log10(value + 1) / Math.log10(ceiling + 1)) * outputMax);
}

export function computeMogulsScore(input: MogulsScoreInput): MogulsScoreOutput {
  const { connections, total_revenue_usd, transactions_90d, avg_order_value_usd, days_active } = input;

  if (connections.length === 0) {
    return {
      moguls_score: 0, influence_score: 0, authority_score: 0, growth_score: 0,
      revenue_score: 0, engagement_score: 0, audience_quality: 0, content_score: 0,
      consistency_score: 0, virality_score: 0, total_followers: 0, total_reach: 0,
      avg_engagement_rate: 0, top_platform: null, growth_pct_7d: 0, growth_pct_30d: 0, breakdown: {},
    };
  }

  const totalFollowers = connections.reduce((s, c) => s + c.followers, 0);
  const totalReach = connections.reduce((s, c) => s + c.reach, 0);
  const avgEngRate = connections.reduce((s, c) => s + c.engagement_rate, 0) / connections.length;
  const topConn = [...connections].sort((a, b) => b.followers - a.followers)[0];

  // ── Influence Score ──────────────────────────────────────────────────────
  // Raw reach × platform diversity × quality signal
  const reachScore = logScale(totalFollowers, 10_000_000, 400);
  const platformDiversity = Math.min(300, connections.length * 60);
  const qualitySignal = Math.min(300, avgEngRate * 100);
  const influenceScore = clamp(reachScore + platformDiversity + qualitySignal);

  // ── Authority Score ──────────────────────────────────────────────────────
  // Consistency + engagement depth + multi-platform presence
  const consistencyDays = Math.min(1, days_active / 365);
  const engDepth = Math.min(400, avgEngRate > 0 ? avgEngRate * 80 : 0);
  const multiPlatform = Math.min(300, connections.length * 50);
  const ownedChannels = connections.filter(c => ["newsletter", "podcast", "website"].includes(c.platform)).length;
  const ownedBonus = ownedChannels * 100;
  const authorityScore = clamp((consistencyDays * 200) + engDepth + multiPlatform + ownedBonus);

  // ── Growth Score ─────────────────────────────────────────────────────────
  const avgGrowth7d = connections.reduce((s, c) => s + c.growth_pct_7d, 0) / connections.length;
  const avgGrowth30d = connections.reduce((s, c) => s + c.growth_pct_30d, 0) / connections.length;
  const momentumScore = Math.min(500, Math.max(0, avgGrowth30d * 50));
  const velocityScore = Math.min(300, Math.max(0, avgGrowth7d * 80));
  const baseGrowth = logScale(totalFollowers, 1_000_000, 200);
  const growthScore = clamp(momentumScore + velocityScore + baseGrowth);

  // ── Revenue Score ─────────────────────────────────────────────────────────
  const revenueBase = logScale(total_revenue_usd, 1_000_000, 400);
  const txScore = Math.min(300, transactions_90d * 30);
  const aovScore = Math.min(300, logScale(avg_order_value_usd, 10_000, 300));
  const revenueScore = clamp(revenueBase + txScore + aovScore);

  // ── Engagement Score ─────────────────────────────────────────────────────
  // >3% is excellent for most platforms
  const engagementScore = clamp(Math.min(1000, (avgEngRate / 3) * 600 + connections.length * 50));

  // ── Audience Quality ──────────────────────────────────────────────────────
  // Engagement relative to followers (bots have 0 engagement)
  const authFollowerProxy = Math.min(400, avgEngRate > 0.5 ? 400 : avgEngRate * 800);
  const audienceSize = logScale(totalFollowers, 5_000_000, 400);
  const channelDiversity = Math.min(200, connections.length * 40);
  const audienceQuality = clamp(authFollowerProxy + audienceSize + channelDiversity);

  // ── Content Score ─────────────────────────────────────────────────────────
  const avgViews = connections.reduce((s, c) => s + c.avg_views, 0) / connections.length;
  const avgShares = connections.reduce((s, c) => s + c.avg_shares, 0) / connections.length;
  const viewsScore = logScale(avgViews, 1_000_000, 400);
  const shareScore = Math.min(300, avgShares * 10);
  const contentDiversity = Math.min(300, connections.length * 60);
  const contentScore = clamp(viewsScore + shareScore + contentDiversity);

  // ── Consistency Score ─────────────────────────────────────────────────────
  const avgPostsPerPlatform = connections.reduce((s, c) => s + c.posts_count, 0) / connections.length;
  const consistencyScore = clamp(
    Math.min(500, logScale(avgPostsPerPlatform, 1000, 500)) +
    Math.min(300, consistencyDays * 300) +
    Math.min(200, connections.length * 40)
  );

  // ── Virality Score ───────────────────────────────────────────────────────
  const avgViewsToFollowersRatio = connections.reduce((s, c) =>
    s + (c.followers > 0 ? c.avg_views / c.followers : 0), 0) / connections.length;
  const viralityScore = clamp(Math.min(1000, avgViewsToFollowersRatio * 500));

  // ── Moguls Score (weighted composite) ───────────────────────────────────
  const mogulsScore = clamp(
    influenceScore * 0.20 +
    authorityScore * 0.15 +
    growthScore    * 0.20 +
    revenueScore   * 0.15 +
    engagementScore * 0.10 +
    audienceQuality * 0.10 +
    contentScore   * 0.05 +
    consistencyScore * 0.03 +
    viralityScore  * 0.02
  );

  // ── Platform breakdown ───────────────────────────────────────────────────
  const breakdown: MogulsScoreOutput["breakdown"] = {};
  for (const c of connections) {
    const weight = PLATFORM_WEIGHTS[c.platform] ?? 1.0;
    const platformHealth = Math.min(100, Math.round(
      (c.engagement_rate > 0 ? Math.min(40, c.engagement_rate * 10) : 0) +
      (c.growth_pct_30d > 0 ? Math.min(30, c.growth_pct_30d * 3) : 0) +
      (c.posts_count > 0 ? Math.min(20, Math.log10(c.posts_count + 1) * 8) : 0) +
      10
    ));
    breakdown[c.platform] = {
      followers: c.followers,
      engagement_rate: c.engagement_rate,
      health: platformHealth,
      contribution_pct: totalFollowers > 0 ? Math.round((c.followers / totalFollowers) * 100) : 0,
    };
    // Apply platform weight to boost high-authority platforms
    breakdown[c.platform].health = Math.min(100, Math.round(platformHealth * weight));
  }

  const avgGrowth7dAll = connections.reduce((s, c) => s + c.growth_pct_7d, 0) / connections.length;
  const avgGrowth30dAll = connections.reduce((s, c) => s + c.growth_pct_30d, 0) / connections.length;

  return {
    moguls_score: mogulsScore,
    influence_score: influenceScore,
    authority_score: authorityScore,
    growth_score: growthScore,
    revenue_score: revenueScore,
    engagement_score: engagementScore,
    audience_quality: audienceQuality,
    content_score: contentScore,
    consistency_score: consistencyScore,
    virality_score: viralityScore,
    total_followers: totalFollowers,
    total_reach: totalReach,
    avg_engagement_rate: avgEngRate,
    top_platform: topConn?.platform ?? null,
    growth_pct_7d: avgGrowth7dAll,
    growth_pct_30d: avgGrowth30dAll,
    breakdown,
  };
}
