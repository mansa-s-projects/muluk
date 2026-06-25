// POST /api/cron/weekly-digest
// Runs weekly. Sends founder a weekly performance digest email.
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

type WeeklyMetrics = {
  waitlist7d: number;
  creators7d: number;
  activeCreators7d: number;
  activeCreatorsPrev7d: number;
  transactions7d: number;
  transactionsPrev7d: number;
  grossVolume7d: number;
  grossVolumePrev7d: number;
  socialFollowersTotal: number;
  hotLeads: number;
  openEmailEnrollments: number;
};

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function generateAISummary(metrics: WeeklyMetrics): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "AI summary unavailable - OPENROUTER_API_KEY not set.";

  const grossDelta = pctDelta(metrics.grossVolume7d, metrics.grossVolumePrev7d);
  const txDelta = pctDelta(metrics.transactions7d, metrics.transactionsPrev7d);
  const activeDelta = pctDelta(metrics.activeCreators7d, metrics.activeCreatorsPrev7d);

  const prompt = `You are writing an operator-grade weekly digest for Mansas Moguls.

This week metrics:
- New waitlist signups (7d): ${metrics.waitlist7d}
- New creator applications (7d): ${metrics.creators7d}
- Active creators (7d): ${metrics.activeCreators7d}
- Transactions (7d): ${metrics.transactions7d}
- Gross volume (7d): ${metrics.grossVolume7d.toFixed(2)}
- Total connected followers across social accounts: ${metrics.socialFollowersTotal}
- Hot/VIP leads: ${metrics.hotLeads}
- Open email sequence enrollments: ${metrics.openEmailEnrollments}

Week-over-week deltas:
- Active creators delta: ${activeDelta.toFixed(1)}%
- Transactions delta: ${txDelta.toFixed(1)}%
- Gross volume delta: ${grossDelta.toFixed(1)}%

Write 4 short paragraphs:
1) What improved most.
2) What is a risk signal.
3) One concrete action for next week.
4) A confidence statement for momentum.

Constraints:
- Plain language, no fluff.
- No bullet points.
- Keep under 180 words.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
        "X-Title": "Mansas Moguls Weekly Digest",
      },
      body: JSON.stringify({
        model: DIGEST_MODEL,
        max_tokens: 320,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return "AI summary unavailable.";

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? "AI summary unavailable.";
  } catch {
    return "AI summary unavailable.";
  }
}

function buildDigestHtml(metrics: WeeklyMetrics, aiSummary: string, rangeLabel: string): string {
  const statBlock = (label: string, value: string | number) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1c1c1c;color:#888;font-size:13px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1c1c1c;color:#c8a96e;font-size:15px;font-weight:500;text-align:right;">
        ${typeof value === "number" ? value.toLocaleString() : value}
      </td>
    </tr>`;

  const grossDelta = pctDelta(metrics.grossVolume7d, metrics.grossVolumePrev7d);
  const txDelta = pctDelta(metrics.transactions7d, metrics.transactionsPrev7d);
  const activeDelta = pctDelta(metrics.activeCreators7d, metrics.activeCreatorsPrev7d);

  const sign = (n: number) => (n > 0 ? "+" : "");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;}
  .wrap{max-width:620px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden;}
  .hdr{background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:32px;text-align:center;}
  .logo{font-size:20px;font-weight:700;color:#000;letter-spacing:6px;}
  .date{font-size:11px;color:rgba(0,0,0,0.55);margin-top:6px;letter-spacing:0.1em;}
  .bod{padding:36px 30px;line-height:1.7;color:#ccc;font-size:14px;}
  .section-lbl{font-size:10px;color:#555;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;}
  .ai-box{background:#0f0f0f;border-left:3px solid #c8a96e;padding:20px 24px;margin:24px 0;border-radius:0 6px 6px 0;color:rgba(255,255,255,0.75);line-height:1.75;}
  .ftr{background:#0a0a0a;padding:22px 28px;text-align:center;color:#444;font-size:11px;}
</style></head>
<body><div class="wrap">
  <div class="hdr">
    <div class="logo">MANSAS MOGULS</div>
    <div class="date">Weekly Digest · ${rangeLabel}</div>
  </div>
  <div class="bod">
    <div class="section-lbl">Core Metrics (Last 7 Days)</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${statBlock("New waitlist signups", metrics.waitlist7d)}
      ${statBlock("New creator applications", metrics.creators7d)}
      ${statBlock("Active creators", metrics.activeCreators7d)}
      ${statBlock("Transactions", metrics.transactions7d)}
      ${statBlock("Gross volume", `$${metrics.grossVolume7d.toFixed(2)}`)}
      ${statBlock("Connected followers", metrics.socialFollowersTotal)}
      ${statBlock("Hot/VIP leads", metrics.hotLeads)}
      ${statBlock("Open email sequences", metrics.openEmailEnrollments)}
    </table>

    <div style="margin-top:28px" class="section-lbl">Week Over Week</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${statBlock("Active creators delta", `${sign(activeDelta)}${activeDelta.toFixed(1)}%`)}
      ${statBlock("Transactions delta", `${sign(txDelta)}${txDelta.toFixed(1)}%`)}
      ${statBlock("Gross volume delta", `${sign(grossDelta)}${grossDelta.toFixed(1)}%`)}
    </table>

    <div style="margin-top:32px;" class="section-lbl">AI Operator Summary</div>
    <div class="ai-box">${aiSummary}</div>
  </div>
  <div class="ftr">Mansas Moguls · Weekly Operator Digest</div>
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
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    waitlist7dRes,
    creators7dRes,
    activeCreators7dRes,
    activeCreatorsPrev7dRes,
    tx7dRes,
    txPrev7dRes,
    followersRes,
    hotLeadsRes,
    openEnrollmentsRes,
  ] = await Promise.all([
    db.from("waitlist").select("id", { count: "exact", head: true }).gte("created_at", start7d.toISOString()),
    db.from("creator_applications").select("id", { count: "exact", head: true }).gte("created_at", start7d.toISOString()),
    db.from("creators").select("id", { count: "exact", head: true }).gte("updated_at", start7d.toISOString()),
    db.from("creators").select("id", { count: "exact", head: true }).gte("updated_at", start14d.toISOString()).lt("updated_at", start7d.toISOString()),
    db.from("transactions").select("amount,created_at").gte("created_at", start7d.toISOString()),
    db.from("transactions").select("amount,created_at").gte("created_at", start14d.toISOString()).lt("created_at", start7d.toISOString()),
    db.from("social_connections").select("followers"),
    db.from("lead_scores").select("id", { count: "exact", head: true }).in("tier", ["hot", "vip"]),
    db.from("email_sequence_enrollments").select("id", { count: "exact", head: true }).eq("completed", false).eq("unsubscribed", false),
  ]);

  const gross7d = (tx7dRes.data ?? []).reduce((sum: number, row: { amount?: number | null }) => sum + Number(row.amount ?? 0), 0);
  const grossPrev7d = (txPrev7dRes.data ?? []).reduce((sum: number, row: { amount?: number | null }) => sum + Number(row.amount ?? 0), 0);

  const metrics: WeeklyMetrics = {
    waitlist7d: waitlist7dRes.count ?? 0,
    creators7d: creators7dRes.count ?? 0,
    activeCreators7d: activeCreators7dRes.count ?? 0,
    activeCreatorsPrev7d: activeCreatorsPrev7dRes.count ?? 0,
    transactions7d: tx7dRes.data?.length ?? 0,
    transactionsPrev7d: txPrev7dRes.data?.length ?? 0,
    grossVolume7d: gross7d,
    grossVolumePrev7d: grossPrev7d,
    socialFollowersTotal: (followersRes.data ?? []).reduce((sum: number, row: { followers?: number | null }) => sum + Number(row.followers ?? 0), 0),
    hotLeads: hotLeadsRes.count ?? 0,
    openEmailEnrollments: openEnrollmentsRes.count ?? 0,
  };

  const aiSummary = await generateAISummary(metrics);

  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const rangeLabel = `${dateFmt.format(start7d)} - ${dateFmt.format(now)}`;
  const html = buildDigestHtml(metrics, aiSummary, rangeLabel);

  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: founderEmail,
    subject: `Mansas Moguls Weekly Digest - ${rangeLabel}`,
    html,
  });

  if (sendErr) {
    return NextResponse.json({ error: "Failed to send weekly digest", detail: sendErr.message }, { status: 500 });
  }

  await db.from("marketing_events").insert({
    event_type: "weekly_digest_sent",
    metadata: { recipient: founderEmail, range: rangeLabel, metrics },
  });

  return NextResponse.json({ sent: true, recipient: founderEmail, range: rangeLabel, metrics });
}
