import { SCORE_WEIGHTS, parseAudienceSize } from "./scoring";
import type {
  CreatorApplicationInput,
  CreatorScoreResult,
  ScoreDimension,
  ScoreExplainability,
  SocialSignalsInput,
} from "./types";

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function engagementReasons(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): string[] {
  const text = normalize(`${application.bio} ${application.offerDescription} ${application.reasonForJoining}`);
  const reasons: string[] = [];

  if (hasAny(text, ["daily", "weekly", "consistent", "community", "comments", "dm"])) {
    reasons.push("Language indicates regular audience interaction and repeat publishing cadence.");
  }
  if (socialSignals?.contentConsistency) {
    reasons.push(`Content consistency signal is ${socialSignals.contentConsistency}.`);
  }
  if (socialSignals?.engagementQuality) {
    reasons.push(`Engagement quality signal is ${socialSignals.engagementQuality}.`);
  }

  return reasons.length > 0 ? reasons : ["Limited evidence of engagement loops and posting cadence in application text."];
}

function audienceReasons(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): string[] {
  const followerCount = socialSignals?.followerCount ?? parseAudienceSize(application.audienceSize);
  const reasons: string[] = [];

  reasons.push(`Estimated audience size is ${followerCount.toLocaleString()} based on provided profile data.`);
  if (application.secondaryPlatforms.length > 0) {
    reasons.push(`Cross-platform presence across ${application.secondaryPlatforms.length + 1} channels improves reach resilience.`);
  }
  if (socialSignals?.followerCount) {
    reasons.push("Follower count came from structured social signal data, increasing confidence.");
  }

  return reasons;
}

function nicheReasons(application: CreatorApplicationInput): string[] {
  const text = normalize(application.niche);
  if (hasAny(text, ["fitness", "business", "beauty", "coaching", "education", "finance"])) {
    return ["Niche maps to high-value conversion categories with proven willingness to pay."];
  }
  if (hasAny(text, ["fashion", "lifestyle", "gaming", "travel", "food", "tech", "design"])) {
    return ["Niche has monetization potential, but requires stronger positioning to maximize conversion."];
  }
  return ["Niche is broad or emerging, so monetization confidence depends on sharper positioning."];
}

function offerReasons(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): string[] {
  const text = normalize(application.offerDescription);
  const reasons: string[] = [];

  if (hasAny(text, ["coaching", "consulting", "course", "template", "membership", "subscription", "ebook", "service"])) {
    reasons.push("Offer description contains clear monetization artifacts and sellable formats.");
  }
  if (socialSignals?.offerClarity) {
    reasons.push(`Offer clarity signal is ${socialSignals.offerClarity}.`);
  }
  if (socialSignals?.linkInBioPresent) {
    reasons.push("Link in bio is present, indicating immediate conversion path readiness.");
  }

  return reasons.length > 0 ? reasons : ["Offer lacks explicit product, pricing, or conversion details."];
}

function brandReasons(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): string[] {
  const text = normalize(`${application.bio} ${application.offerDescription}`);
  const reasons: string[] = [];

  if (hasAny(text, ["results", "clients", "trusted", "strategy", "framework", "professional", "premium"])) {
    reasons.push("Bio and offer language include trust markers that improve brand credibility.");
  }
  if (socialSignals?.bioClarity) {
    reasons.push(`Bio clarity signal is ${socialSignals.bioClarity}.`);
  }
  if (socialSignals?.visualQuality) {
    reasons.push(`Visual quality signal is ${socialSignals.visualQuality}.`);
  }

  return reasons.length > 0 ? reasons : ["Brand trust markers are weak or missing from the current profile narrative."];
}

function growthReasons(application: CreatorApplicationInput, socialSignals?: SocialSignalsInput): string[] {
  const text = normalize(application.reasonForJoining);
  const reasons: string[] = [];

  if (hasAny(text, ["launch", "grow", "scale", "revenue", "experiment", "learn", "execute", "momentum"])) {
    reasons.push("Motivation statement shows execution intent and growth orientation.");
  }
  if (socialSignals?.audienceIntentSignals) {
    reasons.push(`Audience intent signal is ${socialSignals.audienceIntentSignals}.`);
  }
  if (socialSignals?.monetizationSignals) {
    reasons.push(`Monetization signal is ${socialSignals.monetizationSignals}.`);
  }

  return reasons.length > 0 ? reasons : ["Growth intent is currently aspirational rather than execution-specific."];
}

function makeItem(score: number, weight: number, reasons: string[]) {
  return {
    score,
    weight,
    weightedContribution: Number(((score * weight) / 100).toFixed(2)),
    reasons,
  };
}

export function buildScoreExplainability(
  application: CreatorApplicationInput,
  score: CreatorScoreResult,
  socialSignals?: SocialSignalsInput
): ScoreExplainability {
  return {
    audience: makeItem(score.subscores.audience, SCORE_WEIGHTS.audience, audienceReasons(application, socialSignals)),
    engagement: makeItem(score.subscores.engagement, SCORE_WEIGHTS.engagement, engagementReasons(application, socialSignals)),
    niche: makeItem(score.subscores.niche, SCORE_WEIGHTS.niche, nicheReasons(application)),
    offer_readiness: makeItem(score.subscores.offer_readiness, SCORE_WEIGHTS.offerReadiness, offerReasons(application, socialSignals)),
    brand_quality: makeItem(score.subscores.brand_quality, SCORE_WEIGHTS.brandQuality, brandReasons(application, socialSignals)),
    growth_potential: makeItem(score.subscores.growth_potential, SCORE_WEIGHTS.growthPotential, growthReasons(application, socialSignals)),
  } satisfies Record<ScoreDimension, ReturnType<typeof makeItem>>;
}
