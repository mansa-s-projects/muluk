import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Fan presence heartbeat — no auth required, code is identity
// POST /api/fan/presence
// Body: { code: string, page?: string, session_id?: string }
//
// Rate-limited by design: fans send this every 30s.
// We resolve creator_id via fan_codes_v2 → content_items_v2 join.

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CODE_RE = /^FAN-[A-Z2-9]{10}$/;

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

  const page =
    typeof body.page === "string" ? body.page.slice(0, 200) : null;
  const sessionId =
    typeof body.session_id === "string" ? body.session_id.slice(0, 64) : null;

  const supabase = getServiceClient();

  // Resolve fan_code_id and creator_id in one join
  const { data: fanCode, error: lookupErr } = await supabase
    .from("fan_codes_v2")
    .select("id, content_id, is_paid, content_items_v2!inner(creator_id)")
    .eq("code", code)
    .eq("is_paid", true)
    .maybeSingle();

  if (lookupErr || !fanCode) {
    // Silently succeed — don't leak whether a code exists
    return NextResponse.json({ ok: true });
  }

  const creatorId = (fanCode as unknown as { content_items_v2: { creator_id: string } })
    .content_items_v2.creator_id;

  // Upsert presence row — conflict on fan_code_id
  const { error: upsertErr } = await supabase
    .from("fan_presence")
    .upsert(
      {
        fan_code_id: fanCode.id,
        creator_id: creatorId,
        last_seen_at: new Date().toISOString(),
        current_page: page,
        session_id: sessionId,
      },
      { onConflict: "fan_code_id" }
    );

  if (upsertErr) {
    console.error("[fan/presence] upsert error", upsertErr);
    return NextResponse.json({ error: "Presence update failed" }, { status: 500 });
  }

  // Also keep fan_codes_v2.last_seen_at in sync (backward compat with migration 047)
  await supabase
    .from("fan_codes_v2")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", fanCode.id);

  return NextResponse.json({ ok: true });
}
