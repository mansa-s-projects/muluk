// POST /api/marketing/enroll  — manually enroll an email in a sequence
// GET  /api/marketing/enroll  — get enrollment status for an email
// Both require service-role (SUPABASE_SERVICE_ROLE_KEY) or admin session

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

type EnrollBody = {
  email: string;
  sequence_name: string;
  metadata?: Record<string, unknown>;
};

type SequenceStep = {
  delay_hours: number;
};

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Option 1: internal service-role header (machine-to-machine)
  const serviceKey = req.headers.get("x-service-key");
  if (serviceKey && serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY) return true;

  // Option 2: admin session cookie
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const db = createServiceClient();
    const { data: admin } = await db
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    return admin !== null;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EnrollBody;
  try {
    body = (await req.json()) as EnrollBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, sequence_name, metadata = {} } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!sequence_name) {
    return NextResponse.json({ error: "sequence_name is required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Verify the sequence exists and has active steps
  const { data: firstStep, error: stepErr } = await db
    .from("email_sequence_steps")
    .select("delay_hours")
    .eq("sequence_name", sequence_name)
    .eq("step_number", 1)
    .eq("is_active", true)
    .maybeSingle();

  if (stepErr) {
    return NextResponse.json({ error: "Failed to validate sequence" }, { status: 500 });
  }
  if (!firstStep) {
    return NextResponse.json(
      { error: `Sequence '${sequence_name}' not found or has no active steps` },
      { status: 404 }
    );
  }

  const now = new Date();
  const step = firstStep as SequenceStep;
  const nextSendAt = new Date(now.getTime() + step.delay_hours * 60 * 60 * 1000).toISOString();

  const { data: enrollment, error: upsertErr } = await db
    .from("email_sequence_enrollments")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        sequence_name,
        current_step: 0,
        enrolled_at: now.toISOString(),
        next_send_at: nextSendAt,
        completed: false,
        unsubscribed: false,
        metadata,
      },
      { onConflict: "email,sequence_name" }
    )
    .select()
    .single();

  if (upsertErr) {
    return NextResponse.json({ error: "Failed to enroll email", detail: upsertErr.message }, { status: 500 });
  }

  await db.from("marketing_events").insert({
    event_type: "manual_sequence_enrollment",
    email: email.toLowerCase().trim(),
    metadata: { sequence: sequence_name, next_send_at: nextSendAt },
  });

  return NextResponse.json({ success: true, enrollment }, { status: 200 });
}

export async function GET(req: NextRequest) {
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const sequenceName = searchParams.get("sequence");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email query param is required" }, { status: 400 });
  }

  const db = createServiceClient();
  let query = db
    .from("email_sequence_enrollments")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .order("enrolled_at", { ascending: false });

  if (sequenceName) {
    query = query.eq("sequence_name", sequenceName);
  }

  const { data: enrollments, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ email, enrollments: [] }, { status: 200 });
  }

  // Enrich with lead score
  const { data: leadScore } = await db
    .from("lead_scores")
    .select("score, tier, last_activity")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({
    email,
    enrollments,
    lead_score: leadScore ?? null,
  });
}
