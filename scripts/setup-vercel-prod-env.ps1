$ErrorActionPreference = "Continue"

Write-Host "Checking current Vercel Production env vars..." -ForegroundColor Cyan
$envList = vercel.cmd env ls production 2>$null | Out-String

$required = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "TOKEN_ENCRYPTION_KEY",
  "OPENROUTER_API_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "WHOP_API_KEY",
  "WHOP_WEBHOOK_SECRET",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "TWITTER_CALLBACK_URL",
  "INSTAGRAM_CLIENT_ID",
  "INSTAGRAM_CLIENT_SECRET",
  "INSTAGRAM_CALLBACK_URL",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN"
)

foreach ($name in $required) {
  if ($envList -match "(?m)^\s*$name\s") {
    Write-Host "[skip] $name already exists in production." -ForegroundColor DarkYellow
    continue
  }

  Write-Host "[input] Add value for $name" -ForegroundColor Green
  Write-Host "Type the value directly in terminal when prompted by Vercel CLI." -ForegroundColor Gray
  vercel.cmd env add $name production

  # Refresh list after each add to avoid duplicate prompts.
  $envList = vercel.cmd env ls production 2>$null | Out-String
}

Write-Host "Done. Final production env list:" -ForegroundColor Cyan
vercel.cmd env ls production
