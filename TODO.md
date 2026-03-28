# CIPHER — TODO

## Immediate Fixes

- [x] Apply `<Suspense>` wrapper around `<LoginForm />` in `src/app/login/page.tsx`
  - `LoginForm` uses `useSearchParams()` which requires a Suspense boundary
  - Fixed: wrapped in `<Suspense>` with no fallback (login page has its own loading state)

## Server & Environment

- [x] Restart dev server after `.env.local` update (`npm run dev`)
- [ ] Verify `/login` and `/dashboard` load without 500 errors (manual smoke test)

## Dashboard

- [x] `src/app/dashboard/page.tsx` queries exact confirmed tables:
  - `creator_wallets` → `total_earnings`, `balance`, `referral_income`
  - `fan_codes` → filtered by `creator_id`
  - `transactions` → filtered by `creator_id`, shows `fan_code`, `amount`, `type`, `status`

## Supabase

- [x] RLS SELECT/ALL policies created in `supabase/migrations/005_rls_core_tables.sql`:
  - `creator_wallets` — SELECT + UPDATE for own rows
  - `fan_codes` — ALL for own rows
  - `transactions` — SELECT for own rows
  - `content_items` — ALL for own rows
  - `withdrawal_requests` — ALL for own rows
  - `creator_applications` — SELECT + UPDATE + INSERT for own rows
- [ ] Run `005_rls_core_tables.sql` in Supabase SQL Editor
- [ ] Seed test data (wallet row, fan codes, transactions) for the authenticated test user

## Git / Deploy

- [x] `.env.example` updated with all required env vars (Supabase, Resend, Anthropic, all OAuth providers, TOKEN_ENCRYPTION_KEY)
- [ ] Push latest commits to `MansaMusaMogule86/cipher` (main)

## Future Features

- [ ] Creator application review flow (admin view)
- [ ] Fan code generation logic
- [ ] Payout request flow
- [ ] Email notifications for application status updates

