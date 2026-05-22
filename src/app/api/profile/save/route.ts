import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ProfileSaveBody = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  website: string;
  location: string;
  specialty: string;
  ctaLabel: string;
  ctaUrl: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<ProfileSaveBody>;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id:           user.id,
          display_name: body.displayName ?? null,
          handle:       body.handle?.toLowerCase().replace(/[^a-z0-9_]/g, "") || null,
          bio:          body.bio ?? null,
          avatar_url:   body.avatarUrl ?? null,
          banner_url:   body.bannerUrl ?? null,
          website:      body.website ?? null,
          location:     body.location ?? null,
          specialty:    body.specialty ?? null,
          cta_label:    body.ctaLabel ?? null,
          cta_url:      body.ctaUrl ?? null,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
