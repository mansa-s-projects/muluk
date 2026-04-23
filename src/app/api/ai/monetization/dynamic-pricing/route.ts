import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { contentType = "unlock", contentQuality = "standard", exclusivity = "standard" } = body;

    const { data: _contentHistory } = await supabase
      .from("content_items")
      .select("price, status, type, created_at")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, type, status, created_at")
      .eq("creator_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);

    const completedTx = transactions?.filter(t => t.status === "completed") || [];
    const avgTransaction = completedTx.length > 0 
      ? completedTx.reduce((s, t) => s + t.amount, 0) / completedTx.length 
      : 0;
    
    const pricePoints = completedTx.map(t => t.amount);
    const medianPrice = pricePoints.sort((a, b) => a - b)[Math.floor(pricePoints.length / 2)] || 10;
    
    const priceBuckets: Record<string, number> = {};
    completedTx.forEach(t => {
      const bucket = Math.floor(t.amount / 5) * 5;
      priceBuckets[bucket] = (priceBuckets[bucket] || 0) + 1;
    });
    
    const optimalBucket = Object.entries(priceBuckets)
      .sort((a, b) => b[1] - a[1])[0];
    const mostSuccessfulPrice = optimalBucket ? parseInt(optimalBucket[0]) : medianPrice;

    const prompt = `Recommend optimal pricing for this content as a creator monetization AI.

CREATOR CONTEXT:
- Content Type: ${contentType} (unlock, subscription, tip, bundle)
- Content Quality: ${contentQuality} (standard, premium, exclusive)
- Exclusivity Level: ${exclusivity} (standard, limited, one-time)
- Average Transaction: $${avgTransaction.toFixed(2)}
- Most Successful Price Point: $${mostSuccessfulPrice}
- Median Fan Spend: $${medianPrice}

Provide pricing recommendation in this format:

OPTIMAL_PRICE: $[amount]
PRICE_RANGE: $[min] - $[max]
CONFIDENCE: [0-100]%

RATIONALE:
[2-3 sentences explaining the recommendation]

FACTORS_CONSIDERED:
- [factor]: [impact]
- [factor]: [impact]
- [factor]: [impact]

ALTERNATIVE_STRATEGIES:
1. [strategy name]: [description and expected outcome]
2. [strategy name]: [description and expected outcome]

DYNAMIC_ADJUSTMENTS:
- Launch price: $[amount] (first 24h)
- Standard price: $[amount]
- Scarcity premium: +$[amount] (if limited)`;

    const { stream } = await aiRouter.streamCompletion("price_analysis", prompt);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const extract = (key: string) => {
      const regex = new RegExp(`${key}:\\s*([^\\n]+)`, "i");
      return fullText.match(regex)?.[1]?.trim() || "";
    };

    const recommendation = {
      optimalPrice: extract("OPTIMAL_PRICE"),
      priceRange: extract("PRICE_RANGE"),
      confidence: extract("CONFIDENCE"),
      rationale: fullText.match(/RATIONALE:\\s*([\\s\\S]+?)(?=FACTORS_CONSIDERED:|$)/i)?.[1]?.trim() || "",
      factors: fullText.match(/FACTORS_CONSIDERED:\\s*([\\s\\S]+?)(?=ALTERNATIVE_STRATEGIES:|$)/i)?.[1]
        ?.split("\n")
        .map(l => l.replace(/^-\\s*/, "").trim())
        .filter(Boolean) || [],
      strategies: fullText.match(/ALTERNATIVE_STRATEGIES:\\s*([\\s\\S]+?)(?=DYNAMIC_ADJUSTMENTS:|$)/i)?.[1]
        ?.split(/\\d+\\./)
        .map(s => s.trim())
        .filter(Boolean) || [],
      dynamicPricing: {
        launch: extract("Launch price").match(/\$?([\d.]+)/)?.[1] || extract("OPTIMAL_PRICE").match(/\$?([\d.]+)/)?.[1],
        standard: extract("Standard price").match(/\$?([\d.]+)/)?.[1] || extract("OPTIMAL_PRICE").match(/\$?([\d.]+)/)?.[1],
        scarcity: extract("Scarcity premium").match(/\+?\$?([\d.]+)/)?.[1],
      },
      raw: fullText,
    };

    await supabase.from("pricing_recommendations").insert({
      creator_id: user.id,
      content_type: contentType,
      recommendation: recommendation,
      metrics_used: {
        avgTransaction,
        medianPrice,
        mostSuccessfulPrice,
        sampleSize: completedTx.length,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      recommendation,
      creatorMetrics: {
        avgTransaction: avgTransaction.toFixed(2),
        medianPrice,
        mostSuccessfulPrice,
        totalTransactions: completedTx.length,
      }
    });
  } catch (error) {
    console.error("Dynamic pricing failed:", error);
    return NextResponse.json({ error: "Pricing analysis failed" }, { status: 500 });
  }
}
