import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import PayLinkClient from "./PayLinkClient";
import type { PayLink } from "./PayLinkClient";

type PageProps = { params: Promise<{ id: string }> };

async function fetchPayLink(id: string) {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve by UUID or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = db
    .from("payment_links")
    .select(
      "id, title, description, price, content_type, content_value, file_url, view_count, purchase_count, slug, whop_checkout_url"
    )
    .eq("is_active", true);

  const { data, error } = isUuid
    ? await query.eq("id", id).single()
    : await query.eq("slug", id).single();

  if (error || !data) return null;
  return data as PayLink & { whop_checkout_url?: string | null };
}

const fetchPayLinkCached = cache(fetchPayLink);

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const link = await fetchPayLinkCached(id);
  if (!link) return { title: "Not Found — MULUK" };
  return {
    title: `${link.title} — MULUK`,
    description: link.description ?? "Exclusive content — unlock after purchase.",
    robots: { index: false, follow: false },
  };
}

export default async function PayLinkPage({ params }: PageProps) {
  const { id } = await params;
  const link = await fetchPayLinkCached(id);
  if (!link) notFound();

  const { whop_checkout_url, ...payLink } = link;

  // Inject redirect_url into the Whop checkout URL
  let checkoutUrl: string | null = whop_checkout_url ?? null;
  if (checkoutUrl) {
    try {
      const baseUrl = getBaseUrl();
      const redirectTarget = `${baseUrl}/pay/${payLink.slug ?? payLink.id}?success=1`;
      const parsed = new URL(checkoutUrl);
      if (!parsed.searchParams.has("redirect_url")) {
        parsed.searchParams.set("redirect_url", redirectTarget);
        checkoutUrl = parsed.toString();
      }
    } catch {
      // leave checkoutUrl as-is if URL parsing fails
    }
  }

  return <PayLinkClient link={payLink} checkoutUrl={checkoutUrl} />;
}
