import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rawSlug = String((body as Record<string, unknown>).slug ?? "").trim().toLowerCase();

  if (!rawSlug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }
  if (!SLUG_PATTERN.test(rawSlug)) {
    return NextResponse.json(
      { error: "Slug must be 3–30 chars, lowercase letters/numbers/hyphens/underscores, and start with a letter or number" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // Check uniqueness (case-insensitive) — exclude the current user's row
  const { data: existing } = await serviceClient
    .from("creator_applications")
    .select("user_id")
    .ilike("referral_slug", rawSlug)
    .neq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "That slug is already taken. Try another." }, { status: 409 });
  }

  // Also check against handles (slug can't collide with someone else's handle)
  const { data: handleConflict } = await serviceClient
    .from("creator_applications")
    .select("user_id")
    .ilike("handle", rawSlug)
    .neq("user_id", user.id)
    .maybeSingle();

  if (handleConflict) {
    return NextResponse.json({ error: "That slug conflicts with another creator's handle." }, { status: 409 });
  }

  const { error } = await serviceClient
    .from("creator_applications")
    .update({ referral_slug: rawSlug })
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken. Try another." }, { status: 409 });
    }
    console.error("referral/customize error:", error);
    return NextResponse.json({ error: "Could not update slug" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug: rawSlug });
}
