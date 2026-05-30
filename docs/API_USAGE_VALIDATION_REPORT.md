# API Usage Validation Report

Generated: 2026-05-30 13:51:57 +04:00

## Scope and Constraints
- Input set: all endpoints previously identified with zero internal route references (118 endpoints).
- Runtime logs validated: Vercel production logs (CLI) over the maximum working window in this environment (7 days).
- Supabase runtime logs: unavailable from this workspace (Supabase CLI not installed/configured here).
- Webhook provider logs: not directly accessible from this workspace.
- Browser/network telemetry: inferred from static code callsites only (no live session capture in this run).
- Server actions/external integrations: inferred from static code references and endpoint class.
- Deletion policy applied: Delete Candidate stays No unless 30+ day inactivity is confirmed across runtime channels.

## Summary
- Active: 1
- Dormant (provisional): 57
- Unknown: 60
- Delete Candidate = No for all rows pending 30-day multi-source runtime confirmation.

## Endpoint Matrix
| Endpoint | Last Accessed | Source | Request Volume | Delete Candidate (Yes/No) | Classify |
|---|---|---|---|---|---|
| /api/admin/actions | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/activity | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/applications | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/applications/[id] | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/audit-logs | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/bootstrap | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/creators | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/creators/[id] | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/login | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/messages | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/stats | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/supporters | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/admin/transactions | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/content/ideas | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/ai/copilot/daily-brief | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/ai/ghostwrite | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/monetization/dynamic-pricing | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/onboarding/analyze | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/onboarding/blueprint | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/onboarding/complete | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/supporters/personas | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/voice/clone | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/ai/voice/tts | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/applications/analyze | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/apply | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/auth/instagram/callback | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/instagram/connect | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/telegram/callback | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/telegram/connect | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/auth/tiktok/callback | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/tiktok/connect | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/auth/twitter/callback | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/twitter/connect | 2026-05-30 05:56:12 UTC | Vercel production logs (7d) | 2 (Vercel 7d sample) | No | Active |
| /api/auth/youtube/callback | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/auth/youtube/connect | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/bookings/create | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/bookings/slots/[handle] | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/commissions | Not observed in Vercel logs (past 7d) | Code literal references (8) | 0 (Vercel 7d sample) | No | Unknown |
| /api/commissions/[id] | Not observed in Vercel logs (past 7d) | Code literal references (5) | 0 (Vercel 7d sample) | No | Unknown |
| /api/commissions/[id]/status | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/commissions/creator/[handle] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/creator/[handle] | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/creator/presence | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/dashboard/bookings/slots | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/dashboard/bookings/slots/[id] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/dashboard/notifications | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/deals | Not observed in Vercel logs (past 7d) | Code literal references (4) | 0 (Vercel 7d sample) | No | Unknown |
| /api/deals/[id] | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/launch-actions | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/marketing-agent | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/messages | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/notifications/send | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/offers | Not observed in Vercel logs (past 7d) | Code literal references (7) | 0 (Vercel 7d sample) | No | Unknown |
| /api/offers/[id]/launch | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/offers/[id]/unlock | Not observed in Vercel logs (past 7d) | Code literal references (3) | 0 (Vercel 7d sample) | No | Unknown |
| /api/offers/manage | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/offers/purchase | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/onboarding/draft | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/onboarding/first-money-complete | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/onboarding/profile-draft | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/onboarding/profile-save | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/pay/[id] | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/pay/[id]/verify | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/payment-links | Not observed in Vercel logs (past 7d) | Code literal references (5) | 0 (Vercel 7d sample) | No | Unknown |
| /api/payment-links/[id] | Not observed in Vercel logs (past 7d) | Code literal references (3) | 0 (Vercel 7d sample) | No | Unknown |
| /api/payment-links/[id]/reprovision | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/profile/save | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/rate-card/[slug] | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/rate-card/generate | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referral/customize | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referral/stats | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referral/update-handle | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referrals/attach | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referrals/click | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referrals/leaderboard | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referrals/purchase | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/referrals/stats | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/series | Not observed in Vercel logs (past 7d) | Code literal references (11) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/[id] | Not observed in Vercel logs (past 7d) | Code literal references (8) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/[id]/buy | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/[id]/episodes | Not observed in Vercel logs (past 7d) | Code literal references (3) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/[id]/episodes/[episodeId] | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/[id]/read | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/series/public/[handle] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/signals | Not observed in Vercel logs (past 7d) | Code literal references (6) | 0 (Vercel 7d sample) | No | Unknown |
| /api/signals/action-plan | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/signals/engage | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/signals/refresh | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/social/analyze | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/social/auto-share | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/social/connections | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/social/instagram/connect | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/social/instagram/fetch | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/social/refresh-metrics | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/supporter/access-tokens | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/supporter/ping | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/supporter-codes/generate | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/supporter-portal/[code] | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/supporters/[supporter_code] | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/supporters/generate | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/tools/bio | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/tools/caption | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/tools/predict | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/upload | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/v2/content/create | Not observed in Vercel logs (past 7d) | Code literal references (2) | 0 (Vercel 7d sample) | No | Unknown |
| /api/v2/crypto/initiate | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/v2/earnings | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/v2/unlock/[code] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/vault/[id] | Not observed in Vercel logs (past 7d) | Code literal references (4) | 0 (Vercel 7d sample) | No | Unknown |
| /api/vault/[id]/checkout | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/vault/[id]/view | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/vault/items/[handle] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/vault/setup | Not observed in Vercel logs (past 7d) | No runtime hit in sampled Vercel logs; no static literal references | 0 (Vercel 7d sample) | No | Dormant |
| /api/vault/upload | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/webhooks/whop | Not observed in Vercel logs (past 7d) | Code literal references (2); External integration endpoint class (webhook) | 0 (Vercel 7d sample) | No | Unknown |
| /api/whop-link | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
| /api/withdrawal | Not observed in Vercel logs (past 7d) | Code literal references (3) | 0 (Vercel 7d sample) | No | Unknown |
| /api/withdrawal/[id] | Not observed in Vercel logs (past 7d) | Code literal references (1) | 0 (Vercel 7d sample) | No | Unknown |
