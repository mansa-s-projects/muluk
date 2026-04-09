import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ slug: string }> };

function getServiceDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

// ── GET /api/rate-card/[slug] — public, no auth required ──────────────────

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  if (!slug || !/^[a-f0-9]{12}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const db = getServiceDb();

  const { data: card, error } = await db
    .from("rate_cards")
    .select(`
      id, slug, title,
      brand_deal_price, story_post_price, session_price, subscription_price,
      is_public, view_count, stats_snapshot, created_at,
      profiles!inner ( display_name, handle, avatar_url, bio )
    `)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("[rate-card/get] query failed:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }

  if (!card) {
    return NextResponse.json({ error: "Rate card not found" }, { status: 404 });
  }

  // Increment view count without blocking the response.
  void db.rpc("increment_rate_card_views", { p_slug: slug });

  return NextResponse.json({ card });
}

// ── PATCH /api/rate-card/[slug] — authenticated, owner only ───────────────
// Body: { brandDealPrice?, storyPostPrice?, sessionPrice?, subscriptionPrice?, title? }

export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params;

  if (!slug || !/^[a-f0-9]{12}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll:  (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Build update payload from allowed fields only
  const update: Record<string, unknown> = {};

  const priceFields: Array<[string, string]> = [
    ["brandDealPrice",    "brand_deal_price"],
    ["storyPostPrice",    "story_post_price"],
    ["sessionPrice",      "session_price"],
    ["subscriptionPrice", "subscription_price"],
  ];

  for (const [camel, snake] of priceFields) {
    if (camel in raw) {
      const val = raw[camel];
      if (typeof val !== "number" || !Number.isFinite(val) || val < 0 || val > 10_000_000) {
        return NextResponse.json({ error: `Invalid value for ${camel}` }, { status: 422 });
      }
      update[snake] = Math.round((val + Number.EPSILON) * 100); // dollars → cents
    }
  }

  if ("title" in raw) {
    const t = raw["title"];
    if (typeof t !== "string" || t.length > 120) {
      return NextResponse.json({ error: "Invalid title" }, { status: 422 });
    }
    update["title"] = t.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 422 });
  }

  const db = getServiceDb();

  // ── Verify ownership using service role (bypasses RLS for read) ───────────
  const { data: existing } = await db
    .from("rate_cards")
    .select("creator_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing || existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Apply update ──────────────────────────────────────────────────────────
  const { data: updated, error: updateErr } = await db
    .from("rate_cards")
    .update(update)
    .eq("slug", slug)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error("rate_cards update failed:", updateErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ rateCard: updated });
}
