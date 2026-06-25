// GET /api/intelligence/trends
// Returns short-horizon trend predictions from historical snapshots and content performance.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  platform: string;
  snapshot_date: string;
  followers: number | null;
  engagement: number | null;
  views: number | null;
};

type RankingRow = {
  platform: string;
  posted_at: string | null;
  views: number | null;
  engagement_rate: number | null;
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function growthPct(first: number, last: number): number {
  if (first <= 0) return last > 0 ? 100 : 0;
  return ((last - first) / first) * 100;
}

function confidenceFromPoints(points: number): "low" | "medium" | "high" {
  if (points >= 30) return "high";
  if (points >= 12) return "medium";
  return "low";
}

export async function GET() {
  const allowDevBypass =
    process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !allowDevBypass) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && allowDevBypass) {
    return NextResponse.json({
      predictions: [],
      recommendedPostingWindowsUtc: [],
      summary: "No authenticated creator context.",
      method: "heuristic-v1",
      bypassUsed: true,
    });
  }

  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  const [snapshotsRes, rankingsRes] = await Promise.all([
    supabase
      .from("growth_snapshots")
      .select("platform, snapshot_date, followers, engagement, views")
      .eq("creator_id", user!.id)
      .gte("snapshot_date", cutoff)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("content_rankings")
      .select("platform, posted_at, views, engagement_rate")
      .eq("creator_id", user!.id)
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(120),
  ]);

  if (snapshotsRes.error) {
    return NextResponse.json({ error: snapshotsRes.error.message }, { status: 500 });
  }
  if (rankingsRes.error) {
    return NextResponse.json({ error: rankingsRes.error.message }, { status: 500 });
  }

  const snapshots = (snapshotsRes.data ?? []) as SnapshotRow[];
  const rankings = (rankingsRes.data ?? []) as RankingRow[];

  const platformMap = new Map<string, SnapshotRow[]>();
  for (const row of snapshots) {
    if (!platformMap.has(row.platform)) platformMap.set(row.platform, []);
    platformMap.get(row.platform)!.push(row);
  }

  const predictions = Array.from(platformMap.entries())
    .map(([platform, rows]) => {
      const ordered = [...rows].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      const followers = ordered.map(r => Number(r.followers ?? 0));
      const engagements = ordered.map(r => Number(r.engagement ?? 0));
      const views = ordered.map(r => Number(r.views ?? 0));

      const firstFollowers = followers[0] ?? 0;
      const lastFollowers = followers[followers.length - 1] ?? 0;
      const followerGrowth90d = growthPct(firstFollowers, lastFollowers);

      const points = ordered.length;
      const engagementAvg = avg(engagements);
      const viewsAvg = avg(views);

      // 14-day projection via normalized daily trend from first->last over observed period.
      const daysObserved = Math.max(1, points - 1);
      const dailyDelta = (lastFollowers - firstFollowers) / daysObserved;
      const followers14dProjected = Math.max(0, Math.round(lastFollowers + dailyDelta * 14));

      // Opportunity score balances growth + engagement + volume signal.
      const opportunityScore =
        Math.max(0, Math.min(100, followerGrowth90d * 0.8 + engagementAvg * 2.4 + Math.log10(Math.max(1, viewsAvg)) * 12));

      return {
        platform,
        samplePoints: points,
        confidence: confidenceFromPoints(points),
        followerGrowth90dPct: Number(followerGrowth90d.toFixed(2)),
        avgEngagement: Number(engagementAvg.toFixed(3)),
        avgViews: Math.round(viewsAvg),
        projectedFollowers14d: followers14dProjected,
        opportunityScore: Number(opportunityScore.toFixed(1)),
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Posting window heuristic from top content timing by engagement rate.
  const hourStats = new Map<number, number[]>();
  for (const row of rankings) {
    if (!row.posted_at) continue;
    const hourUtc = new Date(row.posted_at).getUTCHours();
    const e = Number(row.engagement_rate ?? 0);
    if (!hourStats.has(hourUtc)) hourStats.set(hourUtc, []);
    hourStats.get(hourUtc)!.push(e);
  }

  const recommendedPostingWindowsUtc = Array.from(hourStats.entries())
    .map(([hourUtc, values]) => ({ hourUtc, avgEngagementRate: avg(values), samples: values.length }))
    .filter(item => item.samples >= 3)
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 3)
    .map(item => ({
      hourUtc: item.hourUtc,
      labelUtc: `${String(item.hourUtc).padStart(2, "0")}:00 UTC`,
      expectedEngagementRate: Number(item.avgEngagementRate.toFixed(3)),
      samples: item.samples,
    }));

  const top = predictions[0];
  const summary = top
    ? `Highest upside platform is ${top.platform} with ${top.followerGrowth90dPct}% growth over observed history and ${top.projectedFollowers14d} projected followers in 14 days.`
    : "Not enough historical data to compute trend predictions yet.";

  return NextResponse.json({
    predictions,
    recommendedPostingWindowsUtc,
    summary,
    method: "heuristic-v1",
    bypassUsed: false,
  });
}
