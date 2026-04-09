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

// ── POST /api/series/[id]/episodes — creator: add episode ─────────────────────

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 422 });

  const db = getServiceDb();

  // Verify series ownership
  const { data: series } = await db
    .from("series").select("id").eq("id", id).eq("creator_id", user.id).maybeSingle();
  if (!series) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto sort_order = max + 1
  const { data: maxRow } = await db
    .from("series_episodes")
    .select("sort_order")
    .eq("series_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((maxRow?.sort_order as number) ?? 0) + 1;

  const { data, error } = await db
    .from("series_episodes")
    .insert({
      series_id:  id,
      creator_id: user.id,
      title,
      body:       typeof body.body      === "string" ? body.body.trim()      || null : null,
      media_url:  typeof body.media_url === "string" ? body.media_url.trim() || null : null,
      sort_order,
      is_preview: body.is_preview === true,
    })
    .select()
    .single();

  if (error) {
    console.error("[series/episodes/create] insert failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
