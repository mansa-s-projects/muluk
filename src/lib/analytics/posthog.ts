/**
 * Legacy analytics shim — kept for backwards compatibility with hooks/useTracking.ts
 * and any other existing imports. PostHog is now initialized exclusively via
 * PostHogProvider (src/app/providers/PostHogProvider.tsx).
 * For new code, import from @/lib/analytics/track instead.
 */
import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, unknown>;

function ph(): typeof posthog | null {
  if (typeof window === 'undefined') return null;
  return posthog;
}

/** @deprecated PostHog is initialized by PostHogProvider — do not call this. */
export const initPostHog = () => {
  // no-op: initialization is handled by src/app/providers/PostHogProvider.tsx
};

export const identifyUser = (userId: string, properties: AnalyticsProperties) => {
  ph()?.identify(userId, properties);
};

export const trackVisitor = (data: AnalyticsProperties) => {
  ph()?.capture('page_view', data);
};

export const trackSignUp = (data: AnalyticsProperties) => {
  ph()?.capture('user_signed_up', data);
};

export const trackLogin = (data: AnalyticsProperties) => {
  ph()?.capture('user_logged_in', data);
};

export const trackContentUpload = (data: AnalyticsProperties) => {
  ph()?.capture('content_uploaded', data);
};

export const trackContentPurchase = (data: AnalyticsProperties) => {
  ph()?.capture('content_purchased', data);
};

export const trackPaymentSuccess = (data: AnalyticsProperties) => {
  ph()?.capture('payment_succeeded', data);
};

export const trackPaymentFailure = (data: AnalyticsProperties) => {
  ph()?.capture('payment_failed', data);
};

export const trackCreatorEarnings = (data: AnalyticsProperties) => {
  ph()?.capture('creator_earnings', data);
};

export const trackWithdrawalRequest = (data: AnalyticsProperties) => {
  ph()?.capture('withdrawal_requested', data);
};

export const trackReferralClick = (data: AnalyticsProperties) => {
  ph()?.capture('referral_link_clicked', data);
};

export const trackSocialShare = (data: AnalyticsProperties) => {
  ph()?.capture('social_shared', data);
};

export const trackButtonClick = (buttonName: string, context?: AnalyticsProperties) => {
  ph()?.capture('button_clicked', { button_name: buttonName, ...context });
};

export const trackError = (error: AnalyticsProperties) => {
  ph()?.capture('error_occurred', error);
};

export const trackAdminAction = (data: AnalyticsProperties) => {
  posthog.capture('admin_action', { ...data, timestamp: new Date().toISOString() });
};

export default posthog;
