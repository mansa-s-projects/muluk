import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FirstDrop = {
  title: string;
  description: string;
  price: number;
  expiryHours: number;
  caption: string;
  mediaType: "image" | "video" | "text";
};

type LaunchBlueprint = {
  offerIdea: string;
  offerDescription: string;
  price: number;
  contentPillars: string[];
  bestChannels: string[];
  sevenDayPlan: Array<{ day: number; action: string }>;
  revenueEstimate: { monthly: number; yearly: number };
};

type ProfileIdentity = {
  displayName?: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string;
  location?: string;
  specialty?: string;
  cta?: string;
};

type CompleteRequest = {
  niche: string;
  subNiche?: string;
  contentTypes: string[];
  experience: string;
  launchBlueprint: LaunchBlueprint;
  firstDrop: FirstDrop;
  profileIdentity?: ProfileIdentity | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CompleteRequest;
    const { niche, subNiche, contentTypes, experience, launchBlueprint, firstDrop, profileIdentity } = body;

    // Update creator_onboarding with completed status
    const { error: onboardingError } = await supabase.from("creator_onboarding").upsert({
      user_id: user.id,
      interests: [niche, subNiche].filter(Boolean),
      content_types: contentTypes,
      experience_level: experience,
      launch_blueprint: launchBlueprint,
      first_drop: firstDrop,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (onboardingError) {
      console.error("Failed to save onboarding:", onboardingError);
      return NextResponse.json({ error: "Failed to save onboarding" }, { status: 500 });
    }

    // Create the first drop as a content item (draft)
    const expiresAt = firstDrop.expiryHours > 0
      ? new Date(Date.now() + firstDrop.expiryHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .insert({
        creator_id: user.id,
        title: firstDrop.title,
        description: firstDrop.description,
        content_type: firstDrop.mediaType,
        is_premium: true,
        price: firstDrop.price,
        currency: "usd",
        status: "draft",
        metadata: {
          caption: firstDrop.caption,
          expires_at: expiresAt,
          from_onboarding: true,
        },
      })
      .select("id")
      .single();

    if (contentError) {
      console.error("Failed to create first drop:", contentError);
      // Don't fail the whole request, onboarding is still saved
    }

    // Mark onboarding as complete in profiles or creator_applications
    await supabase.from("profiles").upsert({
      id: user.id,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    }, { onConflict: "id" });

    // Save profile identity if provided
    if (profileIdentity?.displayName) {
      const pi = profileIdentity;
      await supabase
        .from("creator_applications")
        .upsert({
          user_id: user.id,
          name: pi.displayName,
          handle: pi.handle,
          bio: pi.bio,
          category: niche,
          avatar_url: pi.avatarUrl ?? null,
          banner_url: pi.bannerUrl ?? null,
          website: pi.cta || pi.website || null,
          location: pi.location || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    const handle = profileIdentity?.handle;
    return NextResponse.json({
      success: true,
      dropId: contentItem?.id,
      fanPageUrl: handle ? `/${handle}` : "",
      message: "Onboarding complete! Your first drop is ready to publish.",
    });
  } catch (error) {
    console.error("Onboarding completion failed:", error);
    return NextResponse.json({ error: "Completion failed" }, { status: 500 });
  }
}
