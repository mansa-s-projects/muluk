import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const internalKey = request.headers.get("x-muluk-internal-key");
    if (!internalKey || internalKey !== process.env.REFERRAL_INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      referred_id?: string;
      amount?: number;
      event_type?: "purchase" | "subscription" | "tip" | "vault_unlock";
      metadata?: Record<string, unknown>;
    };

    const referredId = body.referred_id ?? "";
    const amount = Number.isFinite(body.amount) ? Math.trunc(body.amount as number) : 0;

    if (!referredId || amount <= 0) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const eventType = body.event_type ?? "purchase";
    const metadata = body.metadata ?? {};

    const db = getServiceClient();
    const { data, error } = await db.rpc("increment_referral_revenue", {
      p_referred_id: referredId,
      p_amount: amount,
      p_event_type: eventType,
      p_metadata: metadata,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: Boolean(data), referral_id: data });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update referral" }, { status: 500 });
  }
}
