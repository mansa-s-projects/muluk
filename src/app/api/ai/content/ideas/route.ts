import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";
import { assertFeatureAccess, TierGateError, tierGatePayload } from "@/lib/tiers";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Tier gate: ai_tools requires legend+ ────────────────────────────────
    try {
      await assertFeatureAccess(user.id, "ai_tools", supabase);
    } catch (e) {
      if (e instanceof TierGateError) return NextResponse.json(tierGatePayload(e), { status: 403 });
      throw e;
    }

    const { data: profile } = await supabase
      .from("creator_applications")
      .select("category, bio")
      .eq("user_id", user.id)
      .single();

    const { data: pastContent } = await supabase
      .from("content_items")
      .select("title, description, type, price, status")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const body = await req.json();
    const { contentPillars = [], trendingTopics = [], count = 7 } = body;

    const category = profile?.category || "luxury";
    const pastTitles = pastContent?.map(c => c.title).join(", ") || "None yet";

    const prompt = `Generate ${count} content ideas for a ${category} creator.

CREATOR CONTEXT:
- Category: ${category}
- Bio: ${profile?.bio || "Not specified"}
- Content Pillars: ${contentPillars.join(", ") || "Not defined"}
- Past Content: ${pastTitles}
- Trending Topics: ${trendingTopics.join(", ") || "None specified"}

For each idea provide:
- Title (hook-driven)
- Content type (photo series, video, carousel, story, reel, exclusive drop)
- Brief description (2 sentences)
- Platform optimization (Instagram, TikTok, Twitter/X, or MULUK exclusive)
- Estimated engagement level (high/medium/low with reason)
- Monetization angle (tip, unlock, subscription, or free growth content)

Format each idea as:
DAY [number]: [TITLE]
Type: [type]
Description: [description]
Platform: [platform]
Engagement: [level] - [reason]
Monetization: [strategy]
---`;

    const { stream } = await aiRouter.streamCompletion("content_ideas", prompt);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const ideas = fullText.split(/---/).map(block => {
      const lines = block.trim().split("\n");
      const dayMatch = lines[0]?.match(/DAY\s*\d+:\s*(.+)/i);
      return {
        title: dayMatch?.[1] || lines[0] || "Untitled",
        type: lines.find(l => l.includes("Type:"))?.replace("Type:", "").trim() || "post",
        description: lines.find(l => l.includes("Description:"))?.replace("Description:", "").trim() || "",
        platform: lines.find(l => l.includes("Platform:"))?.replace("Platform:", "").trim() || "general",
        engagement: lines.find(l => l.includes("Engagement:"))?.replace("Engagement:", "").trim() || "medium",
        monetization: lines.find(l => l.includes("Monetization:"))?.replace("Monetization:", "").trim() || "free",
        raw: block.trim(),
      };
    }).filter(i => i.title && i.title !== "Untitled");

    const now = new Date();
    const calendarEntries = ideas.slice(0, count).map((idea, idx) => ({
      creator_id: user.id,
      title: idea.title,
      description: idea.description,
      type: idea.type,
      status: "idea",
      scheduled_for: new Date(now.getTime() + (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
      ai_generated: true,
      metadata: { platform: idea.platform, engagement: idea.engagement, monetization: idea.monetization },
    }));

    if (calendarEntries.length > 0) {
      await supabase.from("content_items").insert(calendarEntries);
    }

    return NextResponse.json({ 
      success: true, 
      ideas,
      savedToCalendar: calendarEntries.length,
    });
  } catch (error) {
    console.error("Content ideas generation failed:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
