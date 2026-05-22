import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

type OnboardingRequestBody = {
  interests?: string[];
  contentTypes?: string[];
  experience?: string;
  currentPlatforms?: string[];
  followerCounts?: Record<string, number>;
  goals?: string[];
};

type OnboardingAnalysis = {
  niche: string;
  confidence: string;
  subNiches: string[];
  handleSuggestions: string[];
  pricing: {
    recommendation: string;
    rationale: string;
  };
  contentPillars: Array<{ name: string; description: string }>;
  targetAudience: {
    primary: string;
    psychographics: string[];
    painPoints: string;
  };
  platformPriority: string[];
  first30Days: string[];
  rawAnalysis: string;
};

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function detectNiche(interests: string[], contentTypes: string[]) {
  const combined = `${interests.join(" ")} ${contentTypes.join(" ")}`.toLowerCase();

  if (/(luxury|watch|jewelry|high fashion|designer)/.test(combined)) return "luxury";
  if (/(fitness|workout|gym|nutrition|body)/.test(combined)) return "fitness";
  if (/(music|artist|dj|producer|song)/.test(combined)) return "music";
  if (/(art|paint|illustration|design)/.test(combined)) return "art";
  if (/(fashion|style|outfit|beauty)/.test(combined)) return "fashion";
  if (/(gaming|stream|esports|game)/.test(combined)) return "gaming";
  if (/(education|tutorial|teach|course)/.test(combined)) return "education";
  if (/(tech|software|startup|ai|code)/.test(combined)) return "tech";
  if (/(food|recipe|chef|cooking)/.test(combined)) return "food";
  if (/(travel|trip|destination|hotel)/.test(combined)) return "travel";

  return "other";
}

function buildFallbackAnalysis({
  interests,
  contentTypes,
  experience,
  currentPlatforms,
  goals,
}: Required<Pick<OnboardingRequestBody, "interests" | "contentTypes" | "experience" | "currentPlatforms" | "goals">>): OnboardingAnalysis {
  const primaryNiche = detectNiche(interests, contentTypes);
  const nicheLabel = titleCase(primaryNiche);
  const firstInterest = interests[0] || nicheLabel;
  const firstContentType = contentTypes[0] || "premium content";
  const topPlatform = currentPlatforms[0] || "instagram";
  const normalizedGoals = goals.length > 0 ? goals : ["first 50 paying fans", "clear premium positioning"];

  return {
    niche: primaryNiche,
    confidence: experience === "advanced" ? "82%" : experience === "intermediate" ? "74%" : "66%",
    subNiches: uniqueList([
      `${titleCase(firstInterest)} insights`,
      `${nicheLabel} behind the scenes`,
      `${titleCase(firstContentType)} exclusives`,
    ]).slice(0, 3),
    handleSuggestions: uniqueList([
      `${String(firstInterest).replace(/\s+/g, "").toLowerCase()}cipher`,
      `${String(firstInterest).replace(/\s+/g, "").toLowerCase()}afterdark`,
      `${primaryNiche}privateclub`,
      `${primaryNiche}innercircle`,
      `${String(firstContentType).replace(/\s+/g, "").toLowerCase()}vault`,
    ]).slice(0, 5),
    pricing: {
      recommendation: experience === "advanced" ? "$29" : experience === "intermediate" ? "$19" : "$12",
      rationale: `Start with a clear entry offer around ${titleCase(firstContentType)} and raise pricing once repeat buyers and retention are visible.`,
    },
    contentPillars: [
      {
        name: "Identity",
        description: `Make ${nicheLabel.toLowerCase()} positioning obvious through repeatable themes, language, and visual signatures.`,
      },
      {
        name: "Proof",
        description: `Use ${titleCase(firstContentType).toLowerCase()} to show outcomes, transformation, or exclusivity people cannot get for free.`,
      },
      {
        name: "Conversion",
        description: "Turn casual attention into paid intent with direct calls to action, member-only teasers, and recurring drops.",
      },
    ],
    targetAudience: {
      primary: `${nicheLabel} fans who already follow creators on ${topPlatform} and are willing to pay for closer access or premium drops.`,
      psychographics: ["status-driven", "community-seeking", "impulse-upgrade friendly"],
      painPoints: "They want sharper curation, more exclusive access, and a reason to pay instead of just passively scrolling.",
    },
    platformPriority: uniqueList([topPlatform, "instagram", "tiktok", "telegram"]).slice(0, 4),
    first30Days: [
      `Publish 10 short posts that anchor your ${nicheLabel.toLowerCase()} positioning and repeat the same paid offer.`,
      `Create 3 paid pieces of ${titleCase(firstContentType).toLowerCase()} content tied directly to these goals: ${normalizedGoals.join(", ")}.`,
      "Message early fans, collect objections, and tighten pricing plus hooks every week.",
    ],
    rawAnalysis: "Fallback onboarding strategy generated locally because the AI provider was unavailable.",
  };
}

function extractAnalysis(fullText: string): OnboardingAnalysis {
  const extract = (key: string) => {
    const regex = new RegExp(`${key}:\\s*([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, "i");
    const match = fullText.match(regex);
    return match?.[1]?.trim() || "";
  };

  const extractList = (key: string) => {
    const section = extract(key);
    return section.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  };

  return {
    niche: extract("NICHE"),
    confidence: extract("CONFIDENCE"),
    subNiches: extract("SUB_NICHES").split(",").map((s) => s.trim()).filter(Boolean),
    handleSuggestions: extractList("HANDLE_SUGGESTIONS"),
    pricing: {
      recommendation: extract("PRICING_RECOMMENDATION"),
      rationale: extract("PRICING_RATIONALE"),
    },
    contentPillars: extract("CONTENT_PILLARS")
      .split(/\d+\./)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pillar) => {
        const [name, description] = pillar.split(":").map((s) => s.trim());
        return { name: name || pillar, description: description || "" };
      }),
    targetAudience: {
      primary: extract("TARGET_AUDIENCE").match(/Primary:\s*(.+)/)?.[1]?.trim() || "",
      psychographics: extract("TARGET_AUDIENCE").match(/Psychographics:\s*(.+)/)?.[1]?.split(",").map((s) => s.trim()) || [],
      painPoints: extract("TARGET_AUDIENCE").match(/Pain Points:\s*(.+)/)?.[1]?.trim() || "",
    },
    platformPriority: extract("PLATFORM_PRIORITY").split(",").map((s) => s.trim()).filter(Boolean),
    first30Days: extract("FIRST_30_DAYS")
      .split(/\d+\./)
      .map((s) => s.trim())
      .filter(Boolean),
    rawAnalysis: fullText,
  };
}

function isUsableAnalysis(analysis: OnboardingAnalysis) {
  return Boolean(
    analysis.niche ||
    analysis.pricing.recommendation ||
    analysis.contentPillars.length > 0 ||
    analysis.first30Days.length > 0
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as OnboardingRequestBody;
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

    let analysis: OnboardingAnalysis;

    try {
      const { stream } = await aiRouter.streamCompletion("niche_recommendation", prompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const parsed = extractAnalysis(fullText);
      analysis = isUsableAnalysis(parsed)
        ? parsed
        : buildFallbackAnalysis({ interests, contentTypes, experience, currentPlatforms, goals });
    } catch (error) {
      console.error("Onboarding AI fallback triggered:", error);
      analysis = buildFallbackAnalysis({ interests, contentTypes, experience, currentPlatforms, goals });
    }

    const { error: upsertError } = await supabase.from("creator_onboarding").upsert({
      user_id: user.id,
      analysis,
      interests,
      content_types: contentTypes,
      experience_level: experience,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Onboarding persistence failed:", upsertError);
      return NextResponse.json({ error: "Unable to save onboarding" }, { status: 500 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Onboarding analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
