import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Public endpoint — no auth required (supporters don't have accounts)
function getSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v2/unlock/[code]
 * Returns content metadata + supporter code payment status.
 * Does NOT return file_url unless is_paid = true.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const sanitized = code?.trim().toUpperCase();

  if (!sanitized || !/^SUPPORTER-[A-Z2-9]{10}$/.test(sanitized)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── Fetch supporter code ────────────────────────────────────────────────────
  const { data: SupporterCode, error: codeErr } = await supabase
    .from("supporter_codes_v2")
    .select("id, code, content_id, is_paid, payment_method")
    .eq("code", sanitized)
    .single();

  if (codeErr || !SupporterCode) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  // ── Fetch content ─────────────────────────────────────────────────────
  const { data: content, error: contentErr } = await supabase
    .from("content_items_v2")
    .select("id, title, description, price, currency, file_url, preview_url")
    .eq("id", SupporterCode.content_id)
    .single();

  if (contentErr || !content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // ── Gate file_url behind payment ──────────────────────────────────────
  const responseContent = {
    ...content,
    file_url: SupporterCode.is_paid ? content.file_url : null,
  };

  // ── Record supporter presence on successful paid unlock ─────────────────────
  if (SupporterCode.is_paid) {
    await supabase
      .from("supporter_codes_v2")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", SupporterCode.id);
  }

  return NextResponse.json({
    success: true,
    data: {
      content: responseContent,
      SupporterCode: {
        id: SupporterCode.id,
        code: SupporterCode.code,
        is_paid: SupporterCode.is_paid,
        payment_method: SupporterCode.payment_method,
      },
    },
  });
}
