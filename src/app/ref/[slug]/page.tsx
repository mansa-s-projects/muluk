import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";
import { headers } from "next/headers";

const SLUG_PATTERN = /^[a-zA-Z0-9_.-]{1,32}$/;

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug || !SLUG_PATTERN.test(slug)) {
    redirect("/apply");
  }

  const supabase = createServiceClient();

  // Look up by referral_slug first, then fall back to handle
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id, handle, referral_slug, phantom_mode")
    .or(`referral_slug.ilike.${slug},handle.ilike.${slug}`)
    .maybeSingle();

  // Track the click (fire-and-forget, never block redirect)
  if (creator?.user_id) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ipHash = ip
      ? createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : null;

    void supabase.from("referral_clicks").insert({
      referral_slug: slug.toLowerCase(),
      ip_hash: ipHash,
    });
  }

  // Redirect to apply page with ref param preserved
  redirect(`/apply?ref=${encodeURIComponent(slug.toLowerCase())}`);
}
