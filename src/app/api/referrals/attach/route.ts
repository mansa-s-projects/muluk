import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const REF_COOKIE = "cipher_referral_code";
const REF_SOURCE_COOKIE = "cipher_referral_source";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function normalizeCode(input: string): string {
  return input.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      referral_code?: string;
      source?: string;
      event_id?: string;
    };

    const cookieStore = await cookies();
    const referralCode = normalizeCode(
      body.referral_code ?? cookieStore.get(REF_COOKIE)?.value ?? ""
    );
    const source = (body.source ?? cookieStore.get(REF_SOURCE_COOKIE)?.value ?? "signup").slice(0, 64);
    const eventId = (body.event_id ?? "").slice(0, 128);

    if (!referralCode || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(referralCode)) {
      return NextResponse.json({ ok: true, attached: false });
    }

    const db = getServiceClient();

    const { data: codeRow, error: codeError } = await db
      .from("creator_referral_codes")
      .select("creator_id, referral_code")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (codeError || !codeRow) {
      return NextResponse.json({ ok: true, attached: false });
    }

    // Prevent self-referrals.
    if (codeRow.creator_id === user.id) {
      const response = NextResponse.json({ ok: true, attached: false });
      response.cookies.delete(REF_COOKIE);
      response.cookies.delete(REF_SOURCE_COOKIE);
      return response;
    }

    // Attribution lock: once a referred user exists, it cannot be changed.
    const { data: existingForUser } = await db
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", user.id)
      .maybeSingle();

    if (existingForUser) {
      const response = NextResponse.json({ ok: true, attached: false, locked: true });
      response.cookies.delete(REF_COOKIE);
      response.cookies.delete(REF_SOURCE_COOKIE);
      return response;
    }

    const { data: clickedRow } = await db
      .from("referrals")
      .select("id")
      .eq("referrer_id", codeRow.creator_id)
      .eq("referral_code", codeRow.referral_code)
      .is("referred_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let referralId = clickedRow?.id ?? null;

    if (referralId) {
      const { error: updateError } = await db
        .from("referrals")
        .update({
          referred_id: user.id,
          status: "signed_up",
          signup_at: new Date().toISOString(),
        })
        .eq("id", referralId);

      if (updateError) {
        referralId = null;
      }
    }

    if (!referralId) {
      const { data: inserted, error: insertError } = await db
        .from("referrals")
        .insert({
          referrer_id: codeRow.creator_id,
          referred_id: user.id,
          referral_code: codeRow.referral_code,
          source,
          status: "signed_up",
          signup_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return NextResponse.json({ ok: true, attached: false });
      }
      referralId = inserted.id;
    }

    await db.from("referral_events").insert({
      referral_id: referralId,
      event_type: "signup",
      metadata: {
        source,
        event_id: eventId || null,
        referred_id: user.id,
      },
    });

    const response = NextResponse.json({ ok: true, attached: true, referral_id: referralId });
    response.cookies.delete(REF_COOKIE);
    response.cookies.delete(REF_SOURCE_COOKIE);
    return response;
  } catch {
    return NextResponse.json({ ok: true, attached: false });
  }
}
