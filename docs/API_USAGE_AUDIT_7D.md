# API Usage Audit (7-Day Runtime Window)

Generated: 2026-05-30 13:55:13 +04:00

Definitions used:
- Active: Received traffic within 7 days.
- Dormant: No traffic within 7 days and no known integrations.
- Unknown: No traffic observed but external dependencies cannot yet be ruled out.

Total endpoints audited: 118
Active: 1 | Dormant: 0 | Unknown: 117

## ACTIVE ENDPOINTS

| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller |
|---|---:|---|---|---|
| /api/auth/twitter/connect | 2 | 2026-05-30 05:56:12 UTC | 307:2 | None observed |

## DORMANT ENDPOINTS

| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller |
|---|---:|---|---|---|

## UNKNOWN ENDPOINTS

| Endpoint | Request Count | Last Access Time | Response Status Distribution | Primary Caller | Possible Dependencies |
|---|---:|---|---|---|---|
| /api/admin/actions | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/activity | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/applications | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/applications/[id] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/admin/audit-logs | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/bootstrap | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/creators | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/creators/[id] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/admin/login | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/messages | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/stats | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/supporters | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/admin/transactions | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/ai/content/ideas | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/ai/copilot/daily-brief | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/ai/ghostwrite | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/ai/monetization/dynamic-pricing | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/ai/onboarding/analyze | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/ai/onboarding/blueprint | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/ai/onboarding/complete | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/ai/supporters/personas | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/ai/voice/clone | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/ai/voice/tts | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/applications/analyze | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/apply | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/auth/instagram/callback | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/auth/instagram/connect | 0 | No traffic observed (7d) | none | None observed | External integrations |
| /api/auth/telegram/callback | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/auth/telegram/connect | 0 | No traffic observed (7d) | none | None observed | External integrations |
| /api/auth/tiktok/callback | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/auth/tiktok/connect | 0 | No traffic observed (7d) | none | None observed | External integrations |
| /api/auth/twitter/callback | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/auth/youtube/callback | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/auth/youtube/connect | 0 | No traffic observed (7d) | none | None observed | External integrations |
| /api/bookings/create | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/bookings/slots/[handle] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/commissions | 0 | No traffic observed (7d) | none | None observed | Supabase, Whop |
| /api/commissions/[id] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/commissions/[id]/status | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/commissions/creator/[handle] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/creator/[handle] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/creator/presence | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/dashboard/bookings/slots | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/dashboard/bookings/slots/[id] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/dashboard/notifications | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/deals | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/deals/[id] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/launch-actions | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/marketing-agent | 0 | No traffic observed (7d) | none | Stripe integration | Stripe, Supabase |
| /api/messages | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/notifications/send | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/offers | 0 | No traffic observed (7d) | none | None observed | Supabase, Whop |
| /api/offers/[id]/launch | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/offers/[id]/unlock | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/offers/manage | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/offers/purchase | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/onboarding/draft | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/onboarding/first-money-complete | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/onboarding/profile-draft | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/onboarding/profile-save | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/pay/[id] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/pay/[id]/verify | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/payment-links | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/payment-links/[id] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/payment-links/[id]/reprovision | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/profile/save | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/rate-card/[slug] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/rate-card/generate | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referral/customize | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referral/stats | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referral/update-handle | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referrals/attach | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referrals/click | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referrals/leaderboard | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referrals/purchase | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/referrals/stats | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/series | 0 | No traffic observed (7d) | none | None observed | Supabase, Whop |
| /api/series/[id] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/series/[id]/buy | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/series/[id]/episodes | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/series/[id]/episodes/[episodeId] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/series/[id]/read | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/series/public/[handle] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/signals | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/signals/action-plan | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/signals/engage | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/signals/refresh | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/social/analyze | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/social/auto-share | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/social/connections | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/social/instagram/connect | 0 | No traffic observed (7d) | none | None observed | External integrations |
| /api/social/instagram/fetch | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/social/refresh-metrics | 0 | No traffic observed (7d) | none | None observed | Supabase, External integrations |
| /api/supporter/access-tokens | 0 | No traffic observed (7d) | none | Webhook provider | Webhook providers, External integrations, Whop, Supabase |
| /api/supporter/ping | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/supporter-codes/generate | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/supporter-portal/[code] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/supporters/[supporter_code] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/supporters/generate | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/tools/bio | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/tools/caption | 0 | No traffic observed (7d) | none | None observed | Supabase, Automations |
| /api/tools/predict | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/upload | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/v2/content/create | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/v2/crypto/initiate | 0 | No traffic observed (7d) | none | Webhook provider | Webhook providers, External integrations |
| /api/v2/earnings | 0 | No traffic observed (7d) | none | None observed | Supabase |
| /api/v2/unlock/[code] | 0 | No traffic observed (7d) | none | None observed | None identified |
| /api/vault/[id] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/vault/[id]/checkout | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/vault/[id]/view | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/vault/items/[handle] | 0 | No traffic observed (7d) | none | None observed | Whop |
| /api/vault/setup | 0 | No traffic observed (7d) | none | None observed | Supabase, Whop |
| /api/vault/upload | 0 | No traffic observed (7d) | none | None observed | Supabase, Whop |
| /api/webhooks/whop | 0 | No traffic observed (7d) | none | Webhook provider | Webhook providers, External integrations, Whop, Supabase, Automations |
| /api/whop-link | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase, External integrations |
| /api/withdrawal | 0 | No traffic observed (7d) | none | Whop integration | Whop, Supabase |
| /api/withdrawal/[id] | 0 | No traffic observed (7d) | none | None observed | None identified |

