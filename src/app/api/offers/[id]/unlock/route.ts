/**
 * /api/offers/[id]/unlock
 *
 * GET  — check if the authenticated user has an unlock for this offer.
 *         Returns: { unlocked: boolean }
 *
 * POST — grant an unlock for the authenticated user on this offer.
 *         DEV ONLY — disabled in production.
 *         In production, unlocks are created exclusively by the verified
 *         Whop webhook at /api/webhooks/whop (membership.went_valid event).
 *         Returns: { ok: true } | { error: string }
 *
 *         Optional body: { user_id: string } — creator can grant access to
 *         another user. Omit to grant access to self (the caller).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUnlock, createUnlock } from "@/lib/unlocks";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/offers/[id]/unlock ──────────────────────────────────────────────

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: offerId } = await params;

  if (!UUID_RE.test(offerId)) {
    return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ unlocked: false });
  }

  const unlocked = await checkUnlock(offerId, user.id);
  return NextResponse.json({ unlocked });
}

// ─── POST /api/offers/[id]/unlock ─────────────────────────────────────────────

export async function POST(req: Request, { params }: RouteContext) {
  // In production, unlocks are created by the Whop webhook (membership.went_valid).
  // This manual endpoint is only available in development for testing.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Manual unlocks are disabled in production. Use the Whop webhook." },
      { status: 403 }
    );
  }
  const { id: offerId } = await params;

  if (!UUID_RE.test(offerId)) {
    return NextResponse.json({ error: "Invalid offer id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional body — creator can grant a specific user_id
  let targetUserId = user.id;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.user_id && typeof body.user_id === "string" && UUID_RE.test(body.user_id)) {
      // Only the offer's creator may grant another user
      const { data: offer } = await supabase
        .from("offers")
        .select("creator_id")
        .eq("id", offerId)
        .single();

      if (offer?.creator_id !== user.id) {
        return NextResponse.json(
          { error: "Only the offer creator can grant access to other users" },
          { status: 403 }
        );
      }

      targetUserId = body.user_id;
    }
  } catch {
    // No body or invalid JSON — grant to self
  }

  // Resolve creator_id from the offer
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("creator_id")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const result = await createUnlock({
    offerId,
    userId: targetUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
