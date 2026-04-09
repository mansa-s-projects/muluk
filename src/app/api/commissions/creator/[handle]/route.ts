/**
 * POST /api/commissions/creator/[handle]
 * Fan submits a commission request (no auth required)
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { fan_email, fan_name, title, description, budget_cents, deadline } = body;

  if (!fan_email || !title || !description || !budget_cents) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (typeof title !== "string" || typeof description !== "string") {
    return NextResponse.json({ error: "title and description must be strings" }, { status: 400 });
  }
  if (fan_name !== undefined && fan_name !== null && typeof fan_name !== "string") {
    return NextResponse.json({ error: "fan_name must be a string" }, { status: 400 });
  }
  if (typeof budget_cents !== "number" || budget_cents < 100) {
    return NextResponse.json({ error: "Minimum budget $1" }, { status: 400 });
  }
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fan_email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = getService();
  const clean = handle.replace(/^@/, "").toLowerCase();

  // Resolve creator by handle
  const { data: creator, error: creatorError } = await supabase
    .from("creator_applications")
    .select("user_id, name")
    .eq("handle", clean)
    .eq("status", "approved")
    .maybeSingle();

  if (creatorError) {
    console.error("[commissions] creator lookup failed:", creatorError);
    return NextResponse.json({ error: "Failed to resolve creator" }, { status: 500 });
  }

  if (!creator?.user_id) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { data: commission, error } = await supabase
    .from("commissions")
    .insert({
      creator_id:   creator.user_id,
      fan_email:    fan_email.toLowerCase().trim(),
      fan_name:     fan_name?.trim() || null,
      title:        title.trim().slice(0, 200),
      description:  description.trim().slice(0, 2000),
      budget_cents: Math.round(budget_cents),
      deadline:     deadline || null,
    })
    .select("id, access_token, status")
    .single();

  if (error) {
    console.error("[commissions] insert error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  return NextResponse.json({
    id:           commission.id,
    access_token: commission.access_token,
    status:       commission.status,
  }, { status: 201 });
}