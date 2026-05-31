// POST /api/marketing/track
// Track a lead signal and update their score.
// Called client-side on key behavioral events.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { scoreLead } from "@/lib/marketing/lead-score";
import type { LeadSignal } from "@/lib/marketing/lead-score";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; signal: LeadSignal; metadata?: Record<string, unknown> };
    if (!body.signal) return NextResponse.json({ ok: false }, { status: 400 });

    const db = createServiceClient();

    // Log the marketing event regardless
    await db.from("marketing_events").insert({
      event_type: body.signal,
      email: body.email ?? null,
      metadata: body.metadata ?? {},
    });

    if (!body.email) return NextResponse.json({ ok: true });

    // Load existing signals and add the new one
    const { data: existing } = await db
      .from("lead_scores")
      .select("score, signals")
      .eq("email", body.email)
      .maybeSingle();

    const signals: LeadSignal[] = [...((existing?.signals as LeadSignal[]) ?? []), body.signal];
    const { score, tier } = scoreLead(signals);

    await db.from("lead_scores").upsert({
      email: body.email,
      score,
      tier,
      signals,
      last_activity: new Date().toISOString(),
    }, { onConflict: "email" });

    return NextResponse.json({ ok: true, score, tier });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
