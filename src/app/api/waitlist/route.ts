import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseClient } from "@/lib/supabase";

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }

  return new Resend(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const resend = createResendClient();
    const body = await req.json();
    const { email, type, source } = body;

    /* ── VALIDATE ── */
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!["creator", "fan"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    /* ── SAVE TO SUPABASE ── */
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        type,
        source: source || "landing",
        ip: req.headers.get("x-forwarded-for") ?? null,
      });

    // if email already exists, still return success (don't expose duplicate)
    if (dbError && dbError.code !== "23505") {
      console.error("Supabase error:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const alreadyExists = dbError?.code === "23505";

    /* ── SEND CONFIRMATION EMAIL via Resend ── */
    if (!alreadyExists) {
      const isCreator = type === "creator";

      await resend.emails.send({
        from:    "MULUK <hello@muluk.vip>",   // ← change to your verified domain
        to:      email,
        subject: isCreator
          ? "You're on the MULUK waitlist — founding creator spot reserved"
          : "You're on the MULUK waitlist",
        html: emailTemplate({ email, type: type as "creator" | "fan" }),
      });
    }

    return NextResponse.json({ success: true, alreadyExists });

  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ─────────────────────────────────────────
   EMAIL TEMPLATE
───────────────────────────────────────── */
function emailTemplate({ email, type }: { email: string; type: "creator" | "fan" }) {
  const isCreator = type === "creator";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You're on the MULUK waitlist</title>
</head>
<body style="margin:0;padding:0;background:#020203;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020203;min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 24px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- LOGO -->
          <tr>
            <td style="padding-bottom:48px;">
              <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:500;letter-spacing:0.3em;color:#c8a96e;">MULUK</span>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding-bottom:48px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,110,0.4),transparent);"></div>
            </td>
          </tr>

          <!-- HEADLINE -->
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:300;line-height:1.1;color:rgba(255,255,255,0.92);letter-spacing:-0.01em;">
                ${isCreator ? "Your spot is<br/><em style='color:#c8a96e;font-style:italic;'>reserved.</em>" : "You're<br/><em style='color:#c8a96e;font-style:italic;'>in.</em>"}
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding-bottom:40px;">
              <p style="margin:0;font-size:16px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.5);">
                ${isCreator
                  ? `We received your application for <strong style="color:rgba(255,255,255,0.7);font-weight:400;">${email}</strong>.<br/><br/>
                     You're among the first 500 creators we're onboarding personally. That means lower fees locked in for life, a founding creator badge, and direct access to our team before we open to the public.`
                  : `You're on the list at <strong style="color:rgba(255,255,255,0.7);font-weight:400;">${email}</strong>.<br/><br/>
                     We'll let you know the moment MULUK opens. You'll get access before anyone else.`
                }
              </p>
            </td>
          </tr>

          <!-- WHAT'S COMING -->
          <tr>
            <td style="padding-bottom:40px;">
              <div style="background:#0f0f1a;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:28px 32px;">
                <p style="margin:0 0 16px 0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#8a7048;">What you're getting</p>
                ${isCreator ? `
                <p style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Fees locked at ${type === "creator" ? "10%" : "12%"} for life</p>
                <p style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Founding creator badge on your profile</p>
                <p style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Personal onboarding from our team</p>
                <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Lifetime referral income from day one</p>
                ` : `
                <p style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Early access before public launch</p>
                <p style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Zero account required — just your fan code</p>
                <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.5);font-weight:300;">→ &nbsp;Anonymous access to all creators</p>
                `}
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding-bottom:32px;">
              <div style="height:1px;background:rgba(255,255,255,0.05);"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;">
                © 2025 MULUK &nbsp;·&nbsp; muluk.vip &nbsp;·&nbsp;
                <a href="#" style="color:rgba(255,255,255,0.2);text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}