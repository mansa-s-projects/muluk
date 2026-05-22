import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getServiceClient();

    const { data: rows, error } = await db
      .from("referrals")
      .select("id, referred_id, status, total_revenue_generated, signup_at, created_at")
      .eq("referrer_id", user.id)
      .order("total_revenue_generated", { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const referredIds = (rows ?? [])
      .map((r) => r.referred_id)
      .filter((id): id is string => Boolean(id));

    const { data: profiles } = referredIds.length
      ? await db
          .from("creator_applications")
          .select("user_id, name, handle")
          .in("user_id", referredIds)
      : { data: [] as Array<{ user_id: string; name: string | null; handle: string | null }> };

    const profileMap = new Map<string, { name: string | null; handle: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, {
        name: p.name ?? null,
        handle: p.handle ?? null,
      });
    }

    const leaderboard = (rows ?? []).map((r, index) => {
      const referred = r.referred_id ? profileMap.get(r.referred_id) : null;
      return {
        rank: index + 1,
        referral_id: r.id,
        referred_id: r.referred_id,
        name: referred?.name ?? "Pending user",
        handle: referred?.handle ?? null,
        status: r.status,
        revenue_generated: r.total_revenue_generated ?? 0,
        signup_at: r.signup_at,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ leaderboard, fetched_at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
