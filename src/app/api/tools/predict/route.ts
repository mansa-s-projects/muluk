import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch creator's real transaction data for analysis
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("amount, type, status, created_at, fan_code")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: walletData, error: walletError } = await supabase
    .from("creator_wallets")
    .select("balance, total_earnings, referral_income")
    .eq("creator_id", user.id)
    .maybeSingle();

  if (txError || walletError) {
    console.error("Predict route database error", { txError, walletError });
    return NextResponse.json({ error: "Failed to load analytics data" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const parsedPrice = Number.parseFloat(String(body.currentPrice ?? "0").trim());
  const currentPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 && parsedPrice <= 100000
    ? parsedPrice
    : 0;

  const rawContentType = String(body.contentType ?? "subscription")
    .trim()
    .replace(/[\r\n\t\0]+/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, 32)
    .toLowerCase();
  const allowedContentTypes = new Set(["subscription", "tip", "unlock", "one-time"]);
  const contentType = allowedContentTypes.has(rawContentType) ? rawContentType : "subscription";

  const transactions = txData ?? [];
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const avgTx = transactions.length > 0 ? totalRevenue / transactions.length : 0;
  const uniqueFans = new Set(transactions.map(t => t.fan_code)).size;
  const completedTx = transactions.filter(t => t.status === "completed").length;
  const conversionRate = transactions.length > 0 ? (completedTx / transactions.length) * 100 : 0;
  const balance = Number(walletData?.balance ?? 0);

  // Check AI provider is configured
  const status = aiRouter.getStatus();
  if (!status.openrouter) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const systemPrompt = `You are a pricing strategist for premium content creators. Analyze real transaction data and give precise, actionable pricing advice. Be direct, data-driven, and bold.`;

  const userPrompt = `Analyze this creator's data and recommend the optimal price for their ${contentType} content.

CREATOR DATA:
- Current price: $${currentPrice}
- Total revenue (last 50 transactions): $${totalRevenue.toFixed(2)}
- Average transaction: $${avgTx.toFixed(2)}
- Unique fans: ${uniqueFans}
- Completed transactions: ${completedTx}/${transactions.length}
- Conversion rate: ${conversionRate.toFixed(1)}%
- Available balance: $${balance.toFixed(2)}

Respond EXACTLY in this format:
RECOMMENDED_PRICE: $[number]
CONFIDENCE: [0-100]%
REASONING: [2-3 sentence explanation with data-backed rationale]
PREDICTION_1: [specific outcome prediction]
PREDICTION_2: [specific outcome prediction]
PREDICTION_3: [specific outcome prediction]`;

  try {
    // Use "balanced" tier for price analysis (good quality, cheaper than Claude)
    const { stream } = await aiRouter.streamCompletion(
      "price_analysis",
      userPrompt,
      systemPrompt
    );

    // Read the full stream response
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }

    const extract = (key: string) => {
      const match = text.match(new RegExp(`${key}:\\s*(.+)`));
      return match?.[1]?.trim() ?? "";
    };

    return NextResponse.json({
      recommendedPrice: extract("RECOMMENDED_PRICE"),
      confidence: extract("CONFIDENCE"),
      reasoning: extract("REASONING"),
      predictions: [
        extract("PREDICTION_1"),
        extract("PREDICTION_2"),
        extract("PREDICTION_3"),
      ].filter(Boolean),
      stats: {
        totalRevenue: totalRevenue.toFixed(2),
        avgTransaction: avgTx.toFixed(2),
        uniqueFans,
        conversionRate: conversionRate.toFixed(1),
      },
    });
  } catch (error: unknown) {
    console.error("[Predict API] Error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "AI request timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
