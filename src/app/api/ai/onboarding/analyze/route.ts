import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      interests = [], 
      contentTypes = [], 
      experience = "beginner",
      currentPlatforms = [],
      followerCounts = {},
      goals = []
    } = body;

    const prompt = `Analyze this creator profile and provide strategic onboarding recommendations.

CREATOR INPUT:
- Interests: ${interests.join(", ") || "Not specified"}
- Content Types: ${contentTypes.join(", ") || "Not specified"}
- Experience Level: ${experience}
- Current Platforms: ${currentPlatforms.join(", ") || "None"}
- Follower Counts: ${JSON.stringify(followerCounts)}
- Goals: ${goals.join(", ") || "Not specified"}

Provide analysis in this exact format:

NICHE: [primary category from: luxury, fitness, music, art, fashion, gaming, education, tech, food, travel, other]
CONFIDENCE: [0-100]%
SUB_NICHES: [3 specific micro-niches, comma separated]

HANDLE_SUGGESTIONS: [5 handle ideas, one per line]

PRICING_RECOMMENDATION: $[amount]
PRICING_RATIONALE: [one sentence explaining why]

CONTENT_PILLARS:
1. [pillar name]: [description]
2. [pillar name]: [description]
3. [pillar name]: [description]

TARGET_AUDIENCE:
- Primary: [demographic description]
- Psychographics: [3 traits]
- Pain Points: [what they want solved]

PLATFORM_PRIORITY: [ordered list of best platforms for this creator]
FIRST_30_DAYS: [3 specific action items]`;

    const { stream } = await aiRouter.streamCompletion("niche_recommendation", prompt);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const extract = (key: string) => {
      const regex = new RegExp(`${key}:\\s*([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, "i");
      const match = fullText.match(regex);
      return match?.[1]?.trim() || "";
    };

    const extractList = (key: string) => {
      const section = extract(key);
      return section.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    };

    const analysis = {
      niche: extract("NICHE"),
      confidence: extract("CONFIDENCE"),
      subNiches: extract("SUB_NICHES").split(",").map(s => s.trim()).filter(Boolean),
      handleSuggestions: extractList("HANDLE_SUGGESTIONS"),
      pricing: {
        recommendation: extract("PRICING_RECOMMENDATION"),
        rationale: extract("PRICING_RATIONALE"),
      },
      contentPillars: extract("CONTENT_PILLARS")
        .split(/\d+\./)
        .map(s => s.trim())
        .filter(Boolean)
        .map(p => {
          const [name, desc] = p.split(":").map(s => s.trim());
          return { name: name || p, description: desc || "" };
        }),
      targetAudience: {
        primary: extract("TARGET_AUDIENCE").match(/Primary:\s*(.+)/)?.[1]?.trim() || "",
        psychographics: extract("TARGET_AUDIENCE").match(/Psychographics:\s*(.+)/)?.[1]?.split(",").map(s => s.trim()) || [],
        painPoints: extract("TARGET_AUDIENCE").match(/Pain Points:\s*(.+)/)?.[1]?.trim() || "",
      },
      platformPriority: extract("PLATFORM_PRIORITY").split(",").map(s => s.trim()).filter(Boolean),
      first30Days: extract("FIRST_30_DAYS")
        .split(/\d+\./)
        .map(s => s.trim())
        .filter(Boolean),
      rawAnalysis: fullText,
    };

    await supabase.from("creator_onboarding").upsert({
      user_id: user.id,
      analysis: analysis,
      interests,
      content_types: contentTypes,
      experience_level: experience,
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Onboarding analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
