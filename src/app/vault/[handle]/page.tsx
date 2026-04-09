import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VaultPageClient from "./VaultPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  return { title: `${handle}'s Vault — CIPHER` };
}

export default async function VaultHandlePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();

  // Resolve creator by handle
  const { data: profile, error: profileError } = await supabase
    .from("creator_profiles")
    .select("user_id, display_name, handle, avatar_url")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (profileError) {
    console.error("[vault/page] failed to load creator profile", profileError);
    throw new Error("Failed to load creator profile");
  }

  if (!profile) notFound();

  // Fetch active vault items
  const { data: items, error: itemsError } = await supabase
    .from("vault_items")
    .select("id, title, description, price_cents, content_type, preview_path, purchase_count")
    .eq("creator_id", profile.user_id)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (itemsError) {
    console.error("[vault/page] failed to load vault items", itemsError);
    throw new Error("Failed to load vault items");
  }

  return (
    <VaultPageClient
      creator={{
        handle: profile.handle,
        displayName: profile.display_name ?? handle,
        avatarUrl: profile.avatar_url ?? null,
      }}
      items={items ?? []}
    />
  );
}
