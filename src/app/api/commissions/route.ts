/**
 * GET  /api/commissions           — creator inbox (auth required)
 * PATCH /api/commissions/[id]     — accept / reject / deliver (auth)
 * DELETE /api/commissions/[id]    — cancel (auth)
 */
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { provisionCommissionCheckout } from "@/lib/commissions";

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── GET /api/commissions ──────────────────────────────────────────────────────

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // optional filter
  const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit  = 20;

  const supabase = getService();
  let query = supabase
    .from("commissions")
    .select("id,fan_email,fan_name,title,description,budget_cents,agreed_cents,deadline,status,created_at,updated_at,paid_at,access_token", { count: "exact" })
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  return NextResponse.json({ commissions: data, total: count, page });
}
