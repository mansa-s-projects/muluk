import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "./OnboardingWizard";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: creatorApplication, error: appErr },
    { data: onboardingRow, error: onboardingErr },
    { data: socialRows },
  ] = await Promise.all([
    supabase
      .from("creator_applications")
      .select("name, category, content_types, audience_size, bio")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("creator_onboarding")
      .select("interests, content_types, experience_level, analysis")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count, metrics")
      .eq("creator_id", user.id),
  ]);

  if (appErr) console.error("creator_applications query failed:", appErr);
  if (onboardingErr) console.error("creator_onboarding query failed:", onboardingErr);

  // Transform social connections to the format expected by the wizard
  const socialConnections: SocialConnection[] = (socialRows || []).map((row) => ({
    platform: row.platform as SocialConnection["platform"],
    connected: true,
    username: row.platform_username || undefined,
    followers: row.follower_count || undefined,
    engagement: (row.metrics as { engagementRate?: number } | null)?.engagementRate || undefined,
  }));

  return (
    <OnboardingWizard
      creatorName={creatorApplication?.name || "Creator"}
      existingSocialConnections={socialConnections}
      existingAnalysis={(onboardingRow?.analysis as Record<string, unknown> | null) ?? null}
    />
  );
}