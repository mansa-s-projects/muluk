import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/supporter/activity
// Body: { code: string, activity_type: string, page?: string, content_id?: string, metadata?: object }
// Called by supporter pages on key interactions — not on every scroll or mousemove.

const VALID_ACTIVITY_TYPES = new Set([
  "page_view",
  "vault_view",
  "tip_click",
  "message_open",
  "booking_view",
  "series_view",
  "content_unlock",
  "checkout_open",
]);

const CODE_RE = /^SUPPORTER-[A-Z2-9]{10}$/;

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const activityType =
    typeof body.activity_type === "string" ? body.activity_type : "";
  if (!VALID_ACTIVITY_TYPES.has(activityType)) {
    return NextResponse.json({ error: "Invalid activity_type" }, { status: 400 });
  }

  const page =
    typeof body.page === "string" ? body.page.slice(0, 200) : null;
  const contentId =
    typeof body.content_id === "string" ? body.content_id.slice(0, 36) : null;
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  const supabase = getServiceClient();

  // Resolve supporter_code_id and creator_id
  const { data: SupporterCode } = await supabase
    .from("supporter_codes_v2")
    .select("id, content_items_v2!inner(creator_id)")
    .eq("code", code)
    .eq("is_paid", true)
    .maybeSingle();

  if (!SupporterCode) {
    return NextResponse.json({ ok: true }); // Silently succeed
  }

  const creatorId = (SupporterCode as unknown as { content_items_v2: { creator_id: string } })
    .content_items_v2.creator_id;

  const { error } = await supabase.from("supporter_activity").insert({
    supporter_code_id: SupporterCode.id,
    creator_id: creatorId,
    activity_type: activityType,
    page,
    content_id: contentId,
    metadata,
  });

  if (error) {
    console.error("[supporter/activity] insert error", error);
    return NextResponse.json({ error: "Activity log failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
