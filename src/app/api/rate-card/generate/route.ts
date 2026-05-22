import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  calculateRateCardPrices,
  pricesToCents,
  NICHES,
  CONTENT_TYPES,
  type NicheValue,
  type ContentTypeValue,
} from "@/lib/rate-card-pricing";

function getDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function generateSlug(): string {
  // 12 random hex chars — URL-safe and collision-resistant enough for O(10^5) rows
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const VALID_NICHES       = new Set(NICHES.map((n) => n.value));
const VALID_CONTENT_TYPES = new Set(CONTENT_TYPES.map((c) => c.value));

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
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

  // ── Parse & validate body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { followers, engagementRate, niche, contentType } = body as Record<string, unknown>;

  if (
    typeof followers      !== "number" || !Number.isFinite(followers) || followers < 0 || followers > 500_000_000 ||
    typeof engagementRate !== "number" || !Number.isFinite(engagementRate) || engagementRate < 0 || engagementRate > 100 ||
    typeof niche          !== "string" || !VALID_NICHES.has(niche as NicheValue) ||
    typeof contentType    !== "string" || !VALID_CONTENT_TYPES.has(contentType as ContentTypeValue)
  ) {
    return NextResponse.json({ error: "Invalid input parameters" }, { status: 422 });
  }

  const inputs = {
    followers: Math.round(followers),
    engagementRate,
    niche:       niche       as NicheValue,
    contentType: contentType as ContentTypeValue,
  };

  // ── Calculate prices ─────────────────────────────────────────────────────
  const prices      = calculateRateCardPrices(inputs);
  const centPrices  = pricesToCents(prices);

  const nicheLabel       = NICHES.find((n) => n.value === niche)?.label       ?? niche;
  const contentTypeLabel = CONTENT_TYPES.find((c) => c.value === contentType)?.label ?? contentType;

  const statsSnapshot = {
    followers:        inputs.followers,
    engagementRate:   inputs.engagementRate,
    niche:            inputs.niche,
    nicheLabel,
    contentType:      inputs.contentType,
    contentTypeLabel,
  };

  const db = getDb();

  // Ensure profile exists so FK constraints on creator_stats/rate_cards do not fail
  const { error: profileErr } = await db
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  if (profileErr) {
    console.error("profiles upsert failed:", profileErr);
    return NextResponse.json({ error: "Failed to initialize profile" }, { status: 500 });
  }

  // ── Upsert creator_stats ─────────────────────────────────────────────────
  const { error: statsErr } = await db.from("creator_stats").upsert(
    {
      creator_id:      user.id,
      followers:       inputs.followers,
      engagement_rate: inputs.engagementRate,
      niche:           inputs.niche,
      content_type:    inputs.contentType,
    },
    { onConflict: "creator_id" }
  );

  if (statsErr) {
    console.error("creator_stats upsert failed:", statsErr);
    return NextResponse.json({ error: "Failed to save stats" }, { status: 500 });
  }

  // ── Check for existing rate card to preserve slug ─────────────────────────
  const { data: existing, error: existingError } = await db
    .from("rate_cards")
    .select("slug")
    .eq("creator_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[rate-card/generate] failed to query existing slug", {
      userId: user.id,
      error: existingError,
    });
    return NextResponse.json({ error: "Failed to check existing rate card" }, { status: 500 });
  }

  const slug = existing?.slug ?? generateSlug();

  // ── Upsert rate_card ─────────────────────────────────────────────────────
  const { data: rateCard, error: cardErr } = await db
    .from("rate_cards")
    .upsert(
      {
        creator_id:         user.id,
        slug,
        brand_deal_price:   centPrices.brand_deal_price,
        story_post_price:   centPrices.story_post_price,
        session_price:      centPrices.session_price,
        subscription_price: centPrices.subscription_price,
        stats_snapshot:     statsSnapshot,
      },
      { onConflict: "creator_id" }
    )
    .select()
    .single();

  if (cardErr || !rateCard) {
    console.error("rate_cards upsert failed:", cardErr);
    return NextResponse.json({ error: "Failed to save rate card" }, { status: 500 });
  }

  return NextResponse.json({ rateCard }, { status: 200 });
}
