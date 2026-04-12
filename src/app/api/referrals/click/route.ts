import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
    const body = (await request.json()) as {
      referral_code?: string;
      source?: string;
      event_id?: string;
    };

    const referralCode = normalizeCode(body.referral_code ?? "");
    const source = (body.source ?? "direct").slice(0, 64);
    const eventId = (body.event_id ?? "").slice(0, 128);

    if (!referralCode || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(referralCode)) {
      return NextResponse.json({ ok: true });
    }

    const db = getServiceClient();

    const { data: codeRow, error: codeError } = await db
      .from("creator_referral_codes")
      .select("creator_id, referral_code")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (codeError || !codeRow) {
      return NextResponse.json({ ok: true });
    }

    const { data: referralRow, error: referralError } = await db
      .from("referrals")
      .insert({
        referrer_id: codeRow.creator_id,
        referral_code: codeRow.referral_code,
        source,
        status: "clicked",
      })
      .select("id")
      .single();

    if (referralError || !referralRow) {
      return NextResponse.json({ ok: true });
    }

    await db.from("referral_events").insert({
      referral_id: referralRow.id,
      event_type: "link_click",
      metadata: {
        source,
        event_id: eventId || null,
        user_agent: request.headers.get("user-agent") ?? null,
      },
    });

    const response = NextResponse.json({ ok: true, referral_id: referralRow.id });
    response.cookies.set(REF_COOKIE, referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(REF_SOURCE_COOKIE, source, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
