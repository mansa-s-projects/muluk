import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pricesFromCents } from "@/lib/rate-card-pricing";
import RateCardClient from "./RateCardClient";

export default async function RateCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load existing rate card + stats for this creator (if any)
  const [rateCardRes, creatorStatsRes] = await Promise.all([
    supabase
      .from("rate_cards")
      .select("*")
      .eq("creator_id", user.id)
      .maybeSingle(),
    supabase
      .from("creator_stats")
      .select("*")
      .eq("creator_id", user.id)
      .maybeSingle(),
  ]);

  if (rateCardRes.error) {
    console.error("[dashboard/rate-card] failed to load rate card", rateCardRes.error);
    throw new Error("Failed to load rate card");
  }
  if (creatorStatsRes.error) {
    console.error("[dashboard/rate-card] failed to load creator stats", creatorStatsRes.error);
    throw new Error("Failed to load creator stats");
  }

  const rateCard = rateCardRes.data;
  const creatorStats = creatorStatsRes.data;

  const savedPrices = rateCard
    ? pricesFromCents({
        brand_deal_price:   rateCard.brand_deal_price,
        story_post_price:   rateCard.story_post_price,
        session_price:      rateCard.session_price,
        subscription_price: rateCard.subscription_price,
      })
    : null;

  const savedStats = creatorStats
    ? {
        followers:      creatorStats.followers,
        engagementRate: Number(creatorStats.engagement_rate),
        niche:          creatorStats.niche,
        contentType:    creatorStats.content_type,
      }
    : null;

  return (
    <RateCardClient
      savedCard={
        rateCard
          ? {
              id:         rateCard.id,
              slug:       rateCard.slug,
              title:      rateCard.title,
              is_public:  rateCard.is_public,
              view_count: rateCard.view_count,
              created_at: rateCard.created_at,
            }
          : null
      }
      savedPrices={savedPrices}
      savedStats={savedStats}
    />
  );
}
