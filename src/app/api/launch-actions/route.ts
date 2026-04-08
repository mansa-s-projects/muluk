/**
 * POST /api/launch-actions
 * Tracks money-moving actions on launch pages.
 * Authenticated — creator only.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ACTIONS = new Set([
  "copied_link", "opened_pay_page", "copied_caption",
  "copied_dm", "copied_closing_message", "clicked_go_live",
  "created_offer", "generated_link", "shared_instagram",
  "dm_followers", "viewed_analytics",
]);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const action_type     = String(body.action_type ?? "").trim();
    const payment_link_id = body.payment_link_id ? String(body.payment_link_id) : null;
    const offer_draft_id  = body.offer_draft_id  ? String(body.offer_draft_id)  : null;
    const metadata        = body.metadata ?? null;

    if (!VALID_ACTIONS.has(action_type)) {
      return NextResponse.json({ error: "Invalid action_type" }, { status: 400 });
    }

    const { error } = await supabase
      .from("launch_actions")
      .insert({
        creator_id:      user.id,
        action_type,
        payment_link_id: payment_link_id ?? null,
        offer_draft_id:  offer_draft_id  ?? null,
        metadata_json:   metadata ?? null,
      });

    if (error) {
      console.error("[launch-actions] insert failed:", error.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ tracked: true });
  } catch (err) {
    console.error("[launch-actions] unexpected:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
