import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "Voice cloning not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const files = formData.getAll("files") as File[];

  if (!name || files.length === 0) {
    return NextResponse.json({ error: "Name and audio files are required" }, { status: 400 });
  }

  const payload = new FormData();
  payload.append("name", name);
  if (description) payload.append("description", description);
  files.forEach((file) => payload.append("files", file));

  const upstream = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: payload,
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ error: err || "Failed to clone voice" }, { status: 502 });
  }

  const voice = await upstream.json();

  let record: { id?: string; voice_id?: string; name?: string } | null = null;
  try {
    const { data } = await supabase
      .from("voice_clones")
      .insert({
        creator_id: user.id,
        voice_id: voice.voice_id,
        name,
        description: description || null,
        samples_count: files.length,
        category: voice.category || "cloned",
        is_legacy: Boolean(voice.is_legacy),
      })
      .select("id, voice_id, name")
      .single();
    record = data;
  } catch {
    // If table is missing, still return upstream result.
  }

  return NextResponse.json({
    success: true,
    voice: {
      id: record?.id || voice.voice_id,
      voice_id: record?.voice_id || voice.voice_id,
      name: record?.name || name,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voiceId = new URL(req.url).searchParams.get("voiceId");
  if (!voiceId) {
    return NextResponse.json({ error: "voiceId is required" }, { status: 400 });
  }

  try {
    const { data: row } = await supabase
      .from("voice_clones")
      .select("voice_id")
      .eq("id", voiceId)
      .eq("creator_id", user.id)
      .single();

    if (row?.voice_id && ELEVENLABS_API_KEY) {
      await fetch(`${ELEVENLABS_API_URL}/voices/${row.voice_id}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      });
    }

    await supabase.from("voice_clones").delete().eq("id", voiceId).eq("creator_id", user.id);
  } catch {
    // Continue to avoid blocking client cleanup.
  }

  return NextResponse.json({ success: true });
}
