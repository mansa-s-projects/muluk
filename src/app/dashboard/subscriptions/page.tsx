import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import SubscriptionTiersClient from "./SubscriptionTiersClient";

export const metadata = { title: "Subscriptions — MULUK" };

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) redirect("/dashboard/onboarding");

  const { data: creatorProfile } = await supabase
    .from("creator_applications")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fetch existing subscription offers (published or draft, no billing_type on offers table —
  // we identify subscription tiers by price_label containing "/" to indicate recurring pricing)
  const { data: rawTiers } = await supabase
    .from("offers")
    .select("id, title, price_label, description, whop_link, status")
    .eq("creator_id", user.id)
    .ilike("price_label", "%/%")          // "/month", "/mo", "/year" etc.
    .order("created_at", { ascending: false });

  const tiers = (rawTiers ?? []).map((t) => ({
    id:          t.id as string,
    title:       t.title as string,
    price_label: t.price_label as string | null,
    description: t.description as string | null,
    whop_link:   t.whop_link as string | null,
    status:      t.status as string,
  }));

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      handle={creatorProfile?.handle ?? undefined}
    >
      <SubscriptionTiersClient userId={user.id} initialTiers={tiers} />
    </DashboardShell>
  );
}
