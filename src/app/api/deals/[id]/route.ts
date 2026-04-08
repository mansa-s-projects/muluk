import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/deals/[id] — update a brand deal */
export async function PATCH(req: Request, { params }: Params) {
  const authClient = await getAuthClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("brand_deals")
    .select("id, creator_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  if (existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const VALID_STATUSES = ["pending", "active", "delivered", "paid", "cancelled"] as const;
  type DealStatus = typeof VALID_STATUSES[number];

  const updates: Record<string, unknown> = {};

  if (typeof body.brand_name === "string" && body.brand_name.trim()) {
    updates.brand_name = body.brand_name.trim();
  }
  if ("contact_name" in body) {
    updates.contact_name = typeof body.contact_name === "string" ? body.contact_name.trim() || null : null;
  }
  if ("contact_email" in body) {
    updates.contact_email = typeof body.contact_email === "string" ? body.contact_email.trim() || null : null;
  }
  if (typeof body.amount_cents === "number" && body.amount_cents >= 0) {
    updates.amount_cents = body.amount_cents;
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    updates.currency = body.currency.toUpperCase();
  }
  if ("deadline" in body) {
    updates.deadline = typeof body.deadline === "string" ? body.deadline || null : null;
  }
  if ("deliverables" in body) {
    updates.deliverables = typeof body.deliverables === "string" ? body.deliverables.trim() || null : null;
  }
  if ("notes" in body) {
    updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags.filter((t): t is string => typeof t === "string");
  }
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as DealStatus)) {
    updates.status = body.status;
    if (body.status === "paid" && !existing.status.includes("paid")) {
      updates.paid_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 422 });
  }

  const { data: deal, error } = await supabase
    .from("brand_deals")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !deal) {
    console.error("[api/deals/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }

  return NextResponse.json({ deal });
}

/** DELETE /api/deals/[id] — delete a brand deal */
export async function DELETE(_req: Request, { params }: Params) {
  const authClient = await getAuthClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("brand_deals")
    .select("id, creator_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  if (existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("brand_deals")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[api/deals/[id]] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
