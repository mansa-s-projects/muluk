import type {
  ConfidenceLevel,
  CreatorRecommendation,
  CreatorRecommendationResult,
  CreatorScoreResult,
} from "./types";

function toRecommendation(score: number): CreatorRecommendation {
  if (score >= 85) return "APPROVE_PRIORITY";
  if (score >= 70) return "APPROVE";
  if (score >= 50) return "WAITLIST";
  return "REJECT";
}

function confidenceFromScore(score: number, spread: number): ConfidenceLevel {
  if (score >= 85 && spread <= 18) return "high";
  if (score <= 40 && spread <= 20) return "high";
  if (spread > 30) return "low";
  return "medium";
}

function topSignals(score: CreatorScoreResult, mode: "best" | "worst"): Array<{ key: string; value: number }> {
  const pairs = Object.entries(score.subscores).map(([key, value]) => ({ key, value }));
  const sorted = [...pairs].sort((a, b) => (mode === "best" ? b.value - a.value : a.value - b.value));
  return sorted.slice(0, 3);
}

function labelForScoreKey(key: string): string {
  if (key === "offer_readiness") return "Offer readiness";
  if (key === "brand_quality") return "Brand quality";
  if (key === "growth_potential") return "Growth potential";
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function buildRecommendation(score: CreatorScoreResult): CreatorRecommendationResult {
  const recommendation = toRecommendation(score.overallScore);

  const values = Object.values(score.subscores);
  const spread = Math.max(...values) - Math.min(...values);
  const confidence = confidenceFromScore(score.overallScore, spread);

  const strengths = topSignals(score, "best").map(
    (entry) => `${labelForScoreKey(entry.key)} is strong (${entry.value}/100)`
  );

  const weaknesses = topSignals(score, "worst").map(
    (entry) => `${labelForScoreKey(entry.key)} needs work (${entry.value}/100)`
  );

  const reasoningSummary =
    recommendation === "APPROVE_PRIORITY"
      ? "High monetization potential with strong execution readiness. Fast-track recommended."
      : recommendation === "APPROVE"
      ? "Good monetization readiness and fit for immediate activation."
      : recommendation === "WAITLIST"
      ? "Promising profile but missing execution depth. Queue for nurture and re-evaluate."
      : "Current profile does not meet monetization readiness threshold.";

  return {
    recommendation,
    confidence,
    strengths,
    weaknesses,
    reasoningSummary,
  };
}
