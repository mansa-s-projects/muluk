import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/pay/[id]/verify
 * Body: { email: string }
 *
 * After Whop payment.completed webhook fires and writes to payment_link_accesses,
 * the buyer submits their email here to retrieve their unlocked content.
 *
 * Also supports GET ?token=<access_token> for direct token-based access
 * (when Whop redirect_url includes the token in the URL).
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ access: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ access: false, error: "Valid email required" }, { status: 400 });
  }

  const db = getDb();
  const rateLimitResponse = await enforceRateLimit(db, {
    route: `pay-verify-post:${id}:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`,
    limit: 30,
    windowSeconds: 300,
  });
  if (rateLimitResponse) return rateLimitResponse;

  return verifyByEmail(id, email);
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url    = new URL(req.url);
  const token  = url.searchParams.get("token")?.trim();

  if (token) {
    const db = getDb();
    const rateLimitResponse = await enforceRateLimit(db, {
      route: `pay-verify-get:${id}:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 24)}`,
      limit: 30,
      windowSeconds: 300,
    });
    if (rateLimitResponse) return rateLimitResponse;
    return verifyByToken(id, token);
  }
  return NextResponse.json({ access: false, error: "token required" }, { status: 400 });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolvePaymentLinkId(
  db: ReturnType<typeof getDb>,
  idOrSlug: string
): Promise<{ id: string | null; error: string | null }> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(idOrSlug);
  const { data, error } = await db
    .from("payment_links")
    .select("id")
    .eq(isUuid ? "id" : "slug", idOrSlug)
    .maybeSingle();
  if (error) {
    return { id: null, error: error.message };
  }
  return { id: data?.id ?? null, error: null };
}

async function deliverContent(db: ReturnType<typeof getDb>, paymentLinkId: string, grantedAt: string | null) {
  const { data: link, error } = await db
    .from("payment_links")
    .select("content_value, content_type, file_url, title")
    .eq("id", paymentLinkId)
    .single();

  if (error) {
    return NextResponse.json({ access: false, error: error.message }, { status: 500 });
  }
  if (!link) return NextResponse.json({ access: false, error: "Link not found" }, { status: 404 });

  return NextResponse.json({
    access:        true,
    content_value: link.content_type === "text" ? link.content_value : link.file_url,
    content_type:  link.content_type,
    granted_at:    grantedAt,
    title:         link.title,
  });
}

async function verifyByEmail(idOrSlug: string, email: string) {
  const db = getDb();
  const resolved = await resolvePaymentLinkId(db, idOrSlug);
  if (resolved.error) {
    return NextResponse.json({ access: false, error: resolved.error }, { status: 500 });
  }
  if (!resolved.id) {
    return NextResponse.json({ access: false, error: "Link not found" }, { status: 404 });
  }
  const paymentLinkId = resolved.id;

  const { data: access } = await db
    .from("payment_link_accesses")
    .select("id, granted_at")
    .eq("payment_link_id", paymentLinkId)
    .eq("buyer_email", email)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!access) {
    console.warn("[pay-verify] email verification failed", { idOrSlug, emailHash: crypto.createHash("sha256").update(email).digest("hex").slice(0, 12) });
    return NextResponse.json({ access: false });
  }
  return deliverContent(db, paymentLinkId, access.granted_at);
}

async function verifyByToken(idOrSlug: string, token: string) {
  if (token.length < 32) {
    return NextResponse.json({ access: false, error: "token too short" }, { status: 400 });
  }

  const db = getDb();
  const resolved = await resolvePaymentLinkId(db, idOrSlug);
  if (resolved.error) {
    return NextResponse.json({ access: false, error: resolved.error }, { status: 500 });
  }
  if (!resolved.id) {
    return NextResponse.json({ access: false, error: "Link not found" }, { status: 404 });
  }
  const paymentLinkId = resolved.id;

  const { data: accessRows, error: accessError } = await db
    .from("payment_link_accesses")
    .select("access_token, granted_at")
    .eq("payment_link_id", paymentLinkId)
    .order("granted_at", { ascending: false })
    .limit(50);

  if (accessError) {
    return NextResponse.json({ access: false, error: accessError.message }, { status: 500 });
  }

  const access = (accessRows || []).find((row) => {
    if (!row.access_token || row.access_token.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(row.access_token), Buffer.from(token));
  });

  if (!access) {
    console.warn("[pay-verify] token verification failed", { idOrSlug, tokenLength: token.length });
    return NextResponse.json({ access: false });
  }

  return deliverContent(db, paymentLinkId, access.granted_at);
}
