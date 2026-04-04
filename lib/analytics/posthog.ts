/**
 * Server-side PostHog analytics — for use in API routes and server actions.
 * Uses PostHog's /capture HTTP endpoint directly (no posthog-node dependency).
 * For client-side tracking, use src/lib/analytics/track.ts instead.
 */

const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

type Properties = Record<string, unknown>;

async function capture(
  distinctId: string,
  event: string,
  properties: Properties = {}
): Promise<void> {
  if (!POSTHOG_API_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        distinct_id: distinctId,
        event,
        properties: {
          $lib: 'cipher-server',
          ...properties,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-fatal — analytics must never break the request
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function trackSignUp(userId: string, props?: Properties) {
  return capture(userId, 'user_signed_up', props);
}

export async function trackSignIn(userId: string, props?: Properties) {
  return capture(userId, 'user_signed_in', props);
}

// ── Content ───────────────────────────────────────────────────────────────────

export async function trackContentUploaded(
  userId: string,
  props: { contentId: string; title: string; price: number; mediaType: string }
) {
  return capture(userId, 'content_uploaded', props);
}

export async function trackContentPurchased(
  fanId: string,
  props: { contentId: string; creatorId: string; amount: number }
) {
  return capture(fanId, 'content_purchased', props);
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function trackPaymentSucceeded(
  userId: string,
  props: { amount: number; contentId?: string; tier?: string }
) {
  return capture(userId, 'payment_succeeded', props);
}

export async function trackPaymentFailed(
  userId: string,
  props: { amount: number; reason?: string }
) {
  return capture(userId, 'payment_failed', props);
}

export async function trackWithdrawalRequested(
  userId: string,
  props: { amount: number; method?: string }
) {
  return capture(userId, 'withdrawal_requested', props);
}

// ── Generic escape hatch ──────────────────────────────────────────────────────

export async function trackEvent(
  distinctId: string,
  event: string,
  props?: Properties
) {
  return capture(distinctId, event, props);
}
