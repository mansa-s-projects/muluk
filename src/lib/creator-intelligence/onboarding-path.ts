import type {
  CreatorApplicationInput,
  CreatorRecommendation,
  OnboardingPath,
} from "./types";

function normalize(text: string): string {
  return text.toLowerCase();
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

export function determineOnboardingPath(input: {
  application: CreatorApplicationInput;
  recommendation: CreatorRecommendation;
  overallScore: number;
}): OnboardingPath {
  const text = normalize(`${input.application.niche} ${input.application.offerDescription} ${input.application.bio}`);

  if (input.recommendation === "APPROVE_PRIORITY" && input.overallScore >= 92) {
    return "white_glove_priority";
  }

  if (hasAny(text, ["coaching", "consulting", "advisor", "mentor", "strategy call"])) {
    return "coaching_service_launch";
  }

  if (hasAny(text, ["custom", "personalized", "1:1", "one-on-one", "exclusive request"])) {
    return "custom_content_launch";
  }

  if (hasAny(text, ["template", "guide", "ebook", "digital", "download", "course"])) {
    return "digital_offer_fast_launch";
  }

  if (input.recommendation === "WAITLIST") {
    return "audience_build_first";
  }

  return "digital_offer_fast_launch";
}
