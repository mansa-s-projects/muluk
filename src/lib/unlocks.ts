/**
 * Unlock helpers — server-side only (uses service-role client for writes).
 *
 * checkUnlock  — returns true if user_id has an unlock record for offer_id.
 *                Uses the anon/cookie client (safe for server components).
 *
 * createUnlock — inserts an unlock row. Requires service_role because RLS
 *                blocks client-side inserts.  Call only from trusted API routes
 *                (webhooks, creator grant endpoints) — never from client code.
 */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUUID(value: string, label: string) {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}`);
}

// ─── Read: check if authenticated user has access ────────────────────────────

export async function checkUnlock(
  offerId: string,
  userId: string
): Promise<boolean> {
  assertUUID(offerId, "offer_id");
  assertUUID(userId, "user_id");

  const supabase = await createClient(); // cookie-based, respects RLS

  const { data, error } = await supabase
    .from("unlocks")
    .select("id")
    .eq("offer_id", offerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

// ─── Write: grant access (service_role bypasses RLS) ─────────────────────────

export async function createUnlock(params: {
  offerId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  assertUUID(params.offerId, "offer_id");
  assertUUID(params.userId, "user_id");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return { ok: false, error: "Service role not configured" };
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("unlocks")
    .insert({
      offer_id: params.offerId,
      user_id:  params.userId,
    })
    .select("id")
    .single();

  // Swallow unique-violation — already unlocked is fine
  if (error && !error.message.includes("unique")) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
