import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapProvider, mergeProfiles } from "@/lib/profile/importMapper";
import OnboardingWizard, { type ExistingProfile } from "./OnboardingWizard";

type SocialConnection = {
  platform: "instagram" | "tiktok" | "twitter" | "youtube" | "telegram";
  connected: boolean;
  username?: string;
  followers?: number;
  engagement?: number;
  views?: number;
  dmSignals?: number;
};

export default async function CreatorOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If already completed, skip the wizard entirely.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRow?.onboarding_completed === true) {
    redirect("/dashboard");
  }

  const [
    { data: creatorApplication, error: appErr },
    { data: socialRows },
  ] = await Promise.all([
    supabase
      .from("creator_applications")
      .select("name, handle, bio, avatar_url, banner_url, website, location, main_specialty, primary_cta_url, category, content_types, audience_size")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count, metrics")
      .eq("creator_id", user.id),
  ]);

  if (appErr) console.error("creator_applications query failed:", appErr);

  const socialConnections: SocialConnection[] = (socialRows || []).map((row) => ({
    platform: row.platform as SocialConnection["platform"],
    connected: true,
    username: row.platform_username || undefined,
    followers: row.follower_count || undefined,
    engagement: (row.metrics as { engagementRate?: number } | null)?.engagementRate || undefined,
  }));

  const partials = (socialRows || []).map((row) => {
    const metrics = (row.metrics as Record<string, unknown>) ?? {};
    if (row.platform_username) {
      metrics.username = metrics.username ?? row.platform_username;
      metrics.uniqueId = metrics.uniqueId ?? row.platform_username;
    }
    return mapProvider(row.platform as string, metrics);
  });
  const socialMerge = partials.length > 0 ? mergeProfiles(partials) : null;

  const existingProfile: ExistingProfile = {
    displayName: creatorApplication?.name || socialMerge?.displayName || "",
    handle: creatorApplication?.handle || socialMerge?.handle || "",
    bio: creatorApplication?.bio || socialMerge?.bio || "",
    avatarUrl: creatorApplication?.avatar_url || socialMerge?.avatarUrl || null,
    bannerUrl: creatorApplication?.banner_url || socialMerge?.bannerUrl || null,
    websiteUrl: creatorApplication?.website || socialMerge?.websiteUrl || "",
    location: creatorApplication?.location || socialMerge?.location || "",
    specialty: creatorApplication?.main_specialty || "",
    ctaUrl: creatorApplication?.primary_cta_url || "",
  };

  return (
    <OnboardingWizard
      creatorName={creatorApplication?.name || ""}
      existingSocialConnections={socialConnections}
      existingAnalysis={null}
      existingProfile={existingProfile}
    />
  );
}
