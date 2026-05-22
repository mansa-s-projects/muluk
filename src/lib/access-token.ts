import crypto from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hashAccessToken } from "@/lib/token-hash";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Generate a cryptographically secure 64-char hex token for a purchase
 * and store it in the access_tokens table.
 * Returns the raw hex token string.
 */
export async function generateAccessToken(
  purchaseId: string,
  expiresInDays = 365
): Promise<string> {
  if (!Number.isInteger(expiresInDays) || expiresInDays <= 0) {
    throw new Error("expiresInDays must be a positive integer");
  }

  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashAccessToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { error } = await db
    .from("access_tokens")
    .insert({
      purchase_id: purchaseId,
      token_hash: tokenHash,
      expires_at:  expiresAt.toISOString(),
    });

  if (error) {
    throw new Error(`generateAccessToken failed: ${error.message}`);
  }

  return token;
}
