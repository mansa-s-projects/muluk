import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  analyzeCreatorApplication,
  buildCreatorReasoningOptions,
  toApplicationStatus,
  parseAudienceSize,
  type CreatorRecommendation,
  type CreatorPlatform,
} from "@/lib/creator-intelligence";
import { aiRouter } from "@/lib/ai-router";

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }

  return new Resend(apiKey);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLATFORM_VALUES: CreatorPlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "twitter",
  "other",
];

const NICHES = [
  "fitness",
  "business",
  "beauty",
  "coaching",
  "education",
  "finance",
  "fashion",
  "lifestyle",
  "gaming",
  "other",
];

type ApplyPayload = {
  name: string;
  email: string;
  primaryPlatform: CreatorPlatform;
  handle: string;
  secondaryPlatforms?: string[];
  niche: string;
  nicheCustom?: string;
  shortDescription: string;
  audienceSize: string;
  monthlyEarnings?: string;
  whyJoinMuluk: string;
};

function normalizeHandle(value: string): string {
  return value.toLowerCase().trim().replace(/^@/, "");
}

function ensurePayload(body: Record<string, unknown>): ApplyPayload {
  const payload: ApplyPayload = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    primaryPlatform:
      typeof body.primaryPlatform === "string"
        ? (body.primaryPlatform.toLowerCase() as CreatorPlatform)
        : "other",
    handle: typeof body.handle === "string" ? normalizeHandle(body.handle) : "",
    secondaryPlatforms:
      Array.isArray(body.secondaryPlatforms)
        ? body.secondaryPlatforms.filter((item): item is string => typeof item === "string")
        : [],
    niche: typeof body.niche === "string" ? body.niche.trim().toLowerCase() : "",
    nicheCustom: typeof body.nicheCustom === "string" ? body.nicheCustom.trim() : "",
    shortDescription:
      typeof body.shortDescription === "string" ? body.shortDescription.trim() : "",
    audienceSize:
      typeof body.audienceSize === "string" ? body.audienceSize.trim() : "",
    monthlyEarnings:
      typeof body.monthlyEarnings === "string" ? body.monthlyEarnings.trim() : "",
    whyJoinMuluk:
      typeof body.whyJoinMuluk === "string" ? body.whyJoinMuluk.trim() : "",
  };

  if (!payload.name) throw new Error("Missing required field: name");
  if (!payload.email || !EMAIL_RE.test(payload.email)) throw new Error("Invalid email");
  if (!payload.handle) throw new Error("Missing required field: handle");
  if (!PLATFORM_VALUES.includes(payload.primaryPlatform)) {
    throw new Error("Invalid primary platform");
  }
  if (!payload.shortDescription) {
    throw new Error("Missing required field: shortDescription");
  }
  if (!payload.audienceSize) throw new Error("Missing required field: audienceSize");
  if (!payload.whyJoinMuluk) throw new Error("Missing required field: whyJoinMuluk");

  if (!payload.niche || (!NICHES.includes(payload.niche) && payload.niche !== "other")) {
    throw new Error("Invalid niche");
  }

  if (payload.niche === "other" && !payload.nicheCustom) {
    throw new Error("nicheCustom is required when niche is other");
  }

  return payload;
}

function decisionMessage(decision: CreatorRecommendation): string {
  if (decision === "APPROVE_PRIORITY") {
    return "You're in with priority onboarding. Let's unlock your first sale immediately.";
  }
  if (decision === "APPROVE") return "You're in. Let's get your first sale.";
  if (decision === "WAITLIST") return "You're on the list. We'll unlock access soon.";
  return "Not the right fit right now. Stay close.";
}

function decisionRoute(decision: CreatorRecommendation): string {
  if (decision === "APPROVE_PRIORITY" || decision === "APPROVE") {
    return "/dashboard/onboarding";
  }
  if (decision === "WAITLIST") return "/apply?state=waitlist";
  return "/apply?state=rejected";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const resend = createResendClient();

    // Link to auth user if logged in
    const serverClient = await createClient();
    const { data: { user: authUser } } = await serverClient.auth.getUser();
    const userId = authUser?.id ?? null;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("Apply payload JSON parse failed:", {
        message: parseErr instanceof Error ? parseErr.message : "Unknown parse error",
        stack: parseErr instanceof Error ? parseErr.stack : null,
      });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    let payload: ApplyPayload;
    try {
      payload = ensurePayload(body);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Invalid payload",
        },
        { status: 400 }
      );
    }

    const audienceNumeric = parseAudienceSize(payload.audienceSize);
    const analysis = await analyzeCreatorApplication({
      name: payload.name,
      email: payload.email,
      primaryPlatform: payload.primaryPlatform,
      handle: payload.handle,
      secondaryPlatforms: (payload.secondaryPlatforms ?? []).filter(
        (item): item is CreatorPlatform => PLATFORM_VALUES.includes(item as CreatorPlatform)
      ),
      niche: payload.niche === "other" ? payload.nicheCustom ?? "" : payload.niche,
      bio: payload.shortDescription,
      offerDescription: payload.shortDescription,
      audienceSize: payload.audienceSize,
      monthlyEarnings: payload.monthlyEarnings,
      reasonForJoining: payload.whyJoinMuluk,
    }, buildCreatorReasoningOptions(aiRouter.getStatus().openrouter));

    const mappedStatus = toApplicationStatus(analysis.recommendation);

    const { data: creatorRow, error: creatorError } = await supabase
      .from("creators")
      .upsert(
        {
          user_id: userId,
          email: payload.email,
          handle: payload.handle,
          platform: payload.primaryPlatform,
          niche: payload.niche === "other" ? payload.nicheCustom : payload.niche,
          score: analysis.overall_score,
          status: mappedStatus,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (creatorError || !creatorRow) {
      console.error("Creator upsert failed:", creatorError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const { data: applicationRow, error: dbError } = await supabase.from("applications").upsert(
      {
        creator_id: creatorRow.id,
        user_id: userId,
        name: payload.name,
        email: payload.email,
        primary_platform: payload.primaryPlatform,
        handle: payload.handle,
        secondary_platforms: payload.secondaryPlatforms ?? [],
        niche: payload.niche,
        niche_custom: payload.nicheCustom || null,
        bio: payload.shortDescription,
        short_description: payload.shortDescription,
        offer_description: payload.shortDescription,
        audience_size: payload.audienceSize,
        audience_size_self_reported: payload.audienceSize,
        audience_size_numeric: audienceNumeric,
        monthly_earnings: payload.monthlyEarnings || null,
        reason_for_joining: payload.whyJoinMuluk,
        why_join_muluk: payload.whyJoinMuluk,
        raw_data: body,
        engagement_score: analysis.subscores.engagement,
        niche_score: analysis.subscores.niche,
        monetization_score: analysis.subscores.offer_readiness,
        overall_score: analysis.overall_score,
        recommendation: mappedStatus,
        confidence: analysis.confidence,
        onboarding_path: analysis.onboarding_path,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        reasoning_summary: analysis.reasoning_summary,
        ai_summary: analysis.ai_summary,
        status: mappedStatus,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ error: "Already applied" }, { status: 409 });
      }
      console.error("Apply DB insert failed:", {
        message: dbError.message,
        stack: (dbError as { stack?: string }).stack ?? null,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (applicationRow?.id) {
      const { error: scorePersistError } = await supabase.from("application_scores").upsert(
        {
          application_id: applicationRow.id,
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
          onboarding_path: analysis.onboarding_path,
          ai_summary: analysis.ai_summary,
        },
        { onConflict: "application_id" }
      );

      if (scorePersistError) {
        console.error("application_scores upsert failed:", scorePersistError);
      }
    }

    if (userId) {
      const { error: legacyError } = await supabase.from("creator_applications").upsert(
        {
          user_id: userId,
          name: payload.name,
          handle: payload.handle,
          category: payload.niche,
          email: payload.email,
          country: "",
          payout_method: "",
          content_types: payload.secondaryPlatforms ?? [],
          audience_size: payload.audienceSize,
          bio: payload.shortDescription,
          status:
            mappedStatus === "approved"
              ? "approved"
              : mappedStatus === "rejected"
              ? "rejected"
              : "pending",
        },
        { onConflict: "user_id" }
      );

      if (legacyError) {
        console.error("Legacy creator_applications upsert failed:", legacyError);
      }
    }

    try {
      await resend.emails.send({
        from: "MULUK <hello@muluk.vip>",
        to: payload.email,
        subject: "Your MULUK application status",
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#020203;font-family:'Helvetica Neue',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:60px 24px;">
<table width="560" cellpadding="0" cellspacing="0">
  <tr><td style="padding-bottom:40px;"><span style="font-family:'Courier New',monospace;font-size:17px;font-weight:500;letter-spacing:0.3em;color:#c8a96e;">MULUK</span></td></tr>
  <tr><td style="padding-bottom:40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,110,0.4),transparent);"></div></td></tr>
  <tr><td style="padding-bottom:20px;"><h1 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:300;color:rgba(255,255,255,0.92);line-height:1.1;">Application<br/><em style="color:#c8a96e;">processed.</em></h1></td></tr>
  <tr><td style="padding-bottom:36px;"><p style="margin:0;font-size:15px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.5);">Hey ${escapeHtml(payload.name)}, your application for <strong style="color:rgba(255,255,255,0.7);">@${escapeHtml(payload.handle)}</strong> was reviewed.<br/><br/><span style="color:#c8a96e;">${escapeHtml(decisionMessage(analysis.recommendation))}</span></p></td></tr>
  <tr><td style="padding-bottom:36px;">
    <div style="background:#0f0f1a;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:24px 28px;">
      <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#8a7048;">Creator intelligence</p>
      ${[["Overall Score", String(analysis.overall_score)], ["Engagement", String(analysis.subscores.engagement)], ["Niche", String(analysis.subscores.niche)], ["Offer Readiness", String(analysis.subscores.offer_readiness)], ["Decision", analysis.recommendation]].map(([label, value]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:12px;color:rgba(255,255,255,0.3);font-family:'Courier New',monospace;">${label}</span><span style="font-size:13px;color:rgba(255,255,255,0.6);font-weight:300;">${escapeHtml(value)}</span></div>`).join("")}
    </div>
  </td></tr>
  <tr><td><p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;">&#xa9; 2025 MULUK &#xb7; muluk.vip</p></td></tr>
</table></td></tr></table>
</body></html>`,
      });
    } catch (emailErr) {
      console.error("Email delivery failed:", emailErr);
      // DB insert succeeded — return success even if confirmation email fails
    }

    return NextResponse.json({
      success: true,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      onboarding_path: analysis.onboarding_path,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      scores: {
        audience_score: analysis.subscores.audience,
        engagement_score: analysis.subscores.engagement,
        niche_score: analysis.subscores.niche,
        offer_readiness_score: analysis.subscores.offer_readiness,
        brand_quality_score: analysis.subscores.brand_quality,
        growth_potential_score: analysis.subscores.growth_potential,
        overall_score: analysis.overall_score,
      },
      message: decisionMessage(analysis.recommendation),
      redirectTo: decisionRoute(analysis.recommendation),
    });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
