/**
 * GET /api/commissions/[id]/status?token=<access_token>
 * Fan checks their commission status (no auth — token-gated)
 * Returns checkout URL if accepted + unpaid, or delivery status
 */
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url   = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  if (!/^[0-9a-f]{48}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = getService();
  const { data } = await supabase
    .from("commissions")
    .select("id,title,description,budget_cents,agreed_cents,status,deadline,whop_checkout_id,fan_email,paid_at,delivered_at,created_at")
    .eq("id", id)
    .eq("access_token", token)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const checkout_url = data.whop_checkout_id && data.status === "accepted"
    ? `https://whop.com/checkout/${data.whop_checkout_id}/?email=${encodeURIComponent(data.fan_email)}`
    : null;

  return NextResponse.json({
    id:           data.id,
    title:        data.title,
    status:       data.status,
    agreed_cents: data.agreed_cents,
    deadline:     data.deadline,
    checkout_url,
    paid_at:      data.paid_at,
    delivered_at: data.delivered_at,
    created_at:   data.created_at,
  });
}
