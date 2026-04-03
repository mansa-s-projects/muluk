import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FanPageClient from "@/app/components/FanPageClient";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type HandleParams = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: HandleParams): Promise<Metadata> {
  const { handle } = await params;
  const clean = handle.replace(/^@/, "").toLowerCase();

  const supabase = getServiceClient();
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("name, bio, category")
    .eq("handle", clean)
    .eq("status", "approved")
    .single();

  if (!creator) {
    return {
      title: "CIPHER - Creator Platform",
      description: "Exclusive content. Anonymous access. cipher.co",
    };
  }

  return {
    title: `@${clean} on CIPHER - ${creator.name}`,
    description: creator.bio || "Exclusive content. Anonymous access. cipher.co",
    openGraph: {
      title: `@${clean} on CIPHER`,
      description: creator.bio || "Exclusive content on CIPHER",
      url: `https://cipher.co/@${clean}`,
    },
  };
}

export default async function HandlePage({
  params,
  searchParams,
}: HandleParams & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { handle } = await params;
  const query = await searchParams;
  const clean = handle.replace(/^@/, "").toLowerCase();

  const supabase = getServiceClient();

  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id, name, handle, bio, category, tier, phantom_mode, created_at")
    .eq("handle", clean)
    .eq("status", "approved")
    .single();

  if (!creator) notFound();

  const { data: contentItems } = await supabase
    .from("content_items_v2")
    .select("id, title, description, price, currency, whop_checkout_url, preview_url, file_url, created_at")
    .eq("creator_id", creator.user_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const contentIds = (contentItems ?? []).map((item) => item.id);

  let fanCount = 0;
  if (contentIds.length > 0) {
    const { count } = await supabase
      .from("fan_codes_v2")
      .select("id", { count: "exact", head: true })
      .in("content_id", contentIds)
      .eq("is_paid", true);
    fanCount = count ?? 0;
  }

  const { data: socialConnections } = await supabase
    .from("social_connections")
    .select("platform, platform_username, profile_url")
    .eq("creator_id", creator.user_id)
    .order("connected_at", { ascending: false });

  const payment = typeof query.payment === "string" ? query.payment : undefined;
  const codeFromQuery = typeof query.code === "string" ? query.code : undefined;

  return (
    <FanPageClient
      creator={{
        id: creator.user_id,
        name: creator.name,
        handle: creator.handle,
        bio: creator.bio ?? null,
        category: creator.category ?? null,
        tier: creator.tier ?? "cipher",
        phantom_mode: Boolean(creator.phantom_mode),
        created_at: creator.created_at,
      }}
      contentItems={(contentItems ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? null,
        price: item.price,
        currency: item.currency,
        whop_checkout_url: item.whop_checkout_url ?? null,
        preview_url: item.preview_url ?? null,
        file_url: item.file_url ?? null,
        created_at: item.created_at,
      }))}
      fanCount={fanCount}
      socialConnections={(socialConnections ?? []).map((row) => ({
        platform: row.platform,
        username: row.platform_username,
        url: row.profile_url,
      }))}
      initialPaymentSuccess={payment === "success"}
      initialCode={codeFromQuery}
    />
  );
}
