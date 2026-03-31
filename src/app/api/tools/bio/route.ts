import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const keywords = String(body.keywords ?? "").trim();
  const category = String(body.category ?? "luxury").trim();

  if (!keywords) {
    return NextResponse.json({ error: "keywords required" }, { status: 400 });
  }

  // Check AI providers are configured
  const status = aiRouter.getStatus();
  console.log("[Bio API] AI Status:", status);
  
  if (!status.anthropic && !status.openrouter) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const prompt = `Generate 3 distinct creator bio variations for a ${category} content creator. Their keywords are: ${keywords}.

Each bio must be:
- Exactly 2-3 sentences
- Dark, luxury, mysterious tone — like a cipher that only true fans can decode
- Written in first person
- Evocative, bold, never generic

Format your response EXACTLY like this (no extra text):
BIO_1: [bio here]
BIO_2: [bio here]
BIO_3: [bio here]`;

  try {
    // Use "fast" tier for bio generation (cheap model via OpenRouter)
    console.log("[Bio API] Starting bio generation for keywords:", keywords);
    const { stream, modelUsed } = await aiRouter.streamCompletion("bio_generation", prompt);
    console.log("[Bio API] Using model:", modelUsed);

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8", 
        "X-Content-Type-Options": "nosniff",
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
