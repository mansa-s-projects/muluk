import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PublicSeries, PublicEpisode } from "@/lib/series";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ handle: string }> };

// ── GET /api/series/public/[handle] — fan: list published series ───────────────

export async function GET(_req: Request, { params }: Params) {
  const { handle } = await params;
  const db = getServiceDb();

  // Resolve creator by handle
  const { data: creator } = await db
    .from("creator_applications")
    .select("user_id")
    .eq("handle", handle)
    .eq("status", "approved")
    .maybeSingle();
  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  const { data: seriesList } = await db
    .from("series")
    .select("id, title, description, cover_url, price_cents, episode_count")
    .eq("creator_id", creator.user_id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (!seriesList || seriesList.length === 0) {
    return NextResponse.json({ series: [] });
  }

  // Fetch preview episodes for each series in one query
  const seriesIds = seriesList.map((s) => s.id);
  const { data: previewEps } = await db
    .from("series_episodes")
    .select("id, series_id, title, body, media_url, sort_order, is_preview")
    .in("series_id", seriesIds)
    .eq("is_preview", true)
    .order("sort_order");

  const epsBySeriesId = (previewEps ?? []).reduce<Record<string, PublicEpisode[]>>(
    (acc, ep) => {
      const key = ep.series_id as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ep as PublicEpisode);
      return acc;
    },
    {}
  );

  const result: PublicSeries[] = seriesList.map((s) => ({
    id:               s.id as string,
    title:            s.title as string,
    description:      s.description as string | null,
    cover_url:        s.cover_url as string | null,
    price_cents:      s.price_cents as number,
    episode_count:    s.episode_count as number,
    preview_episodes: epsBySeriesId[s.id as string] ?? [],
  }));

  return NextResponse.json({ series: result });
}
