// POST /api/signals/engage
// Track a creator's interaction with a signal (view | click | launch | dismiss)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EngageBody = {
  signal_id: string;
  action: "view" | "click" | "launch" | "dismiss";
  metadata?: Record<string, unknown>;
};

const VALID_ACTIONS = ["view", "click", "launch", "dismiss"] as const;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<EngageBody>;

    if (!body.signal_id || typeof body.signal_id !== "string") {
      return NextResponse.json({ error: "signal_id required" }, { status: 400 });
    }
    if (!body.action || !VALID_ACTIONS.includes(body.action as typeof VALID_ACTIONS[number])) {
      return NextResponse.json({ error: "action must be one of: view, click, launch, dismiss" }, { status: 400 });
    }

    // Upsert — idempotent per user+signal+action
    const { error } = await supabase
      .from("signal_engagement")
      .upsert(
        {
          user_id:   user.id,
          signal_id: body.signal_id,
          action:    body.action,
          metadata:  body.metadata ?? {},
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,signal_id,action", ignoreDuplicates: true }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
