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
  const keywords = String(body.keywords ?? "").trim();
  const category = String(body.category ?? "luxury").trim();

  if (!keywords) {
    return NextResponse.json({ error: "keywords required" }, { status: 400 });
  }

  // Check AI provider is configured
  const status = aiRouter.getStatus();
  if (!status.openrouter) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const prompt = `Generate 3 distinct creator bio variations for a ${category} content creator. Keywords: ${keywords}.

Requirements:
- 2-3 sentences each
- Dark, luxury, mysterious tone
- First person
- Bold, evocative

Format:
BIO_1: [bio]
BIO_2: [bio]
BIO_3: [bio]`;

  try {
    const { stream, usage } = await aiRouter.streamCompletion("bio_generation", prompt);

    // Create a tracked stream to monitor completion
    const trackedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        
        const duration = Date.now() - startTime;
        console.log(`[Bio API] Completed in ${duration}ms. Cost: ~$${usage.estimatedCost.toFixed(6)}`);
        controller.close();
      },
    });

    return new Response(trackedStream, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8", 
        "X-Content-Type-Options": "nosniff",
        "X-Model-Used": usage.model,
        "X-Estimated-Cost": usage.estimatedCost.toFixed(6),
        "X-Tokens-In": String(usage.inputTokens),
      },
    });
  } catch (error) {
    console.error("[Bio API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
