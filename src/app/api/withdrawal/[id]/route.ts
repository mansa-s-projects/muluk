import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/withdrawal/[id]
 * Creator cancels their own pending withdrawal request.
 */
export async function PATCH(req: Request, ctx: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Verify ownership and current status before updating
  const { data: existing, error: fetchErr } = await supabase
    .from("withdrawal_requests")
    .select("id, status, creator_id")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot cancel a request with status "${existing.status}"` },
      { status: 409 }
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("withdrawal_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_id", user.id)
    .select("id, status, updated_at")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true, request: updated });
}
