# CIPHER - Creator Intelligence Platform
## Project Overview & Presentation Script

---

## 1. ELEVATOR PITCH

**CIPHER** is an AI-native operating system for content creators. Think "Notion + AI Co-pilot + Monetization Infrastructure" for the creator economy.

**Core Value Proposition:**
- AI handles strategy, pricing, content ideas, fan engagement
- Creators focus on creating
- Dark luxury aesthetic (UAE private members club meets engineer-built)
- 84% cheaper AI costs than competitors

**Tagline:** *"The platform they were afraid to build."*

---

## 2. TECH STACK

### Frontend
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Variables (CIPHER Design System)
- **Fonts:** Cormorant Garamond (display), Outfit (body), DM Mono (data)
- **UI:** Custom components (no shadcn/ui dependency)

### Backend
- **Runtime:** Node.js (Edge/Serverless)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Auth:** Supabase Auth (Email + OAuth: Twitter, TikTok, Instagram, YouTube, Telegram)
- **Storage:** Supabase Storage (creator assets)
- **Payments:** Whop checkout links for hosted fan payments, plus creator payout rails
- **Email:** Resend
- **AI:** OpenRouter (unified API for multiple providers)

### Infrastructure
- **Hosting:** Vercel (serverless)
- **CI/CD:** GitHub → Vercel auto-deploy
- **Monitoring:** Vercel Logs

---

## 3. PROJECT STRUCTURE

```
cipher/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (routes)/
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── apply/          # Creator application
│   │   │   ├── login/          # Authentication
│   │   │   ├── dashboard/      # Main creator dashboard
│   │   │   │   ├── page.tsx
│   │   │   │   ├── content/    # Content management
│   │   │   │   ├── settings/   # Profile & payout settings
│   │   │   │   └── tools/      # AI tools (bio, pricing, calendar)
│   │   │   ├── admin/          # Admin command center
│   │   │   ├── unlock/[code]/  # Fan unlock pages
│   │   │   └── marketing/      # Marketing materials
│   │   ├── api/                # API Routes
│   │   │   ├── ai/             # AI endpoints
│   │   │   │   ├── onboarding/analyze    # Smart profiling
│   │   │   │   ├── content/ideas         # Content calendar
│   │   │   │   ├── fans/personas         # Fan segmentation
│   │   │   │   ├── monetization/dynamic-pricing
│   │   │   │   └── copilot/daily-brief
│   │   │   ├── auth/[provider]/          # OAuth callbacks
│   │   │   ├── tools/
│   │   │   │   ├── bio/                  # Bio generator
│   │   │   │   ├── caption/              # Caption generator
│   │   │   │   └── predict/              # Price optimizer
│   │   │   ├── v2/
│   │   │   │   ├── content/create
│   │   │   │   └── unlock/[code]
│   │   │   └── dashboard/notifications
│   │   └── debug/              # Debug panels
│   │       ├── ai-status
│   │       ├── env
│   │       ├── database
│   │       └── monetization
│   ├── lib/                    # Shared libraries
│   │   ├── ai-router.ts        # AI model routing
│   │   ├── supabase/           # Supabase clients
│   │   └── dashboard-v2.ts     # Dashboard data layer
│   └── hooks/                  # React hooks
├── supabase/
│   └── migrations/             # SQL migrations
│       ├── 004_tools_and_features.sql
│       ├── 005_rls_core_tables.sql
│       ├── 006_monetization_engine.sql
│       └── ...
├── public/                     # Static assets
└── docs/
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── DEPLOYMENT.md
    └── TODO.md
```

---

## 4. COMPLETED FEATURES (✅)

### Core Platform
- [x] **Authentication System**
  - Email/password auth
  - OAuth: Twitter, TikTok, Instagram, YouTube, Telegram
  - Protected routes middleware

- [x] **Creator Dashboard**
  - Real-time wallet (earnings, balance, referrals)
  - 7-day earnings chart
  - Social reach analytics
  - Notification center
  - Dark mode (always on)

- [x] **Content Management**
  - Create content with unlock prices
  - Burn mode (self-destructing content)
  - Content calendar scheduling
  - Auto-generated unlock links

- [x] **Fan Management**
  - Anonymous fan codes
  - Fan CRM (notes, tags, VIP status)
  - Transaction tracking
  - Fan activity heatmap

- [x] **Monetization**
  - Whop checkout-link integration for hosted fan payments
  - Multiple payout methods (Whop, Wise, USDC, PayPal)
  - Referral system with custom handles
  - Withdrawal requests

### AI Features ("God Mode" Suite)
- [x] **AI Daily Brief** - Morning co-pilot briefing
- [x] **Bio Generator** - 3 bio variations from keywords
- [x] **Caption Generator** - Platform-optimized captions
- [x] **Content Ideas** - 7-day calendar generator
- [x] **Price Optimizer** - AI pricing based on transaction history
- [x] **Fan Personas** - Auto-segmentation (Whale, Loyal, At-Risk, New, Lurker)
- [x] **Ghostwriter** - Content drafting
- [x] **Onboarding Analyzer** - Smart creator profiling

### Tools
- [x] **Phantom Mode** - Privacy toggle
- [x] **Dark Vault** - PIN-protected content
- [x] **Cipher Radio** - In-app music player
- [x] **Fan Code Generator** - Bulk code creation
- [x] **Tax Summary** - CSV export for accountants
- [x] **Collaboration Finder** - Mock creator matching

### Admin Features
- [x] **Command Center** - Admin dashboard
- [x] **Application Review** - Creator approval workflow
- [x] **Analytics** - Platform-wide stats

---

## 5. IN PROGRESS / TODO (❌)

> Items previously listed as TODO that are now **fully shipped**: email notifications (Resend), content file uploads (Supabase Storage), fan messaging / Direct Line, subscription tiers, AI onboarding wizard, PostHog analytics, Vault/Drops, Bookings, Series, Commissions, Brand Deals, Referrals, Signals, Members, Presence, Instant Pay Links, Tip Jar, dashboard error boundary, loading skeletons for all dashboard pages, improved empty states (commissions/deals/series), AI auto-reply suggestions in Direct Line, mobile responsive nav.

### Critical
- [ ] **Production Deployment**
  - Confirm `OPENROUTER_API_KEY` → Vercel env (currently uses Anthropic directly in some routes)
  - Confirm `SUPABASE_SERVICE_ROLE_KEY` → Vercel env
  - Confirm `TOKEN_ENCRYPTION_KEY` (64-char hex) → Vercel env
  - Full smoke test on production URL before first creator invite

### In Progress

- [ ] **Social media auto-posting** — Twitter + Telegram real calls exist (`/api/social/auto-share`); Instagram and TikTok require separate OAuth token flow (Graph API / TikTok Content Posting API) — not yet built

### Crypto / Global Payouts

- [ ] **Crypto rails** — withdrawal settings accept `crypto` method, `/api/v2/crypto/initiate` has architecture comments for USDC / Polygon / Solana / Lightning but returns a mock response; no on-chain integration yet
- [ ] **190-country routing** — no country-based payout routing implemented; currently manual Whop/Wise/PayPal withdrawal only

### AI Enhancements

- [x] **Auto-reply suggestions** — `✦ AI` button in Direct Line composer calls `/api/ai/direct-line/suggest-reply`; shows 3 tap-to-fill suggestions above composer
- [ ] **Weekly email digest** — Resend is live but no scheduled weekly report job
- [ ] **Smart content scheduling** — content calendar UI exists, but no "auto-post at optimal time" engine
- [ ] **Trend prediction** — signals board shows engagement data but no forward-looking trend model

### Polish

- [x] **Error boundary** — `src/app/dashboard/error.tsx` catches all unhandled errors under `/dashboard/*`
- [x] **Loading skeletons** — `DashboardPageLoading` skeleton added to all 12 dashboard subdirectory routes
- [x] **Empty states** — commissions, deals, and series now show icon + description + CTA instead of bare text
- [x] **Mobile nav** — hamburger + slide-out sidebar + overlay added to `DashboardShell`; auto-closes on route change
- [ ] **Fan page OG image** — `generateMetadata` exists on `[handle]` page but OG images are static placeholders; dynamic creator card not yet built

---

## 6. ARCHITECTURE

### Database Schema (Supabase)

**Core Tables:**
```sql
- creator_applications    # Creator profiles
- creator_wallets         # Earnings & balance
- fan_codes              # Anonymous fan identities
- transactions           # Payments & tips
- content_items          # Creator content
- withdrawal_requests    # Payout requests
- social_connections     # OAuth connections
- notifications          # User notifications
- creator_onboarding     # AI onboarding data
- pricing_recommendations # AI pricing history
- daily_briefs          # AI brief history
```

### AI Architecture

**Router Pattern:**
```
Request → AI Router → OpenRouter → Model
                ↓
         Task-based routing:
         - Fast: GPT-4o-mini ($0.15/M)
         - Balanced: Gemini Flash ($0.075/M)
```

**Cost Optimization:**
- 98% cheaper than direct premium-model usage
- 84% cheaper than old GPT-3.5 stack
- All via OpenRouter (single API key)

### Security
- Row Level Security (RLS) on all tables
- Service role key for backend operations
- Client-side auth for user operations
- No secrets exposed to client

---

## 7. API ENDPOINTS

### AI Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/ai/onboarding/analyze | POST | Smart creator profiling |
| /api/ai/content/ideas | POST | Generate 7-day content calendar |
| /api/ai/fans/personas | GET | Fan segmentation analysis |
| /api/ai/monetization/dynamic-pricing | POST | Optimal price recommendation |
| /api/ai/copilot/daily-brief | GET | Morning AI briefing |

### Tools
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/tools/bio | POST | Generate 3 bio variations |
| /api/tools/caption | POST | Generate social captions |
| /api/tools/predict | POST | Price optimization analysis |

### Core
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v2/content/create | POST | Create content with unlock |
| /api/v2/unlock/[code] | GET | Unlock state + payment configuration |
| /api/auth/[provider]/callback | GET | OAuth callbacks |

### Debug
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/debug/ai-status | GET | AI system health |
| /api/debug/env | GET | Environment check |
| /api/debug/database | GET | DB connection test |

---

## 8. DESIGN SYSTEM

### Colors
```css
--void: #020203          /* Page background */
--surface: #0d0d18       /* Cards, panels */
--gold: #c8a96e          /* Primary accent */
--white: rgba(255,255,255,0.92)  /* Text */
--muted: rgba(255,255,255,0.48)  /* Secondary text */
--dim: rgba(255,255,255,0.22)    /* Tertiary text */
```

### Typography
- **Display:** Cormorant Garamond (300-600)
- **Body:** Outfit (300-700)
- **Mono:** DM Mono (300-500)

### Principles
- No white backgrounds (ever)
- No drop shadows (depth via layered darks)
- Gold is the only accent
- Noise texture overlay on all surfaces
- Generous whitespace
- Motion feels inevitable, not decorative

---

## 9. ECONOMICS

### AI Costs (Per 1M Tokens)
| Model | Input | Output | Use Case |
|-------|-------|--------|----------|
| GPT-4o-mini | $0.15 | $0.60 | Fast tasks |
| Gemini Flash | $0.075 | $0.30 | Most features |
| Claude Sonnet | $3.00 | $15.00 | Premium (unused) |

### Estimated Monthly Bills
| Usage | Cost |
|-------|------|
| 10K requests | ~$8 |
| 50K requests | ~$40 |
| 100K requests | ~$80 |

### Revenue Model
- 12-15% platform fee on transactions
- Tiered: Cipher (12%), Legend (10%), Apex (8%)

---

## 10. ROADMAP

### Phase 1: MVP (Completed)
- ✅ Core platform
- ✅ AI features
- ✅ Payments
- ✅ Dashboard

### Phase 2: Launch (Next 2 weeks)
- 🔄 Production deploy
- 🔄 Email notifications
- 🔄 First 10 beta creators

### Phase 3: Growth (Month 2-3)
- ⏳ Mobile app
- ⏳ Advanced analytics
- ⏳ API for developers
- ⏳ White-label option

### Phase 4: Scale (Month 6+)
- ⏳ AI agent marketplace
- ⏳ Creator DAO
- ⏳ Tokenized ownership

---

## 11. COMPETITIVE ADVANTAGES

1. **AI-Native:** Built with AI, not bolted on
2. **Cost Efficiency:** 84% cheaper AI than competitors
3. **Dark Luxury Aesthetic:** Unique positioning
4. **Unified Platform:** Creation + monetization + AI in one
5. **Privacy-First:** Anonymous fan codes
6. **Engineer-Built:** Reliable, scalable architecture

---

## 12. KEY METRICS TO TRACK

- Creator signups
- Content created
- Transactions processed
- AI feature usage
- Fan conversion rate
- Average transaction value
- Creator retention
- Platform fees collected

---

## 13. TEAM & ACKNOWLEDGMENTS

**Built by:** Mansa Musa Mogule
**Design System:** CIPHER Dark Luxury
**AI Infrastructure:** OpenRouter
**Database:** Supabase
**Hosting:** Vercel

---

## 14. DEMO SCRIPT (3 minutes)

**0:00-0:30 - Hook**
"Most creator platforms are spreadsheets with a logo. CIPHER is an AI operating system."

**0:30-1:00 - Dashboard**
"This is the creator dashboard. Real-time earnings, AI daily brief, content calendar."

**1:00-1:30 - AI Features**
"Click 'Generate' - AI suggests 7 days of content. Click 'Optimize' - AI sets the perfect price based on your fans."

**1:30-2:00 - Fan Intelligence**
"AI segments your fans: Whales, Loyal, At-Risk. Each gets a personalized engagement strategy."

**2:00-2:30 - Monetization**
"Create content, set unlock price, share link. Fans pay, you earn. 12% fee, rest is yours."

**2:30-3:00 - Close**
"We're not a tool. We're a co-pilot. The platform they were afraid to build."

---

## 15. CALL TO ACTION

**For Investors:**
- AI-native creator economy infrastructure
- 84% cost advantage
- Dark luxury market positioning

**For Creators:**
- Join beta: cipher.so/apply
- Get your AI co-pilot
- Keep 88-92% of earnings

**For Developers:**
- Open source components
- API coming soon
- Build on CIPHER

---

*End of Presentation Script*
