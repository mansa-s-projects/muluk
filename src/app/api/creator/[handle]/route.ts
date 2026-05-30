import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";
import { Resend } from "resend";

const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]{1,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory IP rate limiter (resets on server restart)
const ipRateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(key);
  if (!entry || now > entry.reset) {
    ipRateMap.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ── GET /api/creator/[handle] — public creator profile ─────────────────────────
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ handle: string }> }
) {
  const { handle } = await context.params;

  if (!handle || !HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up creator by handle
  const { data: creator, error: creatorErr } = await supabase
    .from("creator_applications")
    .select("user_id, display_name, handle, bio, category, phantom_mode, created_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (creatorErr) {
    console.error("creator-profile GET: db error", creatorErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!creator || creator.phantom_mode) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const creatorId: string = creator.user_id;

  // Parallel: published content + social connections
  const [contentRes, socialRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, burn_mode, expires_at, created_at")
      .eq("creator_id", creatorId)
      .in("status", ["published", "active"])
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count")
      .eq("creator_id", creatorId),
  ]);

  const content = (contentRes.data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    description: (c.description as string) ?? "",
    price: (c.price as number) ?? 0,
    burnMode: (c.burn_mode as boolean) ?? false,
    expiresAt: (c.expires_at as string) ?? null,
    createdAt: c.created_at as string,
  }));

  const socialRows = socialRes.data ?? [];
  const totalFollowers = socialRows.reduce(
    (sum, r) => sum + ((r.follower_count as number) ?? 0),
    0
  );
  const byPlatform = socialRows
    .filter((r) => (r.follower_count as number) > 0)
    .map((r) => ({
      platform: r.platform as string,
      username: (r.platform_username as string) ?? null,
      followers: (r.follower_count as number) ?? 0,
    }));

  return NextResponse.json({
    creator: {
      displayName: (creator.display_name as string) ?? null,
      handle: creator.handle as string,
      bio: (creator.bio as string) ?? null,
      category: (creator.category as string) ?? null,
      joinedAt: creator.created_at as string,
    },
    content,
    socialReach: { totalFollowers, byPlatform },
    creatorId,
  });
}

// ── POST /api/creator/[handle] — submit fan code request ───────────────────────
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ handle: string }> }
) {
  const { handle } = await context.params;

  if (!handle || !HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  // Rate-limit by IP hash
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipKey = createHash("sha256").update(ip + handle).digest("hex").slice(0, 16);
  if (isRateLimited(ipKey)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = String((body as Record<string, unknown>).email ?? "").trim().toLowerCase();
  const message = String((body as Record<string, unknown>).message ?? "").trim().slice(0, 500);

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up creator_id by handle
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id, phantom_mode, handle")
    .ilike("handle", handle)
    .maybeSingle();

  if (!creator || creator.phantom_mode) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { error } = await supabase.from("fan_code_requests").insert({
    creator_id: creator.user_id,
    email,
    message: message || null,
  });

  if (error) {
    console.error("creator-profile POST: insert error", error);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  // Notify creator via email (fire-and-forget)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { data: authUser } = await supabase.auth.admin.getUserById(creator.user_id);
    const creatorEmail = authUser?.user?.email;
    if (creatorEmail) {
      const resend = new Resend(resendKey);
      const creatorHandle = String(creator.handle ?? handle);
      const msgHtml = message
        ? `<p style="margin:0 0 8px"><em>"${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"</em></p>`
        : "";
      void resend.emails.send({
        from: "CIPHER <noreply@cipher.so>",
        to: creatorEmail,
        subject: `New fan access request — ${email}`,
        html: `
          <div style="font-family:monospace;background:#080810;color:#fff;padding:32px;max-width:480px">
            <p style="font-size:22px;color:#c8a96e;margin:0 0 24px">✦ CIPHER</p>
            <p style="margin:0 0 8px">A fan wants access to your exclusive content.</p>
            <p style="margin:0 0 16px;color:#c8a96e;font-size:18px">${email}</p>
            ${msgHtml}
            <p style="margin:16px 0 4px;font-size:11px;color:#555">Go to your dashboard &rarr; Fans to generate and send them a code.</p>
            <a href="https://cipher.so/creator/${creatorHandle}" style="color:#c8a96e;font-size:11px">cipher.so/creator/${creatorHandle}</a>
          </div>`,
      }).catch(err => console.error("creator-profile: resend error", err));
    }
  }

  return NextResponse.json({ ok: true });
}
