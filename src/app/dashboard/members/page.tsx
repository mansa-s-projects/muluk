import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import MembersClient from "./MembersClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fans — MULUK",
  description: "Manage your fan community, view fan codes, and track engagement.",
};

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: application } = await db
    .from("creator_applications")
    .select("handle")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  const { data: messages } = await db
    .from("fan_messages")
    .select("fan_code, created_at, from_creator")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  // Build unique fan list from message history
  const fanMap = new Map<string, { fan_code: string; last_active: string; message_count: number }>();
  for (const msg of messages ?? []) {
    if (!msg.fan_code) continue;
    const existing = fanMap.get(msg.fan_code);
    if (!existing) {
      fanMap.set(msg.fan_code, { fan_code: msg.fan_code, last_active: msg.created_at, message_count: 1 });
    } else {
      existing.message_count++;
      if (msg.created_at > existing.last_active) existing.last_active = msg.created_at;
    }
  }

  const fans = Array.from(fanMap.values()).sort(
    (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
  );

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id} handle={application?.handle}>
      <MembersClient
        fans={fans}
        handle={application?.handle ?? profile?.username ?? ""}
        creatorId={user.id}
      />
    </DashboardShell>
  );
}
