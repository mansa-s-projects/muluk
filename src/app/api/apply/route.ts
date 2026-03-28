import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseClient } from "@/lib/supabase";

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }

  return new Resend(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const resend = createResendClient();
    const body = await req.json();
    const { name, handle, category, email, country, payout, content, audience, bio } = body;

    if (!email?.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!name || !handle) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error: dbError } = await supabase.from("creator_applications").insert({
      name: name.trim(),
      handle: handle.toLowerCase().trim().replace(/^@/, ""),
      category,
      email: email.toLowerCase().trim(),
      country,
      payout_method: payout,
      content_types: content,
      audience_size: audience,
      bio: bio || null,
      status: "pending",
    });

    if (dbError && dbError.code !== "23505") {
      console.error("DB error:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    await resend.emails.send({
      from: "CIPHER <hello@cipher.so>",
      to: email,
      subject: "Your CIPHER application is under review",
      html: `<html><body><p>Hi ${name}, your CIPHER application for @${handle} is under review.</p></body></html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}