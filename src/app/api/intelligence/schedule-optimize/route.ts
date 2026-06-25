// POST /api/intelligence/schedule-optimize
// Returns recommended posting windows based on historical engagement and views.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RankingRow = {
  platform: string;
  posted_at: string | null;
  engagement_rate: number | null;
  views: number | null;
};

type Slot = {
  dayOfWeek: number;
  hourUtc: number;
  score: number;
  samples: number;
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function scoreRow(row: RankingRow): number {
  const engagement = Number(row.engagement_rate ?? 0);
  const views = Number(row.views ?? 0);
  return engagement * 100 + Math.log10(Math.max(1, views)) * 10;
}

function dayName(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? "N/A";
}

export async function POST(req: NextRequest) {
  const allowDevBypass =
    process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !allowDevBypass) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform ?? "all").trim().toLowerCase();
  const lookbackDays = Math.max(30, Math.min(180, Number(body.lookbackDays ?? 90)));

  if (!user && allowDevBypass) {
    return NextResponse.json({
      recommendedSlots: [],
      notes: "No authenticated creator context.",
      method: "schedule-optimizer-v1",
      bypassUsed: true,
    });
  }

  const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString();

  let query = supabase
    .from("content_rankings")
    .select("platform, posted_at, engagement_rate, views")
    .eq("creator_id", user!.id)
    .not("posted_at", "is", null)
    .gte("posted_at", cutoff)
    .order("posted_at", { ascending: false })
    .limit(400);

  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as RankingRow[];
  if (rows.length < 12) {
    return NextResponse.json({
      recommendedSlots: [],
      notes: "Not enough historical content points for high-confidence scheduling. Need at least 12 posts in lookback window.",
      method: "schedule-optimizer-v1",
      bypassUsed: false,
    });
  }

  const slotScores = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.posted_at) continue;
    const date = new Date(row.posted_at);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const key = `${day}-${hour}`;
    if (!slotScores.has(key)) slotScores.set(key, []);
    slotScores.get(key)!.push(scoreRow(row));
  }

  const slots: Slot[] = Array.from(slotScores.entries())
    .map(([key, values]) => {
      const [day, hour] = key.split("-").map(v => Number(v));
      return {
        dayOfWeek: day,
        hourUtc: hour,
        score: avg(values),
        samples: values.length,
      };
    })
    .filter(s => s.samples >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const recommendedSlots = slots.map(s => ({
    dayOfWeek: s.dayOfWeek,
    dayLabel: dayName(s.dayOfWeek),
    hourUtc: s.hourUtc,
    slotLabelUtc: `${dayName(s.dayOfWeek)} ${String(s.hourUtc).padStart(2, "0")}:00 UTC`,
    confidence: s.samples >= 6 ? "high" : s.samples >= 3 ? "medium" : "low",
    evidenceSamples: s.samples,
  }));

  const notes =
    platform === "all"
      ? "Recommendations blend all connected platform content performance."
      : `Recommendations are based on ${platform} performance only.`;

  return NextResponse.json({
    recommendedSlots,
    notes,
    method: "schedule-optimizer-v1",
    lookbackDays,
    bypassUsed: false,
  });
}
