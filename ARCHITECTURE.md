# CIPHER Architecture

> Technical architecture of the CIPHER creator economy platform.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Styling** | Tailwind CSS 4, Radix UI primitives |
| **Database** | Supabase (PostgreSQL + Auth + RLS) |
| **Email** | Resend |
| **AI** | Anthropic Claude (Ghostwrite feature) |
| **Analytics** | PostHog |
| **Charts** | Recharts |

---

## Project Structure

```
cipher/
├── src/app/                    # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (waitlist)
│   ├── globals.css             # Global styles (CIPHER design system)
│   ├── login/                  # Auth pages
│   ├── dashboard/              # Creator dashboard
│   │   ├── DashboardClient.tsx # Main dashboard component
│   │   ├── features/           # Premium features (CipherScore, PhantomMode, etc.)
│   │   └── tools/              # Creator tools modals
│   ├── apply/                  # Creator application form
│   ├── marketing/              # Marketing agent page
│   └── api/                    # API routes
│       ├── ai/ghostwrite/      # AI content generation
│       ├── auth/               # OAuth callbacks (Twitter, IG, TikTok, YT, Telegram)
│       ├── dashboard/          # Dashboard endpoints
│       ├── fans/               # Fan code endpoints
│       ├── social/             # Social sharing
│       ├── tools/              # Creator tools (bio, predict)
│       └── waitlist/           # Waitlist signup
├── lib/                        # Shared utilities
│   ├── notifications/          # Email via Resend
│   └── supabase.ts             # Supabase client
├── src/lib/
│   ├── analytics/posthog.ts    # Analytics
│   └── supabase/               # Supabase clients (server/client/middleware)
├── supabase/migrations/        # Database migrations
├── middleware.ts               # Route protection
└── hooks/useTracking.ts        # Event tracking hook
```

---

## Database Schema

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                        creator_applications                      │
├─────────────────────────────────────────────────────────────────┤
│ id, user_id, email, display_name, handle, bio, status,         │
│ phantom_mode, vault_pin_hash, created_at                        │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         creator_wallets                          │
├─────────────────────────────────────────────────────────────────┤
│ id, creator_id, balance, total_earnings, referral_income        │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           fan_codes                              │
├─────────────────────────────────────────────────────────────────┤
│ id, creator_id, code, status, custom_name, creator_notes,       │
│ tags[], is_vip, created_at                                      │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          transactions                            │
├─────────────────────────────────────────────────────────────────┤
│ id, creator_id, fan_code, amount, type, status, created_at      │
└─────────────────────────────────────────────────────────────────┘
```

### Content & Social

```
content_items           # Creator content (posts, media)
├── scheduled_for       # Content calendar scheduling
├── burn_mode           # Self-destructing content
└── auto_shared         # Social auto-share flag

social_connections      # OAuth-connected platforms
├── platform            # twitter, tiktok, instagram, youtube, telegram
├── platform_username
├── platform_user_id
└── follower_count

collab_proposals        # Creator collaboration requests
fan_messages            # Fan message blast history
withdrawal_requests     # Payout requests
```

### Analytics

```
analytics_events        # Event tracking
├── event_name
├── properties (JSONB)
├── user_id
└── session_id
```

---

## Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Landing │ ──▶ │    Login     │ ──▶ │  Dashboard   │
│   Page   │     │ (Supabase)   │     │  (Protected) │
└──────────┘     └──────────────┘     └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │  middleware  │  ← Redirects unauthenticated users
                │   .ts        │  ← Updates session cookies
                └──────────────┘
```

### Social OAuth

Each platform has connect/callback routes:
- `/api/auth/{platform}/connect` — Initiates OAuth
- `/api/auth/{platform}/callback` — Handles callback, stores tokens

Supported: `twitter`, `instagram`, `tiktok`, `youtube`, `telegram`

---

## Row Level Security (RLS)

All tables use Supabase RLS for data isolation:

```sql
-- Example: creators only see their own data
CREATE POLICY "creator sees own wallet"
  ON creator_wallets FOR SELECT
  USING (auth.uid() = creator_id);
```

Tables with RLS enabled:
- `creator_wallets` — SELECT, UPDATE
- `fan_codes` — ALL operations
- `transactions` — SELECT only
- `content_items` — ALL operations
- `withdrawal_requests` — ALL operations
- `creator_applications` — SELECT, UPDATE, INSERT
- `social_connections` — ALL operations
- `creator_vault_pins` — ALL operations

---

## API Design

All API routes follow these patterns:

```typescript
// Authentication check
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Rate limiting (where applicable)
if (isRateLimited(user.id)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

### Response Format

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ error: "Error message" }
```

---

## Security

### Token Encryption
Social OAuth tokens are encrypted at rest using AES-256-GCM:
- `TOKEN_ENCRYPTION_KEY` env var (32-byte hex)
- Tokens stored as encrypted ciphertext

### Vault PIN
Creator vault PINs are hashed before storage:
- Stored in `creator_vault_pins` table
- Used for accessing sensitive features (Dark Vault)

### Phantom Mode
Anonymous browsing mode for creators:
- Privacy protection from platform analytics
- Toggle stored in `creator_applications.phantom_mode`

---

## Design System

CIPHER uses a "dark luxury" aesthetic:

```css
:root {
  --gold: #c8a96e;
  --gold-dim: rgba(200, 169, 110, 0.55);
  --muted: rgba(255, 255, 255, 0.4);
  --dim: rgba(255, 255, 255, 0.25);
}

--font-display: Cormorant, Georgia, serif;
--font-mono: 'DM Mono', 'Courier New', monospace;
```

Key components:
- Custom cursor with trailing ring
- Gold accent colors
- Noise texture backgrounds
- Layered depth with subtle borders
