// POST /api/signals/action-plan
// Generate a personalised action plan for a specific signal using AI

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

type ActionPlanBody = {
  signal_id: string;
};

type ActionPlan = {
  headline: string;
  offer_title: string;
  offer_description: string;
  price: number;
  offer_type: string;
  launch_steps: Array<{ day: number; action: string }>;
  caption: string;
  dm_script: string;
  expected_revenue_low: number;
  expected_revenue_high: number;
};

function buildFallbackPlan(signal: {
  topic: string;
  niche: string;
  suggested_product?: string | null;
  suggested_price?: number | null;
  offer_type?: string | null;
  action_suggestion?: string | null;
}): ActionPlan {
  const price = signal.suggested_price ?? 29;
  return {
    headline: `Capitalise on "${signal.topic}" right now`,
    offer_title: signal.suggested_product ?? `${signal.topic} Masterclass`,
    offer_description: `A focused ${signal.niche} resource built around the "${signal.topic}" trend — giving your audience exactly what they're searching for today.`,
    price,
    offer_type: signal.offer_type ?? "digital",
    launch_steps: [
      { day: 1, action: `Post a hook about "${signal.topic}" — tease that you have the inside take` },
      { day: 2, action: "Share a quick win related to this topic in your story/feed" },
      { day: 3, action: `Launch your offer: announce access for founding members at $${price}` },
      { day: 4, action: "DM your top 20 engaged followers with a personal invite" },
      { day: 5, action: "Post social proof or a behind-the-scenes clip to drive FOMO" },
    ],
    caption: `Everyone's talking about ${signal.topic}. Here's what most people are missing — and how I'm helping my community get ahead of it. Link in bio.`,
    dm_script: `Hey! I just launched something around ${signal.topic} — thought you'd want first access since you've been interested in ${signal.niche}. It's $${price} and I'm keeping it small. Here's the link: [your-link]`,
    expected_revenue_low: Math.round(price * 5),
    expected_revenue_high: Math.round(price * 30),
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<ActionPlanBody>;
    if (!body.signal_id) return NextResponse.json({ error: "signal_id required" }, { status: 400 });

    // Fetch the signal
    const { data: signal, error: signalErr } = await supabase
      .from("signals")
      .select("id, niche, topic, title, summary, suggested_product, suggested_price, offer_type, action_suggestion, demand_level, score")
      .eq("id", body.signal_id)
      .eq("is_active", true)
      .maybeSingle();

    if (signalErr || !signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    // Fetch creator context
    const { data: app } = await supabase
      .from("creator_applications")
      .select("name, category, bio")
      .eq("user_id", user.id)
      .maybeSingle();

    const price = signal.suggested_price ?? 29;

    const prompt = `You are a monetization strategist for creator economy platforms.

CREATOR:
- Name: ${app?.name ?? "Creator"}
- Niche: ${app?.category ?? signal.niche}
- Bio: ${app?.bio ?? "Content creator"}

TRENDING SIGNAL:
- Topic: "${signal.topic}"
- Demand Level: ${signal.demand_level}
- Signal Score: ${signal.score}/100
- Summary: ${signal.summary ?? "Trending in " + signal.niche}
- Suggested Product: ${signal.suggested_product ?? "Not defined"}
- Suggested Price: $${price}

Generate a monetization action plan in this EXACT format:

HEADLINE: [one punchy sentence for why to act now]
OFFER_TITLE: [product/service name]
OFFER_DESCRIPTION: [2 sentence pitch]
PRICE: $[number]
OFFER_TYPE: [one of: course, coaching, drop, community, digital]
DAY1: [specific action]
DAY2: [specific action]
DAY3: [specific action]
DAY4: [specific action]
DAY5: [specific action]
CAPTION: [social post caption, 2-3 sentences, no emojis]
DM_SCRIPT: [short DM to warm followers, 2-3 sentences]
REVENUE_LOW: $[number]
REVENUE_HIGH: $[number]

Be hyper-specific. Use the creator's actual niche and the exact trend topic.`;

    let plan: ActionPlan;

    try {
      const { stream } = await aiRouter.streamCompletion("content_strategy", prompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }

      const extract = (key: string) => {
        const m = text.match(new RegExp(`${key}:\\s*([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, "i"));
        return m?.[1]?.trim() ?? "";
      };

      const priceMatch = extract("PRICE").match(/\$?([\d.]+)/);
      const parsedPrice = priceMatch ? parseFloat(priceMatch[1]) : price;

      const revLow  = parseFloat(extract("REVENUE_LOW").replace(/[$,]/g, "")) || parsedPrice * 5;
      const revHigh = parseFloat(extract("REVENUE_HIGH").replace(/[$,]/g, "")) || parsedPrice * 30;

      const days = [1, 2, 3, 4, 5].map(d => ({
        day: d,
        action: extract(`DAY${d}`) || buildFallbackPlan(signal).launch_steps[d - 1].action,
      }));

      plan = {
        headline:             extract("HEADLINE")           || buildFallbackPlan(signal).headline,
        offer_title:          extract("OFFER_TITLE")        || buildFallbackPlan(signal).offer_title,
        offer_description:    extract("OFFER_DESCRIPTION")  || buildFallbackPlan(signal).offer_description,
        price:                parsedPrice,
        offer_type:           extract("OFFER_TYPE")         || (signal.offer_type ?? "digital"),
        launch_steps:         days,
        caption:              extract("CAPTION")            || buildFallbackPlan(signal).caption,
        dm_script:            extract("DM_SCRIPT")          || buildFallbackPlan(signal).dm_script,
        expected_revenue_low:  Math.round(revLow),
        expected_revenue_high: Math.round(revHigh),
      };
    } catch {
      plan = buildFallbackPlan(signal);
    }

    // Track the click engagement
    supabase.from("signal_engagement").upsert({
      user_id:   user.id,
      signal_id: signal.id,
      action:    "click",
      metadata:  { action_plan_generated: true },
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id,signal_id,action", ignoreDuplicates: true }).then(() => {});

    return NextResponse.json({ plan, signal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
