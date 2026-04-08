/**
 * GET /api/vault/items/[handle]
 *
 * Returns active vault items for a creator, with public preview URLs.
 * Used by the fan-facing vault page. No auth required.
 */

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getPreviewPublicUrl } from "@/lib/vault";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const db = getDb();

  // Resolve creator from handle
  const { data: profile } = await db
    .from("profiles")
    .select("id, display_name")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { data: items, error } = await db
    .from("vault_items")
    .select("id, title, description, price_cents, content_type, preview_path, purchase_count, created_at")
    .eq("creator_id", profile.id)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vault/items] DB error:", error.message);
    return NextResponse.json({ error: "Failed to load vault" }, { status: 500 });
  }

  const enriched = (items ?? []).map((item) => ({
    ...item,
    preview_url: getPreviewPublicUrl(item.preview_path),
  }));

  return NextResponse.json({
    creator: { id: profile.id, display_name: profile.display_name, handle },
    items:   enriched,
  });
}
