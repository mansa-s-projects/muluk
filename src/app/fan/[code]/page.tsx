import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import FanPortalClient from "./FanPortalClient";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `CIPHER — Fan Portal`,
    description: `Your anonymous CIPHER access portal. Code: ${code}`,
  };
}

const CODE_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;

export default async function FanPortalPage({ params }: Props) {
  const { code } = await params;

  // Validate format early to avoid unnecessary DB hit
  if (!code || !CODE_PATTERN.test(code)) {
    return <FanPortalClient code={code} error="invalid" data={null} />;
  }

  const supabase = createServiceClient();

  // Look up fan code
  const { data: fanCodeRow } = await supabase
    .from("fan_codes")
    .select("id, code, status, creator_id, tags, is_vip, created_at")
    .eq("code", code)
    .maybeSingle();

  if (!fanCodeRow || fanCodeRow.status !== "active") {
    return <FanPortalClient code={code} error="not_found" data={null} />;
  }

  const creatorId: string = fanCodeRow.creator_id;

  // Parallel fetch: creator profile + content + fan history + unlocks
  const [creatorRes, contentRes, txRes, unlockRes] = await Promise.all([
    supabase
      .from("creator_applications")
      .select("name, handle, bio, category, phantom_mode")
      .eq("user_id", creatorId)
      .maybeSingle(),
    supabase
      .from("content_items")
      .select("id, title, description, price, burn_mode, expires_at, status, created_at")
      .eq("creator_id", creatorId)
      .in("status", ["published", "active"])
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("transactions")
      .select("id, amount, type, status, created_at")
      .eq("fan_code", code)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("fan_unlocks")
      .select("content_id, amount_paid, unlocked_at")
      .eq("fan_code", code),
  ]);

  // Fire-and-forget view tracking
  void Promise.resolve(
    supabase.from("fan_portal_views").insert({ fan_code: code, creator_id: creatorId })
  ).then(undefined, () => {});

  const creator = creatorRes.data;
  const content = contentRes.data ?? [];
  const history = txRes.data ?? [];
  const unlocked = (unlockRes.data ?? []).map((u) => u.content_id as string);

  return (
    <FanPortalClient
      code={code}
      error={null}
      data={{
        fanCode: {
          code: fanCodeRow.code,
          status: fanCodeRow.status,
          isVip: fanCodeRow.is_vip ?? false,
          tags: fanCodeRow.tags ?? [],
          joinedAt: fanCodeRow.created_at,
        },
        creator: creator
          ? {
              name: (creator as { name?: string }).name ?? null,
              handle: creator.handle ?? null,
              bio: creator.bio ?? null,
              category: creator.category ?? null,
              phantomMode: creator.phantom_mode ?? false,
            }
          : null,
        content: content.map((c) => ({
          id: c.id as string,
          title: c.title as string,
          description: (c.description as string) ?? "",
          price: (c.price as number) ?? 0,
          burnMode: (c.burn_mode as boolean) ?? false,
          expiresAt: (c.expires_at as string) ?? null,
          createdAt: c.created_at as string,
        })),
        history: history.map((t) => ({
          id: t.id as string,
          amount: t.amount as number,
          type: (t.type as string) ?? "payment",
          status: t.status as string,
          createdAt: t.created_at as string,
        })),
        unlocked,
        creatorId,
      }}
    />
  );
}
