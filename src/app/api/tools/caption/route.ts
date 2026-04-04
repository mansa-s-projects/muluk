import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";
import { assertFeatureAccess, TierGateError, tierGatePayload } from "@/lib/tiers";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Tier gate: ai_tools requires legend+ ──────────────────────────────────
  try {
    await assertFeatureAccess(user.id, "ai_tools", supabase);
  } catch (e) {
    if (e instanceof TierGateError) return NextResponse.json(tierGatePayload(e), { status: 403 });
    throw e;
  }

  const body = await req.json().catch(() => ({}));
  const contentType = String(body.contentType ?? "photo").trim(); // photo, video, announcement, teaser
  const topic = String(body.topic ?? "").trim();
  const tone = String(body.tone ?? "mysterious").trim(); // mysterious, bold, playful, exclusive
  const platform = String(body.platform ?? "general").trim(); // instagram, twitter, tiktok, general

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  // Check AI provider is configured
  const status = aiRouter.getStatus();
  if (!status.openrouter) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const platformGuidance: Record<string, string> = {
    instagram: "Use emojis strategically. Keep under 125 characters for clean preview. Include call-to-action.",
    twitter: "Under 280 characters. Punchy and shareable. Use 1-2 hashtags max.",
    tiktok: "Casual, trend-aware voice. Short and hook-driven. Use text speak sparingly.",
    general: "Versatile tone that works across platforms."
  };

  const prompt = `Generate 3 distinct ${tone}-tone captions for a ${contentType} about "${topic}".

Platform guidance: ${platformGuidance[platform] || platformGuidance.general}

Requirements:
- Match the dark luxury brand voice (mysterious, exclusive, confident)
- Each caption should feel different (varied angles/hooks)
- Include strategic emoji placement (1-3 per caption)
- End with subtle engagement prompt when appropriate

Format:
CAPTION_1: [caption]
CAPTION_2: [caption]
CAPTION_3: [caption]`;

  try {
    const { stream, usage } = await aiRouter.streamCompletion("caption_generation", prompt);

    // Create a tracked stream
    const trackedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          controller.enqueue(value);
        }
        
        const duration = Date.now() - startTime;
        console.log(`[Caption API] Completed in ${duration}ms. Cost: ~$${usage.estimatedCost.toFixed(6)}`);
        controller.close();
      },
    });

    return new Response(trackedStream, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8", 
        "X-Content-Type-Options": "nosniff",
        "X-Model-Used": usage.model,
        "X-Estimated-Cost": usage.estimatedCost.toFixed(6),
      },
    });
  } catch (error) {
    console.error("[Caption API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
