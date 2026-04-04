import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const redirect = req.nextUrl.searchParams.get("redirect") || "";
  const isSecure = process.env.NODE_ENV !== "development";

  if (!botToken) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "telegram",
      social_msg: "Telegram login is not configured yet.",
    }));
  }

  const botId = botToken.split(":")[0];
  const callback = `${appBaseUrl(req)}/api/auth/telegram/callback`;
  const origin = new URL(appBaseUrl(req)).hostname;

  const authUrl = new URL("https://oauth.telegram.org/auth");
  authUrl.searchParams.set("bot_id", botId);
  authUrl.searchParams.set("origin", origin);
  authUrl.searchParams.set("request_access", "write");
  authUrl.searchParams.set("return_to", callback);

  const res = NextResponse.redirect(authUrl);
  if (redirect) {
    res.cookies.set("telegram_oauth_redirect", redirect, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  }
  return res;
}
