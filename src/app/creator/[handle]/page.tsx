import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import CreatorProfileClient from "./CreatorProfileClient";

type Props = { params: Promise<{ handle: string }> };

const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]{1,32}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} on CIPHER`,
    description: `Exclusive content from @${handle}. Request fan access on CIPHER.`,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { handle } = await params;

  if (!handle || !HANDLE_PATTERN.test(handle)) {
    return <CreatorProfileClient handle={handle} error="not_found" data={null} />;
  }

  const supabase = createServiceClient();

  // Look up creator by handle (case-insensitive)
  const { data: creator } = await supabase
    .from("creator_applications")
    .select("user_id, display_name, handle, bio, category, phantom_mode, created_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (!creator || creator.phantom_mode) {
    return <CreatorProfileClient handle={handle} error="not_found" data={null} />;
  }

  const creatorId: string = creator.user_id;

  // Parallel fetch: published content + social connections
  const [contentRes, socialRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, burn_mode, expires_at, created_at")
      .eq("creator_id", creatorId)
      .in("status", ["published", "active"])
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count")
      .eq("creator_id", creatorId),
  ]);

  const content = (contentRes.data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    description: (c.description as string) ?? "",
    price: (c.price as number) ?? 0,
    burnMode: (c.burn_mode as boolean) ?? false,
    expiresAt: (c.expires_at as string) ?? null,
    createdAt: c.created_at as string,
  }));

  const socialRows = socialRes.data ?? [];
  const totalFollowers = socialRows.reduce(
    (sum, r) => sum + ((r.follower_count as number) ?? 0),
    0
  );
  const byPlatform = socialRows
    .filter((r) => (r.follower_count as number) > 0)
    .map((r) => ({
      platform: r.platform as string,
      username: (r.platform_username as string) ?? null,
      followers: (r.follower_count as number) ?? 0,
    }));

  return (
    <CreatorProfileClient
      handle={handle}
      error={null}
      data={{
        creator: {
          displayName: (creator.display_name as string) ?? null,
          handle: creator.handle as string,
          bio: (creator.bio as string) ?? null,
          category: (creator.category as string) ?? null,
          joinedAt: creator.created_at as string,
        },
        content,
        socialReach: { totalFollowers, byPlatform },
      }}
    />
  );
}
