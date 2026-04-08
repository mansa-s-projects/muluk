import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }

  return new Resend(apiKey);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const resend = createResendClient();

    // Link to auth user if logged in
    const serverClient = await createClient();
    const { data: { user: authUser } } = await serverClient.auth.getUser();
    const userId = authUser?.id ?? null;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("Apply payload JSON parse failed:", {
        message: parseErr instanceof Error ? parseErr.message : "Unknown parse error",
        stack: parseErr instanceof Error ? parseErr.stack : null,
      });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const raw = body;
    const email = raw.email;
    const name = raw.name;
    const handle = raw.handle;

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    if (!handle || typeof handle !== "string" || !handle.trim()) {
      return NextResponse.json({ error: "Missing required field: handle" }, { status: 400 });
    }

    const rawContent = raw.content;
    if (!Array.isArray(rawContent) || rawContent.some(c => typeof c !== "string")) {
      return NextResponse.json({ error: "Invalid content: must be an array of strings" }, { status: 400 });
    }
    const content: string[] = rawContent as string[];

    const category = typeof raw.category === "string" ? raw.category : "";
    const country = typeof raw.country === "string" ? raw.country : "";
    const payout = typeof raw.payout === "string" ? raw.payout : "";
    const audience = typeof raw.audience === "string" ? raw.audience : "";
    const bio = typeof raw.bio === "string" ? raw.bio : null;

    const { error: dbError } = await supabase.from("creator_applications").insert({
      name: name.trim(),
      handle: handle.toLowerCase().trim().replace(/^@/, ""),
      category,
      email: email.toLowerCase().trim(),
      country,
      payout_method: payout,
      ...(userId ? { user_id: userId } : {}),
      content_types: content,
      audience_size: audience,
      bio: bio || null,
      status: "pending",
    });

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ error: "Already applied" }, { status: 409 });
      }
      console.error("Apply DB insert failed:", {
        message: dbError.message,
        stack: (dbError as { stack?: string }).stack ?? null,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    try {
      await resend.emails.send({
        from: "CIPHER <hello@cipher.so>",
        to: email,
        subject: "Your CIPHER application is under review",
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#020203;font-family:'Helvetica Neue',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:60px 24px;">
<table width="560" cellpadding="0" cellspacing="0">
  <tr><td style="padding-bottom:40px;"><span style="font-family:'Courier New',monospace;font-size:17px;font-weight:500;letter-spacing:0.3em;color:#c8a96e;">CIPHER</span></td></tr>
  <tr><td style="padding-bottom:40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,110,0.4),transparent);"></div></td></tr>
  <tr><td style="padding-bottom:20px;"><h1 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:300;color:rgba(255,255,255,0.92);line-height:1.1;">Application<br/><em style="color:#c8a96e;">received.</em></h1></td></tr>
  <tr><td style="padding-bottom:36px;"><p style="margin:0;font-size:15px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.5);">Hey ${escapeHtml(name)}, we&#x27;ve received your application for <strong style="color:rgba(255,255,255,0.7);">@${escapeHtml(handle)}</strong>.<br/><br/>We review every application personally. You&#x27;ll hear from us within 48 hours.</p></td></tr>
  <tr><td style="padding-bottom:36px;">
    <div style="background:#0f0f1a;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:24px 28px;">
      <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#8a7048;">Your application</p>
      ${[["Category", category], ["Country", country], ["Payout", payout], ["Audience", audience]].map(([label, value]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:12px;color:rgba(255,255,255,0.3);font-family:'Courier New',monospace;">${label}</span><span style="font-size:13px;color:rgba(255,255,255,0.6);font-weight:300;">${escapeHtml(value)}</span></div>`).join("")}
    </div>
  </td></tr>
  <tr><td><p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;">&#xa9; 2025 CIPHER &#xb7; cipher.so</p></td></tr>
</table></td></tr></table>
</body></html>`,
      });
    } catch (emailErr) {
      console.error("Email delivery failed:", emailErr);
      // DB insert succeeded — return success even if confirmation email fails
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
