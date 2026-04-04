import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

type BlueprintRequest = {
  niche: string;
  subNiche?: string;
  contentTypes: string[];
  experience: string;
  strongestPlatform: string;
  totalFollowers: number;
};

type LaunchBlueprint = {
  offerIdea: string;
  offerDescription: string;
  price: number;
  priceConfidence: "high" | "medium" | "low";
  priceRationale: string;
  contentPillars: string[];
  bestChannels: string[];
  channelConfidence: "high" | "medium" | "low";
  channelRationale: string;
  sevenDayPlan: Array<{ day: number; action: string }>;
  revenueEstimate: { monthly: number; yearly: number; low: number; high: number };
  revenueAssumptions: string;
  strategySummary: string;
};

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildFallbackBlueprint(input: BlueprintRequest): LaunchBlueprint {
  const basePrice = input.experience === "advanced" ? 29 : input.experience === "intermediate" ? 19 : 12;
  const conversionRate = input.experience === "advanced" ? 0.02 : input.experience === "intermediate" ? 0.015 : 0.01;
  const monthlyBuyers = Math.max(10, Math.floor(input.totalFollowers * conversionRate));
  
  const nicheLabel = titleCase(input.niche);
  const subNicheLabel = input.subNiche ? titleCase(input.subNiche) : nicheLabel;
  const monthly = monthlyBuyers * basePrice;
  
  // Calculate confidence based on data quality
  const priceConfidence = input.experience === "advanced" && input.totalFollowers > 10000 ? "high" 
    : input.totalFollowers > 2000 ? "medium" : "low";
  const channelConfidence = input.totalFollowers > 5000 ? "high" : input.totalFollowers > 1000 ? "medium" : "low";
  
  return {
    offerIdea: `${subNicheLabel} Inner Circle`,
    offerDescription: `Exclusive access to behind-the-scenes ${input.niche} content, personal insights, direct messaging, and limited drops. For serious ${input.niche} fans who want closer access.`,
    price: basePrice,
    priceConfidence,
    priceRationale: `Based on ${input.experience} creator benchmarks in ${nicheLabel}`,
    contentPillars: [
      `${nicheLabel} behind the scenes`,
      "Personal stories & insights",
      `Exclusive ${input.contentTypes[0] || "content"} drops`,
    ],
    bestChannels: [input.strongestPlatform, "telegram", "instagram"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
    channelConfidence,
    channelRationale: `${titleCase(input.strongestPlatform)} is your largest audience (${input.totalFollowers.toLocaleString()} followers)`,
    sevenDayPlan: [
      { day: 1, action: `Post teaser: "Something private is coming for my ${input.niche} community..."` },
      { day: 2, action: "Share a behind-the-scenes moment that won't be public" },
      { day: 3, action: `Story poll: "Would you pay $${basePrice}/mo for exclusive ${subNicheLabel} access?"` },
      { day: 4, action: "Announce: Private community launching tomorrow, founding members only" },
      { day: 5, action: `Go live: Open founding access at $${basePrice}/mo — first 50 only` },
      { day: 6, action: "DM your top 20 engaged followers with personal invite" },
      { day: 7, action: "Post first exclusive drop for members, tease it publicly" },
    ],
    revenueEstimate: {
      monthly,
      yearly: monthly * 12,
      low: Math.floor(monthly * 0.5),
      high: Math.floor(monthly * 2),
    },
    revenueAssumptions: `${(conversionRate * 100).toFixed(1)}% conversion of ${input.totalFollowers.toLocaleString()} followers`,
    strategySummary: `Launch a $${basePrice}/mo private ${nicheLabel.toLowerCase()} community, drive traffic from ${titleCase(input.strongestPlatform)}, hit ${monthlyBuyers}+ members in 30 days.`,
  };
}

function extractBlueprint(fullText: string, input: BlueprintRequest): LaunchBlueprint {
  const extract = (key: string) => {
    const regex = new RegExp(`${key}:\\s*([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, "i");
    const match = fullText.match(regex);
    return match?.[1]?.trim() || "";
  };

  const priceMatch = extract("PRICE").match(/\$?(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1], 10) : (input.experience === "advanced" ? 29 : 19);

  const monthlyMatch = extract("MONTHLY_ESTIMATE").match(/\$?([\d,]+)/);
  const yearlyMatch = extract("YEARLY_ESTIMATE").match(/\$?([\d,]+)/);
  const monthly = monthlyMatch ? parseInt(monthlyMatch[1].replace(",", ""), 10) : price * 15;
  const yearly = yearlyMatch ? parseInt(yearlyMatch[1].replace(",", ""), 10) : monthly * 12;

  const sevenDayRaw = extract("SEVEN_DAY_PLAN");
  const sevenDayPlan = sevenDayRaw
    .split(/\n/)
    .map((line, i) => {
      const dayMatch = line.match(/Day\s*(\d)/i);
      const day = dayMatch ? parseInt(dayMatch[1], 10) : i + 1;
      const action = line.replace(/Day\s*\d[:\s]*/i, "").trim();
      return { day, action };
    })
    .filter((item) => item.action && item.day <= 7)
    .slice(0, 7);

  const nicheLabel = titleCase(input.niche);
  const conversionRate = input.experience === "advanced" ? 0.02 : input.experience === "intermediate" ? 0.015 : 0.01;
  const priceConfidence = input.experience === "advanced" && input.totalFollowers > 10000 ? "high" 
    : input.totalFollowers > 2000 ? "medium" : "low";
  const channelConfidence = input.totalFollowers > 5000 ? "high" : input.totalFollowers > 1000 ? "medium" : "low";

  return {
    offerIdea: extract("OFFER_IDEA") || `${titleCase(input.niche)} Inner Circle`,
    offerDescription: extract("OFFER_DESCRIPTION") || `Premium ${input.niche} access and content.`,
    price,
    priceConfidence,
    priceRationale: `Based on ${input.experience} creator benchmarks in ${nicheLabel}`,
    contentPillars: extract("CONTENT_PILLARS").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3) || [input.niche],
    bestChannels: extract("BEST_CHANNELS").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3) || [input.strongestPlatform],
    channelConfidence,
    channelRationale: `${titleCase(input.strongestPlatform)} is your largest audience (${input.totalFollowers.toLocaleString()} followers)`,
    sevenDayPlan: sevenDayPlan.length > 0 ? sevenDayPlan : buildFallbackBlueprint(input).sevenDayPlan,
    revenueEstimate: { 
      monthly, 
      yearly,
      low: Math.floor(monthly * 0.5),
      high: Math.floor(monthly * 2),
    },
    revenueAssumptions: `${(conversionRate * 100).toFixed(1)}% conversion of ${input.totalFollowers.toLocaleString()} followers`,
    strategySummary: `Launch a $${price}/mo private ${nicheLabel.toLowerCase()} community, drive traffic from ${titleCase(input.strongestPlatform)}, hit ${Math.floor(input.totalFollowers * conversionRate)}+ members in 30 days.`,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as BlueprintRequest;
    const { niche, subNiche, contentTypes, experience, strongestPlatform, totalFollowers } = body;

    const prompt = `Create a launch blueprint for a ${niche}${subNiche ? ` (${subNiche})` : ""} creator.

CREATOR PROFILE:
- Niche: ${niche}${subNiche ? ` / ${subNiche}` : ""}
- Content types: ${contentTypes.join(", ")}
- Experience: ${experience}
- Strongest platform: ${strongestPlatform}
- Total followers: ${totalFollowers.toLocaleString()}

Generate a personalized launch strategy in this exact format:

OFFER_IDEA: [catchy private community/product name]
OFFER_DESCRIPTION: [2-3 sentence value proposition]
PRICE: $[amount]
CONTENT_PILLARS: [3 content themes, comma-separated]
BEST_CHANNELS: [top 3 platforms, comma-separated]

SEVEN_DAY_PLAN:
Day 1: [specific action]
Day 2: [specific action]
Day 3: [specific action]
Day 4: [specific action]
Day 5: [specific action]
Day 6: [specific action]
Day 7: [specific action]

MONTHLY_ESTIMATE: $[projected monthly revenue]
YEARLY_ESTIMATE: $[projected yearly revenue]

Make actions specific, urgent, and conversion-focused. No generic advice.`;

    let blueprint: LaunchBlueprint;

    try {
      const { stream } = await aiRouter.streamCompletion("launch_blueprint", prompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      blueprint = extractBlueprint(fullText, body);
      
      // Validate blueprint has required fields
      if (!blueprint.offerIdea || !blueprint.sevenDayPlan.length) {
        blueprint = buildFallbackBlueprint(body);
      }
    } catch (error) {
      console.error("Blueprint AI fallback triggered:", error);
      blueprint = buildFallbackBlueprint(body);
    }

    // Save to onboarding record
    await supabase.from("creator_onboarding").upsert({
      user_id: user.id,
      launch_blueprint: blueprint,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ success: true, blueprint });
  } catch (error) {
    console.error("Blueprint generation failed:", error);
    return NextResponse.json({ error: "Blueprint generation failed" }, { status: 500 });
  }
}
