// POST /api/cron/viral-amplify
// Runs every 6 hours. Amplifies the viral loop:
// 1. Identifies top referrers and sends celebration emails
// 2. Generates social proof notifications for new signups
// 3. Triggers referral reward processing
// 4. Sends waitlist position updates to engaged leads

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const FROM = "Mansas Moguls <growth@mansasmoguls.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com";

function auth(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  return token === process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const results: Record<string, number> = { referral_emails: 0, position_updates: 0, content_queued: 0 };

  // 1. Top referrers this week — send them a nudge/celebration
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: topReferrers } = await db
    .from("referrals")
    .select("creator_handle, clicks, conversions")
    .gte("created_at", weekAgo)
    .order("conversions", { ascending: false })
    .limit(10);

  for (const ref of topReferrers ?? []) {
    if ((ref.conversions ?? 0) >= 3 && resend) {
      // Get creator email
      const { data: app } = await db
        .from("creator_applications")
        .select("email, name")
        .eq("handle", ref.creator_handle)
        .maybeSingle();

      if (app?.email) {
        await resend.emails.send({
          from: FROM,
          to: app.email,
          subject: `🔥 You referred ${ref.conversions} new operators this week`,
          html: `<div style="background:#020203;color:rgba(255,255,255,0.88);padding:40px;font-family:sans-serif;">
            <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;color:#c8a96e;">MANSAS MOGULS</p>
            <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:rgba(255,255,255,0.9);">You're building an empire, ${app.name?.split(" ")[0] ?? "Creator"}.</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.8;">Your referral link brought in <strong style="color:#c8a96e">${ref.conversions} new operators</strong> this week.<br/>
            Keep sharing. Keep earning.</p>
            <a href="${SITE}/dashboard" style="display:inline-block;background:#c8a96e;color:#0a0800;padding:12px 24px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:3px;margin-top:20px;">View Your Empire →</a>
          </div>`,
        });
        results.referral_emails++;
      }
    }
  }

  // 2. Send waitlist position updates to hot leads who haven't opened emails in 48h
  const day2 = new Date(Date.now() - 2 * 86400000).toISOString();
  const { data: hotLeads } = await db
    .from("lead_scores")
    .select("email, score")
    .in("tier", ["hot", "vip"])
    .lt("last_activity", day2)
    .limit(50);

  const { count: waitlistCount } = await db
    .from("waitlist")
    .select("id", { count: "exact", head: true });

  for (const lead of hotLeads ?? []) {
    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: lead.email,
        subject: `${waitlistCount ?? "Thousands"} operators are building their empires`,
        html: `<div style="background:#020203;color:rgba(255,255,255,0.88);padding:40px;font-family:sans-serif;">
          <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.3em;color:#c8a96e;">MANSAS MOGULS</p>
          <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:300;">The queue is moving.</h2>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.8;">
            ${waitlistCount ?? "Thousands"} operators are already on the list.<br/>
            The founding creator cohort locks in at 500 spots.
          </p>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.8;">Refer a friend to move up the queue instantly.</p>
          <a href="${SITE}" style="display:inline-block;background:#c8a96e;color:#0a0800;padding:12px 24px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:3px;margin-top:20px;">Claim Your Spot →</a>
        </div>`,
      });
      results.position_updates++;

      // Update last_activity so we don't re-send for 48h
      await db.from("lead_scores").update({ last_activity: new Date().toISOString() }).eq("email", lead.email);
    }
  }

  // 3. Queue social proof content about platform momentum
  const momentumContent = [
    `The creator economy is $250B. Platforms take 30–50%. We take 12%. The math is clear. #MansasMoguls #CreatorEconomy`,
    `Most creator platforms own your audience. We give it back to you. Your followers. Your data. Your empire.`,
    `88% payout. Anonymous supporter codes. Crypto rails to 190 countries. This is what creator infrastructure should look like.`,
  ];

  for (const content of momentumContent) {
    await db.from("marketing_content_queue").insert({
      platform: "twitter",
      content,
      status: "pending",
      scheduled_at: new Date(Date.now() + Math.random() * 6 * 3600000).toISOString(),
      ai_model: "curated",
    });
    results.content_queued++;
  }

  await db.from("marketing_events").insert({
    event_type: "viral_amplify_run",
    metadata: results,
  });

  return NextResponse.json({ success: true, ...results, timestamp: new Date().toISOString() });
}
