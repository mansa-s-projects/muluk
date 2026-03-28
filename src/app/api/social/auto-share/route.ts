import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ConnectionRow = {
  platform: string;
  access_token: string | null;
  platform_user_id: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const contentTitle = String(body.contentTitle ?? "").trim();
  const shareText = String(body.shareText ?? "").trim() || `New exclusive content just dropped 🔒 cipher.co/@${user.email?.split("@")[0] ?? "creator"}`;

  const { data: rawConnections, error: connErr } = await supabase
    .from("social_connections")
    .select("platform, access_token, platform_user_id")
    .eq("creator_id", user.id)
    .in("platform", ["twitter", "telegram"]);

  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }

  const connections = (rawConnections ?? []) as ConnectionRow[];

  const results: Array<{ platform: string; ok: boolean; error?: string }> = [];

  for (const conn of connections) {
    if (conn.platform === "twitter" && conn.access_token) {
      try {
        const res = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${conn.access_token}`,
          },
          body: JSON.stringify({ text: `${shareText}\n\n${contentTitle}`.trim() }),
        });
        if (!res.ok) {
          results.push({ platform: "twitter", ok: false, error: await res.text() });
        } else {
          results.push({ platform: "twitter", ok: true });
        }
      } catch (err) {
        results.push({ platform: "twitter", ok: false, error: String(err) });
      }
    }

    if (conn.platform === "telegram" && conn.platform_user_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        const res = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: conn.platform_user_id,
            text: `${shareText}\n\n${contentTitle}`.trim(),
          }),
        });
        if (!res.ok) {
          results.push({ platform: "telegram", ok: false, error: await res.text() });
        } else {
          results.push({ platform: "telegram", ok: true });
        }
      } catch (err) {
        results.push({ platform: "telegram", ok: false, error: String(err) });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
