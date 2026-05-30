import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const CODE_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  // Validate code format
  if (!code || !CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. Look up the supporter code
  const { data: SupporterCodeRow, error: fcError } = await supabase
    .from("supporter_codes")
    .select("id, code, status, creator_id, custom_name, tags, is_vip, created_at")
    .eq("code", code)
    .maybeSingle();

  if (fcError) {
    console.error("supporter-portal: supporter_codes lookup error", fcError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!SupporterCodeRow || SupporterCodeRow.status !== "active") {
    return NextResponse.json({ error: "Code not found or inactive" }, { status: 404 });
  }

  const creatorId: string = SupporterCodeRow.creator_id;

  // 2. Fetch creator profile
  const { data: creatorRow } = await supabase
    .from("creator_applications")
    .select("name, handle, bio, category, phantom_mode")
    .eq("user_id", creatorId)
    .maybeSingle();

  // 3. Fetch published content items (not expired)
  const { data: contentRows } = await supabase
    .from("content_items")
    .select("id, title, description, price, burn_mode, expires_at, status, created_at")
    .eq("creator_id", creatorId)
    .in("status", ["published", "active"])
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  // 4. Fetch this supporter's transaction history
  const { data: txRows } = await supabase
    .from("transactions")
    .select("id, amount, type, status, created_at")
    .eq("supporter_code", code)
    .order("created_at", { ascending: false })
    .limit(50);

  // 5. Fetch which content this supporter has unlocked
  const { data: unlockRows } = await supabase
    .from("supporter_unlocks")
    .select("content_id, amount_paid, unlocked_at")
    .eq("supporter_code", code);

  // 6. Record portal view (fire-and-forget)
  void Promise.resolve(
    supabase.from("supporter_portal_views").insert({ supporter_code: code, creator_id: creatorId })
  ).then(undefined, () => {});

  return NextResponse.json({
    SupporterCode: {
      code: SupporterCodeRow.code,
      status: SupporterCodeRow.status,
      isVip: SupporterCodeRow.is_vip ?? false,
      tags: SupporterCodeRow.tags ?? [],
      joinedAt: SupporterCodeRow.created_at,
    },
    creator: creatorRow
      ? {
          name: creatorRow.name ?? null,
          handle: creatorRow.handle ?? null,
          bio: creatorRow.bio ?? null,
          category: creatorRow.category ?? null,
          phantomMode: creatorRow.phantom_mode ?? false,
        }
      : null,
    content: (contentRows ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price ?? 0,
      burnMode: c.burn_mode ?? false,
      expiresAt: c.expires_at ?? null,
      createdAt: c.created_at,
    })),
    history: (txRows ?? []).map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      status: t.status,
      createdAt: t.created_at,
    })),
    unlocked: (unlockRows ?? []).map((u) => u.content_id),
  });
}

// POST — save a supporter unlock intent
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (!code || !CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const contentId = String((body as Record<string, unknown>).contentId ?? "").trim();
  const creatorId = String((body as Record<string, unknown>).creatorId ?? "").trim();

  if (!contentId || !creatorId) {
    return NextResponse.json({ error: "contentId and creatorId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Validate the supporter code still exists and is active
  const { data: SupporterCodeRow } = await supabase
    .from("supporter_codes")
    .select("id, status")
    .eq("code", code)
    .maybeSingle();

  if (!SupporterCodeRow || SupporterCodeRow.status !== "active") {
    return NextResponse.json({ error: "Code not found or inactive" }, { status: 404 });
  }

  // Upsert unlock intent (amount_paid = 0 = "notify me")
  const { error } = await supabase
    .from("supporter_unlocks")
    .upsert(
      { supporter_code: code, content_id: contentId, creator_id: creatorId, amount_paid: 0 },
      { onConflict: "supporter_code,content_id" }
    );

  if (error) {
    console.error("supporter-portal: unlock upsert error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
