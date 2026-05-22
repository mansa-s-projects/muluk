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

// ── GET /api/series — creator: list own series ────────────────────────────────

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceDb();
  const { data, error } = await db
    .from("series")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ series: data ?? [] });
}

// ── POST /api/series — creator: create new series ─────────────────────────────

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 422 });

  const price_cents = typeof body.price_cents === "number" ? Math.floor(body.price_cents) : 0;
  if (price_cents < 0) return NextResponse.json({ error: "price_cents must be >= 0" }, { status: 422 });

  let safeCoverUrl: string | null = null;
  if (typeof body.cover_url === "string") {
    const trimmed = body.cover_url.trim();
    if (trimmed) {
      if (trimmed.length > 2048) {
        return NextResponse.json({ error: "cover_url is too long" }, { status: 422 });
      }
      try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ error: "cover_url must use http or https" }, { status: 422 });
        }
        safeCoverUrl = parsed.toString();
      } catch {
        return NextResponse.json({ error: "cover_url must be a valid URL" }, { status: 422 });
      }
    }
  }

  const db = getServiceDb();
  const { data, error } = await db
    .from("series")
    .insert({
      creator_id:  user.id,
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      cover_url:   safeCoverUrl,
      price_cents,
      status:      "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Series, { status: 201 });
}
