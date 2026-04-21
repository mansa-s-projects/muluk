import { calculateCreatorScore } from "./scoring";
import { determineOnboardingPath } from "./onboarding-path";
import { buildRecommendation } from "./recommend";
import type {
  AnalyzeCreatorOptions,
  CreatorAnalysisOutput,
  CreatorApplicationInput,
} from "./types";

export async function analyzeCreatorApplication(
  application: CreatorApplicationInput,
  options: AnalyzeCreatorOptions = {}
): Promise<CreatorAnalysisOutput> {
  const score = calculateCreatorScore(application, options.socialSignals);
  const recommendation = buildRecommendation(score);
  const onboardingPath = determineOnboardingPath({
    application,
    recommendation: recommendation.recommendation,
    overallScore: score.overallScore,
  });

  let aiSummary: string | null = null;
  if (options.includeLlmReasoning && options.llmReasoningFn) {
    try {
      aiSummary = await options.llmReasoningFn({
        application,
        score,
        recommendation,
        onboardingPath,
      });
    } catch (error) {
      console.error("Creator intelligence LLM reasoning failed:", error);
      aiSummary = null;
    }
  }

  return {
    overall_score: score.overallScore,
    recommendation: recommendation.recommendation,
    confidence: recommendation.confidence,
    subscores: score.subscores,
    strengths: recommendation.strengths,
    weaknesses: recommendation.weaknesses,
    onboarding_path: onboardingPath,
    reasoning_summary: recommendation.reasoningSummary,
    ai_summary: aiSummary,
  };
}

export function toApplicationStatus(recommendation: CreatorAnalysisOutput["recommendation"]):
  | "approved"
  | "waitlist"
  | "rejected" {
  if (recommendation === "APPROVE" || recommendation === "APPROVE_PRIORITY") {
    return "approved";
  }
  if (recommendation === "WAITLIST") {
    return "waitlist";
  }
  return "rejected";
}
