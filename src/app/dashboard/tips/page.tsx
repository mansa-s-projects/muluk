import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import TipsClient from "./TipsClient";
import type { Tip } from "@/lib/tips";
import DashboardShell from "@/app/dashboard/components/DashboardShell";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function TipsDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getServiceDb();

  const [tipsRes, monthlyRes, profileRes] = await Promise.all([
    db
      .from("tips")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.rpc("get_tip_monthly_earnings", {
      p_creator_id: user.id,
      p_year:       new Date().getFullYear(),
    }),
    db
      .from("creator_applications")
      .select("handle")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .single(),
  ]);

  if (tipsRes.error) {
    console.error("[dashboard/tips] failed to load tips", { creatorId: user.id, error: tipsRes.error });
    throw new Error("Failed to load tips");
  }
  if (monthlyRes.error) {
    console.error("[dashboard/tips] failed to load monthly tip earnings", {
      creatorId: user.id,
      rpc: "get_tip_monthly_earnings",
      error: monthlyRes.error,
    });
    throw new Error("Failed to load tip earnings");
  }
  if (profileRes.error) {
    console.error("[dashboard/tips] failed to load creator handle", { creatorId: user.id, error: profileRes.error });
    throw new Error("Failed to load creator profile");
  }

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id} handle={profileRes.data?.handle ?? undefined}>
      <TipsClient
        initialTips={(tipsRes.data ?? []) as Tip[]}
        monthlyEarnings={(monthlyRes.data ?? []) as { month: number; total_cents: number; tip_count: number }[]}
        handle={profileRes.data?.handle ?? ""}
      />
    </DashboardShell>
  );
}
