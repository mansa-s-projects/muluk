// POST /api/intelligence/brief
// AI Analyst: generates personalized creator intelligence brief via OpenRouter.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function callAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
      "X-Title": "Mansas Moguls Intelligence",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet-20241022",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [intelligenceRes, connectionsRes, profileRes] = await Promise.all([
    supabase.from("creator_intelligence").select("*").eq("creator_id", user.id).maybeSingle(),
    supabase.from("social_connections").select("platform, platform_username, follower_count, metrics").eq("creator_id", user.id),
    supabase.from("creator_applications").select("name, handle, category").eq("user_id", user.id).maybeSingle(),
  ]);

  const intel = intelligenceRes.data;
  const connections = connectionsRes.data ?? [];
  const profile = profileRes.data;

  if (!intel && connections.length === 0) {
    return NextResponse.json({
      insights: ["Connect your social accounts to unlock AI analysis."],
      recommendations: ["Start by linking Instagram, TikTok, or YouTube from the Integrations page."],
      opportunities: [],
      warning: null,
    });
  }

  const context = `
Creator: ${profile?.name ?? "Unknown"} (@${profile?.handle ?? "unknown"}) — niche: ${profile?.category ?? "general"}
Health Score: ${intel?.health_score ?? 0}/100 | Growth: ${intel?.growth_score ?? 0}/100 | Engagement: ${intel?.engagement_score ?? 0}/100
Monetization Score: ${intel?.monetization_score ?? 0}/100 | Total Followers: ${(intel?.total_followers ?? 0).toLocaleString()}
Top Platform: ${intel?.top_platform ?? "none"} | Weekly Growth: ${intel?.weekly_growth_pct ?? 0}%
Connected: ${connections.map(c => `${c.platform}(${c.follower_count?.toLocaleString() ?? 0})`).join(", ")}
`.trim();

  const prompt = `You are the Mansas Moguls AI Analyst — the world's sharpest creator intelligence system. Analyze this creator's data and generate a precise, executive-level intelligence brief. Be specific and data-driven. No fluff. No filler.

${context}

Return ONLY valid JSON:
{
  "insights": ["3-5 sharp insights about performance"],
  "recommendations": ["3-5 specific ranked action items"],
  "opportunities": ["2-3 monetization/growth opportunities they are missing"],
  "warning": "one critical risk or null"
}`;

  const raw = await callAI(prompt);
  if (!raw) {
    return NextResponse.json({
      insights: ["AI analysis requires OPENROUTER_API_KEY to be configured."],
      recommendations: ["Add OPENROUTER_API_KEY to your environment variables."],
      opportunities: [],
      warning: null,
    });
  }

  try {
    // Strip markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as {
      insights: string[];
      recommendations: string[];
      opportunities: string[];
      warning: string | null;
    };

    await supabase
      .from("creator_intelligence")
      .upsert({
        creator_id: user.id,
        ai_insights: parsed.insights,
        ai_recommendations: parsed.recommendations,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "creator_id" });

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
  }
}
