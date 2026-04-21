import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeCreatorApplication,
  buildCreatorReasoningOptions,
  parseAudienceSize,
  toApplicationStatus,
  type CreatorApplicationInput,
  type CreatorPlatform,
  type SocialSignalsInput,
} from "@/lib/creator-intelligence";
import { aiRouter } from "@/lib/ai-router";

const PLATFORMS: CreatorPlatform[] = ["tiktok", "instagram", "youtube", "twitter", "other"];

function toPlatform(value: string | null | undefined): CreatorPlatform {
  if (!value) return "other";
  const normalized = value.toLowerCase();
  return PLATFORMS.includes(normalized as CreatorPlatform)
    ? (normalized as CreatorPlatform)
    : "other";
}

function mapApplicationInput(row: Record<string, unknown>): CreatorApplicationInput {
  return {
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    primaryPlatform: toPlatform(typeof row.primary_platform === "string" ? row.primary_platform : null),
    handle: String(row.handle ?? ""),
    secondaryPlatforms: Array.isArray(row.secondary_platforms)
      ? row.secondary_platforms
          .filter((item): item is string => typeof item === "string")
          .map((item) => toPlatform(item))
      : [],
    niche: String(row.niche ?? ""),
    bio: String(row.bio ?? row.short_description ?? ""),
    offerDescription: String(row.offer_description ?? row.short_description ?? ""),
    audienceSize: String(row.audience_size ?? row.audience_size_self_reported ?? "0"),
    monthlyEarnings: row.monthly_earnings ? String(row.monthly_earnings) : undefined,
    reasonForJoining: String(row.reason_for_joining ?? row.why_join_muluk ?? ""),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      applicationId?: string;
      application?: Partial<CreatorApplicationInput>;
      socialSignals?: SocialSignalsInput;
      includeLlmReasoning?: boolean;
    };

    let application: CreatorApplicationInput;
    let applicationId: string | null = null;

    if (body.applicationId) {
      applicationId = body.applicationId;
      const { data: applicationRow, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", body.applicationId)
        .single();

      if (error || !applicationRow) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      application = mapApplicationInput(applicationRow as unknown as Record<string, unknown>);
    } else if (body.application) {
      application = {
        name: body.application.name ?? "",
        email: body.application.email ?? "",
        primaryPlatform: body.application.primaryPlatform ?? "other",
        handle: body.application.handle ?? "",
        secondaryPlatforms: body.application.secondaryPlatforms ?? [],
        niche: body.application.niche ?? "",
        bio: body.application.bio ?? "",
        offerDescription: body.application.offerDescription ?? "",
        audienceSize: body.application.audienceSize ?? "0",
        monthlyEarnings: body.application.monthlyEarnings,
        reasonForJoining: body.application.reasonForJoining ?? "",
      };
    } else {
      return NextResponse.json(
        { error: "Provide applicationId or inline application payload" },
        { status: 400 }
      );
    }

    const analysis = await analyzeCreatorApplication(application, {
      socialSignals: body.socialSignals,
      ...buildCreatorReasoningOptions(
        Boolean(body.includeLlmReasoning) && aiRouter.getStatus().openrouter
      ),
    });

    const mappedStatus = toApplicationStatus(analysis.recommendation);

    if (applicationId) {
      const { error: scoreError } = await supabase.from("application_scores").upsert(
        {
          application_id: applicationId,
          overall_score: analysis.overall_score,
          audience_score: analysis.subscores.audience,
          engagement_score: analysis.subscores.engagement,
          niche_score: analysis.subscores.niche,
          offer_readiness_score: analysis.subscores.offer_readiness,
          brand_quality_score: analysis.subscores.brand_quality,
          growth_potential_score: analysis.subscores.growth_potential,
          recommendation: analysis.recommendation,
          confidence: analysis.confidence,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          red_flags: analysis.red_flags,
          opportunity_tags: analysis.opportunity_tags,
          first_revenue_prescription: analysis.first_revenue_prescription,
          admin_decision_memo: analysis.admin_decision_memo.memo,
          score_explainability: analysis.score_explainability,
          onboarding_path: analysis.onboarding_path,
          ai_summary: analysis.ai_summary,
        },
        { onConflict: "application_id" }
      );

      if (scoreError) {
        console.error("application_scores upsert failed:", scoreError);
      }

      const { error: appUpdateError } = await supabase
        .from("applications")
        .update({
          audience_size_numeric: parseAudienceSize(application.audienceSize),
          engagement_score: analysis.subscores.engagement,
          niche_score: analysis.subscores.niche,
          monetization_score: analysis.subscores.offer_readiness,
          overall_score: analysis.overall_score,
          recommendation: mappedStatus,
          confidence: analysis.confidence,
          onboarding_path: analysis.onboarding_path,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          red_flags: analysis.red_flags,
          opportunity_tags: analysis.opportunity_tags,
          first_revenue_prescription: analysis.first_revenue_prescription,
          admin_decision_memo: analysis.admin_decision_memo.memo,
          score_explainability: analysis.score_explainability,
          reasoning_summary: analysis.reasoning_summary,
          ai_summary: analysis.ai_summary,
        })
        .eq("id", applicationId);

      if (appUpdateError) {
        console.error("application update failed:", appUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analyze application error:", error);
    return NextResponse.json({ error: "Failed to analyze application" }, { status: 500 });
  }
}
