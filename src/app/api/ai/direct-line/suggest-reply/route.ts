import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fanName, lastMessages, fanSpend, fanStatus } = body as {
    fanName: string;
    lastMessages: { body: string; isOwn: boolean }[];
    fanSpend: number;
    fanStatus: string;
  };

  if (!lastMessages?.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const transcript = lastMessages
    .slice(-6)
    .map((m) => `${m.isOwn ? "You" : fanName || "Fan"}: ${m.body}`)
    .join("\n");

  const prompt = `You are a creator's assistant helping draft short, natural DM replies to fans.

Fan profile:
- Name: ${fanName || "Anonymous"}
- Total spent: $${((fanSpend ?? 0) / 100).toFixed(0)}
- Status: ${fanStatus || "unknown"}

Recent conversation:
${transcript}

Write 3 short reply options (1–2 sentences each). Be warm but professional. Return ONLY a JSON array of 3 strings, no other text.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://muluk.vip",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error("[suggest-reply] OpenRouter error", await res.text());
      return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ suggestions: [text.slice(0, 200)] });

    const suggestions: string[] = JSON.parse(match[0]);
    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error("[suggest-reply] error", err);
    return NextResponse.json({ error: "AI error" }, { status: 503 });
  }
}
