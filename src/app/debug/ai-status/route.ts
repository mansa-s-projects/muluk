import { NextResponse } from "next/server";

export async function GET() {
  // Check AI provider configuration (OpenRouter only)
  const status = {
    // OpenRouter - used for ALL AI features
    openrouter: {
      keySet: !!process.env.OPENROUTER_API_KEY,
      referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
    // Supabase (for saving generated content)
    supabase: {
      urlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  // Determine overall health
  const hasOpenRouter = status.openrouter.keySet;
  const hasSupabaseService = status.supabase.serviceRoleSet;

  return NextResponse.json({
    ...status,
    health: {
      canGenerateBio: hasOpenRouter,
      canPredictPrice: hasOpenRouter,
      canGhostwrite: hasOpenRouter, // Now uses OpenRouter too
      canSaveToDb: hasSupabaseService,
      allSystemsGo: hasOpenRouter && hasSupabaseService,
    },
    fixes: {
      openrouter: !hasOpenRouter 
        ? "Add OPENROUTER_API_KEY to Vercel env vars" 
        : "All AI features working via OpenRouter",
      database: !hasSupabaseService 
        ? "Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars (NOT NEXT_PUBLIC_)" 
        : "Working",
    },
    models: {
      fast: "openai/gpt-4o-mini - $0.15/$0.60 (bio, captions, pricing, some idea flows)",
      balanced: "google/gemini-flash-1.5 - $0.075/$0.30 (daily brief, personas, strategy)",
      premium: "Available but unused - all features on cheaper models",
      savings: "Ghostwriter: 98% cheaper ($15 → $0.30 per 1M tokens)",
    },
  });
}
