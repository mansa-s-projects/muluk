import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ handle: string }>;
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} — Rate Card | MULUK`,
    description: `Official creator pricing for brand deals, sponsored posts, and sessions.`,
    robots: { index: false, follow: false },
  };
}

export default async function HandleRateCardPage({ params }: Props) {
  const { handle } = await params;
  const clean = handle.replace(/^@/, "").toLowerCase();
  const db = getDb();

  // Resolve creator by handle
  const { data: creator } = await db
    .from("creator_applications")
    .select("user_id")
    .eq("handle", clean)
    .eq("status", "approved")
    .maybeSingle();

  if (!creator) notFound();

  // Fetch their rate card
  const { data: rateCard } = await db
    .from("rate_cards")
    .select("slug")
    .eq("creator_id", creator.user_id)
    .eq("is_public", true)
    .maybeSingle();

  if (!rateCard?.slug) notFound();

  // Canonical display lives at /r/[slug] — redirect preserving the full implementation
  redirect(`/r/${rateCard.slug}`);
}
