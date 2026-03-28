import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeTags(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      rawValues
        .map(tag => String(tag ?? "").trim())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ fan_code: string }> }
) {
  const { fan_code: fanCode } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};

  if ("custom_name" in body || "customName" in body) {
    const customName = String((body as Record<string, unknown>).custom_name ?? (body as Record<string, unknown>).customName ?? "").trim();
    if (customName.length > 50) {
      return NextResponse.json({ error: "Custom name must be 50 characters or fewer" }, { status: 400 });
    }
    payload.custom_name = customName || null;
  }

  if ("notes" in body || "creator_notes" in body) {
    const rawNotes = (body as Record<string, unknown>).notes ?? (body as Record<string, unknown>).creator_notes ?? "";
    payload.creator_notes = String(rawNotes).trim() || null;
  }

  if ("creatorNotes" in body) {
    const rawNotes = (body as Record<string, unknown>).creatorNotes ?? "";
    payload.creator_notes = String(rawNotes).trim() || null;
  }

  if ("tags" in body) {
    payload.tags = normalizeTags((body as Record<string, unknown>).tags);
  }

  if ("is_vip" in body || "isVip" in body) {
    const rawVip = (body as Record<string, unknown>).is_vip ?? (body as Record<string, unknown>).isVip;
    payload.is_vip = rawVip === true || rawVip === "true" || rawVip === 1 || rawVip === "1";
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fan_codes")
    .update(payload)
    .eq("creator_id", user.id)
    .eq("code", fanCode)
    .select("id, code, status, created_at, custom_name, creator_notes, tags, is_vip")
    .maybeSingle();

  if (error) {
    console.error("Fan CRM update failed", error);
    return NextResponse.json({ error: "Could not update fan" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Fan code not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, fan: data });
}