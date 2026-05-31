// GET /api/affiliates/match
// Returns AI-matched affiliate programs ranked by creator fit + revenue potential.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rankPrograms } from "@/lib/intelligence/affiliate-match";
import type { AffiliateProgram, CreatorProfile } from "@/lib/intelligence/affiliate-match";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profileRes, scoresRes, programsRes] = await Promise.all([
    supabase.from("creator_applications").select("category").eq("user_id", user.id).maybeSingle(),
    supabase.from("moguls_scores").select("total_followers, avg_engagement_rate, top_platform, moguls_score").eq("creator_id", user.id).maybeSingle()
      .then(r => r.data ? r : supabase.from("creator_intelligence").select("total_followers, avg_engagement_rate:engagement_score, top_platform, moguls_score:health_score").eq("creator_id", user.id).maybeSingle()),
    supabase.from("brand_affiliates")
      .select("id, brand_name, niches, commission_rate, commission_type, avg_order_value_usd, cookie_duration_days, payout_threshold_usd, tier, network, epc_usd, avg_conversion_rate, trending_score, demand_level, tags, min_followers, monthly_revenue_potential_usd, requires_approval")
      .eq("is_active", true)
      .order("trending_score", { ascending: false })
      .limit(100),
  ]);

  const creator: CreatorProfile = {
    niche: profileRes.data?.category ?? null,
    total_followers: scoresRes.data?.total_followers ?? 0,
    avg_engagement_rate: scoresRes.data?.avg_engagement_rate ?? 0,
    top_platform: scoresRes.data?.top_platform ?? null,
    moguls_score: scoresRes.data?.moguls_score ?? 0,
    monthly_revenue_usd: 0,
  };

  const programs = (programsRes.data ?? []) as AffiliateProgram[];
  const ranked = rankPrograms(creator, programs);

  // Map back to full program data with match scores
  const programMap = new Map(programs.map(p => [p.id, p]));
  const result = ranked.map(r => ({
    ...programMap.get(r.affiliate_id),
    match_score: r.match_score,
    estimated_monthly_revenue_usd: r.estimated_monthly_revenue_usd,
    match_reasons: r.match_reasons,
    revenue_range: r.revenue_range,
    confidence: r.confidence,
  }));

  return NextResponse.json({
    programs: result,
    creator_profile: creator,
    total: result.length,
  });
}
