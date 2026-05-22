import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Public endpoint — fans do not have accounts; code is their identity
function getSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/fan/ping
 * Body: { code: string }
 * Updates last_seen_at for the matching paid fan_codes_v2 row.
 * Called periodically from the fan page while the fan is viewing content.
 */
export async function POST(req: Request) {
  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code || !/^FAN-[A-Z2-9]{10}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("fan_codes_v2")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("code", code)
    .eq("is_paid", true);

  if (error) {
    return NextResponse.json({ error: "Ping failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
