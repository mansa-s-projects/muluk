import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateSupporterCode, calculateSplit } from "@/lib/monetization";
import { checkSupporterCodeLimit } from "@/lib/tiers";

/**
 * POST /api/v2/content/create
 * Creator uploads paid content → generates unlock link.
 *
 * Body: { title, description?, price, currency?, file_url, preview_url? }
 * Returns: { content, SupporterCode, unlockUrl }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Supporter code quantity gate (mansas-moguls tier: max 500) ───────────────────────────
  const SupporterCodeCheck = await checkSupporterCodeLimit(user.id, supabase);
  if (!SupporterCodeCheck.allowed) {
    return NextResponse.json({
      upgrade_required: true,
      current_tier:  SupporterCodeCheck.tier.slug,
      required_tier: "legend",
      feature:       "supporter_codes",
      message:       `Supporter code limit reached (${SupporterCodeCheck.current}/${SupporterCodeCheck.limit}). Upgrade to Legend for unlimited supporter codes.`,
    }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    price?: number;
    currency?: string;
    file_url?: string;
    preview_url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.price || typeof body.price !== "number" || body.price < 50) {
    return NextResponse.json(
      { error: "Price is required and must be at least 50 cents ($0.50)" },
      { status: 400 }
    );
  }
  if (!body.file_url || typeof body.file_url !== "string") {
    return NextResponse.json({ error: "file_url is required" }, { status: 400 });
  }

  const currency = (body.currency || "usd").toLowerCase();
  const { platformFee, creatorEarnings } = calculateSplit(body.price);

  // ── Insert content ────────────────────────────────────────────────────────
  const { data: content, error: contentErr } = await supabase
    .from("content_items_v2")
    .insert({
      creator_id: user.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      price: body.price,
      currency,
      file_url: body.file_url,
      preview_url: body.preview_url || null,
    })
    .select()
    .single();

  if (contentErr || !content) {
    console.error("Content insert error:", contentErr);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }

  // ── Generate supporter code ─────────────────────────────────────────────────────
  let code: string;
  let insertAttempts = 0;
  const maxAttempts = 5;

  // Retry loop in case of rare code collision
  while (true) {
    code = generateSupporterCode();
    const { error: codeErr } = await supabase
      .from("supporter_codes_v2")
      .insert({
        code,
        content_id: content.id,
        is_paid: false,
      });

    if (!codeErr) break;

    insertAttempts++;
    if (insertAttempts >= maxAttempts) {
      console.error("Supporter code generation failed after retries:", codeErr);
      return NextResponse.json(
        { error: "Failed to generate unlock code" },
        { status: 500 }
      );
    }
  }

  // ── Build unlock URL ──────────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mansasmoguls.com";
  const unlockUrl = `${baseUrl}/unlock/${code}`;

  return NextResponse.json({
    success: true,
    data: {
      content: {
        id: content.id,
        title: content.title,
        price: content.price,
        currency: content.currency,
      },
      SupporterCode: code,
      unlockUrl,
      earnings: {
        platformFee,
        creatorEarnings,
        creatorPercent: "88%",
      },
    },
  });
}
