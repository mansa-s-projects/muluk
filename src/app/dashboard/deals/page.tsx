import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import DealsClient from "./DealsClient";
import type { BrandDeal } from "@/lib/brand-deals";


export const dynamic = "force-dynamic";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function DealsDashboardPage() {
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

  const { data: deals } = await db
    .from("brand_deals")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  // Monthly earnings for current year
  const { data: monthlyRaw } = await db.rpc("get_brand_deal_monthly_earnings", {
    p_creator_id: user.id,
    p_year:       new Date().getFullYear(),
  });

  return (
    <DealsClient
      initialDeals={(deals ?? []) as BrandDeal[]}
      monthlyEarnings={(monthlyRaw ?? []) as { month: number; total_cents: number }[]}
    />
  );
}
