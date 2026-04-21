import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import ReferralIntelligenceClient from "./ReferralIntelligenceClient";

export const metadata = {
  title: "Referral Intelligence — MULUK",
  description: "Track click-to-signup-to-revenue performance and top referral conversions.",
};

export default async function ReferralsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  return <ReferralIntelligenceClient />;
}
