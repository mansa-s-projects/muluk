import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AGENT_PROMPTS: Record<string, string> = {
  researcher: `You are a market research analyst for MULUK, a creator economy platform disrupting OnlyFans with 88% creator payouts, anonymous fan codes, and crypto payment rails to 190 countries.

Provide 3 concise insights:
1. Creator migration patterns from competitor platforms
2. Target demographic and geographic priorities
3. Key market timing signals

Format as structured bullet points under bold headers. Under 250 words. Be specific and data-driven.`,

  writer: `You are a senior marketing copywriter for MULUK — a creator platform where creators keep 88% of earnings.

Write 3 high-converting marketing assets:
1. Twitter/X thread opener (punchy, controversial angle on platform fees)
2. TikTok video concept (15-30 seconds, creator frustration-to-solution hook)
3. Email: subject line + opening sentence for creator outreach

MULUK's differentiators: anonymous fan codes, 8% platform fee vs 20% on competitors, crypto payouts to 190 countries. Under 200 words total.`,

  critic: `You are a critical marketing strategist and devil's advocate for MULUK, a new creator platform.

Identify:
1. Top 3 launch risks in the current go-to-market approach
2. The strongest competitor counter-argument MULUK must prepare for
3. One critical assumption MULUK is making that could be wrong

Be brutally direct. Under 250 words.`,
};

const MOCK_OUTPUTS: Record<string, string> = {
  researcher: `**Market Intelligence Report**

**Creator Migration Signals**
• 34% of surveyed OF creators cite platform fees as #1 pain point — MULUK's 8-12% vs 20% is a decisive wedge
• Migration intent spikes after payout delays: target creators who experienced holds in the past 6 months
• Anonymous fan access removes the #1 barrier for mainstream creator crossover

**Target Demographics**
• Primary: 22-32 year old creators in US, UK, AU, CA — highest switching intent + payment infrastructure
• Secondary: LatAm (Brazil, Colombia) — explosive creator growth, severe banking constraints, crypto rail is a unique unlock

**Market Timing**
• OF's EU compliance tensions create a 90-day window of creator uncertainty
• Crypto-native Gen Z creators (18-24) represent a high-growth cohort no competitor is targeting explicitly

_Running with offline fallback — add OPENROUTER_API_KEY to .env.local for live AI analysis._`,

  writer: `**Copy Suite — Launch Assets**

**Twitter/X Thread Opener**
"OnlyFans quietly takes 20% of everything you make. On $10K/month that's $2,000 gone. Every month. Forever. I found out what happens when that number drops to 8%. 🧵"

**TikTok Video Concept**
Open: creator staring at earnings dashboard, frustrated. Text overlay: "This is what I made." Cut to fee deduction. "This is what they kept." 2-second pause. Cut to MULUK. "This is what changes Monday."

**Email**
Subject: _They've been taking 20% of your work for years_
Opening: "While you were building your audience, your platform was building their margins — here's what you're actually owed."

_Running with offline fallback — add OPENROUTER_API_KEY to .env.local for live generation._`,

  critic: `**Critical Risk Analysis**

**Risk 1 — Fraud & Chargebacks**
Anonymous fan codes are the product's crown jewel and its biggest liability. One viral chargeback wave destroys creator trust instantly. Fraud scoring must ship before beta.

**Risk 2 — Creator Activation Gap**
Waitlist numbers are meaningless without day-one creator activation. If MULUK can't seed 50+ high-earning creators in launch week, the demand flywheel never starts. This is the most underprepared area.

**Risk 3 — Payment Processor Dependency**
Stripe terminates adult content platforms without warning. MULUK needs 3 independent payment rails operational on launch day.

**Core Assumption at Risk**
MULUK assumes creators migrate for economics. What they actually migrate for is audience portability. Without a fan migration tool, switching cost is prohibitively high regardless of fee structure.

_Running with offline fallback — add OPENROUTER_API_KEY to .env.local for live analysis._`,
};

export async function POST(request: NextRequest) {
  try {
    const { agent, run_id } = await request.json();

    if (!agent || !run_id) {
      return NextResponse.json({ error: "Missing agent or run_id" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    let outputText: string;

    if (apiKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4-5",
            max_tokens: 512,
            messages: [{ role: "user", content: AGENT_PROMPTS[agent] ?? AGENT_PROMPTS.researcher }],
          }),
        });
        if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
        const data = await res.json();
        outputText = data.choices?.[0]?.message?.content ?? MOCK_OUTPUTS[agent];
      } catch {
        outputText = MOCK_OUTPUTS[agent];
      }
    } else {
      outputText = MOCK_OUTPUTS[agent];
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.from("agent_outputs").insert({
      agent,
      output: {
        text: outputText,
        model: apiKey ? "anthropic/claude-sonnet-4-5" : "mock",
        timestamp: new Date().toISOString(),
      },
      run_id,
    });

    return NextResponse.json({ output: outputText, agent });
  } catch (err) {
    console.error("marketing-agent error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
