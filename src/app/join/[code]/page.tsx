import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import JoinClient from "./JoinClient";

type Params = { params: Promise<{ code: string }> };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function fetchInviter(code: string) {
  const db = getDb();
  const { data: codeRow } = await db
    .from("creator_referral_codes")
    .select("creator_id")
    .eq("referral_code", code.toLowerCase())
    .maybeSingle();

  if (!codeRow?.creator_id) return null;

  const { data: profile } = await db
    .from("creator_applications")
    .select("name, handle")
    .eq("user_id", codeRow.creator_id)
    .maybeSingle();

  return { name: profile?.name ?? null, handle: profile?.handle ?? null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const inviter = await fetchInviter(code);
  const byLine = inviter?.handle
    ? `@${inviter.handle} invited you`
    : "You've been invited";
  return {
    title: `${byLine} — MULUK`,
    description: "Join the exclusive creator platform with 88% payouts.",
    robots: { index: false, follow: false },
  };
}

export default async function JoinPage({ params }: Params) {
  const { code } = await params;
  const inviter = await fetchInviter(code);
  const applyCode = process.env.APPLY_INVITE_CODE ?? "";

  return (
    <JoinClient
      code={code}
      inviterName={inviter?.name ?? null}
      inviterHandle={inviter?.handle ?? null}
      applyCode={applyCode}
    />
  );
}
