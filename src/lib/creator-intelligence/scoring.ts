import {
  type CreatorApplicationInput,
  type CreatorScoreResult,
  type CreatorSubscores,
  type SocialSignalsInput,
} from "./types";

const WEIGHTS = {
  audience: 15,
  engagement: 20,
  niche: 20,
  offerReadiness: 20,
  brandQuality: 10,
  growthPotential: 15,
} as const;

const HIGH_VALUE_NICHES = [
  "fitness",
  "business",
  "beauty",
  "coaching",
  "education",
  "finance",
  "productivity",
  "career",
  "self improvement",
  "skills",
  "language",
];

const MEDIUM_VALUE_NICHES = [
  "fashion",
  "lifestyle",
  "gaming",
  "travel",
  "food",
  "tech",
  "design",
];

const MONETIZATION_KEYWORDS = [
  "sell",
  "offer",
  "coaching",
  "consulting",
  "course",
  "template",
  "service",
  "subscription",
  "membership",
  "ebook",
  "download",
  "program",
  "workshop",
  "masterclass",
];

const QUALITY_KEYWORDS = [
  "premium",
  "exclusive",
  "professional",
  "strategy",
  "system",
  "framework",
  "results",
  "clients",
  "growth",
  "conversion",
  "trusted",
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function countHits(text: string, tokens: string[]): number {
  return tokens.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreBySignal(value: SocialSignalsInput[keyof SocialSignalsInput]): number {
  if (value === "high") return 85;
  if (value === "medium") return 65;
  if (value === "low") return 45;
  return 0;
}

export function parseAudienceSize(audienceSize: string): number {
  const normalized = audienceSize.toLowerCase().replace(/,/g, "").trim();

  const range = normalized.match(/(\d+(?:\.\d+)?)\s*(k|m)?\s*[-–]\s*(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (range) {
    const low = toAbsolute(range[1], range[2]);
    const high = toAbsolute(range[3], range[4]);
    return Math.round((low + high) / 2);
  }

  const under = normalized.match(/under\s+(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (under) {
    return Math.round(toAbsolute(under[1], under[2]) * 0.6);
  }

  const single = normalized.match(/(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (!single) return 0;
  return toAbsolute(single[1], single[2]);
}

function toAbsolute(raw: string, suffix?: string): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  if (suffix === "m") return Math.round(num * 1_000_000);
  if (suffix === "k") return Math.round(num * 1_000);
  return Math.round(num);
}

function scoreAudience(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): number {
  const parsedAudience = parseAudienceSize(application.audienceSize);
  const followerCount = socialSignals?.followerCount ?? parsedAudience;

  let followerScore = 45;
  if (followerCount >= 250_000) followerScore = 96;
  else if (followerCount >= 100_000) followerScore = 90;
  else if (followerCount >= 50_000) followerScore = 82;
  else if (followerCount >= 10_000) followerScore = 74;
  else if (followerCount >= 5_000) followerScore = 64;
  else if (followerCount >= 1_000) followerScore = 56;

  const crossPlatformBonus = Math.min(application.secondaryPlatforms.length * 5, 15);
  const credibilityBoost = socialSignals?.followerCount ? 8 : 0;

  return clamp(followerScore + crossPlatformBonus + credibilityBoost);
}

function scoreEngagement(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): number {
  const text = normalize(`${application.bio} ${application.offerDescription} ${application.reasonForJoining}`);
  const activityHits = countHits(text, ["daily", "weekly", "consistent", "community", "comments", "dm"]);
  const consistency = scoreBySignal(socialSignals?.contentConsistency);
  const engagementQuality = scoreBySignal(socialSignals?.engagementQuality);
  const postFrequency = scoreBySignal(socialSignals?.postFrequency);

  const base = 42;
  const textual = activityHits * 6;
  const signals = (consistency + engagementQuality + postFrequency) / 3;
  const signalBoost = signals > 0 ? (signals - 50) * 0.45 : 0;

  return clamp(base + textual + signalBoost);
}

function scoreNiche(application: CreatorApplicationInput): number {
  const niche = normalize(application.niche);

  if (HIGH_VALUE_NICHES.some((item) => niche.includes(item))) return 88;
  if (MEDIUM_VALUE_NICHES.some((item) => niche.includes(item))) return 72;
  return 58;
}

function scoreOfferReadiness(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): number {
  const text = normalize(application.offerDescription);
  const hits = countHits(text, MONETIZATION_KEYWORDS);

  const claritySignal = scoreBySignal(socialSignals?.offerClarity);
  const linkBonus = socialSignals?.linkInBioPresent ? 8 : 0;

  const base = 34;
  const keywordBoost = hits * 11;
  const signalBoost = claritySignal > 0 ? (claritySignal - 45) * 0.45 : 0;

  return clamp(base + keywordBoost + linkBonus + signalBoost);
}

function scoreBrandQuality(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): number {
  const text = normalize(`${application.bio} ${application.offerDescription}`);
  const qualityHits = countHits(text, QUALITY_KEYWORDS);

  const bioSignal = scoreBySignal(socialSignals?.bioClarity);
  const visualSignal = scoreBySignal(socialSignals?.visualQuality);

  const base = 40;
  const textBoost = qualityHits * 6;
  const signalBoost = bioSignal > 0 || visualSignal > 0 ? ((bioSignal + visualSignal) / 2 - 50) * 0.35 : 0;

  return clamp(base + textBoost + signalBoost);
}

function scoreGrowthPotential(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): number {
  const text = normalize(application.reasonForJoining);
  const driveHits = countHits(text, ["launch", "grow", "scale", "revenue", "experiment", "iterate", "learn", "execute", "momentum"]);

  const intentSignal = scoreBySignal(socialSignals?.audienceIntentSignals);
  const monetizationSignal = scoreBySignal(socialSignals?.monetizationSignals);

  const base = 48;
  const driveBoost = driveHits * 6;
  const signalBoost = intentSignal > 0 || monetizationSignal > 0 ? ((intentSignal + monetizationSignal) / 2 - 50) * 0.4 : 0;

  return clamp(base + driveBoost + signalBoost);
}

export function calculateCreatorScore(
  application: CreatorApplicationInput,
  socialSignals?: SocialSignalsInput
): CreatorScoreResult {
  const subscores: CreatorSubscores = {
    audience: scoreAudience(application, socialSignals),
    engagement: scoreEngagement(application, socialSignals),
    niche: scoreNiche(application),
    offer_readiness: scoreOfferReadiness(application, socialSignals),
    brand_quality: scoreBrandQuality(application, socialSignals),
    growth_potential: scoreGrowthPotential(application, socialSignals),
  };

  const weightedBreakdown = {
    audienceWeighted: (subscores.audience * WEIGHTS.audience) / 100,
    engagementWeighted: (subscores.engagement * WEIGHTS.engagement) / 100,
    nicheWeighted: (subscores.niche * WEIGHTS.niche) / 100,
    offerReadinessWeighted: (subscores.offer_readiness * WEIGHTS.offerReadiness) / 100,
    brandQualityWeighted: (subscores.brand_quality * WEIGHTS.brandQuality) / 100,
    growthPotentialWeighted: (subscores.growth_potential * WEIGHTS.growthPotential) / 100,
  };

  const overallScore = clamp(
    weightedBreakdown.audienceWeighted +
      weightedBreakdown.engagementWeighted +
      weightedBreakdown.nicheWeighted +
      weightedBreakdown.offerReadinessWeighted +
      weightedBreakdown.brandQualityWeighted +
      weightedBreakdown.growthPotentialWeighted
  );

  return { subscores, overallScore, weightedBreakdown };
}
