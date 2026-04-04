import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapProvider, mergeProfiles } from "@/lib/profile/importMapper";
import ProfileSetupClient, { type ProfileDraftData } from "./ProfileSetupClient";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding/profile");
  }

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

  const rows = socialRows ?? [];

  const partials = rows.map(row => {
    const metrics = (row.metrics as Record<string, unknown>) ?? {};
    if (row.platform_username) {
      metrics.username = metrics.username ?? row.platform_username;
      metrics.uniqueId = metrics.uniqueId ?? row.platform_username;
    }
    return mapProvider(row.platform, metrics);
  });

  const socialMerge = partials.length > 0 ? mergeProfiles(partials) : null;
  const sources = rows.map(r => r.platform).filter(Boolean);

  const draft: ProfileDraftData = {
    displayName: existing?.name || socialMerge?.displayName || "",
    handle: existing?.handle || socialMerge?.handle || "",
    bio: existing?.bio || socialMerge?.bio || "",
    avatarUrl: existing?.avatar_url || socialMerge?.avatarUrl || null,
    bannerUrl: existing?.banner_url || socialMerge?.bannerUrl || null,
    websiteUrl: existing?.website || socialMerge?.websiteUrl || "",
    location: existing?.location || socialMerge?.location || "",
    mainSpecialty: existing?.main_specialty || "",
    primaryCtaLabel: existing?.primary_cta_label || "",
    primaryCtaUrl: existing?.primary_cta_url || "",
  };

  return <ProfileSetupClient initialDraft={draft} sources={sources} />;
}
