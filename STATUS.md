# CIPHER — Project Status
> Last updated: April 14, 2026

---

## Build & Lint

| Check | Status | Notes |
|---|---|---|
| `npm run build` | ✅ PASSING | 129/129 pages, 0 errors |
| `npm run lint` | ✅ PASSING (0 errors) | 70 pre-existing warnings remain |
| `supabase db push` | ✅ PASSING | All 47 migrations applied — use `npx supabase db push` (supabase not in PATH) |

---

## 🔴 Critical — Deployment Gates

| Gate | Status | Notes |
|---|---|---|
| supabase db push | ✅ DONE | All 47 migrations confirmed applied via `npx supabase migration list` |
| Vercel: `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set in .env.local | Verify Vercel copy matches |
| Vercel: `WHOP_API_KEY` | ✅ Set in .env.local (was WHOP_COMPANY_ID) | Verify Vercel copy matches |
| Vercel: `TOKEN_ENCRYPTION_KEY` | ✅ Set in .env.local | Verify Vercel copy is same 64-char hex |
| Vercel: `WHOP_WEBHOOK_SECRET` | ✅ Set in .env.local | Verify Vercel copy matches |
| Vercel: `OPENROUTER_API_KEY` | ✅ Set in .env.local | Verify Vercel copy matches |
| Vercel: `OPENAI_API_KEY` | ~~❌ MISSING~~ N/A | Removed — marketing agent now uses OpenRouter |
| Vercel: `RESEND_API_KEY` | ✅ Set in .env.local | Verify Vercel copy matches |
| Vercel: `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | ✅ Set in .env.local | Verify Vercel copy matches |
| Vercel: OAuth credentials (Twitter, IG, TikTok, Telegram, YouTube) | ⚠️ Partially set | YouTube ✅, others empty — see OAuth section below |
| OAuth callbacks updated to prod domain | ❌ MANUAL STEP | Each provider dashboard must have `https://muluk.vip/api/auth/<platform>/callback` |
| Production deploy executed | ❌ BLOCKED | Blocked by OAuth callback URLs + confirm Vercel env vars match |
| Post-deploy smoke test | ❌ BLOCKED | Blocked by deploy |

---

## 🔴 Critical — setAll Cookie Bug

Routes inside `getAuthUser()` that have `setAll: () => {}` — refreshed session cookies are **never persisted**, causing silent auth failures on token refresh boundary.

| File | Status |
|---|---|
| `src/app/api/series/route.ts` | ✅ FIXED |
| `src/app/api/series/[id]/route.ts` | ✅ FIXED |
| `src/app/api/series/[id]/episodes/route.ts` | ✅ FIXED |
| `src/app/api/series/[id]/episodes/[episodeId]/route.ts` | ✅ FIXED |
| `src/app/api/commissions/route.ts` | ✅ Fixed — `getAuthSupabase()` has proper `setAll` |
| `src/app/api/commissions/[id]/route.ts` | ✅ Fixed |
| `src/app/api/deals/route.ts` | ✅ Fixed |
| `src/app/api/deals/[id]/route.ts` | ✅ Fixed |
| `src/app/api/dashboard/bookings/slots/route.ts` | ✅ Fixed |
| `src/app/api/dashboard/bookings/slots/[id]/route.ts` | ✅ Fixed |

**Fixed April 9 2026.** All 4 series route files updated to persist cookies on token refresh.

---

## Migrations Status

| Migration | In Repo | Applied to Remote |
|---|---|---|
| 004–035 (base schema) | ✅ | ✅ (assumed) |
| 036_rate_cards | ✅ | ✅ |
| 037_bookings | ✅ | ✅ |
| 038_vault | ✅ | ✅ |
| 039_commissions | ✅ | ✅ |
| 040_brand_deals | ✅ | ✅ |
| 041_tips | ✅ | ✅ |
| 042_series_drops | ✅ | ✅ |
| 043_bookings_whop_checkout | ✅ | ✅ |
| 044_content_items_whop_product | ✅ | ✅ |
| 045_bookings_unique_slot_constraint | ✅ | ✅ |
| 20240329000000_analytics | ✅ | ✅ |
| 20250403130000_voice_clone_tables | ✅ | ✅ |

---

## API Routes — Implementation Status

### Core Auth & Session
| Route | Status |
|---|---|
| `POST /api/auth/*` (Twitter, IG, TikTok, Telegram, YouTube) | ✅ Built |
| Middleware session refresh | ✅ `lib/supabase/middleware.ts` — proper `setAll` |

### Payments & Monetization
| Route | Status |
|---|---|
| `POST /api/pay` | ✅ Built |
| `POST /api/whop-link` | ✅ Built |
| `POST /api/payment-links` | ✅ Built |
| `GET/POST /api/offers` | ✅ Built |
| `POST /api/tips` | ✅ Built |
| `GET/POST /api/bookings` | ✅ Built |
| `GET/POST /api/deals` | ✅ Built |
| `GET/POST /api/commissions` | ✅ Built |
| `GET/POST /api/series` | ✅ Built — setAll cookie bug fixed |
| `POST /api/vault` | ✅ Built |
| `POST /api/rate-card/generate` | ✅ Built |
| `GET /api/rate-card/[slug]` | ✅ Built |

### Webhooks
| Route | Status |
|---|---|
| `POST /api/webhooks/whop` | ✅ Built — HMAC-SHA256 signature verification, handles `payment.completed` and `membership.went_valid` |

### Social
| Route | Status |
|---|---|
| `POST /api/social/auto-share` | ✅ Real API calls — Twitter (OAuth2 Bearer) + Telegram Bot API. Instagram/TikTok **NOT included**. |
| `POST /api/social/analyze` | ✅ Built |
| `GET/POST /api/social/connections` | ✅ Built |
| `POST /api/social/instagram/connect` | ✅ Built |
| `POST /api/social/instagram/fetch` | ✅ Built |
| `POST /api/social/refresh-metrics` | ✅ Built |

### AI
| Route | Status |
|---|---|
| `POST /api/ai/*` | ✅ Built |
| `POST /api/marketing-agent` | ✅ Built |

### Admin
| Route | Status |
|---|---|
| `GET/POST /api/admin/*` | ✅ Built — 404 for non-admins |

---

## 🟡 Features Not Yet Built

| Feature | Notes |
|---|---|
| Auto-posting to Instagram & TikTok | `auto-share` route only calls Twitter + Telegram. IG/TikTok require separate OAuth token flow and platform API (Graph API, TikTok Content Posting API). |
| Auto-reply suggestions for fan DMs | AI feature — planned, not built |
| Weekly email digest | Planned, not built |
| Smart auto-scheduling (optimal post times) | Planned, not built |
| Trend prediction | Planned, not built |
| Voice clone UI + route | Migration exists (`20250403130000_voice_clone_tables.sql`), DB schema ready — **no API route or dashboard UI** |
| Fan-side commission token validation in SQL | RLS policy uses `USING (true)` — token validated at app layer only (in `creator/[handle]/route.ts`). Consider adding a DB-level check. |
| Mobile responsiveness pass | Incomplete across dashboard and fan pages |

---

## 🟡 Required Env Vars Checklist

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL                ✅ set
NEXT_PUBLIC_SUPABASE_ANON_KEY           ✅ set
SUPABASE_SERVICE_ROLE_KEY               ✅ set locally — verify Vercel

# Auth / Encryption
TOKEN_ENCRYPTION_KEY                    ✅ set locally — verify Vercel (same 64-char hex)

# Payments
WHOP_API_KEY                            ✅ set locally (was WHOP_COMPANY_ID) — verify Vercel
WHOP_WEBHOOK_SECRET                     ✅ set locally — verify Vercel

# AI
OPENROUTER_API_KEY                      ✅ set locally — verify Vercel
# OPENAI_API_KEY removed — marketing agent uses OpenRouter

# Email
RESEND_API_KEY                          ✅ set locally — verify Vercel

# Analytics
NEXT_PUBLIC_POSTHOG_KEY                 ✅ set locally — verify Vercel
NEXT_PUBLIC_POSTHOG_HOST                ✅ set locally — verify Vercel

# OAuth — Twitter
TWITTER_CLIENT_ID                       ❌ EMPTY
TWITTER_CLIENT_SECRET                   ❌ EMPTY
TWITTER_CALLBACK_URL                    ✅ set locally — update to prod domain

# OAuth — Instagram
INSTAGRAM_CLIENT_ID                     ❌ EMPTY
INSTAGRAM_CLIENT_SECRET                 ❌ EMPTY
INSTAGRAM_CALLBACK_URL                  ✅ set locally — update to prod domain

# OAuth — YouTube
YOUTUBE_CLIENT_ID                       ✅ set locally — verify Vercel
YOUTUBE_CLIENT_SECRET                   ✅ set locally — verify Vercel
YOUTUBE_CALLBACK_URL                    ❓ not in .env.local — may be hardcoded; confirm

# OAuth — TikTok
TIKTOK_CLIENT_KEY                       ❌ EMPTY
TIKTOK_CLIENT_SECRET                    ❌ EMPTY

# Telegram
TELEGRAM_BOT_TOKEN                      ❌ EMPTY

# Site
NEXT_PUBLIC_SITE_URL                    ✅ set locally — update to prod domain in Vercel
```

---

## Immediate Priority Order

1. ~~Fix `supabase db push`~~ — ✅ Done. All 47 migrations verified applied.
2. ~~Fix setAll cookie bug in 4 series routes~~ — ✅ Done. Build confirmed passing.
3. ~~Add `WHOP_API_KEY`~~ — ✅ Done (was WHOP_COMPANY_ID, renamed).
4. ~~Remove OpenAI / use OpenRouter~~ — ✅ Done. Marketing agent now uses `OPENROUTER_API_KEY`.
5. **Update OAuth callback URLs** to prod domain (`https://muluk.vip/api/auth/<platform>/callback`) in each provider dashboard; update `*_CALLBACK_URL` env vars in Vercel
6. **Confirm all other Vercel env vars** match `.env.local` — especially `TOKEN_ENCRYPTION_KEY` (same 64-char hex) and `WHOP_WEBHOOK_SECRET`
7. **Execute production deploy** (`git push` to Vercel-linked branch)
8. **Run smoke test**: landing → waitlist → login → apply → dashboard loop
