import { parseAudienceSize } from "./scoring";
import type {
  AdminDecisionMemo,
  CreatorApplicationInput,
  CreatorRecommendation,
  CreatorScoreResult,
  FirstRevenuePrescription,
  OpportunityTag,
  RedFlagAssessment,
  SocialSignalsInput,
} from "./types";

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function severityFromRiskScore(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function detectRedFlags(
  application: CreatorApplicationInput,
  score: CreatorScoreResult,
  socialSignals?: SocialSignalsInput
): RedFlagAssessment[] {
  const niche = normalize(application.niche);
  const offerText = normalize(application.offerDescription);
  const bioText = normalize(application.bio);
  const reasonText = normalize(application.reasonForJoining);
  const audience = socialSignals?.followerCount ?? parseAudienceSize(application.audienceSize);

  const fakeAudienceRiskScore =
    audience >= 50_000 && score.subscores.engagement < 55
      ? 82
      : socialSignals?.engagementQuality === "low" && audience >= 10_000
      ? 67
      : 18;

  const vagueNicheRiskScore =
    hasAny(niche, ["lifestyle", "creator", "content", "general", "other"]) || score.subscores.niche < 62
      ? 76
      : 22;

  const monetizationRiskScore =
    score.subscores.offer_readiness < 55 && !hasAny(offerText, ["sell", "offer", "coaching", "course", "subscription", "service", "template", "membership"])
      ? 84
      : 24;

  const brandTrustRiskScore =
    score.subscores.brand_quality < 58 && !hasAny(bioText, ["results", "clients", "trusted", "years", "certified", "case study"])
      ? 74
      : 21;

  const consistencyRiskScore =
    socialSignals?.contentConsistency === "low" || score.subscores.engagement < 58 || !hasAny(reasonText, ["daily", "weekly", "consistent", "schedule"])
      ? 72
      : 19;

  return [
    {
      type: "fake_audience_risk",
      detected: fakeAudienceRiskScore >= 45,
      severity: severityFromRiskScore(fakeAudienceRiskScore),
      reason: fakeAudienceRiskScore >= 45
        ? "Audience scale appears high relative to engagement signals, suggesting potential audience quality mismatch."
        : "Audience-to-engagement ratio appears credible based on available signals.",
    },
    {
      type: "vague_niche",
      detected: vagueNicheRiskScore >= 45,
      severity: severityFromRiskScore(vagueNicheRiskScore),
      reason: vagueNicheRiskScore >= 45
        ? "Niche positioning is broad, making monetization targeting and offer resonance weaker."
        : "Niche positioning is sufficiently specific for targeted monetization.",
    },
    {
      type: "no_monetization_intent",
      detected: monetizationRiskScore >= 45,
      severity: severityFromRiskScore(monetizationRiskScore),
      reason: monetizationRiskScore >= 45
        ? "Application lacks explicit monetization intent, offer mechanics, or conversion language."
        : "Application includes clear intent to monetize with sellable outcomes.",
    },
    {
      type: "weak_brand_trust",
      detected: brandTrustRiskScore >= 45,
      severity: severityFromRiskScore(brandTrustRiskScore),
      reason: brandTrustRiskScore >= 45
        ? "Brand trust signals are underdeveloped, reducing buyer confidence for paid conversion."
        : "Brand trust indicators are present and support conversion confidence.",
    },
    {
      type: "low_content_consistency",
      detected: consistencyRiskScore >= 45,
      severity: severityFromRiskScore(consistencyRiskScore),
      reason: consistencyRiskScore >= 45
        ? "Content consistency appears weak, which may reduce compounding audience intent."
        : "Content cadence appears consistent enough to support monetization momentum.",
    },
  ];
}

export function deriveOpportunityTags(
  application: CreatorApplicationInput,
  score: CreatorScoreResult,
  redFlags: RedFlagAssessment[]
): OpportunityTag[] {
  const text = normalize(`${application.niche} ${application.offerDescription} ${application.bio}`);
  const highFlags = redFlags.filter((flag) => flag.detected && flag.severity === "high").length;
  const tags = new Set<OpportunityTag>();

  if (score.subscores.offer_readiness >= 70 || hasAny(text, ["premium", "consulting", "strategy", "1:1", "high ticket"])) {
    tags.add("high_ticket_potential");
  }
  if (score.subscores.engagement >= 62 && hasAny(text, ["membership", "subscription", "community", "weekly", "q&a"])) {
    tags.add("subscription_fit");
  }
  if (score.subscores.offer_readiness >= 60 || hasAny(text, ["template", "ebook", "download", "course", "digital"])) {
    tags.add("pay_link_fit");
  }
  if (hasAny(text, ["custom", "personalized", "one-on-one", "1:1", "request"])) {
    tags.add("custom_content_fit");
  }
  if (score.subscores.growth_potential >= 70 && score.subscores.brand_quality >= 62 && highFlags === 0) {
    tags.add("referral_candidate");
  }
  if (score.overallScore >= 90 && highFlags === 0) {
    tags.add("white_glove_candidate");
  }

  return [...tags];
}

function priceRange(
  audience: number,
  tags: OpportunityTag[],
  recommendation: CreatorRecommendation
): string {
  if (tags.includes("white_glove_candidate") || tags.includes("high_ticket_potential")) {
    return "$299-$1,500";
  }
  if (tags.includes("subscription_fit")) {
    return "$19-$79 / month";
  }
  if (tags.includes("pay_link_fit")) {
    return "$29-$149";
  }
  if (recommendation === "WAITLIST") {
    return "$9-$39";
  }
  if (audience < 5_000) {
    return "$19-$59";
  }
  return "$49-$199";
}

function firstProductType(tags: OpportunityTag[]): string {
  if (tags.includes("high_ticket_potential")) return "paid strategy audit or premium consultation";
  if (tags.includes("subscription_fit")) return "founding-member subscription offer";
  if (tags.includes("custom_content_fit")) return "custom content request package";
  if (tags.includes("pay_link_fit")) return "digital mini-offer via direct pay link";
  return "lightweight starter digital product";
}

export function buildFirstRevenuePrescription(
  application: CreatorApplicationInput,
  score: CreatorScoreResult,
  recommendation: CreatorRecommendation,
  tags: OpportunityTag[]
): FirstRevenuePrescription {
  const audience = parseAudienceSize(application.audienceSize);
  const productType = firstProductType(tags);

  return {
    what_to_sell_first: `Start with a ${productType} aligned to ${application.niche || "your niche"} and immediate audience pain points.`,
    recommended_price_range: priceRange(audience, tags, recommendation),
    best_first_product_type: productType,
    fastest_path_to_first_3_sales: [
      "Publish one authority post that names a specific audience pain and outcome.",
      "Drop a single CTA to your pay link with a limited founding offer and 48-hour window.",
      "DM or reply to warm audience intent signals from the post and offer direct checkout help.",
      "Collect first 3 buyer outcomes and turn them into trust proof for the next conversion cycle.",
    ],
  };
}

export function buildAdminDecisionMemo(input: {
  recommendation: CreatorRecommendation;
  overallScore: number;
  confidence: "high" | "medium" | "low";
  redFlags: RedFlagAssessment[];
  opportunityTags: OpportunityTag[];
}): AdminDecisionMemo {
  const severeFlags = input.redFlags.filter((flag) => flag.detected && flag.severity === "high");
  const decision: AdminDecisionMemo["decision"] =
    input.recommendation === "APPROVE" || input.recommendation === "APPROVE_PRIORITY"
      ? "approve"
      : input.recommendation === "WAITLIST"
      ? "waitlist"
      : "reject";

  const riskSummary =
    severeFlags.length > 0
      ? `Risk watch: ${severeFlags.map((flag) => flag.type).join(", ")}.`
      : "No severe risk flags detected.";

  const opportunitySummary = input.opportunityTags.length > 0
    ? `Top opportunities: ${input.opportunityTags.join(", ")}.`
    : "Opportunity profile is still developing.";

  return {
    decision,
    memo: `Decision: ${decision.toUpperCase()} (score ${input.overallScore}, confidence ${input.confidence}). ${riskSummary} ${opportunitySummary} This recommendation balances readiness, trust, and near-term revenue velocity.`,
  };
}
