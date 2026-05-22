import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VaultClient from "./VaultClient";


export const metadata = { title: "Vault — MULUK" };

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase
      .from("vault_items")
      .select(
        "id, title, description, price_cents, content_type, preview_path, status, purchase_count, created_at"
      )
      .eq("creator_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("creator_profiles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <VaultClient
      creatorId={user.id}
      handle={profile?.handle ?? ""}
      initialItems={items ?? []}
    />
  );
}
