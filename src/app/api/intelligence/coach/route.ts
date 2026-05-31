// POST /api/intelligence/coach
// AI Growth Coach — persistent conversation with context from your analytics.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
      "X-Title": "Mansas Moguls AI Coach",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet-20241022",
      max_tokens: 1000,
      messages,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("ai_coach_sessions")
    .select("id, role, content, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json() as { message: string };
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const db = createServiceClient();

  // Load creator context
  const [scoresRes, connectionsRes, profileRes, historyRes] = await Promise.all([
    supabase.from("moguls_scores").select("*").eq("creator_id", user.id).maybeSingle(),
    supabase.from("social_connections").select("platform, platform_username, follower_count, metrics").eq("creator_id", user.id),
    supabase.from("creator_applications").select("name, handle, category").eq("user_id", user.id).maybeSingle(),
    supabase.from("ai_coach_sessions").select("role, content").eq("creator_id", user.id)
      .order("created_at", { ascending: true }).limit(20),
  ]);

  const scores = scoresRes.data;
  const connections = connectionsRes.data ?? [];
  const profile = profileRes.data;
  const history = historyRes.data ?? [];

  const systemPrompt = `You are the Mansas Moguls AI Growth Coach — the world's most elite creator intelligence advisor. You have deep knowledge of the creator economy, platform algorithms, monetization strategies, audience psychology, and content performance.

Creator Context:
- Name: ${profile?.name ?? "Creator"} (@${profile?.handle ?? "unknown"}) — Niche: ${profile?.category ?? "general"}
- Moguls Score: ${scores?.moguls_score ?? 0}/1000
- Influence Score: ${scores?.influence_score ?? 0}/1000
- Authority Score: ${scores?.authority_score ?? 0}/1000
- Growth Score: ${scores?.growth_score ?? 0}/1000
- Total Followers: ${(scores?.total_followers ?? 0).toLocaleString()}
- Platforms: ${connections.map(c => `${c.platform}(${c.follower_count?.toLocaleString() ?? 0})`).join(", ")}

Be direct, data-driven, and specific. Give advice worth $10,000. No generic tips. Reference their actual numbers.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  // Save user message
  await db.from("ai_coach_sessions").insert({ creator_id: user.id, role: "user", content: message });

  const reply = await callAI(messages);
  if (!reply) return NextResponse.json({ error: "AI Coach unavailable — configure OPENROUTER_API_KEY" }, { status: 503 });

  // Save assistant reply
  await db.from("ai_coach_sessions").insert({ creator_id: user.id, role: "assistant", content: reply });

  return NextResponse.json({ reply });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("ai_coach_sessions").delete().eq("creator_id", user.id);
  return NextResponse.json({ success: true });
}
