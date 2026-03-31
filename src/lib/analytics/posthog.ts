// CIPHER PostHog Analytics Integration
import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      },
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true },
      },
    });
  }
};

export const identifyUser = (userId: string, properties: any) => {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, { ...properties, first_seen: new Date().toISOString() });
  }
};

export const trackVisitor = (data: any) => {
  posthog.capture('page_view', { ...data, timestamp: new Date().toISOString() });
};

export const trackSignUp = (data: any) => {
  posthog.capture('user_signed_up', { ...data, timestamp: new Date().toISOString() });
};

export const trackLogin = (data: any) => {
  posthog.capture('user_logged_in', { ...data, timestamp: new Date().toISOString() });
};

export const trackContentUpload = (data: any) => {
  posthog.capture('content_uploaded', data);
};

export const trackContentPurchase = (data: any) => {
  posthog.capture('content_purchased', data);
};

export const trackPaymentSuccess = (data: any) => {
  posthog.capture('payment_succeeded', { ...data, timestamp: new Date().toISOString() });
};

export const trackPaymentFailure = (data: any) => {
  posthog.capture('payment_failed', data);
};

export const trackCreatorEarnings = (data: any) => {
  posthog.capture('creator_earnings', data);
};

export const trackWithdrawalRequest = (data: any) => {
  posthog.capture('withdrawal_requested', data);
};

export const trackReferralClick = (data: any) => {
  posthog.capture('referral_link_clicked', data);
};

export const trackSocialShare = (data: any) => {
  posthog.capture('social_shared', data);
};

export const trackButtonClick = (buttonName: string, context?: any) => {
  posthog.capture('button_clicked', { button_name: buttonName, ...context });
};

export const trackError = (error: any) => {
  posthog.capture('error_occurred', { ...error, timestamp: new Date().toISOString() });
};

export const trackAdminAction = (data: any) => {
  posthog.capture('admin_action', { ...data, timestamp: new Date().toISOString() });
};

export default posthog;
