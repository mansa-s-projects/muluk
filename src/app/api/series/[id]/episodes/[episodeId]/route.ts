import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

type Params = { params: Promise<{ id: string; episodeId: string }> };

// ── PATCH /api/series/[id]/episodes/[episodeId] — creator: edit episode ────────

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, episodeId } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = getServiceDb();

  // Verify episode + series ownership
  const { data: ep } = await db
    .from("series_episodes")
    .select("id, series_id, creator_id")
    .eq("id", episodeId)
    .eq("series_id", id)
    .eq("creator_id", user.id)
    .maybeSingle();
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title      === "string")  updates.title      = body.title.trim();
  if (typeof body.body       === "string")  updates.body       = body.body.trim()      || null;
  if (typeof body.media_url  === "string")  updates.media_url  = body.media_url.trim() || null;
  if (typeof body.sort_order === "number")  updates.sort_order = Math.floor(body.sort_order);
  if (typeof body.is_preview === "boolean") updates.is_preview = body.is_preview;

  const { data, error } = await db
    .from("series_episodes")
    .update(updates)
    .eq("id", episodeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE /api/series/[id]/episodes/[episodeId] — creator: remove episode ─────

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, episodeId } = await params;
  const db = getServiceDb();

  const { data: ep } = await db
    .from("series_episodes")
    .select("id")
    .eq("id", episodeId)
    .eq("series_id", id)
    .eq("creator_id", user.id)
    .maybeSingle();
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.from("series_episodes").delete().eq("id", episodeId);
  return NextResponse.json({ deleted: true });
}
