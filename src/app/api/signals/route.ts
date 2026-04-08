// src/app/api/signals/route.ts
// GET  /api/signals          — fetch active signals for the authenticated creator's niches
// POST /api/signals          — upsert creator_signal_preferences

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_NICHES = [
  "luxury", "fitness", "music", "art", "fashion", "gaming",
  "education", "tech", "food", "travel", "finance", "health",
  "beauty", "sports", "crypto", "business",
];

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const nicheParam = searchParams.get("niche");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const source = searchParams.get("source"); // optional filter

    // Resolve niches: explicit param > creator preferences > creator_applications niche
    let niches: string[] = [];

    if (nicheParam && VALID_NICHES.includes(nicheParam)) {
      niches = [nicheParam];
    } else {
      // Load saved preferences
      const { data: prefs } = await supabase
        .from("creator_signal_preferences")
        .select("niches")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prefs?.niches?.length) {
        niches = prefs.niches;
      } else {
        // Fall back to the niche stored in creator_applications
        const { data: app } = await supabase
          .from("creator_applications")
          .select("category")
          .eq("user_id", user.id)
          .maybeSingle();
        if (app?.category) niches = [app.category];
      }
    }

    type SignalRow = {
      id: string; niche: string; source: string; topic: string; title: string;
      summary: string | null; score: number; demand_level: string; velocity: number;
      suggested_product: string | null; suggested_price: number | null;
      offer_type: string | null; action_suggestion: string | null;
      keywords: string[]; source_url: string | null;
      expires_at: string | null; created_at: string;
    };

    // Build query
    let query = supabase
      .from("signals")
      .select(
        "id, niche, source, topic, title, summary, score, demand_level, velocity, " +
        "suggested_product, suggested_price, offer_type, action_suggestion, keywords, " +
        "source_url, expires_at, created_at"
      )
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("score", { ascending: false })
      .limit(limit);

    if (niches.length > 0) {
      query = query.in("niche", niches);
    }
    if (source) {
      query = query.eq("source", source);
    }

    const { data: rawSignals, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const signals = rawSignals as unknown as SignalRow[] | null;

    // Load creator's engagement for these signals
    const signalIds = (signals ?? []).map((s) => s.id);
    let engagementMap: Record<string, string[]> = {};

    if (signalIds.length > 0) {
      const { data: engagement } = await supabase
        .from("signal_engagement")
        .select("signal_id, action")
        .eq("user_id", user.id)
        .in("signal_id", signalIds);

      if (engagement) {
        for (const e of engagement) {
          if (!engagementMap[e.signal_id]) engagementMap[e.signal_id] = [];
          engagementMap[e.signal_id].push(e.action);
        }
      }
    }

    const enriched = (signals ?? []).map((s) => ({
      ...s,
      userActions: engagementMap[s.id] ?? [],
    }));

    return NextResponse.json({
      signals: enriched,
      niches,
      total: enriched.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { niches?: string[]; muted_topics?: string[]; notify_on_viral?: boolean };

    const niches = (body.niches ?? []).filter(n => VALID_NICHES.includes(n));

    const { error } = await supabase
      .from("creator_signal_preferences")
      .upsert({
        user_id: user.id,
        niches,
        muted_topics: body.muted_topics ?? [],
        notify_on_viral: body.notify_on_viral ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
