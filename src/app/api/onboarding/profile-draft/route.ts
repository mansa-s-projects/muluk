import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapProvider, mergeProfiles } from "@/lib/profile/importMapper";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: socialRows }, { data: existing }] = await Promise.all([
      supabase
        .from("social_connections")
        .select("platform, platform_username, follower_count, metrics")
        .eq("creator_id", user.id),
      supabase
        .from("creator_applications")
        .select("name, handle, bio, avatar_url, banner_url, website, location, main_specialty, primary_cta_label, primary_cta_url, profile_completed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // If profile already completed, return it directly
    if (existing?.profile_completed_at) {
      return NextResponse.json({
        draft: {
          displayName: existing.name || "",
          handle: existing.handle || "",
          bio: existing.bio || "",
          avatarUrl: existing.avatar_url || null,
          bannerUrl: existing.banner_url || null,
          websiteUrl: existing.website || "",
          location: existing.location || "",
          mainSpecialty: existing.main_specialty || "",
          primaryCtaLabel: existing.primary_cta_label || "",
          primaryCtaUrl: existing.primary_cta_url || "",
        },
        alreadyCompleted: true,
        sources: [],
      });
    }

    // Map each connected social account
    const rows = socialRows || [];
    const partials = rows.map(row => {
      const metrics = (row.metrics as Record<string, unknown>) || {};
      // Supplement with top-level columns
      if (row.platform_username) metrics.username = metrics.username || row.platform_username;
      if (row.platform_username) metrics.uniqueId = metrics.uniqueId || row.platform_username;
      if (row.platform_username) metrics.name = metrics.name || "";
      return mapProvider(row.platform, metrics);
    });

    const merged = partials.length > 0 ? mergeProfiles(partials) : {
      displayName: existing?.name || "",
      handle: existing?.handle || "",
      bio: existing?.bio || "",
      avatarUrl: existing?.avatar_url || null,
      bannerUrl: existing?.banner_url || null,
      websiteUrl: existing?.website || "",
      location: existing?.location || "",
    };

    // Prefer saved profile fields if they exist over social import
    const draft = {
      displayName: existing?.name || merged.displayName,
      handle:      existing?.handle || merged.handle,
      bio:         existing?.bio || merged.bio,
      avatarUrl:   existing?.avatar_url || merged.avatarUrl,
      bannerUrl:   existing?.banner_url || merged.bannerUrl,
      websiteUrl:  existing?.website || merged.websiteUrl,
      location:    existing?.location || merged.location,
      mainSpecialty:   existing?.main_specialty || "",
      primaryCtaLabel: existing?.primary_cta_label || "",
      primaryCtaUrl:   existing?.primary_cta_url || "",
    };

    return NextResponse.json({
      draft,
      alreadyCompleted: false,
      sources: rows.map(r => r.platform),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to build draft";
    console.error("Profile draft error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
