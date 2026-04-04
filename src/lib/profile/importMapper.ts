// Profile import mapping utilities
// Maps raw social provider data → unified ProfileDraft shape

export type ProfileDraft = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string;
  location: string;
};

// ── Per-provider mappers ──────────────────────────────────────────────────────

export function mapInstagram(raw: Record<string, unknown>): Partial<ProfileDraft> {
  return {
    displayName: (raw.full_name as string) || "",
    handle: (raw.username as string) || "",
    bio: (raw.biography as string) || "",
    avatarUrl: (raw.profile_picture_url as string) || null,
    websiteUrl: (raw.external_url as string) || "",
  };
}

export function mapTikTok(raw: Record<string, unknown>): Partial<ProfileDraft> {
  return {
    displayName: (raw.nickname as string) || "",
    handle: (raw.uniqueId as string) || "",
    bio: (raw.signature as string) || "",
    avatarUrl: (raw.avatarLarger as string) || (raw.avatarMedium as string) || null,
    websiteUrl: (raw.bioLink as string) || "",
    location: (raw.region as string) || "",
  };
}

export function mapYouTube(raw: Record<string, unknown>): Partial<ProfileDraft> {
  const thumbnails = raw.thumbnails as Record<string, { url?: string }> | null;
  const avatarUrl =
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    (raw.thumbnail_url as string) ||
    null;

  return {
    displayName: (raw.title as string) || "",
    handle: (raw.customUrl as string)?.replace(/^@/, "") || "",
    bio: (raw.description as string) || "",
    avatarUrl,
    bannerUrl: (raw.bannerExternalUrl as string) || (raw.banner_url as string) || null,
    location: (raw.country as string) || "",
  };
}

export function mapX(raw: Record<string, unknown>): Partial<ProfileDraft> {
  return {
    displayName: (raw.name as string) || "",
    handle: (raw.username as string) || (raw.screen_name as string) || "",
    bio: (raw.description as string) || "",
    avatarUrl: ((raw.profile_image_url as string) || "").replace(/_normal\./, "_400x400.") || null,
    bannerUrl: (raw.profile_banner_url as string) || null,
    websiteUrl: (raw.url as string) || (raw.entities as { url?: { urls?: Array<{ expanded_url?: string }> } } | null)?.url?.urls?.[0]?.expanded_url || "",
    location: (raw.location as string) || "",
  };
}

export function mapProvider(
  platform: string,
  metrics: Record<string, unknown>
): Partial<ProfileDraft> {
  switch (platform) {
    case "instagram": return mapInstagram(metrics);
    case "tiktok":    return mapTikTok(metrics);
    case "youtube":   return mapYouTube(metrics);
    case "twitter":
    case "x":         return mapX(metrics);
    default:          return {};
  }
}

// ── Merge multiple partials into one draft ────────────────────────────────────

export function mergeProfiles(partials: Partial<ProfileDraft>[]): ProfileDraft {
  const pick = <K extends keyof ProfileDraft>(key: K): ProfileDraft[K] => {
    const vals = partials
      .map(p => p[key])
      .filter(v => v !== undefined && v !== null && v !== "") as ProfileDraft[K][];
    return (vals[0] ?? "") as ProfileDraft[K];
  };

  // Bio: pick longest non-empty
  const bios = partials.map(p => p.bio || "").filter(Boolean);
  const bio = bios.length > 0 ? bios.reduce((a, b) => (b.length > a.length ? b : a)) : "";

  return {
    displayName: pick("displayName"),
    handle:      pick("handle"),
    bio,
    avatarUrl:   pick("avatarUrl"),
    bannerUrl:   pick("bannerUrl"),
    websiteUrl:  pick("websiteUrl"),
    location:    pick("location"),
  };
}
