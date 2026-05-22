export type CreatorPlatform = "tiktok" | "instagram" | "youtube" | "twitter" | "other";

export type ConfidenceLevel = "high" | "medium" | "low";

export type CreatorRecommendation =
  | "APPROVE_PRIORITY"
  | "APPROVE"
  | "WAITLIST"
  | "REJECT";

export type OnboardingPath =
  | "digital_offer_fast_launch"
  | "coaching_service_launch"
  | "custom_content_launch"
  | "audience_build_first"
  | "white_glove_priority";

export interface CreatorApplicationInput {
  name: string;
  email: string;
  primaryPlatform: CreatorPlatform;
  handle: string;
  secondaryPlatforms: CreatorPlatform[];
  niche: string;
  bio: string;
  offerDescription: string;
  audienceSize: string;
  monthlyEarnings?: string;
  reasonForJoining: string;
}

export interface SocialSignalsInput {
  followerCount?: number;
  postFrequency?: "low" | "medium" | "high";
  engagementQuality?: "low" | "medium" | "high";
  bioClarity?: "low" | "medium" | "high";
  contentConsistency?: "low" | "medium" | "high";
  monetizationSignals?: "low" | "medium" | "high";
  linkInBioPresent?: boolean;
  offerClarity?: "low" | "medium" | "high";
  visualQuality?: "low" | "medium" | "high";
  audienceIntentSignals?: "low" | "medium" | "high";
}

export interface CreatorSubscores {
  audience: number;
  engagement: number;
  niche: number;
  offer_readiness: number;
  brand_quality: number;
  growth_potential: number;
}

export type ScoreDimension = keyof CreatorSubscores;

export interface ScoreExplainabilityItem {
  score: number;
  weight: number;
  weightedContribution: number;
  reasons: string[];
}

export type ScoreExplainability = Record<ScoreDimension, ScoreExplainabilityItem>;

export interface WeightedScoreBreakdown {
  audienceWeighted: number;
  engagementWeighted: number;
  nicheWeighted: number;
  offerReadinessWeighted: number;
  brandQualityWeighted: number;
  growthPotentialWeighted: number;
}

export interface CreatorScoreResult {
  subscores: CreatorSubscores;
  overallScore: number;
  weightedBreakdown: WeightedScoreBreakdown;
}

export interface CreatorRecommendationResult {
  recommendation: CreatorRecommendation;
  confidence: ConfidenceLevel;
  strengths: string[];
  weaknesses: string[];
  reasoningSummary: string;
}

export type RedFlagType =
  | "fake_audience_risk"
  | "vague_niche"
  | "no_monetization_intent"
  | "weak_brand_trust"
  | "low_content_consistency";

export interface RedFlagAssessment {
  type: RedFlagType;
  detected: boolean;
  severity: "low" | "medium" | "high";
  reason: string;
}

export type OpportunityTag =
  | "high_ticket_potential"
  | "subscription_fit"
  | "pay_link_fit"
  | "custom_content_fit"
  | "referral_candidate"
  | "white_glove_candidate";

export interface FirstRevenuePrescription {
  what_to_sell_first: string;
  recommended_price_range: string;
  best_first_product_type: string;
  fastest_path_to_first_3_sales: string[];
}

export interface AdminDecisionMemo {
  decision: "approve" | "waitlist" | "reject";
  memo: string;
}

export interface CreatorAnalysisOutput {
  overall_score: number;
  recommendation: CreatorRecommendation;
  confidence: ConfidenceLevel;
  subscores: CreatorSubscores;
  score_explainability: ScoreExplainability;
  strengths: string[];
  weaknesses: string[];
  red_flags: RedFlagAssessment[];
  opportunity_tags: OpportunityTag[];
  first_revenue_prescription: FirstRevenuePrescription;
  admin_decision_memo: AdminDecisionMemo;
  onboarding_path: OnboardingPath;
  reasoning_summary: string;
  ai_summary: string | null;
}

export interface AnalyzeCreatorOptions {
  socialSignals?: SocialSignalsInput;
  includeLlmReasoning?: boolean;
  llmReasoningFn?: (input: {
    application: CreatorApplicationInput;
    score: CreatorScoreResult;
    recommendation: CreatorRecommendationResult;
    onboardingPath: OnboardingPath;
  }) => Promise<string>;
}
