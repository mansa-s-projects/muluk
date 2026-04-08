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

/** GET /api/deals — list creator's brand deals */
export async function GET(req: Request) {
  const authClient = await getAuthClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const supabase = getServiceClient();
  let query = supabase
    .from("brand_deals")
    .select("*", { count: "exact" })
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: deals, count, error } = await query;
  if (error) {
    console.error("[api/deals] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  return NextResponse.json({
    deals: deals ?? [],
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

/** POST /api/deals — create a brand deal */
export async function POST(req: Request) {
  const authClient = await getAuthClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brandName = typeof body.brand_name === "string" ? body.brand_name.trim() : "";
  if (!brandName) {
    return NextResponse.json({ error: "brand_name is required" }, { status: 422 });
  }

  const amountCents = typeof body.amount_cents === "number" ? body.amount_cents : 0;
  if (amountCents < 0) {
    return NextResponse.json({ error: "amount_cents must be >= 0" }, { status: 422 });
  }

  const supabase = getServiceClient();
  const { data: deal, error } = await supabase
    .from("brand_deals")
    .insert({
      creator_id:    user.id,
      brand_name:    brandName,
      contact_name:  typeof body.contact_name === "string" ? body.contact_name.trim() || null : null,
      contact_email: typeof body.contact_email === "string" ? body.contact_email.trim() || null : null,
      amount_cents:  amountCents,
      currency:      typeof body.currency === "string" ? body.currency.toUpperCase() : "USD",
      deadline:      typeof body.deadline === "string" ? body.deadline || null : null,
      deliverables:  typeof body.deliverables === "string" ? body.deliverables.trim() || null : null,
      notes:         typeof body.notes === "string" ? body.notes.trim() || null : null,
      tags:          Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
      status:        "pending",
    })
    .select("*")
    .single();

  if (error || !deal) {
    console.error("[api/deals] POST error:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }

  return NextResponse.json({ deal }, { status: 201 });
}
