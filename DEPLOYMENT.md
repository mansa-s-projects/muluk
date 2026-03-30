# CIPHER Deployment Guide

> Deploy CIPHER to production on Vercel with Supabase.

---

## Prerequisites

- Vercel account
- Supabase project (production)
- Resend account with verified domain
- OAuth credentials for social platforms
- Anthropic API key (for AI features)

---

## 1. Supabase Setup

### Create Production Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key

### Run Migrations

Execute migrations in order in the SQL Editor:

```sql
-- 1. Core tables (waitlist, creator_applications, etc.)
-- Run any initial migration first

-- 2. Tools & features
-- supabase/migrations/004_tools_and_features.sql

-- 3. Row Level Security
-- supabase/migrations/005_rls_core_tables.sql

-- 4. Analytics
-- supabase/migrations/20240329000000_analytics.sql
```

### Configure Auth

1. **Email Auth:** Enable in Authentication → Providers
2. **Site URL:** Set to `https://your-domain.com`
3. **Redirect URLs:** Add:
   - `https://your-domain.com/**`
   - `https://your-domain.com/api/auth/*/callback`

---

## 2. Vercel Deployment

### Connect Repository

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Select the `cipher` repository

### Environment Variables

Add these in Vercel → Settings → Environment Variables:

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Email
RESEND_API_KEY=re_xxxxx

# Site URL (your production domain)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# AI Features
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Twitter/X OAuth
TWITTER_CLIENT_ID=xxxxx
TWITTER_CLIENT_SECRET=xxxxx
TWITTER_CALLBACK_URL=https://your-domain.com/api/auth/twitter/callback

# Instagram OAuth
INSTAGRAM_CLIENT_ID=xxxxx
INSTAGRAM_CLIENT_SECRET=xxxxx
INSTAGRAM_CALLBACK_URL=https://your-domain.com/api/auth/instagram/callback

# YouTube OAuth
YOUTUBE_CLIENT_ID=xxxxx
YOUTUBE_CLIENT_SECRET=xxxxx

# TikTok OAuth
TIKTOK_CLIENT_KEY=xxxxx
TIKTOK_CLIENT_SECRET=xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=xxxxx
TELEGRAM_BOT_USERNAME=CIPHERbot

# Token Encryption (generate 32-byte hex)
TOKEN_ENCRYPTION_KEY=xxxxx
```

### Generate Encryption Key

```bash
# Generate 32-byte hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deploy

```bash
# Via Vercel CLI
vercel --prod

# Or push to main branch for auto-deploy
git push origin main
```

---

## 3. Domain Configuration

### Custom Domain

1. In Vercel → Domains → Add
2. Add your domain (e.g., `cipher.so`)
3. Configure DNS:
   - `A` record: `76.76.21.21`
   - `CNAME` for `www`: `cname.vercel-dns.com`

### Update OAuth Callbacks

Update callback URLs in each platform's developer console:

| Platform | Callback URL |
|----------|--------------|
| Twitter | `https://your-domain.com/api/auth/twitter/callback` |
| Instagram | `https://your-domain.com/api/auth/instagram/callback` |
| TikTok | `https://your-domain.com/api/auth/tiktok/callback` |
| YouTube | `https://your-domain.com/api/auth/youtube/callback` |

---

## 4. Email Configuration

### Verify Domain in Resend

1. Go to Resend → Domains → Add Domain
2. Add DNS records (SPF, DKIM, DMARC)
3. Update sender email in code: `CIPHER <hello@your-domain.com>`

### Files to Update

Update sender email in:
- `src/app/api/waitlist/route.ts`
- `src/app/api/apply/route.ts`

```typescript
await resend.emails.send({
  from: "CIPHER <hello@your-domain.com>",
  // ...
});
```

---

## 5. Monitoring

### Vercel Analytics

Enable in Vercel → Analytics to track:
- Page views
- Core Web Vitals
- Error rates

### PostHog

Already integrated. Verify events are flowing:
- Visit dashboard
- Check PostHog project for events

### Error Tracking

Monitor Vercel → Logs for:
- API errors
- Build failures
- Runtime exceptions

---

## 6. Security Checklist

- [ ] **RLS Enabled:** All Supabase tables have Row Level Security
- [ ] **Tokens Encrypted:** `TOKEN_ENCRYPTION_KEY` is set
- [ ] **HTTPS Only:** Vercel enforces HTTPS by default
- [ ] **OAuth Secrets:** Never exposed in client-side code
- [ ] **Environment Variables:** All secrets in Vercel, not in code

### Verify RLS

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All tables should show rowsecurity = true
```

---

## 7. Performance

### Edge Functions

API routes run on Vercel Edge by default for low latency.

### Image Optimization

Next.js optimizes images automatically. Ensure:
- Use `next/image` component
- Configure `remotePatterns` in `next.config.ts`

### Caching

Static pages are cached at the edge. Dynamic routes use:
- `revalidate` for ISR
- `cache: 'no-store'` for real-time data

---

## 8. Post-Deployment

### Smoke Tests

1. ✅ Landing page loads
2. ✅ Waitlist form submits
3. ✅ Login works
4. ✅ Dashboard loads for authenticated user
5. ✅ Social OAuth connects
6. ✅ AI ghostwrite generates content

### Database Seeding (Optional)

For demo/testing, seed initial data:

```sql
-- Add test creator wallet
INSERT INTO creator_wallets (creator_id, balance, total_earnings, referral_income)
VALUES ('user-uuid-here', 250.00, 1250.00, 125.00);
```

---

## Rollback

### Vercel

1. Go to Vercel → Deployments
2. Find previous successful deployment
3. Click "..." → Promote to Production

### Database

Keep migrations versioned. To rollback:
1. Create a reverse migration
2. Run in Supabase SQL Editor

---

## Environment Matrix

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `*_CALLBACK_URL` | `localhost:3000` | `your-domain.com` |
| Supabase Project | Dev project | Prod project |

---

## Troubleshooting

### Build Fails

```bash
# Check local build first
npm run build
```

Common issues:
- TypeScript errors
- Missing environment variables
- Import path issues

### OAuth Not Working

1. Verify callback URLs match exactly
2. Check platform developer console for errors
3. Ensure `TOKEN_ENCRYPTION_KEY` is set

### Database Connection Errors

1. Verify Supabase URL and anon key
2. Check RLS policies
3. Ensure migrations have run

### Emails Not Sending

1. Verify Resend API key
2. Check domain verification
3. Look at Resend dashboard for failures
