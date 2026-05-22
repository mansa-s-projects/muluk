import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error(`Missing Supabase credentials: url=${!!url}, key=${!!key}`);
  }
  
  return createServiceClient(url, key);
}

function safeCode(seed: string, userId: string): string {
  const base = seed.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 18);
  const suffix = userId.replace(/-/g, "").slice(0, 6);
  if (base.length >= 3) return `${base}-${suffix}`;
  return `creator-${suffix}`;
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

    // Ensure creator code exists.
    let referralCode = "";
    const { data: existingCode } = await db
      .from("creator_referral_codes")
      .select("referral_code")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (existingCode?.referral_code) {
      referralCode = existingCode.referral_code;
    } else {
      const { data: creatorProfile } = await db
        .from("creator_applications")
        .select("handle, referral_handle")
        .eq("user_id", user.id)
        .maybeSingle();

      const candidate = safeCode(
        creatorProfile?.referral_handle || creatorProfile?.handle || "creator",
        user.id
      );

      const { data: inserted } = await db
        .from("creator_referral_codes")
        .upsert(
          {
            creator_id: user.id,
            referral_code: candidate,
          },
          { onConflict: "creator_id" }
        )
        .select("referral_code")
        .single();

      referralCode = inserted?.referral_code ?? candidate;
    }

    const { data: referrals, error: referralError } = await db
      .from("referrals")
      .select(
        "id, referred_id, status, created_at, total_revenue_generated, signup_at, first_purchase_at, source"
      )
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralError) {
      return NextResponse.json({ error: referralError.message }, { status: 500 });
    }

    const rows = referrals ?? [];
    const referralIds = rows.map((r) => r.id);
    const referredIds = rows
      .map((r) => r.referred_id)
      .filter((id): id is string => Boolean(id));

    const [eventsResult, referredProfilesResult] = await Promise.all([
      referralIds.length > 0
        ? db
            .from("referral_events")
            .select("referral_id, event_type, created_at")
            .in("referral_id", referralIds)
        : Promise.resolve({ data: [], error: null }),
      referredIds.length > 0
        ? db
            .from("creator_applications")
            .select("user_id, name, handle, email")
            .in("user_id", referredIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const eventRows = eventsResult.data ?? [];
    const profileRows = referredProfilesResult.data ?? [];

    const lastActivityMap = new Map<string, string>();
    for (const ev of eventRows) {
      const prev = lastActivityMap.get(ev.referral_id);
      if (!prev || new Date(ev.created_at).getTime() > new Date(prev).getTime()) {
        lastActivityMap.set(ev.referral_id, ev.created_at);
      }
    }

    const profileMap = new Map<string, { name: string | null; handle: string | null; email: string | null }>();
    for (const p of profileRows) {
      profileMap.set(p.user_id, {
        name: p.name ?? null,
        handle: p.handle ?? null,
        email: p.email ?? null,
      });
    }

    const clicks = eventRows.filter((e) => e.event_type === "link_click").length;
    const signups = rows.filter((r) => r.status === "signed_up" || r.status === "converted").length;
    const conversions = rows.filter((r) => r.status === "converted").length;
    const revenue = rows.reduce((sum, r) => sum + (r.total_revenue_generated ?? 0), 0);

    const tableRows = rows.map((r) => {
      const referred = r.referred_id ? profileMap.get(r.referred_id) : null;
      return {
        id: r.id,
        referred_id: r.referred_id,
        referral_code: referralCode,
        source: r.source ?? null,
        status: r.status,
        signup_at: r.signup_at ?? null,
        first_purchase_at: r.first_purchase_at ?? null,
        total_revenue_generated: r.total_revenue_generated ?? 0,
        created_at: r.created_at,
        last_activity_at: lastActivityMap.get(r.id) ?? r.created_at,
        referred_user: {
          name: referred?.name ?? "Pending user",
          handle: referred?.handle ?? null,
          email: referred?.email ?? null,
        },
      };
    });

    const leaderboard = [...tableRows]
      .sort((a, b) => b.total_revenue_generated - a.total_revenue_generated)
      .slice(0, 10);

    return NextResponse.json({
      referral_code: referralCode,
      referral_link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/join/${referralCode}`,
      kpis: {
        total_referrals: rows.length,
        total_conversions: conversions,
        conversion_rate: signups > 0 ? Number(((conversions / signups) * 100).toFixed(2)) : 0,
        revenue_generated: revenue,
      },
      funnel: {
        clicks,
        signups,
        conversions,
      },
      referrals: tableRows,
      leaderboard,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Referral stats error:", errorMsg);
    
    // More specific error responses
    if (errorMsg.includes("API key")) {
      return NextResponse.json({ error: "API key misconfigured. Contact support." }, { status: 500 });
    }
    if (errorMsg.includes("Missing Supabase")) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    return NextResponse.json({ error: "Failed to fetch referral stats" }, { status: 500 });
  }
}
