import { NextResponse } from "next/server";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "TOKEN_ENCRYPTION_KEY",
  "OPENROUTER_API_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "INSTAGRAM_CLIENT_ID",
  "INSTAGRAM_CLIENT_SECRET",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "WHOP_WEBHOOK_SECRET",
];

const OPTIONAL = [
  "WHOP_API_KEY",
  "FOUNDER_EMAIL",
  "ALLOW_DEV_ADMIN_BYPASS",
  "ELEVENLABS_API_KEY",
  "CRON_SECRET",
];

export async function GET() {
  const required = REQUIRED.map(key => ({
    key,
    set: Boolean(process.env[key]),
  }));

  const optional = OPTIONAL.map(key => ({
    key,
    set: Boolean(process.env[key]),
  }));

  const requiredCount = required.filter(item => item.set).length;
  const optionalCount = optional.filter(item => item.set).length;

  return NextResponse.json({
    ok: requiredCount === REQUIRED.length,
    required,
    optional,
    summary: {
      requiredTotal: REQUIRED.length,
      requiredSet: requiredCount,
      optionalTotal: OPTIONAL.length,
      optionalSet: optionalCount,
    },
  });
}
