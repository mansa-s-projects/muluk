import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHomeClient from "./DashboardHomeClient";

export const metadata = { title: "Dashboard — MULUK" };

async function DashboardHome({ userId, handle, userEmail }: { userId: string; handle?: string; userEmail: string }) {
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("get_creator_dashboard_stats", { p_user_id: userId });
  return (
    <DashboardHomeClient
      stats={stats ?? null}
      handle={handle}
      userEmail={userEmail}
    />
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRow?.onboarding_completed !== true) redirect("/dashboard/onboarding");

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DashboardHome
      userId={user.id}
      handle={creatorProfile?.handle ?? undefined}
      userEmail={user.email ?? ""}
    />
  );
}
