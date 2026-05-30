import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Referrals for this creator
  const { data: referrals } = await serviceClient
    .from("referrals")
    .select("id, referred_email, status, reward_amount, created_at, activated_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = referrals ?? [];
  const totalReferred = rows.length;
  const activeCount = rows.filter(r => r.status === "active" || r.status === "rewarded").length;
  const lifetimeEarnings = rows.reduce((sum, r) => sum + Number(r.reward_amount ?? 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEarnings = rows
    .filter(r => String(r.created_at ?? "") >= monthStart)
    .reduce((sum, r) => sum + Number(r.reward_amount ?? 0), 0);

  // Click count in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: creatorApp } = await serviceClient
    .from("creator_applications")
    .select("referral_slug, handle")
    .eq("user_id", user.id)
    .maybeSingle();

  const activeSlug = creatorApp?.referral_slug ?? creatorApp?.handle ?? "";

  const { count: clickCount } = await serviceClient
    .from("referral_clicks")
    .select("id", { count: "exact", head: true })
    .eq("referral_slug", activeSlug)
    .gte("created_at", thirtyDaysAgo);

  // Leaderboard rank: count creators with more active referrals than this creator
  const { count: aboveCount } = await serviceClient
    .from("referrals")
    .select("referrer_id", { count: "exact", head: true })
    .in("status", ["active", "rewarded"])
    .neq("referrer_id", user.id)
    .filter("referrer_id", "not.is", null);

  // Simple rank approximation (group by referrer, count actives > our count)
  // Full leaderboard requires a separate query; we approximate here
  const leaderboardPosition = activeCount === 0 ? 99 : Math.max(1, Math.ceil((aboveCount ?? 0) / Math.max(activeCount, 1)));
  const { count: totalReferrers } = await serviceClient
    .from("referrals")
    .select("referrer_id", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    referrals: rows.map(r => ({
      id: r.id as string,
      referred_email: r.referred_email as string,
      status: r.status as string,
      reward_amount: Number(r.reward_amount ?? 0),
      created_at: r.created_at as string,
      activated_at: (r.activated_at as string) ?? null,
    })),
    stats: {
      totalReferred,
      activeCount,
      lifetimeEarnings,
      monthEarnings,
      clickCount30d: clickCount ?? 0,
      leaderboardPosition,
      leaderboardTotal: Math.max(totalReferrers ?? 0, 1),
    },
  });
}
