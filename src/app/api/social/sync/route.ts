// POST /api/social/sync
// Syncs all connected social accounts for the authenticated creator.
// Fetches live follower counts, engagement metrics, saves daily snapshots,
// and recomputes the full Moguls Score.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/app/api/auth/_utils";
import { computeMogulsScore } from "@/lib/intelligence/moguls-score";

type PlatformRow = {
  id: string;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  access_token_encrypted: string | null;
  follower_count: number | null;
};

type MetricsResult = {
  followers: number;
  following: number;
  posts_count: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
  reach: number;
  impressions: number;
  raw_json: Record<string, unknown>;
};

// ── Platform sync functions ──────────────────────────────────────────────────

async function syncInstagram(token: string): Promise<MetricsResult | null> {
  try {
    const fields = "followers_count,follows_count,media_count,name,username,biography";
    const res = await fetch(
      `https://graph.instagram.com/me?fields=${fields}&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    // Fetch recent media for engagement
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=like_count,comments_count,impressions,reach&limit=12&access_token=${token}`
    );
    let avgLikes = 0, avgComments = 0, avgReach = 0, avgImpressions = 0;
    if (mediaRes.ok) {
      const mediaData = (await mediaRes.json()) as { data?: Array<Record<string, number>> };
      const posts = mediaData.data ?? [];
      if (posts.length > 0) {
        avgLikes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0) / posts.length;
        avgComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0) / posts.length;
        avgReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0) / posts.length;
        avgImpressions = posts.reduce((s, p) => s + (p.impressions ?? 0), 0) / posts.length;
      }
    }

    const followers = Number(data.followers_count ?? 0);
    const engRate = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;

    return {
      followers,
      following: Number(data.follows_count ?? 0),
      posts_count: Number(data.media_count ?? 0),
      avg_views: 0,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      engagement_rate: engRate,
      reach: Math.round(avgReach),
      impressions: Math.round(avgImpressions),
      raw_json: data,
    };
  } catch { return null; }
}

async function syncYouTube(token: string): Promise<MetricsResult | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: Array<{ statistics: Record<string, string> }> };
    const stats = data.items?.[0]?.statistics ?? {};

    const subs = Number(stats.subscriberCount ?? 0);
    const views = Number(stats.viewCount ?? 0);
    const videos = Number(stats.videoCount ?? 1);
    const avgViews = videos > 0 ? views / videos : 0;

    return {
      followers: subs,
      following: 0,
      posts_count: videos,
      avg_views: avgViews,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      reach: 0,
      impressions: 0,
      raw_json: stats,
    };
  } catch { return null; }
}

async function syncTwitter(token: string, userId: string): Promise<MetricsResult | null> {
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { public_metrics?: Record<string, number> } };
    const metrics = data.data?.public_metrics ?? {};

    const followers = metrics.followers_count ?? 0;
    const tweets = metrics.tweet_count ?? 0;

    return {
      followers,
      following: metrics.following_count ?? 0,
      posts_count: tweets,
      avg_views: metrics.impression_count ?? 0,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      reach: 0,
      impressions: 0,
      raw_json: metrics,
    };
  } catch { return null; }
}

async function syncTikTok(token: string): Promise<MetricsResult | null> {
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { user?: Record<string, number> } };
    const user = data.data?.user ?? {};

    return {
      followers: user.follower_count ?? 0,
      following: user.following_count ?? 0,
      posts_count: user.video_count ?? 0,
      avg_views: 0,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      reach: 0,
      impressions: 0,
      raw_json: user,
    };
  } catch { return null; }
}

// ── Score computation ────────────────────────────────────────────────────────

function computeScores(connections: Array<{ metrics: MetricsResult; platform: string }>) {
  if (connections.length === 0) return null;

  const totalFollowers = connections.reduce((s, c) => s + c.metrics.followers, 0);
  const avgEngagement = connections.reduce((s, c) => s + c.metrics.engagement_rate, 0) / connections.length;
  const topPlatform = connections.sort((a, b) => b.metrics.followers - a.metrics.followers)[0]?.platform ?? null;

  // Health score: based on account diversity + follower count
  const platformCount = connections.length;
  const healthScore = Math.min(100, Math.round(
    (platformCount / 5) * 30 +
    Math.min(50, Math.log10(totalFollowers + 1) * 10) +
    Math.min(20, avgEngagement * 5)
  ));

  // Engagement score: 3% is great for most platforms
  const engagementScore = Math.min(100, Math.round((avgEngagement / 3) * 100));

  // Growth score: placeholder based on follower count tiers
  const growthScore = Math.min(100, Math.round(Math.log10(totalFollowers + 1) * 20));

  // Audience quality: engagement relative to reach
  const audienceQuality = Math.min(100, Math.round(engagementScore * 0.8 + platformCount * 4));

  // Virality: avg views vs followers
  const avgViews = connections.reduce((s, c) => s + c.metrics.avg_views, 0) / connections.length;
  const viralityScore = Math.min(100, totalFollowers > 0 ? Math.round((avgViews / totalFollowers) * 100) : 0);

  const monetizationScore = Math.min(100, Math.round(
    Math.min(40, Math.log10(totalFollowers + 1) * 8) +
    Math.min(40, avgEngagement * 10) +
    Math.min(20, platformCount * 4)
  ));

  const platformBreakdown: Record<string, unknown> = {};
  for (const c of connections) {
    platformBreakdown[c.platform] = {
      followers: c.metrics.followers,
      engagement_rate: c.metrics.engagement_rate,
      posts_count: c.metrics.posts_count,
    };
  }

  return {
    health_score: healthScore,
    growth_score: growthScore,
    engagement_score: engagementScore,
    monetization_score: monetizationScore,
    audience_quality_score: audienceQuality,
    virality_score: viralityScore,
    total_followers: totalFollowers,
    top_platform: topPlatform,
    platform_breakdown: platformBreakdown,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  // Load all connected accounts
  const { data: connections } = await db
    .from("social_connections")
    .select("id, platform, platform_user_id, platform_username, access_token_encrypted, follower_count")
    .eq("creator_id", user.id) as { data: PlatformRow[] | null };

  if (!connections?.length) {
    return NextResponse.json({ synced: 0, message: "No connected accounts" });
  }

  const synced: string[] = [];
  const failed: string[] = [];
  const metricsResults: Array<{ metrics: MetricsResult; platform: string }> = [];

  for (const conn of connections) {
    if (!conn.access_token_encrypted) { failed.push(conn.platform); continue; }

    let token: string;
    try {
      token = decryptToken(conn.access_token_encrypted);
    } catch { failed.push(conn.platform); continue; }

    let metrics: MetricsResult | null = null;

    if (conn.platform === "instagram") metrics = await syncInstagram(token);
    else if (conn.platform === "youtube") metrics = await syncYouTube(token);
    else if (conn.platform === "twitter") metrics = await syncTwitter(token, conn.platform_user_id ?? "");
    else if (conn.platform === "tiktok") metrics = await syncTikTok(token);
    // Telegram uses a different model (bot-based) — skip live sync for now

    if (!metrics) { failed.push(conn.platform); continue; }

    metricsResults.push({ metrics, platform: conn.platform });

    // Update social_connections with latest follower count + metrics
    await db
      .from("social_connections")
      .update({
        follower_count: metrics.followers,
        metrics: {
          followers: metrics.followers,
          following: metrics.following,
          posts_count: metrics.posts_count,
          avg_views: metrics.avg_views,
          avg_likes: metrics.avg_likes,
          avg_comments: metrics.avg_comments,
          engagementRate: metrics.engagement_rate,
          reach: metrics.reach,
          impressions: metrics.impressions,
        },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    // Upsert daily snapshot
    await db
      .from("social_metrics_history")
      .upsert({
        creator_id: user.id,
        platform: conn.platform,
        snapshot_date: new Date().toISOString().split("T")[0],
        followers: metrics.followers,
        following: metrics.following,
        posts_count: metrics.posts_count,
        avg_views: metrics.avg_views,
        avg_likes: metrics.avg_likes,
        avg_comments: metrics.avg_comments,
        engagement_rate: metrics.engagement_rate,
        reach: metrics.reach,
        impressions: metrics.impressions,
        raw_json: metrics.raw_json,
      }, { onConflict: "creator_id,platform,snapshot_date" });

    synced.push(conn.platform);
  }

  // Recompute legacy intelligence scores
  const scores = computeScores(metricsResults);
  if (scores) {
    await db.from("creator_intelligence").upsert({
      creator_id: user.id, ...scores,
      last_analyzed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "creator_id" });
  }

  // Compute full Moguls Score
  const mogulsInput = {
    connections: metricsResults.map(r => ({
      platform: r.platform,
      followers: r.metrics.followers,
      following: r.metrics.following,
      posts_count: r.metrics.posts_count,
      avg_views: r.metrics.avg_views,
      avg_likes: r.metrics.avg_likes,
      avg_comments: r.metrics.avg_comments,
      avg_shares: 0,
      engagement_rate: r.metrics.engagement_rate,
      growth_pct_7d: 0,
      growth_pct_30d: 0,
      reach: r.metrics.reach,
      impressions: r.metrics.impressions,
    })),
    total_revenue_usd: 0,
    transactions_90d: 0,
    avg_order_value_usd: 0,
    days_active: 90,
  };
  const moguls = computeMogulsScore(mogulsInput);
  await db.from("moguls_scores").upsert({
    creator_id: user.id,
    ...moguls,
    platforms_connected: metricsResults.length,
    last_scored_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "creator_id" });

  // Write growth snapshots for chart rendering
  const today = new Date().toISOString().split("T")[0];
  const snapshots = metricsResults.map(r => ({
    creator_id: user.id,
    platform: r.platform,
    snapshot_date: today,
    followers: r.metrics.followers,
    views: Math.round(r.metrics.avg_views),
    engagement: r.metrics.engagement_rate,
    reach: r.metrics.reach,
  }));
  if (snapshots.length > 0) {
    await db.from("growth_snapshots").upsert(snapshots, { onConflict: "creator_id,platform,snapshot_date" });
  }

  return NextResponse.json({ synced: synced.length, platforms: synced, failed, moguls_score: moguls.moguls_score });
}
