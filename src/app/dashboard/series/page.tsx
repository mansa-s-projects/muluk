import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import SeriesClient from "@/app/dashboard/series/SeriesClient";
import type { Series, SeriesEpisode } from "@/lib/series";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function SeriesDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getServiceDb();

  const [seriesRaw, monthlyRaw, profileRaw] = await Promise.all([
    db
      .from("series")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    db.rpc("get_series_monthly_revenue", {
      p_creator_id: user.id,
      p_year:       new Date().getFullYear(),
    }),
    db
      .from("creator_applications")
      .select("handle")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle(),
  ]);

  if (seriesRaw.error) {
    console.error("[dashboard/series] failed to load series", { creatorId: user.id, error: seriesRaw.error });
    throw new Error("Failed to load series");
  }
  if (monthlyRaw.error) {
    console.error("[dashboard/series] failed to load monthly series revenue", {
      creatorId: user.id,
      rpc: "get_series_monthly_revenue",
      error: monthlyRaw.error,
    });
    throw new Error("Failed to load series revenue");
  }
  if (profileRaw.error) {
    console.error("[dashboard/series] failed to load creator profile", { creatorId: user.id, error: profileRaw.error });
    throw new Error("Failed to load creator profile");
  }

  const seriesList = (seriesRaw.data ?? []) as Series[];

  // Batch-fetch episodes for all series
  let allEpisodes: SeriesEpisode[] = [];
  if (seriesList.length > 0) {
    const seriesIds = seriesList.map((s) => s.id);
    const { data: epRaw } = await db
      .from("series_episodes")
      .select("*")
      .in("series_id", seriesIds)
      .order("sort_order")
      .order("created_at");
    allEpisodes = (epRaw ?? []) as SeriesEpisode[];
  }

  return (
    <SeriesClient
      initialSeries={seriesList}
      initialEpisodes={allEpisodes}
      monthlyEarnings={(monthlyRaw.data ?? []) as { month: number; total_cents: number; purchase_count: number }[]}
      handle={profileRaw.data?.handle ?? ""}
    />
  );
}
