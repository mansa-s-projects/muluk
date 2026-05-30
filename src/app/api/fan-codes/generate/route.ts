import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Unambiguous uppercase alphanumeric chars (no 0/O, 1/I/L)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_ATTEMPTS = 8;

function genSegment(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

function genCode(): string {
  return `${genSegment(4)}-${genSegment(4)}`;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try generating a unique code with retry on collision
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = genCode();

    const { data: existing } = await supabase
      .from("fan_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existing) continue; // collision — retry

    const { data: inserted, error } = await supabase
      .from("fan_codes")
      .insert({
        code,
        creator_id: user.id,
        status: "active",
        tags: [],
        is_vip: false,
      })
      .select("id, code, status, created_at, custom_name, creator_notes, tags, is_vip")
      .single();

    if (error) {
      console.error("fan-codes/generate insert error:", error);
      return NextResponse.json({ error: "Could not generate code" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fanCode: inserted });
  }

  return NextResponse.json({ error: "Could not generate a unique code — try again" }, { status: 500 });
}
