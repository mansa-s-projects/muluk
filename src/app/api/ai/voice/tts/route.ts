import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeatureAccess, TierGateError, tierGatePayload } from "@/lib/tiers";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const DEFAULT_VOICES = [
  { id: "rachel", voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", is_default: true },
  { id: "adam", voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", is_default: true },
  { id: "antoni", voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", is_default: true },
  { id: "bella", voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", is_default: true },
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: clonedVoices } = await supabase
      .from("voice_clones")
      .select("id, voice_id, name, description")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      default_voices: DEFAULT_VOICES,
      cloned_voices: clonedVoices ?? [],
    });
  } catch {
    return NextResponse.json({
      default_voices: DEFAULT_VOICES,
      cloned_voices: [],
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Tier gate: ai_tools requires legend+ ────────────────────────────────
  try {
    await assertFeatureAccess(user.id, "ai_tools", supabase);
  } catch (e) {
    if (e instanceof TierGateError) return NextResponse.json(tierGatePayload(e), { status: 403 });
    throw e;
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "Voice generation not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  const voiceId = String(body.voiceId ?? "").trim();
  const stability = Number(body.stability ?? 0.5);
  const similarityBoost = Number(body.similarityBoost ?? 0.75);

  if (!text || !voiceId) {
    return NextResponse.json({ error: "Text and voiceId are required" }, { status: 400 });
  }

  if (text.length > 5000) {
    return NextResponse.json({ error: "Text exceeds 5000 characters" }, { status: 400 });
  }

  const upstream = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ error: err || "Failed to generate speech" }, { status: 502 });
  }

  const audioBuffer = await upstream.arrayBuffer();

  try {
    await supabase.from("voice_generations").insert({
      creator_id: user.id,
      voice_id: voiceId,
      text: text.slice(0, 500),
      text_length: text.length,
      model: "eleven_monolingual_v1",
    });
  } catch {
    // Non-blocking logging path.
  }

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
