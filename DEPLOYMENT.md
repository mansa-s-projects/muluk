# MANSA’S MOGULES — Production Deployment Guide

Deploy Mansa’s Mogules to production using:
Vercel + Supabase + OpenRouter.

The platform is infrastructure for digital empires.

NOT:
a creator app,
a crypto dashboard,
or generic SaaS software.

Every deployment decision should reinforce:
speed,
control,
ownership,
and stability.

---

# Prerequisites

Before deployment ensure:

Vercel account

Production Supabase project

Resend account with verified domain

OAuth credentials

OpenRouter API access

Anthropic API access

PostHog project

Domain configured

---

# 1. Supabase Production Setup

## Create Production Project

Create a dedicated production project inside Supabase.

Store securely:

Project URL

Anon key

Service role key

---

# Run Migrations

Execute migrations sequentially.

```sql id="dwhh2r"
supabase/migrations/
```

Critical rules:

Never modify deployed migrations.

Always create new migration files.

Ensure:
RLS is enabled everywhere.

---

# Configure Authentication

Inside Supabase:

Enable:
Email authentication.

Configure:

Site URL

Redirect URLs

Example:

```txt id="n81m9i"
https://your-domain.com/**

https://your-domain.com/api/auth/*/callback
```

---

# 2. Vercel Deployment

## Connect Repository

Import repository into Vercel.

Production branch:
main

---

# Environment Variables

Add all secrets inside:
Vercel → Environment Variables

```env id="k21n4d"
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_SITE_URL=

TOKEN_ENCRYPTION_KEY=

RESEND_API_KEY=

OPENROUTER_API_KEY=

ANTHROPIC_API_KEY=

POSTHOG_KEY=

STRIPE_SECRET_KEY=

WHOP_API_KEY=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

TELEGRAM_BOT_TOKEN=

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

---

# Generate Encryption Key

```bash id="z6q8ru"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Must be:
64-character hex string.

Used for:
AES-256-GCM encryption.

---

# Deploy

```bash id="lv0b9l"
vercel --prod
```

Or:

```bash id="7v3y3s"
git push origin main
```

---

# 3. Domain Configuration

## Add Domain

Inside Vercel:

Domains → Add Domain

Example:

```txt id="xq1p1m"
mansasmogules.com
```

---

# DNS Configuration

```txt id="52c4ir"
A Record:
76.76.21.21

CNAME:
cname.vercel-dns.com
```

---

# OAuth Redirects

Update all platform callbacks.

Example:

```txt id="4xt0fr"
https://your-domain.com/api/auth/twitter/callback
```

Repeat for:

Instagram

TikTok

YouTube

Telegram

---

# 4. Email Infrastructure

## Resend Domain Verification

Configure:

SPF

DKIM

DMARC

Never send from:
gmail addresses.

Use:

```txt id="p2ytvl"
Mansa’s Mogules <hello@your-domain.com>
```

---

# Update Sender References

Search and replace:

Mansas Moguls

with:

Mansa’s Mogules

Files likely affected:

```txt id="7h65hy"
src/app/api/waitlist/route.ts

src/app/api/apply/route.ts
```

---

# 5. Monitoring Infrastructure

## Vercel Analytics

Enable:

Performance tracking

Error tracking

Web vitals

---

# PostHog

Verify events:

Landing visits

Authentication

Treasury events

Signal broadcasts

Citizen conversions

Alliance activity

---

# Runtime Monitoring

Monitor:

API failures

Build failures

Runtime exceptions

Failed intelligence requests

Treasury processing failures

OAuth callback issues

---

# 6. Security Checklist

## Mandatory

[ ] RLS enabled on every table

[ ] OAuth tokens encrypted

[ ] HTTPS enforced

[ ] No secrets exposed client-side

[ ] Admin routes protected

[ ] Service keys server-only

[ ] Device fingerprints hashed

[ ] Error responses sanitized

---

# Verify RLS

```sql id="cl5y8f"
SELECT schemaname,
tablename,
rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Every table must show:

```txt id="s7l8f8"
rowsecurity = true
```

---

# 7. Performance Standards

## Edge Infrastructure

Deploy critical APIs on Edge runtime.

Priority systems:

Signals

Treasury

Intelligence

Citizens

---

# Image Optimization

Use:

next/image

Avoid:
unoptimized large assets.

---

# Caching Strategy

Static:
edge cached.

Real-time:
cache: 'no-store'

Analytics:
ISR + revalidation.

---

# 8. Post-Deployment Validation

## Smoke Test Checklist

[ ] Landing page loads

[ ] Authentication works

[ ] Throne renders correctly

[ ] Treasury systems load

[ ] No NaN states

[ ] Signals broadcast correctly

[ ] AI systems respond

[ ] OAuth integrations function

[ ] Dominion analytics render safely

[ ] Alliance systems load

---

# Optional Demo Seeding

```sql id="ec9x4v"
INSERT INTO operator_wallets (
  operator_id,
  balance,
  treasury_total,
  alliance_income
)
VALUES (
  'user-uuid',
  250.00,
  1250.00,
  125.00
);
```

---

# Rollback Strategy

## Vercel

Deployments →
Select previous deployment →
Promote to production.

---

# Database Rollback

Never manually edit production tables.

Always:
create reverse migrations.

---

# Environment Matrix

| Variable        | Development | Production         |
| --------------- | ----------- | ------------------ |
| SITE_URL        | localhost   | production domain  |
| OAuth Redirects | localhost   | production domain  |
| Supabase        | dev project | production project |

---

# Troubleshooting

## Build Failures

Run locally first:

```bash id="5mw07y"
npm run build
```

Common causes:

TypeScript errors

Missing env vars

Broken imports

---

# OAuth Failures

Verify:

callback URLs

platform credentials

TOKEN_ENCRYPTION_KEY

---

# Database Failures

Check:

Supabase URL

Anon key

RLS policies

Migration execution order

---

# Email Failures

Verify:

Resend key

domain verification

SPF/DKIM records

sender configuration

---

# Final Deployment Philosophy

Mansa’s Mogules is not:
another creator platform.

It is:
infrastructure for digital ownership.

The deployment should prioritize:

speed

control

security

stability

scalability

Every system must feel:
intentional,
minimal,
and operational.
