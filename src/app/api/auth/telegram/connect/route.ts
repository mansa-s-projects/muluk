import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

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

  return NextResponse.redirect(authUrl);
}
