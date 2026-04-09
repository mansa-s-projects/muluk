/**
 * PATCH /api/commissions/[id]  — accept / reject / deliver / update notes
 * DELETE /api/commissions/[id] — cancel
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

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, notes, agreed_cents } = body as {
    action?: "accept" | "reject" | "deliver" | "cancel";
    notes?: string;
    agreed_cents?: number;
  };

  const supabase = getService();

  // Ensure this commission belongs to the creator
  const { data: existing } = await supabase
    .from("commissions")
    .select("id, status, fan_email, title, access_token")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (action === "accept") {
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Can only accept pending commissions" }, { status: 400 });
    }
    if (!agreed_cents || agreed_cents < 100) {
      return NextResponse.json({ error: "agreed_cents required (min 100)" }, { status: 400 });
    }
    updates.status       = "accepted";
    updates.agreed_cents = Math.round(agreed_cents);

    // Generate Whop checkout link for fan
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const redirectUrl = `${siteUrl}/commission/status?token=${existing.access_token}`;

    const checkout = await provisionCommissionCheckout({
      commissionId: id,
      fanEmail:     existing.fan_email,
      title:        existing.title,
      agreedCents:  Math.round(agreed_cents),
      redirectUrl,
    });

    if (!checkout) {
      console.error("[commissions] checkout provisioning failed", { commissionId: id });
      return NextResponse.json({ error: "Failed to provision checkout" }, { status: 502 });
    }

    updates.whop_product_id  = checkout.whop_product_id;
    updates.whop_checkout_id = checkout.whop_checkout_id;
  } else if (action === "reject") {
    if (!["pending", "accepted"].includes(existing.status)) {
      return NextResponse.json({ error: "Cannot reject at this stage" }, { status: 400 });
    }
    updates.status = "rejected";
  } else if (action === "deliver") {
    if (existing.status !== "paid") {
      return NextResponse.json({ error: "Can only deliver paid commissions" }, { status: 400 });
    }
    updates.status       = "delivered";
    updates.delivered_at = new Date().toISOString();
  } else if (action === "cancel") {
    if (["delivered", "cancelled", "rejected"].includes(existing.status)) {
      return NextResponse.json({ error: "Commission is already in a terminal state" }, { status: 409 });
    }
    updates.status = "cancelled";
  }

  if (notes !== undefined) updates.notes = notes.slice(0, 1000);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid update fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("commissions")
    .update(updates)
    .eq("id", id)
    .eq("creator_id", user.id)
    .select();

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Commission not found" }, { status: 404 });
  }

  return NextResponse.json({ commission: data[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getService();

  const { error } = await supabase
    .from("commissions")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("creator_id", user.id);

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
