/**
 * /api/offers/manage
 *
 * GET  — list all offers for the authenticated creator
 *         ?creator_id=<uuid> returns only published offers for that creator (public)
 * POST — create a new offer (authenticated creator only)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Columns safe to return to the public (unlock_content is never included)
const PUBLIC_COLUMNS =
  "id, creator_id, title, description, price_label, thumbnail_url, preview_content, whop_link, status, created_at, updated_at";

// Full columns for the authenticated owner
const OWNER_COLUMNS =
  "id, creator_id, title, description, price_label, thumbnail_url, preview_content, unlock_content, whop_link, status, created_at, updated_at";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const creatorIdParam = searchParams.get("creator_id")?.trim();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Public: fetch published offers for a specific creator ─────────────────
  if (creatorIdParam) {
    const isOwner = user?.id === creatorIdParam;

    const query = supabase
      .from("offers")
      .select(isOwner ? OWNER_COLUMNS : PUBLIC_COLUMNS)
      .eq("creator_id", creatorIdParam)
      .order("created_at", { ascending: false });

    // Non-owners only see published
    const { data, error } = isOwner
      ? await query
      : await query.eq("status", "published");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offers: data ?? [] });
  }

  // ── Authenticated: fetch all own offers ───────────────────────────────────
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("offers")
    .select(OWNER_COLUMNS)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Validate required fields ──────────────────────────────────────────────
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "title exceeds 200 characters" }, { status: 400 });

  // ── Validate optional URL fields ──────────────────────────────────────────
  const thumbnailUrl = body.thumbnail_url ? String(body.thumbnail_url).trim() : null;
  const whopLink     = body.whop_link     ? String(body.whop_link).trim()     : null;
  const urlRegex     = /^https?:\/\/.+/;

  if (thumbnailUrl && !urlRegex.test(thumbnailUrl)) {
    return NextResponse.json({ error: "thumbnail_url must be a valid http/https URL" }, { status: 400 });
  }
  if (whopLink && !urlRegex.test(whopLink)) {
    return NextResponse.json({ error: "whop_link must be a valid http/https URL" }, { status: 400 });
  }

  // ── Validate status ───────────────────────────────────────────────────────
  const status = String(body.status ?? "draft");
  if (!["draft", "published"].includes(status)) {
    return NextResponse.json({ error: "status must be 'draft' or 'published'" }, { status: 400 });
  }

  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      creator_id:      user.id,
      title,
      description:     body.description     ? String(body.description).trim()     : null,
      price_label:     body.price_label     ? String(body.price_label).trim()     : null,
      thumbnail_url:   thumbnailUrl,
      preview_content: body.preview_content ? String(body.preview_content).trim() : null,
      unlock_content:  body.unlock_content  ? String(body.unlock_content).trim()  : null,
      whop_link:       whopLink,
      status,
    })
    .select(OWNER_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer }, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Build update payload from only provided fields
  const patch: Record<string, unknown> = {};
  if (body.title         !== undefined) patch.title           = String(body.title).trim();
  if (body.description   !== undefined) patch.description     = body.description ? String(body.description).trim() : null;
  if (body.price_label   !== undefined) patch.price_label     = body.price_label ? String(body.price_label).trim() : null;
  if (body.thumbnail_url !== undefined) patch.thumbnail_url   = body.thumbnail_url ? String(body.thumbnail_url).trim() : null;
  if (body.preview_content !== undefined) patch.preview_content = body.preview_content ? String(body.preview_content).trim() : null;
  if (body.unlock_content  !== undefined) patch.unlock_content  = body.unlock_content  ? String(body.unlock_content).trim()  : null;
  if (body.whop_link     !== undefined) patch.whop_link       = body.whop_link ? String(body.whop_link).trim() : null;
  if (body.status        !== undefined) {
    const s = String(body.status);
    if (!["draft", "published"].includes(s)) {
      return NextResponse.json({ error: "status must be 'draft' or 'published'" }, { status: 400 });
    }
    patch.status = s;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // RLS ensures only the creator can update their own offer
  const { data: offer, error } = await supabase
    .from("offers")
    .update(patch)
    .eq("id", id)
    .eq("creator_id", user.id)
    .select(OWNER_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  return NextResponse.json({ offer });
}
