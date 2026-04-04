import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SaveBody = {
  displayName: string;
  handle: string;
  bio: string;
  websiteUrl: string;
  location: string;
  mainSpecialty: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: SaveBody = await req.json();

    const { error } = await supabase
      .from("creator_applications")
      .upsert(
        {
          user_id: user.id,
          name: body.displayName || null,
          handle: body.handle || null,
          bio: body.bio || null,
          website: body.websiteUrl || null,
          location: body.location || null,
          avatar_url: body.avatarUrl || null,
          banner_url: body.bannerUrl || null,
          main_specialty: body.mainSpecialty || null,
          primary_cta_label: body.primaryCtaLabel || null,
          primary_cta_url: body.primaryCtaUrl || null,
          profile_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
