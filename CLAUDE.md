# MULUK — Claude Code Guide

## Project

Creator economy platform. 88% payouts, anonymous fan codes, crypto rails to 190 countries.
MVP focus: landing → waitlist → login → apply → dashboard loop.

## Stack

- **Framework:** Next.js 16.2.1, App Router, Turbopack
- **DB/Auth:** Supabase (project: `atrlfehyvcaqmathdrnj`)
- **Email:** Resend
- **Analytics:** PostHog
- **Payments:** Stripe + Whop
- **AI:** Anthropic Claude
- **Styling:** Tailwind CSS v4

## Commands

```bash
npm run dev       # Turbopack dev server (via scripts/dev.mjs)
npm run dev:raw   # Next.js dev server directly
npm run build     # Production build
npm run lint      # ESLint
```

## Structure

```
src/app/           # All routes (App Router)
  [handle]/        # Public fan page
  dashboard/       # Creator dashboard
  admin/           # Admin panel (404 if not admin)
  api/             # API routes
    auth/          # OAuth callbacks (Twitter, IG, TikTok, Telegram, YouTube)
    admin/         # Admin-only endpoints
    ai/            # AI features
    pay/           # Payment handling
lib/               # Shared utilities
  auth/role-guards.ts  # Route classification (isAdminRoute, isPublicRoute, etc.)
  supabase/        # Supabase clients
supabase/migrations/   # SQL migrations (numbered 001–032+)
```

## Auth & Middleware

- `middleware.ts` handles all route protection via `lib/auth/role-guards.ts`
- Admin routes return **404** (not 401/403) for non-admins — security by obscurity
- Debug routes are 404 in production
- OAuth tokens stored AES-256-GCM encrypted; requires `TOKEN_ENCRYPTION_KEY` (64-char hex) in `.env.local`
- OAuth redirect sanitization in `src/app/api/auth/_utils.ts:sanitizeOAuthRedirect`

## DB Conventions

- All tables have RLS enabled
- Column is `name` (not `display_name`) in `creator_applications`
- `creator_applications` has a `user_id` column (added in migration `fix_creator_profile_and_vault_pins`)
- Never do cross-schema joins (`auth.users` ↔ public tables) in TypeScript — query separately
- Migration files: `supabase/migrations/` — numbered sequentially

## Key Env Vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
TOKEN_ENCRYPTION_KEY        # 64-char hex, AES-256-GCM for OAuth tokens
RESEND_API_KEY
```

## Design System

Dark luxury aesthetic: near-black backgrounds, gold accent (`#c8a96e`), noise texture.
Use the `cipher-design` skill for UI work.

## Gotchas

- Only `src/app/` is the App Router root — no root-level `app/` directory
- `next.config.ts` sets `turbopack.root` explicitly to avoid Turbopack root warnings
- Fan device fingerprints must be stored as one-way hashes, retained max 90 days (privacy requirement)
