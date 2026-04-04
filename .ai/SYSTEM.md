CIPHER SYSTEM CONTEXT

Product:
CIPHER is a premium creator monetization platform.

Core Flow:
- Onboarding collects niche, content type, and connects social platforms
- Social connections power real signal analysis (followers, engagement, DM opportunities)
- System generates a launch blueprint (offer, price, plan)
- First drop is auto-created and optimized for conversion
- User launches directly from onboarding
- Dashboard continues with next best actions

Current State:
- Onboarding UX is fully rebuilt and optimized for conversion
- First drop screen is frictionless and prefilled
- Pricing tiers implemented (Start / Scale / Elite)
- Messaging is revenue-focused and premium
- Social connection step exists but OAuth is partially broken

Current Problem:
- YouTube OAuth is fully operational: routes at `/api/auth/youtube/connect` + `/api/auth/youtube/callback`
- `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are provisioned in `.env.local`

Standards:
- No generic UX
- Everything must push toward monetization
- No fake AI outputs
- Every feature must reduce friction or increase revenue
- Premium tone only (no hype, no cringe)

Goal:
Turn creators into paying creators as fast as possible.