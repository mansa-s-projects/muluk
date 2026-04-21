import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import RateCardClient from "./RateCardClient";
import type {
  RateCardPrices,
  RateCardInputs,
  NicheValue,
  ContentTypeValue,
} from "@/lib/rate-card-pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rate Card — MULUK",
  description: "Generate and share your creator rate card.",
};

export default async function RateCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: application }, { data: rateCard }, { data: stats }] =
    await Promise.all([
      db
        .from("creator_applications")
        .select("handle")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle(),
      db
        .from("rate_cards")
        .select(
          "id, slug, title, brand_deal_price, story_post_price, session_price, subscription_price, is_public, view_count, created_at"
        )
        .eq("creator_id", user.id)
        .maybeSingle(),
      db
        .from("creator_stats")
        .select("followers, engagement_rate, niche, content_type")
        .eq("creator_id", user.id)
        .maybeSingle(),
    ]);

  const savedCard = rateCard
    ? {
        id: rateCard.id,
        slug: rateCard.slug as string,
        title: rateCard.title as string | null,
        is_public: rateCard.is_public as boolean,
        view_count: rateCard.view_count as number,
        created_at: rateCard.created_at as string,
      }
    : null;

  const savedPrices: RateCardPrices | null = rateCard
    ? {
        brandDealPrice: (rateCard.brand_deal_price as number) / 100,
        storyPostPrice: (rateCard.story_post_price as number) / 100,
        sessionPrice: (rateCard.session_price as number) / 100,
        subscriptionPrice: (rateCard.subscription_price as number) / 100,
      }
    : null;

  const savedStats: RateCardInputs | null = stats
    ? {
        followers: stats.followers as number,
        engagementRate: stats.engagement_rate as number,
        niche: stats.niche as NicheValue,
        contentType: stats.content_type as ContentTypeValue,
      }
    : null;

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      handle={application?.handle}
    >
      <RateCardClient
        savedCard={savedCard}
        savedPrices={savedPrices}
        savedStats={savedStats}
      />
    </DashboardShell>
  );
}
