import { calculateCreatorScore } from "./scoring";
import { determineOnboardingPath } from "./onboarding-path";
import { buildRecommendation } from "./recommend";
import { buildScoreExplainability } from "./explainability";
import {
  buildAdminDecisionMemo,
  buildFirstRevenuePrescription,
  deriveOpportunityTags,
  detectRedFlags,
} from "./elite-insights";
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
  const scoreExplainability = buildScoreExplainability(application, score, options.socialSignals);
  const redFlags = detectRedFlags(application, score, options.socialSignals);
  const opportunityTags = deriveOpportunityTags(application, score, redFlags);
  const firstRevenuePrescription = buildFirstRevenuePrescription(
    application,
    score,
    recommendation.recommendation,
    opportunityTags
  );
  const adminDecisionMemo = buildAdminDecisionMemo({
    recommendation: recommendation.recommendation,
    overallScore: score.overallScore,
    confidence: recommendation.confidence,
    redFlags,
    opportunityTags,
  });
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
    score_explainability: scoreExplainability,
    strengths: recommendation.strengths,
    weaknesses: recommendation.weaknesses,
    red_flags: redFlags,
    opportunity_tags: opportunityTags,
    first_revenue_prescription: firstRevenuePrescription,
    admin_decision_memo: adminDecisionMemo,
    onboarding_path: onboardingPath,
    reasoning_summary: `${recommendation.reasoningSummary} ${adminDecisionMemo.memo}`,
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
