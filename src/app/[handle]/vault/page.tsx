import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VaultPageClient from "@/app/vault/[handle]/VaultPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `${handle}'s Vault — MULUK` };
}

export default async function HandleVaultPage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("creator_profiles")
    .select("user_id, display_name, handle, avatar_url")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (profileError) throw new Error("Failed to load creator profile");
  if (!profile) notFound();

  const { data: items, error: itemsError } = await supabase
    .from("vault_items")
    .select("id, title, description, price_cents, content_type, preview_path, purchase_count")
    .eq("creator_id", profile.user_id)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (itemsError) throw new Error("Failed to load vault items");

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
