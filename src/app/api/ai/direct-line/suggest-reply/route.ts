// POST /api/ai/direct-line/suggest-reply
// Generates 3 creator reply suggestions based on recent supporter thread context.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SuggestBody = {
  supporterCode?: string;
  latestMessage?: string;
  tone?: "warm" | "premium" | "direct";
};

async function callAI(prompt: string): Promise<string[] | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
      "X-Title": "Mansas Moguls Direct Line",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  try {
    const parsed = JSON.parse(clean) as { suggestions?: string[] };
    const suggestions = (parsed.suggestions ?? []).map(s => s.trim()).filter(Boolean).slice(0, 3);
    return suggestions.length ? suggestions : null;
  } catch {
    // Fallback: parse as lines if model did not return strict JSON.
    const suggestions = clean
      .split("\n")
      .map(l => l.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    return suggestions.length ? suggestions : null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SuggestBody;
    const supporterCode = String(body.supporterCode ?? "").trim().toUpperCase();
    const latestMessage = String(body.latestMessage ?? "").trim();
    const tone = (body.tone ?? "warm") as "warm" | "premium" | "direct";

    if (!supporterCode && !latestMessage) {
      return NextResponse.json(
        { error: "supporterCode or latestMessage is required" },
        { status: 400 }
      );
    }

    let threadContext = "";

    if (supporterCode) {
      const { data: supporterData } = await supabase
        .from("supporter_codes")
        .select("creator_id")
        .eq("code", supporterCode)
        .single();

      if (supporterData?.creator_id !== user.id) {
        return NextResponse.json({ error: "Invalid supporter code" }, { status: 403 });
      }

      const { data: messages } = await supabase
        .from("supporter_messages")
        .select("content, from_creator, created_at")
        .eq("creator_id", user.id)
        .eq("supporter_code", supporterCode)
        .order("created_at", { ascending: false })
        .limit(12);

      const ordered = [...(messages ?? [])].reverse();
      threadContext = ordered
        .map((m, i) => `${i + 1}. ${m.from_creator ? "Creator" : "Supporter"}: ${m.content}`)
        .join("\n");
    }

    const userSignal = latestMessage || "No explicit latest message provided";
    const toneGuide: Record<string, string> = {
      warm: "Friendly, reassuring, human.",
      premium: "Confident, high-value, polished.",
      direct: "Concise, clear, action-oriented.",
    };

    const prompt = `You are writing reply drafts for a creator in a private supporter chat.

Tone: ${toneGuide[tone]}

Thread context:
${threadContext || "No prior thread context available."}

Latest supporter signal:
${userSignal}

Task:
- Generate exactly 3 distinct reply options.
- Each option must be 1-2 sentences.
- Keep each option under 220 characters.
- Do not sound robotic.
- No emojis unless naturally needed.
- Avoid overpromising.

Return ONLY valid JSON:
{"suggestions":["...","...","..."]}`;

    const suggestions = await callAI(prompt);
    if (!suggestions) {
      return NextResponse.json(
        {
          suggestions: [
            "Appreciate you reaching out. I can help with that, and I will send the best next step shortly.",
            "Thanks for the message. If you share one more detail on what you need most, I can tailor this for you.",
            "Got you. I can prioritize this and send a clear option you can act on right away.",
          ],
          fallback: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ suggestions, fallback: false });
  } catch (error) {
    console.error("Direct Line suggest-reply error:", error);
    return NextResponse.json({ error: "Failed to generate reply suggestions" }, { status: 500 });
  }
}
