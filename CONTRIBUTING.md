# Contributing to CIPHER

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- Resend account (for emails)

### 1. Clone & Install

```bash
git clone https://github.com/MansaMusaMogule86/cipher.git
cd cipher
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email (required for waitlist)
RESEND_API_KEY=re_xxxxx

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI Features (optional)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Social OAuth (optional - add as needed)
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_CALLBACK_URL=http://localhost:3000/api/auth/instagram/callback

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=CIPHERbot

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Token encryption for OAuth tokens (32-byte hex)
TOKEN_ENCRYPTION_KEY=
```

### 3. Database Setup

Run migrations in Supabase SQL Editor:

```bash
# In order:
supabase/migrations/004_tools_and_features.sql
supabase/migrations/005_rls_core_tables.sql
supabase/migrations/20240329000000_analytics.sql
```

### 4. Start Development Server

```bash
npm run dev
```

> **Note:** This uses a custom wrapper (`scripts/dev.mjs`) that kills any existing Next.js process before starting. Use `npm run dev:raw` for vanilla Next.js behavior.

Open [http://localhost:3000](http://localhost:3000)

---

## Development Workflow

### Branch Naming

```
feature/short-description
fix/issue-number-description
refactor/component-name
```

### Commit Messages

```
feat: add ghostwrite AI feature
fix: resolve dashboard loading state
refactor: extract social connection logic
docs: update API reference
```

---

## Code Standards

### TypeScript

- Strict mode enabled
- Explicit return types for functions
- Use type imports: `import type { User } from "@supabase/supabase-js"`

### React

- Functional components only
- Use `"use client"` directive for client components
- Prefer composition over prop drilling

### Styling

- Tailwind CSS for utility classes
- Inline styles for dynamic/animated elements
- Follow CIPHER design system:
  - Gold accent: `#c8a96e`
  - Dark backgrounds: `#020203`, `#0a0a0f`
  - Font families: `var(--font-display)`, `var(--font-mono)`

### API Routes

```typescript
// Pattern for authenticated routes
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // ... handle request
}
```

---

## Project Structure

### Adding a New Feature

1. **Dashboard feature** → `src/app/dashboard/features/`
2. **Dashboard tool** → `src/app/dashboard/tools/`
3. **API route** → `src/app/api/{feature}/route.ts`
4. **Database changes** → new migration in `supabase/migrations/`

### Adding Social Platform Integration

1. Create routes in `src/app/api/auth/{platform}/`:
   - `connect/route.ts` — OAuth initiation
   - `callback/route.ts` — Token exchange

2. Add platform to `SOCIAL_PLATFORMS` in `DashboardClient.tsx`

3. Add env vars to `.env.example`

---

## Testing

### Manual Testing

1. **Waitlist:** Submit email on landing page
2. **Login:** Create account via Supabase Auth
3. **Dashboard:** Verify all sections load without errors

### Smoke Test Checklist

- [ ] Landing page loads
- [ ] Waitlist form submits
- [ ] Login page works
- [ ] Dashboard loads for authenticated user
- [ ] Social connections display correctly
- [ ] Ghostwrite AI generates content

---

## Troubleshooting

### "Another next dev server is already running"

The dev script handles this automatically. If issues persist:

```powershell
# Windows
Get-Process node | Where-Object Path -Match "next" | Stop-Process
```

### Supabase RLS Errors

Ensure all migrations have been run and the user has proper policies:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### OAuth Callback Errors

1. Verify callback URLs match exactly (including trailing slashes)
2. Check platform developer console for API credentials
3. Ensure `TOKEN_ENCRYPTION_KEY` is set (32 hex characters)

---

## Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Test locally
4. Push and create PR
5. Fill out PR template
6. Request review

### PR Checklist

- [ ] Code follows project conventions
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Database migrations included (if applicable)
- [ ] Environment variables documented (if new)
