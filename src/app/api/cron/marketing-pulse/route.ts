// POST /api/cron/marketing-pulse
// Runs every hour. Enrolls new waitlist signups, sends due email sequence steps.
// Triggered by cron scheduler with Authorization: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com";
const FROM = "Mansas Moguls <growth@mansasmoguls.com>";

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

function interpolateTemplate(html: string, email: string): string {
  const unsubUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return html
    .replace(/\{\{SITE_URL\}\}/g, SITE_URL)
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl)
    .replace(/\{\{EMAIL\}\}/g, email);
}

type SequenceStep = {
  id: string;
  sequence_name: string;
  step_number: number;
  delay_hours: number;
  subject: string;
  preview_text: string | null;
  body_html: string;
  cta_text: string | null;
  cta_url: string | null;
  is_active: boolean;
};

type Enrollment = {
  id: string;
  email: string;
  sequence_name: string;
  current_step: number;
};

type WaitlistRow = { email: string };

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  let processed = 0;
  let emailsSent = 0;
  const errors: string[] = [];

  // ── 1. Enroll new waitlist signups into waitlist_nurture ───────────────────
  const { data: newSignups, error: waitlistErr } = await db
    .from("waitlist")
    .select("email")
    .gte("created_at", oneHourAgo);

  if (waitlistErr) {
    errors.push(`waitlist_fetch: ${waitlistErr.message}`);
  } else if (newSignups && newSignups.length > 0) {
    const emails = (newSignups as WaitlistRow[]).map((r) => r.email);

    // Only enroll emails not already in the sequence
    const { data: existing } = await db
      .from("email_sequence_enrollments")
      .select("email")
      .eq("sequence_name", "waitlist_nurture")
      .in("email", emails);

    const alreadyEnrolled = new Set((existing ?? []).map((r: { email: string }) => r.email));
    const toEnroll = emails.filter((e) => !alreadyEnrolled.has(e));

    if (toEnroll.length > 0) {
      const enrollRows = toEnroll.map((email) => ({
        email,
        sequence_name: "waitlist_nurture",
        current_step: 0,
        enrolled_at: now.toISOString(),
        next_send_at: now.toISOString(), // step 1 fires immediately
        completed: false,
        unsubscribed: false,
      }));

      const { error: enrollErr } = await db
        .from("email_sequence_enrollments")
        .insert(enrollRows);

      if (enrollErr) {
        errors.push(`enrollment_insert: ${enrollErr.message}`);
      } else {
        processed += toEnroll.length;
        await db.from("marketing_events").insert(
          toEnroll.map((email) => ({
            event_type: "sequence_enrolled",
            email,
            metadata: { sequence: "waitlist_nurture", triggered_by: "cron_marketing_pulse" },
          }))
        );
      }
    }
  }

  // ── 2. Send due email sequence steps ──────────────────────────────────────
  const { data: dueEnrollments, error: dueErr } = await db
    .from("email_sequence_enrollments")
    .select("id, email, sequence_name, current_step")
    .lte("next_send_at", now.toISOString())
    .eq("completed", false)
    .eq("unsubscribed", false)
    .limit(100); // process up to 100 per tick to avoid timeout

  if (dueErr) {
    errors.push(`due_enrollments_fetch: ${dueErr.message}`);
  } else if (dueEnrollments && dueEnrollments.length > 0) {
    for (const enrollment of dueEnrollments as Enrollment[]) {
      const nextStepNumber = enrollment.current_step + 1;

      const { data: stepData, error: stepErr } = await db
        .from("email_sequence_steps")
        .select("*")
        .eq("sequence_name", enrollment.sequence_name)
        .eq("step_number", nextStepNumber)
        .eq("is_active", true)
        .maybeSingle();

      if (stepErr) {
        errors.push(`step_fetch:${enrollment.id}: ${stepErr.message}`);
        continue;
      }

      // No more steps — mark sequence complete
      if (!stepData) {
        await db
          .from("email_sequence_enrollments")
          .update({ completed: true })
          .eq("id", enrollment.id);

        await db.from("marketing_events").insert({
          event_type: "sequence_completed",
          email: enrollment.email,
          metadata: { sequence: enrollment.sequence_name },
        });
        continue;
      }

      const step = stepData as SequenceStep;

      // Send the email
      const html = interpolateTemplate(step.body_html, enrollment.email);
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: enrollment.email,
        subject: step.subject,
        html,
      });

      if (sendErr) {
        errors.push(`send:${enrollment.id}: ${sendErr.message}`);
        await db.from("marketing_events").insert({
          event_type: "sequence_email_failed",
          email: enrollment.email,
          metadata: {
            sequence: enrollment.sequence_name,
            step: nextStepNumber,
            error: sendErr.message,
          },
        });
        continue;
      }

      emailsSent += 1;

      // Look ahead to the next step to calculate next_send_at
      const { data: followingStep } = await db
        .from("email_sequence_steps")
        .select("delay_hours")
        .eq("sequence_name", enrollment.sequence_name)
        .eq("step_number", nextStepNumber + 1)
        .eq("is_active", true)
        .maybeSingle();

      const nextSendAt = followingStep
        ? new Date(now.getTime() + followingStep.delay_hours * 60 * 60 * 1000).toISOString()
        : null;

      await db
        .from("email_sequence_enrollments")
        .update({
          current_step: nextStepNumber,
          next_send_at: nextSendAt,
          completed: nextSendAt === null,
        })
        .eq("id", enrollment.id);

      await db.from("marketing_events").insert({
        event_type: "sequence_email_sent",
        email: enrollment.email,
        metadata: {
          sequence: enrollment.sequence_name,
          step: nextStepNumber,
          subject: step.subject,
        },
      });
    }
  }

  return NextResponse.json({
    processed,
    emails_sent: emailsSent,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
