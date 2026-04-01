import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRouter } from "@/lib/ai-router";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: yesterdayTx } = await supabase
      .from("transactions")
      .select("amount, type, fan_code, created_at")
      .eq("creator_id", user.id)
      .eq("status", "completed")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });

    const { data: weekTx } = await supabase
      .from("transactions")
      .select("amount, created_at")
      .eq("creator_id", user.id)
      .eq("status", "completed")
      .gte("created_at", lastWeek.toISOString());

    const { data: scheduledContent } = await supabase
      .from("content_items")
      .select("title, scheduled_for, status")
      .eq("creator_id", user.id)
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString())
      .order("scheduled_for", { ascending: true });

    const { data: fanActivity } = await supabase
      .from("fan_codes")
      .select("code, created_at, is_vip")
      .eq("creator_id", user.id)
      .gte("created_at", lastWeek.toISOString());

    const { data: unreadNotifs } = await supabase
      .from("notifications")
      .select("id, message, created_at")
      .eq("user_id", user.id)
      .eq("unread", true)
      .order("created_at", { ascending: false })
      .limit(5);

    const yesterdayRevenue = yesterdayTx?.reduce((s, t) => s + t.amount, 0) || 0;
    const yesterdayTxCount = yesterdayTx?.length || 0;
    const weekAvgDaily = weekTx ? weekTx.reduce((s, t) => s + t.amount, 0) / 7 : 0;
    const vsWeekAvg = weekAvgDaily > 0 ? ((yesterdayRevenue - weekAvgDaily) / weekAvgDaily * 100).toFixed(0) : 0;
    
    const newFansYesterday = fanActivity?.filter(f => new Date(f.created_at) >= yesterday).length || 0;
    const vipFans = fanActivity?.filter(f => f.is_vip).length || 0;

    const prompt = `Generate a creator's daily briefing as their AI co-pilot.

YESTERDAY'S PERFORMANCE:
- Revenue: $${yesterdayRevenue.toFixed(2)} (${Number(vsWeekAvg) > 0 ? '+' : ''}${vsWeekAvg}% vs 7-day avg)
- Transactions: ${yesterdayTxCount}
- New Fans: ${newFansYesterday}
- VIP Fans: ${vipFans}

UPCOMING SCHEDULE (next 48h):
${scheduledContent?.map(c => `- ${c.title} (${c.status}) at ${new Date(c.scheduled_for).toLocaleDateString()}`).join("\n") || "Nothing scheduled"}

NOTIFICATIONS:
${unreadNotifs?.map(n => `- ${n.message}`).join("\n") || "No new notifications"}

Create a daily brief in this format:

MOOD: [celebratory/calm/urgent/focused] based on performance

HEADLINE: [One punchy sentence summarizing yesterday]

WINS:
- [specific win with number]
- [specific win with number]

TODAY'S PRIORITIES (ranked):
1. [highest impact action] - WHY: [reasoning]
2. [second action] - WHY: [reasoning]
3. [third action] - WHY: [reasoning]

QUICK WINS (under 10 min):
- [action]: [expected outcome]
- [action]: [expected outcome]

CONTENT OPPORTUNITY:
Based on ${scheduledContent?.length ? "your schedule" : "no scheduled content"}, suggest: [specific content idea for today]

FAN ENGAGEMENT:
- Message this fan: [type] because [reason]
- Re-engage: [strategy for dormant fans]

MONEY OPPORTUNITY:
[Specific pricing or bundling suggestion for today]`;

    const { stream } = await aiRouter.streamCompletion("content_strategy", prompt);
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const extractSection = (header: string) => {
      const pattern = new RegExp(`${header}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z_]|$)`, "i");
      const match = fullText.match(pattern);
      return match?.[1]?.trim() || "";
    };

    const brief = {
      generatedAt: now.toISOString(),
      mood: fullText.match(/MOOD:\\s*(.+)/i)?.[1]?.trim() || "focused",
      headline: fullText.match(/HEADLINE:\\s*(.+)/i)?.[1]?.trim() || "Your daily brief",
      wins: extractSection("WINS").split("\n").map(l => l.replace(/^-\\s*/, "").trim()).filter(Boolean),
      priorities: extractSection("TODAY'S PRIORITIES")
        .split(/\\d+\\./)
        .map(s => s.trim())
        .filter(Boolean)
        .map(p => {
          const [action, why] = p.split(/WHY:/i).map(s => s.trim());
          return { action: action?.replace(/^-\\s*/, ""), why: why || "" };
        }),
      quickWins: extractSection("QUICK WINS")
        .split("\n")
        .map(l => l.replace(/^-\\s*/, "").trim())
        .filter(Boolean),
      contentOpportunity: extractSection("CONTENT OPPORTUNITY"),
      fanEngagement: {
        messageFan: extractSection("FAN ENGAGEMENT").match(/Message this fan:(.+)/i)?.[1]?.trim() || "",
        reengage: extractSection("FAN ENGAGEMENT").match(/Re-engage:(.+)/i)?.[1]?.trim() || "",
      },
      moneyOpportunity: extractSection("MONEY OPPORTUNITY"),
      raw: fullText,
      metrics: {
        yesterdayRevenue,
        yesterdayTxCount,
        vsWeekAvg: Number(vsWeekAvg),
        newFansYesterday,
        upcomingContent: scheduledContent?.length || 0,
      }
    };

    await supabase.from("daily_briefs").insert({
      creator_id: user.id,
      date: now.toISOString().split("T")[0],
      brief: brief,
      metrics: brief.metrics,
    });

    return NextResponse.json({ success: true, brief });
  } catch (error) {
    console.error("Daily brief generation failed:", error);
    return NextResponse.json({ error: "Brief generation failed" }, { status: 500 });
  }
}
