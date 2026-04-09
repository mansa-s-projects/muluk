import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Series } from "@/lib/series";

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
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

type Params = { params: Promise<{ id: string }> };

// ── GET /api/series/[id] — creator: get series + episodes ──────────────────────

export async function GET(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceDb();

  const [seriesRes, episodesRes] = await Promise.all([
    db.from("series").select("*").eq("id", id).eq("creator_id", user.id).maybeSingle(),
    db.from("series_episodes").select("*").eq("series_id", id).order("sort_order").order("created_at"),
  ]);

  if (seriesRes.error || episodesRes.error) {
    return NextResponse.json(
      {
        error: "Failed to load series",
        details: seriesRes.error?.message ?? episodesRes.error?.message,
      },
      { status: 500 }
    );
  }

  if (!seriesRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ series: seriesRes.data, episodes: episodesRes.data ?? [] });
}

// ── PATCH /api/series/[id] — creator: update series ───────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const db = getServiceDb();

  // Verify ownership
  const { data: existing } = await db
    .from("series").select("id").eq("id", id).eq("creator_id", user.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") {
    const trimmedTitle = body.title.trim();
    if (trimmedTitle === "") return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    updates.title = trimmedTitle;
  }
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.cover_url === "string")   updates.cover_url   = body.cover_url.trim()   || null;
  if (typeof body.status === "string" && ["draft","published","archived"].includes(body.status)) {
    updates.status = body.status;
  }
  if (typeof body.price_cents === "number") {
    const p = Math.floor(body.price_cents);
    if (p < 0) return NextResponse.json({ error: "price_cents must be >= 0" }, { status: 422 });
    updates.price_cents = p;
  }

  const { data, error } = await db
    .from("series").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Series);
}

// ── DELETE /api/series/[id] — creator: delete series ──────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceDb();

  const { data: existing } = await db
    .from("series").select("id").eq("id", id).eq("creator_id", user.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error: deleteErr } = await db
    .from("series").delete().eq("id", id).eq("creator_id", user.id);
  if (deleteErr) {
    console.error("[series/delete] delete failed:", deleteErr);
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
