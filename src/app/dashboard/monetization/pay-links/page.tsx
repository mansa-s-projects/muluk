import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import PayLinksClient from "./PayLinksClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pay Links — MULUK",
  description: "Create and manage payment links for your content.",
};

export default async function PayLinksPage() {
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

  const { data: links } = await supabase
    .from("payment_links")
    .select("id, title, description, price, content_type, is_active, is_live, view_count, purchase_count, slug, whop_checkout_url, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return <PayLinksClient initialLinks={links ?? []} />;
}
