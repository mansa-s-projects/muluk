// POST /api/cron/metrics-report
// Runs daily at 9am. Sends founder a performance digest email.
// Triggered by cron scheduler with Authorization: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";

const FROM = "Mansas Moguls <growth@mansasmoguls.com>";
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const DIGEST_MODEL = "openai/gpt-4o-mini";

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

type PlatformMetrics = {
  newWaitlistToday: number;
  totalWaitlist: number;
  newCreatorsToday: number;
  activeCreators7d: number;
  totalFollowers: number;
  hotLeads: number;
  emailsInSequences: number;
};

async function generateAISummary(metrics: PlatformMetrics): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "AI summary unavailable — OPENROUTER_API_KEY not set.";

  const prompt = `You are writing a concise founder performance digest for Mansas Moguls, a creator monetization platform.

Today's platform metrics:
- New waitlist signups today: ${metrics.newWaitlistToday}
- Total waitlist size: ${metrics.totalWaitlist}
- New creator signups today: ${metrics.newCreatorsToday}
- Active creators (logged in last 7 days): ${metrics.activeCreators7d}
- Total followers managed across all creators: ${metrics.totalFollowers.toLocaleString()}
- Hot/VIP leads: ${metrics.hotLeads}
- Emails in active sequences: ${metrics.emailsInSequences}

Write a 3-sentence digest that:
1. Calls out the single most important signal in these numbers
2. Gives one concrete action the founder should take today
3. Ends with one sentence on momentum or concern

Be direct. No fluff. No bullet points. Sound like a smart operator, not an AI.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
        "X-Title": "Mansas Moguls Metrics Digest",
      },
      body: JSON.stringify({
        model: DIGEST_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return "AI summary unavailable.";

    const json = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return json.choices[0]?.message?.content?.trim() ?? "AI summary unavailable.";
  } catch {
    return "AI summary unavailable.";
  }
}

function buildDigestHtml(metrics: PlatformMetrics, aiSummary: string, dateStr: string): string {
  const statBlock = (label: string, value: string | number) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1c1c1c;color:#888;font-size:13px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1c1c1c;color:#c8a96e;font-size:15px;font-weight:500;text-align:right;">
        ${typeof value === "number" ? value.toLocaleString() : value}
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;}
  .wrap{max-width:580px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden;}
  .hdr{background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:32px;text-align:center;}
  .logo{font-size:20px;font-weight:700;color:#000;letter-spacing:6px;}
  .date{font-size:11px;color:rgba(0,0,0,0.5);margin-top:6px;letter-spacing:0.1em;}
  .bod{padding:40px 32px;line-height:1.7;color:#ccc;font-size:14px;}
  .section-lbl{font-size:10px;color:#555;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;}
  .ai-box{background:#0f0f0f;border-left:3px solid #c8a96e;padding:20px 24px;margin:24px 0;border-radius:0 6px 6px 0;font-style:italic;color:rgba(255,255,255,0.7);line-height:1.8;}
  .ftr{background:#0a0a0a;padding:24px 32px;text-align:center;color:#444;font-size:11px;}
</style></head>
<body><div class="wrap">
  <div class="hdr">
    <div class="logo">MANSAS MOGULS</div>
    <div class="date">Daily Digest · ${dateStr}</div>
  </div>
  <div class="bod">
    <div class="section-lbl">Platform Metrics</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${statBlock("New waitlist signups today", metrics.newWaitlistToday)}
      ${statBlock("Total waitlist size", metrics.totalWaitlist)}
      ${statBlock("New creator signups today", metrics.newCreatorsToday)}
      ${statBlock("Active creators (last 7 days)", metrics.activeCreators7d)}
      ${statBlock("Total followers managed", metrics.totalFollowers.toLocaleString())}
      ${statBlock("Hot / VIP leads", metrics.hotLeads)}
      ${statBlock("Emails in active sequences", metrics.emailsInSequences)}
    </table>

    <div style="margin-top:32px;" class="section-lbl">AI Analysis</div>
    <div class="ai-box">${aiSummary}</div>
  </div>
  <div class="ftr">Mansas Moguls · Founder Digest · Automated Report</div>
</div></body></html>`;
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (!founderEmail) {
    return NextResponse.json({ error: "FOUNDER_EMAIL env var not set" }, { status: 500 });
  }

  const db = createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Fetch all metrics in parallel ─────────────────────────────────────────
  const [
    waitlistTodayRes,
    waitlistTotalRes,
    creatorsAppTodayRes,
    activeCreatorsRes,
    followersRes,
    hotLeadsRes,
    activeEnrollmentsRes,
  ] = await Promise.all([
    db
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),

    db
      .from("waitlist")
      .select("id", { count: "exact", head: true }),

    db
      .from("creator_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),

    // Creators active in the last 7 days (updated_at reflects last dashboard activity)
    db
      .from("creators")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", sevenDaysAgo.toISOString()),

    db
      .from("social_connections")
      .select("followers"),

    db
      .from("lead_scores")
      .select("id", { count: "exact", head: true })
      .in("tier", ["hot", "vip"]),

    db
      .from("email_sequence_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("completed", false)
      .eq("unsubscribed", false),
  ]);

  const totalFollowers = (followersRes.data ?? []).reduce(
    (sum: number, row: { followers?: number }) => sum + (row.followers ?? 0),
    0
  );

  const metrics: PlatformMetrics = {
    newWaitlistToday: waitlistTodayRes.count ?? 0,
    totalWaitlist: waitlistTotalRes.count ?? 0,
    newCreatorsToday: creatorsAppTodayRes.count ?? 0,
    activeCreators7d: activeCreatorsRes.count ?? 0,
    totalFollowers,
    hotLeads: hotLeadsRes.count ?? 0,
    emailsInSequences: activeEnrollmentsRes.count ?? 0,
  };

  // ── Generate AI summary ────────────────────────────────────────────────────
  const aiSummary = await generateAISummary(metrics);

  // ── Send digest email ──────────────────────────────────────────────────────
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const html = buildDigestHtml(metrics, aiSummary, dateStr);

  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: founderEmail,
    subject: `Mansas Moguls Daily Digest — ${dateStr}`,
    html,
  });

  if (sendErr) {
    return NextResponse.json(
      { error: "Failed to send digest email", detail: sendErr.message, metrics },
      { status: 500 }
    );
  }

  await db.from("marketing_events").insert({
    event_type: "metrics_digest_sent",
    metadata: { recipient: founderEmail, metrics, date: dateStr },
  });

  return NextResponse.json({
    sent: true,
    recipient: founderEmail,
    metrics,
    timestamp: now.toISOString(),
  });
}
