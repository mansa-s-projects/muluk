// GET /api/intelligence/scores
// Returns Moguls scores, 90-day growth history, connections, and demographics.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  const [scoresRes, legacyRes, historyRes, connectionsRes, demographicsRes] = await Promise.all([
    supabase.from("moguls_scores").select("*").eq("creator_id", user.id).maybeSingle(),
    supabase.from("creator_intelligence").select("*").eq("creator_id", user.id).maybeSingle(),
    supabase.from("growth_snapshots")
      .select("platform, snapshot_date, followers, views, engagement, reach")
      .eq("creator_id", user.id)
      .gte("snapshot_date", cutoff)
      .order("snapshot_date", { ascending: true }),
    supabase.from("social_connections")
      .select("platform, platform_username, follower_count, metrics, last_synced_at, profile_url, avatar_url, health_score, audience_quality_score, growth_pct_7d, growth_pct_30d, verified")
      .eq("creator_id", user.id),
    supabase.from("audience_demographics")
      .select("platform, age_18_24_pct, age_25_34_pct, age_35_44_pct, gender_male_pct, gender_female_pct, top_countries, peak_hours")
      .eq("creator_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(10),
  ]);

  // Fall back to legacy creator_intelligence if moguls_scores not yet populated
  const scores = scoresRes.data ?? (legacyRes.data ? {
    moguls_score: legacyRes.data.health_score * 10,
    influence_score: legacyRes.data.health_score * 10,
    authority_score: legacyRes.data.engagement_score * 10,
    growth_score: legacyRes.data.growth_score * 10,
    revenue_score: legacyRes.data.monetization_score * 10,
    engagement_score: legacyRes.data.engagement_score * 10,
    audience_quality: legacyRes.data.audience_quality_score * 10,
    content_score: legacyRes.data.virality_score * 10,
    virality_score: legacyRes.data.virality_score * 10,
    consistency_score: 0,
    total_followers: legacyRes.data.total_followers,
    total_reach: legacyRes.data.total_reach,
    avg_engagement_rate: 0,
    top_platform: legacyRes.data.top_platform,
    growth_pct_7d: legacyRes.data.weekly_growth_pct,
    growth_pct_30d: legacyRes.data.monthly_growth_pct,
    growth_pct_90d: 0,
    total_revenue_usd: 0,
    ai_insights: legacyRes.data.ai_insights ?? [],
    ai_recommendations: legacyRes.data.ai_recommendations ?? [],
    predicted_revenue_30d: 0,
    last_scored_at: legacyRes.data.last_analyzed_at,
  } : null);

  // Fall back to social_metrics_history if no growth_snapshots
  let history = historyRes.data ?? [];
  if (history.length === 0) {
    const { data: metricsHistory } = await supabase
      .from("social_metrics_history")
      .select("platform, snapshot_date, followers, avg_views, engagement_rate, reach")
      .eq("creator_id", user.id)
      .gte("snapshot_date", cutoff)
      .order("snapshot_date", { ascending: true });

    history = (metricsHistory ?? []).map(m => ({
      platform: m.platform,
      snapshot_date: m.snapshot_date,
      followers: m.followers,
      views: m.avg_views,
      engagement: m.engagement_rate,
      reach: m.reach,
    }));
  }

  return NextResponse.json({
    scores,
    history,
    connections: connectionsRes.data ?? [],
    demographics: demographicsRes.data ?? [],
  });
}
