// GET /api/marketing/viral-stats
// Returns platform-wide viral metrics for the founder dashboard.
// Requires admin auth.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const day30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    waitlistTotal,
    waitlistWeek,
    creatorTotal,
    hotLeads,
    referralStats,
    emailStats,
    contentQueue,
  ] = await Promise.all([
    db.from("waitlist").select("id", { count: "exact", head: true }),
    db.from("waitlist").select("id", { count: "exact", head: true }).gte("created_at", day7),
    db.from("creator_applications").select("id", { count: "exact", head: true }),
    db.from("lead_scores").select("id", { count: "exact", head: true }).in("tier", ["hot", "vip"]),
    db.from("referrals").select("id, clicks, conversions").limit(1000),
    db.from("email_sequence_enrollments").select("id, completed, unsubscribed", { count: "exact" }),
    db.from("marketing_content_queue").select("id, platform, status").eq("status", "pending"),
  ]);

  const refs = referralStats.data ?? [];
  const totalClicks = refs.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalConversions = refs.reduce((s, r) => s + (r.conversions ?? 0), 0);
  const viralCoeff = totalClicks > 0 ? (totalConversions / totalClicks).toFixed(3) : "0";

  const enrollments = emailStats.data ?? [];
  const completedSeqs = enrollments.filter(e => e.completed).length;
  const unsubRate = enrollments.length > 0
    ? ((enrollments.filter(e => e.unsubscribed).length / enrollments.length) * 100).toFixed(1)
    : "0";

  return NextResponse.json({
    waitlist: {
      total: waitlistTotal.count ?? 0,
      this_week: waitlistWeek.count ?? 0,
    },
    creators: { total: creatorTotal.count ?? 0 },
    leads: { hot_and_vip: hotLeads.count ?? 0 },
    viral: {
      total_referral_clicks: totalClicks,
      total_conversions: totalConversions,
      viral_coefficient: viralCoeff,
    },
    email: {
      total_enrolled: enrollments.length,
      sequences_completed: completedSeqs,
      unsub_rate_pct: unsubRate,
    },
    content_queue: {
      pending: contentQueue.data?.length ?? 0,
      by_platform: (contentQueue.data ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.platform] = (acc[c.platform] ?? 0) + 1;
        return acc;
      }, {}),
    },
    generated_at: now.toISOString(),
    window_30d_start: day30,
  });
}
