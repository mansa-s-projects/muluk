import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-applications] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const platform = searchParams.get("platform") || "all";
    const niche = searchParams.get("niche") || "all";
    const recommendation = searchParams.get("recommendation") || "all";
    const sort = searchParams.get("sort") || "score_desc";
    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Math.min(100, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 20));
    const offset = (page - 1) * limit;

    let query = supabase.from("applications").select("*", { count: "exact" });

    if (status !== "all" && ["pending", "approved", "waitlist", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }

    if (platform !== "all") {
      query = query.eq("primary_platform", platform);
    }

    if (niche !== "all") {
      query = query.ilike("niche", niche);
    }

    const { data: applications, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const applicationIds = (applications ?? []).map((item) => item.id);
    let scoreMap = new Map<string, Record<string, unknown>>();

    if (applicationIds.length > 0) {
      let scoresQuery = supabase
        .from("application_scores")
        .select("*")
        .in("application_id", applicationIds);

      if (
        recommendation !== "all" &&
        ["APPROVE_PRIORITY", "APPROVE", "WAITLIST", "REJECT"].includes(recommendation)
      ) {
        scoresQuery = scoresQuery.eq("recommendation", recommendation);
      }

      const { data: scoreRows, error: scoresError } = await scoresQuery;
      if (!scoresError && scoreRows) {
        scoreMap = new Map(scoreRows.map((row) => [row.application_id, row]));
      }
    }

    let enriched = (applications ?? []).map((application) => {
      const score = scoreMap.get(application.id);
      return {
        ...application,
        recommendation: score?.recommendation ?? application.recommendation,
        confidence: score?.confidence ?? application.confidence ?? null,
        strengths: score?.strengths ?? application.strengths ?? [],
        weaknesses: score?.weaknesses ?? application.weaknesses ?? [],
        onboarding_path: score?.onboarding_path ?? application.onboarding_path ?? null,
        ai_summary: score?.ai_summary ?? application.ai_summary ?? null,
        subscores: {
          audience: score?.audience_score ?? null,
          engagement: score?.engagement_score ?? application.engagement_score ?? null,
          niche: score?.niche_score ?? application.niche_score ?? null,
          offer_readiness: score?.offer_readiness_score ?? application.monetization_score ?? null,
          brand_quality: score?.brand_quality_score ?? null,
          growth_potential: score?.growth_potential_score ?? null,
        },
      };
    });

    if (recommendation !== "all") {
      enriched = enriched.filter((item) => item.recommendation === recommendation);
    }

    if (sort === "score_desc") {
      enriched = [...enriched].sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0));
    } else if (sort === "score_asc") {
      enriched = [...enriched].sort((a, b) => (a.overall_score ?? 0) - (b.overall_score ?? 0));
    }

    return NextResponse.json({
      applications: enriched,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
