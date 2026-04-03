import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPage } from "./SettingsPage";

type PayoutRow = {
  method: string | null;
  whop_account_id?: string | null;
  stripe_account_id?: string | null;
  wise_email?: string | null;
  crypto_wallet?: string | null;
  paypal_email?: string | null;
};

export default async function SettingsRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch creator profile
  const { data: profile } = await supabase
    .from("creator_applications")
    .select("name, handle, bio, category, avatar_url, banner_url, website, location, profile_public, show_earnings, allow_messages")
    .eq("user_id", user.id)
    .single();

  // Fetch payout settings (whop-first with legacy stripe fallback)
  let payoutData: PayoutRow | null = null;

  const payoutWithWhop = await supabase
    .from("creator_payout_settings")
    .select("method, whop_account_id, stripe_account_id, wise_email, crypto_wallet, paypal_email")
    .eq("creator_id", user.id)
    .single();

  if (payoutWithWhop.error) {
    const payoutLegacy = await supabase
      .from("creator_payout_settings")
      .select("method, stripe_account_id, wise_email, crypto_wallet, paypal_email")
      .eq("creator_id", user.id)
      .single();

    payoutData = payoutLegacy.data as PayoutRow | null;
  } else {
    payoutData = payoutWithWhop.data as PayoutRow | null;
  }

  // Fetch notification settings
  const { data: notifData } = await supabase
    .from("creator_notification_settings")
    .select("email_new_fan, email_new_earning, email_weekly_report, email_marketing, push_enabled")
    .eq("creator_id", user.id)
    .single();

  const settingsData = {
    userId: user.id,
    email: user.email || "",
    profile: {
      displayName: profile?.name || "",
      handle: profile?.handle || "",
      bio: profile?.bio || "",
      category: profile?.category || "luxury",
      avatarUrl: profile?.avatar_url || null,
      bannerUrl: profile?.banner_url || null,
      website: profile?.website || "",
      location: profile?.location || "",
    },
    payout: {
      method: payoutData?.method === "stripe" ? "whop" : payoutData?.method || "wise",
      whopAccountId: payoutData?.whop_account_id || payoutData?.stripe_account_id || "",
      wiseEmail: payoutData?.wise_email || "",
      cryptoWallet: payoutData?.crypto_wallet || "",
      paypalEmail: payoutData?.paypal_email || "",
    },
    notifications: {
      emailNewFan: notifData?.email_new_fan ?? true,
      emailNewEarning: notifData?.email_new_earning ?? true,
      emailWeeklyReport: notifData?.email_weekly_report ?? true,
      emailMarketing: notifData?.email_marketing ?? false,
      pushEnabled: notifData?.push_enabled ?? false,
    },
    privacy: {
      profilePublic: profile?.profile_public ?? true,
      showEarnings: profile?.show_earnings ?? false,
      allowMessages: profile?.allow_messages ?? true,
    },
  };

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#020203" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ 
          fontFamily: "var(--font-display)", 
          fontSize: "32px", 
          color: "var(--gold)", 
          marginBottom: "8px",
          fontWeight: 300,
        }}>
          Settings
        </h1>
        <p style={{ 
          fontSize: "14px", 
          color: "var(--dim)", 
          marginBottom: "32px",
        }}>
          Manage your profile, account, and preferences
        </p>
        <SettingsPage initialData={settingsData} />
      </div>
    </div>
  );
}
