import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PublicEpisode } from "@/lib/series";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TOKEN_RE = /^[0-9a-f]{48}$/;

type Params = { params: Promise<{ id: string }> };

// ── GET /api/series/[id]/read?token= — fan: read all episodes ─────────────────
// Returns full episode list if:
//   a) series is free (price_cents === 0), or
//   b) a valid paid-purchase access_token is provided

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";

  const db = getServiceDb();

  const { data: series } = await db
    .from("series")
    .select("id, title, description, cover_url, price_cents, episode_count, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  let hasAccess = (series.price_cents as number) === 0;

  if (!hasAccess) {
    if (!TOKEN_RE.test(token)) {
      return NextResponse.json({ error: "Invalid or missing access token", status_code: 402 }, { status: 402 });
    }

    const { data: purchase } = await db
      .from("series_purchases")
      .select("id, status")
      .eq("series_id", id)
      .eq("access_token", token)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ error: "Access token not found", status_code: 404 }, { status: 404 });
    }
    if ((purchase.status as string) === "pending") {
      return NextResponse.json({ error: "Payment pending", pending: true }, { status: 402 });
    }
    if ((purchase.status as string) === "refunded") {
      return NextResponse.json({ error: "Purchase refunded", refunded: true }, { status: 403 });
    }
    if ((purchase.status as string) === "paid") {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: episodes } = await db
    .from("series_episodes")
    .select("id, title, body, media_url, sort_order, is_preview")
    .eq("series_id", id)
    .order("sort_order")
    .order("created_at");

  return NextResponse.json({
    series: {
      id:            series.id,
      title:         series.title,
      description:   series.description,
      cover_url:     series.cover_url,
      price_cents:   series.price_cents,
      episode_count: series.episode_count,
    },
    episodes: (episodes ?? []) as PublicEpisode[],
  });
}
