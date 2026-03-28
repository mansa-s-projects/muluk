import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dashboardUrl } from "@/app/api/auth/_utils";

function verifyTelegramAuth(req: NextRequest, botToken: string) {
  const params = req.nextUrl.searchParams;
  const hash = params.get("hash") ?? "";
  if (!hash) return false;

  // Validate auth_date to prevent replay attacks (allow 5-minute window)
  const authDateStr = params.get("auth_date");
  if (!authDateStr) return false;
  const authDate = parseInt(authDateStr, 10);
  if (!Number.isFinite(authDate)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authDate) > 300) return false;

  const dataPairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash" && value !== "") {
      dataPairs.push(`${key}=${value}`);
    }
  });
  dataPairs.sort();

  const dataCheckString = dataPairs.join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expectedHash, "utf8");
  const hashBuf = Buffer.from(hash, "utf8");
  if (expectedBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, hashBuf);
}

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "telegram",
      social_msg: "Telegram bot token missing.",
    }));
  }

  if (!verifyTelegramAuth(req, botToken)) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "telegram",
      social_msg: "Telegram verification failed.",
    }));
  }

  try {
    const telegramId = req.nextUrl.searchParams.get("id");
    const username = req.nextUrl.searchParams.get("username");

    if (!telegramId) {
      return NextResponse.redirect(dashboardUrl(req, {
        social_error: "telegram",
        social_msg: "Telegram verification failed: missing user ID.",
      }));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(dashboardUrl(req, { social_error: "telegram", social_msg: "Sign in to connect Telegram." }));
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "telegram",
          platform_username: username ?? null,
          platform_user_id: telegramId,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    return NextResponse.redirect(dashboardUrl(req, { connected: "telegram" }));
  } catch (err) {
    console.error("Telegram callback failed", err);
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "telegram",
      social_msg: "Telegram connection failed.",
    }));
  }
}
