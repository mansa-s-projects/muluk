import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import SubscriptionsClient from "./SubscriptionsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscriptions — MULUK",
  description: "Manage your subscription tiers and recurring revenue.",
};

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  // Load payment links that function as subscription products
  const { data: payLinks } = await supabase
    .from("payment_links")
    .select("id, title, description, price, is_active, purchase_count, view_count, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const totalSubscribers = (payLinks ?? []).reduce((s, p) => s + (p.purchase_count ?? 0), 0);

  return (
    <SubscriptionsClient
      payLinks={payLinks ?? []}
      totalSubscribers={totalSubscribers}
    />
  );
}
