import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import TipsClient from "./TipsClient";
import type { Tip } from "@/lib/tips";

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

  const { data: tipsRaw } = await db
    .from("tips")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: monthlyRaw } = await db.rpc("get_tip_monthly_earnings", {
    p_creator_id: user.id,
    p_year:       new Date().getFullYear(),
  });

  // Fetch handle for wall-of-love share URL
  const { data: profile } = await db
    .from("creator_applications")
    .select("handle")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .single();

  return (
    <TipsClient
      initialTips={(tipsRaw ?? []) as Tip[]}
      monthlyEarnings={(monthlyRaw ?? []) as { month: number; total_cents: number; tip_count: number }[]}
      handle={profile?.handle ?? ""}
    />
  );
}
