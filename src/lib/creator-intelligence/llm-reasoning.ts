import { aiRouter } from "@/lib/ai-router";
import type {
  AnalyzeCreatorOptions,
  CreatorApplicationInput,
  CreatorRecommendationResult,
  CreatorScoreResult,
  OnboardingPath,
} from "./types";

type CreatorReasoningInput = {
  application: CreatorApplicationInput;
  score: CreatorScoreResult;
  recommendation: CreatorRecommendationResult;
  onboardingPath: OnboardingPath;
};

const SYSTEM_PROMPT = `You are MULUK's creator intelligence reasoning layer.

Your job is to add sharp qualitative judgment on top of an existing rule-based score.
Do not change the score. Do not contradict the provided recommendation unless there is an obvious strategic nuance.
Focus on creator earnings potential, audience quality, monetization readiness, and fit for the MULUK ecosystem.

Return exactly four labeled sections:
MONETIZATION_READINESS:
RED_FLAGS:
FIT_ASSESSMENT:
IDEAL_LAUNCH_PATH:

Each section must be 1-2 concise sentences. No bullets. No markdown.`;

function formatCurrency(value?: string): string {
  return value?.trim() || "not provided";
}

function buildPrompt(input: CreatorReasoningInput): string {
  const secondaryPlatforms =
    input.application.secondaryPlatforms.length > 0
      ? input.application.secondaryPlatforms.join(", ")
      : "none";

  return `Analyze this creator application for MULUK.

APPLICATION:
Name: ${input.application.name}
Primary platform: ${input.application.primaryPlatform}
Handle: @${input.application.handle}
Secondary platforms: ${secondaryPlatforms}
Niche: ${input.application.niche}
Bio: ${input.application.bio || "not provided"}
Offer description: ${input.application.offerDescription || "not provided"}
Audience size: ${input.application.audienceSize}
Monthly earnings: ${formatCurrency(input.application.monthlyEarnings)}
Reason for joining: ${input.application.reasonForJoining}

RULE-BASED SCORING:
Overall score: ${input.score.overallScore}
Audience score: ${input.score.subscores.audience}
Engagement score: ${input.score.subscores.engagement}
Niche score: ${input.score.subscores.niche}
Offer readiness score: ${input.score.subscores.offer_readiness}
Brand quality score: ${input.score.subscores.brand_quality}
Growth potential score: ${input.score.subscores.growth_potential}
Recommendation: ${input.recommendation.recommendation}
Confidence: ${input.recommendation.confidence}
Top strengths: ${input.recommendation.strengths.join(" | ")}
Top weaknesses: ${input.recommendation.weaknesses.join(" | ")}
Suggested onboarding path: ${input.onboardingPath}

Produce the four labeled sections only.`;
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  return fullText.trim();
}

export async function generateCreatorIntelligenceSummary(
  input: CreatorReasoningInput
): Promise<string> {
  const { stream } = await aiRouter.streamCompletion(
    "creator_intelligence_reasoning",
    buildPrompt(input),
    SYSTEM_PROMPT
  );

  const text = await readStreamToString(stream);
  if (!text || text === "Generation failed." || text.startsWith("Error (")) {
    throw new Error("Creator intelligence reasoning failed");
  }

  return text;
}

export function buildCreatorReasoningOptions(enabled: boolean): Pick<
  AnalyzeCreatorOptions,
  "includeLlmReasoning" | "llmReasoningFn"
> {
  return {
    includeLlmReasoning: enabled,
    llmReasoningFn: generateCreatorIntelligenceSummary,
  };
}