# Operator Runbook

## Purpose

Operate, verify, and recover the CIPHER production system.

## Pre-Deploy Checklist

1. `npm run lint -- --quiet`
2. `npm run build`
3. Confirm required env vars are set in Vercel.
4. Confirm Supabase migrations are up to date.

## Deploy

1. Deploy with Vercel (`vercel --prod`) or push to main.
2. Wait for successful build and health checks.
3. Record deployment ID and timestamp.

## Smoke Test Suite

1. Landing page: `/`
2. Auth: `/login`
3. Dashboard: `/dashboard`
4. Content unlock: `/unlock/[code]`
5. APIs:
   - `/api/ai/copilot/daily-brief`
   - `/api/ai/content/ideas`
   - `/api/v2/content/create`
   - `/api/messages`
6. OAuth callbacks for each enabled provider.

## Monitoring

1. Check Vercel logs for 5xx errors.
2. Check Supabase logs for auth/db failures.
3. Check PostHog event ingestion.
4. Check Resend delivery and rejection logs.

## Incident Triage

1. Classify severity:
   - P0: Login, payments, or content unlock down.
   - P1: Partial degradation in AI/social features.
   - P2: Non-critical dashboard/regression issues.
2. Capture failing route, user impact, and first seen timestamp.
3. Mitigate:
   - Disable affected feature path where possible.
   - Roll back to prior deployment if needed.

## Rollback

1. In Vercel, promote previous healthy deployment.
2. Re-run smoke tests.
3. Post incident summary with root cause and fix.

## Security Ops

1. Never expose secrets client-side.
2. Rotate leaked keys immediately.
3. Re-validate OAuth callback domains after domain changes.

## Weekly Maintenance

1. Review failed API calls and top errors.
2. Review rate-limit pressure on AI and messaging routes.
3. Audit RLS and admin access changes.
