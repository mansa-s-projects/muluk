import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import CommissionsClient from "./CommissionsClient";
import type { Commission } from "@/lib/commissions";


export const dynamic = "force-dynamic";

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function CommissionsDashboardPage() {
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

  // Fetch creator handle for the "commission link" card
  const { data: profile } = await db
    .from("creator_applications")
    .select("handle")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  // Fetch all commissions (initial load — newest first)
  const { data: commissions } = await db
    .from("commissions")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <CommissionsClient
      initialCommissions={(commissions ?? []) as Commission[]}
      handle={profile?.handle ?? ""}
    />
  );
}
