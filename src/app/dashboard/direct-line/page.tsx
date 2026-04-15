import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import DirectLineClient from "./DirectLineClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Direct Line — MULUK",
  description: "Private messaging with your fans.",
};

export default async function DirectLinePage() {
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

  const { data: messages } = await supabase
    .from("fan_messages")
    .select("id, fan_code, content, from_creator, read_at, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id}>
      <DirectLineClient initialMessages={messages ?? []} creatorId={user.id} />
    </DashboardShell>
  );
}
