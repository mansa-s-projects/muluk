/**
 * Mansas Moguls Lead Scoring Engine
 *
 * Scores every lead 0–100. Tier: cold < 20, warm 20–50, hot 51–80, vip 81+
 * Runs on every meaningful signal (page visit, email open, social click, etc.)
 */

export type LeadSignal =
  | "waitlist_join"          // +20
  | "email_opened"           // +5
  | "email_clicked"          // +10
  | "landing_visited"        // +2
  | "pricing_visited"        // +15
  | "applied"                // +30
  | "referred_someone"       // +25
  | "social_followed"        // +8
  | "platform_connected"     // +20
  | "returned_visit"         // +3
  | "demo_requested"         // +35;

export type LeadTier = "cold" | "warm" | "hot" | "vip";

const SIGNAL_WEIGHTS: Record<LeadSignal, number> = {
  waitlist_join:       20,
  email_opened:         5,
  email_clicked:       10,
  landing_visited:      2,
  pricing_visited:     15,
  applied:             30,
  referred_someone:    25,
  social_followed:      8,
  platform_connected:  20,
  returned_visit:       3,
  demo_requested:      35,
};

export function scoreLead(signals: LeadSignal[]): { score: number; tier: LeadTier } {
  const score = Math.min(100, signals.reduce((s, sig) => s + (SIGNAL_WEIGHTS[sig] ?? 0), 0));
  const tier: LeadTier =
    score >= 81 ? "vip" :
    score >= 51 ? "hot" :
    score >= 20 ? "warm" : "cold";
  return { score, tier };
}

export function tierColor(tier: LeadTier): string {
  return { vip: "#c8a96e", hot: "#e05555", warm: "#e8a830", cold: "rgba(255,255,255,0.3)" }[tier];
}
