/**
 * /api/offers
 *
 * GET  — list all offer_drafts for the authenticated creator
 * POST — create a new offer_draft (optionally AI-generated from analytics)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeSocial } from "@/lib/analyzeSocial";
import { generateLaunchCommand } from "@/lib/generateLaunchCommand";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("offer_drafts")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Auto-generate from analytics if requested ─────────────────────────────
  if (body.generate_from_analytics) {
    const VALID_OFFER_TYPES = ["premium_content", "private_community", "coaching", "tutorials", "members_access", "vault", "custom"];

    const { data: rawPosts } = await supabase
      .from("social_posts")
      .select("caption, like_count, comments_count, media_type, posted_at")
      .eq("creator_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(50);

    const { data: conns } = await supabase
      .from("social_connections")
      .select("platform, follower_count")
      .eq("creator_id", user.id)
      .order("follower_count", { ascending: false })
      .limit(1);

    const followers = conns?.[0]?.follower_count ?? 0;
    const platform  = conns?.[0]?.platform ?? "instagram";

    const posts = (rawPosts ?? []).map((p: {
      caption: string | null;
      like_count: number;
      comments_count: number;
      media_type: string | null;
      posted_at: string | null;
    }) => ({
      caption: p.caption, like_count: p.like_count ?? 0,
      comments_count: p.comments_count ?? 0,
      media_type: p.media_type, posted_at: p.posted_at,
    }));

    const analysis = analyzeSocial({ posts, followers_count: followers });
    const niche    = String(body.niche ?? "creator");
    const command  = generateLaunchCommand({
      niche, strongest_platform: platform, followers_count: followers, analysis,
    });

    if (!VALID_OFFER_TYPES.includes(command.offer_type)) {
      return NextResponse.json({ error: "Generated invalid offer_type" }, { status: 400 });
    }

    if (!Number.isFinite(analysis.recommended_price_range.min) || analysis.recommended_price_range.min < 50) {
      return NextResponse.json({ error: "price must be ≥ 50 cents" }, { status: 400 });
    }

    // Price in cents
    const priceCents = (analysis.recommended_price_range.min) * 100;

    const { data: offer, error } = await supabase
      .from("offer_drafts")
      .insert({
        creator_id:           user.id,
        title:                command.offer_title,
        description:          command.offer_description,
        price:                priceCents,
        billing_type:         "one_time",
        offer_type:           command.offer_type,
        launch_angle:         command.launch_angle,
        generated_from_social: true,
        analytics_snapshot:   { analysis, command },
        status:               "draft",
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: offer.id,
      generated: true,
      offer_title:   command.offer_title,
      recommended_price: priceCents,
      launch_command:    command,
      analysis,
    });
  }

  // ── Manual create ─────────────────────────────────────────────────────────
  const title       = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const price       = Number(body.price ?? 0);
  const billingType = String(body.billing_type ?? "one_time");
  const offerType   = String(body.offer_type ?? "premium_content");

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!Number.isFinite(price)) {
    return NextResponse.json({ error: "price required or invalid" }, { status: 400 });
  }
  if (price < 50) {
    return NextResponse.json({ error: "price must be ≥ 50 cents" }, { status: 400 });
  }

  const VALID_BILLING   = ["one_time", "monthly", "yearly"];
  const VALID_OFFER_TYPES = ["premium_content", "private_community", "coaching", "tutorials", "members_access", "vault", "custom"];
  if (!VALID_BILLING.includes(billingType))
    return NextResponse.json({ error: "invalid billing_type" }, { status: 400 });
  if (!VALID_OFFER_TYPES.includes(offerType))
    return NextResponse.json({ error: "invalid offer_type" }, { status: 400 });

  const { data: offer, error } = await supabase
    .from("offer_drafts")
    .insert({
      creator_id:    user.id,
      title,
      description:   description || null,
      price,
      billing_type:  billingType,
      offer_type:    offerType,
      launch_angle:  body.launch_angle ? String(body.launch_angle) : null,
      status:        "draft",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: offer.id });
}
