// src/lib/signals/seed.ts
// Seed initial signals for all niches — run once on deploy or from admin.
// Usage: import { seedSignals } from "@/lib/signals/seed"; await seedSignals(supabase);

import type { SupabaseClient } from "@supabase/supabase-js";

type SignalRow = {
  niche: string;
  source: string;
  topic: string;
  title: string;
  summary: string;
  score: number;
  demand_level: "low" | "medium" | "high" | "viral";
  velocity: number;
  suggested_product: string;
  suggested_price: number;
  offer_type: string;
  action_suggestion: string;
  keywords: string[];
  is_active: boolean;
  expires_at: string;
};

const TTL_HOURS = 48;

function expires(): string {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();
}

const SEED_SIGNALS: Omit<SignalRow, "expires_at" | "is_active">[] = [
  // ── FITNESS ──────────────────────────────────────────────────────────────
  {
    niche: "fitness", source: "tiktok", topic: "cortisol detox morning routine",
    title: "Cortisol detox is dominating morning routines — monetise the anxiety generation",
    summary: "A wave of Gen Z creators are posting cortisol-lowering morning protocols. Audiences are buying supplements, guides, and coaching to fix their stress response.",
    score: 88, demand_level: "viral", velocity: 88,
    suggested_product: "30-Day Cortisol Reset Program", suggested_price: 49,
    offer_type: "course", action_suggestion: "Post your cortisol morning stack immediately — film it raw, no editing.",
    keywords: ["cortisol", "morning", "detox", "stress", "fitness"],
  },
  {
    niche: "fitness", source: "google", topic: "creatine for women",
    title: "Creatine for women is having its moment — educational content converts hard",
    summary: "Search volume for \"creatine for women\" is up 300% YoY. Women distrust bro-science sources and will pay for credible female-authored guidance.",
    score: 91, demand_level: "viral", velocity: 91,
    suggested_product: "Women's Creatine Guide + Cycle Protocol", suggested_price: 29,
    offer_type: "digital", action_suggestion: "Create a myth-busting post about creatine for women — address the fears directly.",
    keywords: ["creatine", "women", "supplements", "fitness"],
  },

  // ── FINANCE ──────────────────────────────────────────────────────────────
  {
    niche: "finance", source: "google", topic: "high yield savings 2026",
    title: "High-yield savings anxiety is peaking — position yourself as the trusted guide",
    summary: "Rate cut uncertainty is driving millions to search alternatives. Creators who break down HYSA options simply are converting followers to clients fast.",
    score: 95, demand_level: "viral", velocity: 95,
    suggested_product: "Savings Optimiser Masterclass", suggested_price: 39,
    offer_type: "course", action_suggestion: "Post a comparison of the top 5 HYSA rates right now — be the source people share.",
    keywords: ["savings", "HYSA", "interest rate", "finance", "money"],
  },
  {
    niche: "finance", source: "tiktok", topic: "cash stuffing budgeting",
    title: "Cash stuffing is still growing — the physical money movement has digital product demand",
    summary: "Physical budgeting envelopes went viral and the demand hasn't dropped. Digital templates, trackers, and beginner coaching sell extremely well in this audience.",
    score: 78, demand_level: "high", velocity: 78,
    suggested_product: "Cash Stuffing Starter Bundle", suggested_price: 19,
    offer_type: "digital", action_suggestion: "Film your own cash stuffing setup and link your budget template in bio.",
    keywords: ["cash stuffing", "budget", "envelope", "finance"],
  },

  // ── TECH ──────────────────────────────────────────────────────────────────
  {
    niche: "tech", source: "twitter", topic: "vibe coding tools for founders",
    title: "Vibe coding is the new \"learn to code\" — founders are paying for fast shortcuts",
    summary: "Non-technical founders are desperate to ship products without hiring devs. Courses and coaching on AI-assisted coding tools are selling out in days.",
    score: 96, demand_level: "viral", velocity: 96,
    suggested_product: "Build Your First App with AI in 7 Days", suggested_price: 97,
    offer_type: "course", action_suggestion: "Post a before/after of a product you built in under a day using AI tools — show the process.",
    keywords: ["vibe coding", "AI", "no-code", "founder", "build"],
  },
  {
    niche: "tech", source: "twitter", topic: "AI agents replacing VAs",
    title: "AI agent automation is replacing $3k/month VA setups — businesses want the blueprint",
    summary: "The \"fire your VA\" content is going viral. Business owners want to know exactly which AI agents to install. Practical guides and setups sell fast.",
    score: 91, demand_level: "viral", velocity: 91,
    suggested_product: "AI Agent Business Stack Blueprint", suggested_price: 79,
    offer_type: "digital", action_suggestion: "Document your AI agent setup in a 60-second video — show the exact tools and cost savings.",
    keywords: ["AI agents", "automation", "VA", "business", "tech"],
  },

  // ── FASHION ──────────────────────────────────────────────────────────────
  {
    niche: "fashion", source: "tiktok", topic: "quiet luxury vs loud fashion",
    title: "The quiet luxury vs loud fashion debate is still converting — pick a side and sell the look",
    summary: "Fashion audiences are deeply divided. Curators who take a strong stance on either side are driving massive engagement and high affiliate/product revenue.",
    score: 93, demand_level: "viral", velocity: 93,
    suggested_product: "Quiet Luxury Capsule Wardrobe Guide", suggested_price: 35,
    offer_type: "digital", action_suggestion: "Post your 10-piece quiet luxury wardrobe — film getting dressed, not just the clothes.",
    keywords: ["quiet luxury", "fashion", "style", "capsule wardrobe"],
  },

  // ── GAMING ───────────────────────────────────────────────────────────────
  {
    niche: "gaming", source: "tiktok", topic: "Roblox creator economy 2026",
    title: "Roblox creator monetization is a business — teach parents and teens how to earn",
    summary: "Thousands of teens are earning real income in Roblox. Parents are searching for how to help their kids turn gaming into a side income. Content here gets massive organic reach.",
    score: 85, demand_level: "high", velocity: 85,
    suggested_product: "Roblox Creator Income Starter Guide", suggested_price: 29,
    offer_type: "digital", action_suggestion: "Post how much a Roblox creator earns per month — use real numbers, not estimates.",
    keywords: ["Roblox", "gaming", "creator economy", "earn money"],
  },

  // ── EDUCATION ────────────────────────────────────────────────────────────
  {
    niche: "education", source: "twitter", topic: "AI tutors replacing teachers",
    title: "AI tutors vs. human teachers is the most engaged education debate right now",
    summary: "This topic triggers strong opinions from parents, teachers, and students. Educators who position clearly on AI-augmented teaching are building loyal premium audiences.",
    score: 89, demand_level: "high", velocity: 89,
    suggested_product: "AI-Powered Parent Tutoring Toolkit", suggested_price: 49,
    offer_type: "digital", action_suggestion: "Share your honest take on AI tutors — give parents a 3-point framework they can act on today.",
    keywords: ["AI tutor", "education", "teachers", "learning"],
  },

  // ── LUXURY ───────────────────────────────────────────────────────────────
  {
    niche: "luxury", source: "google", topic: "luxury watch market 2026",
    title: "Luxury watch market uncertainty is creating buyer anxiety — guides convert well",
    summary: "The pre-owned Rolex market correction has buyers confused. Comprehensive buying guides and market reports are commanding premium prices from serious collectors.",
    score: 85, demand_level: "high", velocity: 85,
    suggested_product: "2026 Luxury Watch Investment Guide", suggested_price: 149,
    offer_type: "digital", action_suggestion: "Post a breakdown of which watch brands are holding value in 2026 — use real auction data.",
    keywords: ["luxury watch", "Rolex", "investment", "collector"],
  },

  // ── MUSIC ────────────────────────────────────────────────────────────────
  {
    niche: "music", source: "twitter", topic: "AI music royalty debate",
    title: "AI music royalties are the hottest legal battle in music right now — creators need guidance",
    summary: "Artists are confused about their rights when AI is trained on their work. Legal breakdowns and protection bundles are selling fast among independent musicians.",
    score: 94, demand_level: "viral", velocity: 94,
    suggested_product: "Independent Artist AI Protection Playbook", suggested_price: 39,
    offer_type: "digital", action_suggestion: "Post a 3-step breakdown of how to protect your catalogue from AI training — make it shareable.",
    keywords: ["AI music", "royalties", "copyright", "musician"],
  },
];

export async function seedSignals(supabase: SupabaseClient): Promise<{ inserted: number; error?: string }> {
  // Deactivate any existing seed signals to avoid duplicates
  await supabase
    .from("signals")
    .update({ is_active: false })
    .in("niche", [...new Set(SEED_SIGNALS.map(s => s.niche))]);

  const rows: SignalRow[] = SEED_SIGNALS.map(s => ({ ...s, is_active: true, expires_at: expires() }));

  const { error, data } = await supabase
    .from("signals")
    .insert(rows)
    .select("id");

  if (error) return { inserted: 0, error: error.message };
  return { inserted: data?.length ?? 0 };
}
