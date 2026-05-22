import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: transactions } = await supabase
      .from("transactions")
      .select("fan_code, amount, type, status, created_at")
      .eq("creator_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const { data: fanCodes } = await supabase
      .from("fan_codes")
      .select("code, custom_name, is_vip, created_at, tags")
      .eq("creator_id", user.id);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ 
        personas: [],
        message: "No transaction data yet. Personas will be generated after first sales."
      });
    }

    const fanStats: Record<string, {
      code: string;
      totalSpent: number;
      transactionCount: number;
      firstPurchase: string;
      lastPurchase: string;
      avgOrder: number;
      name?: string;
      isVip?: boolean;
    }> = {};

    transactions.forEach(tx => {
      if (!fanStats[tx.fan_code]) {
        fanStats[tx.fan_code] = {
          code: tx.fan_code,
          totalSpent: 0,
          transactionCount: 0,
          firstPurchase: tx.created_at,
          lastPurchase: tx.created_at,
          avgOrder: 0,
        };
      }
      const fan = fanStats[tx.fan_code];
      fan.totalSpent += tx.amount;
      fan.transactionCount += 1;
      fan.lastPurchase = tx.created_at;
      if (new Date(tx.created_at) < new Date(fan.firstPurchase)) {
        fan.firstPurchase = tx.created_at;
      }
    });

    Object.values(fanStats).forEach(fan => {
      fan.avgOrder = fan.totalSpent / fan.transactionCount;
      const fanCode = fanCodes?.find(fc => fc.code === fan.code);
      fan.name = fanCode?.custom_name || undefined;
      fan.isVip = fanCode?.is_vip || false;
    });

    const fansArray = Object.values(fanStats);
    const avgLifetime = fansArray.reduce((s, f) => s + f.totalSpent, 0) / fansArray.length;
    
    const categorized = fansArray.map(fan => {
      const daysSinceLastPurchase = (Date.now() - new Date(fan.lastPurchase).getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceFirstPurchase = (Date.now() - new Date(fan.firstPurchase).getTime()) / (1000 * 60 * 60 * 24);
      
      let persona = "regular";
      if (fan.totalSpent > avgLifetime * 3) persona = "whale";
      else if (fan.transactionCount >= 5 && fan.avgOrder > avgLifetime * 0.5) persona = "loyal";
      else if (daysSinceLastPurchase > 30 && fan.totalSpent > 10) persona = "at_risk";
      else if (daysSinceFirstPurchase < 7) persona = "new";
      else if (fan.totalSpent < 5) persona = "lurker";
      
      return { ...fan, persona, daysSinceLastPurchase: Math.round(daysSinceLastPurchase) };
    });

    const prompt = `Analyze these fan segments for a creator and provide engagement strategies:

FAN DATA SUMMARY:
- Total Fans: ${fansArray.length}
- Average Lifetime Value: $${avgLifetime.toFixed(2)}
- Whales (3x+ avg spend): ${categorized.filter(f => f.persona === "whale").length}
- Loyal (5+ transactions): ${categorized.filter(f => f.persona === "loyal").length}
- At Risk (30+ days inactive): ${categorized.filter(f => f.persona === "at_risk").length}
- New (joined <7 days): ${categorized.filter(f => f.persona === "new").length}
- Lurkers (<$5 spent): ${categorized.filter(f => f.persona === "lurker").length}

For each persona type (whale, loyal, at_risk, new, lurker, regular), provide:
1. Definition/traits
2. Engagement strategy (how to keep/grow them)
3. Specific message template
4. Content recommendation for this segment

Format:
PERSONA: [type]
TRAITS: [description]
STRATEGY: [action plan]
MESSAGE_TEMPLATE: [personalized message they could send]
CONTENT_REC: [what content appeals to them]
---`;

    const { stream } = await aiRouter.streamCompletion("content_strategy", prompt);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const personaInsights = fullText.split(/---/).map(block => {
      const lines = block.trim().split("\n");
      const typeMatch = lines.find(l => l.includes("PERSONA:"))?.match(/PERSONA:\s*(.+)/i);
      return {
        type: typeMatch?.[1]?.toLowerCase().trim() || "unknown",
        traits: lines.find(l => l.includes("TRAITS:"))?.replace("TRAITS:", "").trim() || "",
        strategy: lines.find(l => l.includes("STRATEGY:"))?.replace("STRATEGY:", "").trim() || "",
        messageTemplate: lines.find(l => l.includes("MESSAGE_TEMPLATE:"))?.replace("MESSAGE_TEMPLATE:", "").trim() || "",
        contentRec: lines.find(l => l.includes("CONTENT_REC:"))?.replace("CONTENT_REC:", "").trim() || "",
      };
    }).filter(p => p.type !== "unknown");

    const personas = categorized.reduce((acc, fan) => {
      if (!acc[fan.persona]) acc[fan.persona] = { fans: [], insights: null };
      acc[fan.persona].fans.push(fan);
      return acc;
    }, {} as Record<string, { fans: typeof categorized; insights: typeof personaInsights[0] | null }>);

    Object.keys(personas).forEach(key => {
      personas[key].insights = personaInsights.find(p => p.type === key) || null;
    });

    return NextResponse.json({
      personas,
      summary: {
        totalFans: fansArray.length,
        avgLifetimeValue: avgLifetime,
        revenueConcentration: categorized.filter(f => f.persona === "whale").reduce((s, f) => s + f.totalSpent, 0) / categorized.reduce((s, f) => s + f.totalSpent, 0),
      },
    });
  } catch (error) {
    console.error("Fan persona analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
