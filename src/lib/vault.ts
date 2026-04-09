/**
 * Vault lib — Watermark Preview Vault
 *
 * Handles: types, image blurring/watermarking, Whop checkout provisioning,
 * Supabase Storage signed-URL helpers.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VaultContentType = "image" | "video";
export type VaultItemStatus  = "active" | "draft" | "deleted";
export type VaultPurchaseStatus = "pending" | "paid" | "refunded";

export interface VaultItem {
  id:             string;
  creator_id:     string;
  title:          string;
  description:    string | null;
  price_cents:    number;
  content_type:   VaultContentType;
  file_path:      string;
  preview_path:   string;
  file_size_bytes: number | null;
  mime_type:      string | null;
  whop_product_id: string | null;
  status:         VaultItemStatus;
  purchase_count: number;
  sort_order:     number;
  created_at:     string;
}

export interface VaultPurchase {
  id:              string;
  vault_item_id:   string;
  creator_id:      string;
  access_token:    string;
  buyer_email:     string | null;
  whop_payment_id: string | null;
  whop_checkout_id: string | null;
  status:          VaultPurchaseStatus;
  amount_cents:    number;
  created_at:      string;
  paid_at:         string | null;
}

// ─── Storage bucket names ─────────────────────────────────────────────────────

export const VAULT_ORIGINALS_BUCKET = "vault-originals";
export const VAULT_PREVIEWS_BUCKET  = "vault-previews";

// ─── Image processing ─────────────────────────────────────────────────────────

/**
 * Generate a blurred, watermarked preview image from the given buffer.
 * Works only in server-side Node.js context (uses sharp).
 * Returns a JPEG buffer suitable for the public preview bucket.
 */
export async function generateBlurredPreview(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  // Dynamic import keeps sharp server-only
  const sharp = (await import("sharp")).default;

  const image = sharp(buffer);
  const meta  = await image.metadata();
  const w = meta.width  ?? 800;
  const h = meta.height ?? 600;

  // Build SVG watermark overlay
  const svgOverlay = buildWatermarkSvg(w, h);

  return sharp(buffer)
    .blur(22)
    .modulate({ saturation: 0.15, brightness: 0.6 })
    .composite([
      {
        input: Buffer.from(svgOverlay),
        gravity: "center",
      },
    ])
    .jpeg({ quality: 72, progressive: true })
    .toBuffer();
}

function buildWatermarkSvg(width: number, height: number): string {
  const fontSize = Math.max(28, Math.min(64, Math.round(width * 0.07)));
  const subSize  = Math.round(fontSize * 0.45);

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgba(2,2,3,0.38)"/>
  <rect x="${Math.round(width * 0.5) - 80}" y="${Math.round(height * 0.5) - 52}"
        width="160" height="104" rx="8" fill="rgba(9,9,15,0.72)" stroke="rgba(200,169,110,0.35)" stroke-width="1"/>
  <text x="50%" y="${Math.round(height * 0.5) - 10}"
        font-family="Georgia,serif" font-size="${fontSize}" font-weight="bold"
        fill="rgba(200,169,110,0.92)" text-anchor="middle" dominant-baseline="middle">⊗</text>
  <text x="50%" y="${Math.round(height * 0.5) + 28}"
        font-family="Arial,sans-serif" font-size="${subSize}" font-weight="600" letter-spacing="4"
        fill="rgba(255,255,255,0.75)" text-anchor="middle" dominant-baseline="middle">LOCKED</text>
  <text x="50%" y="${Math.round(height * 0.5) + 48}"
        font-family="Arial,sans-serif" font-size="${Math.round(subSize * 0.75)}" letter-spacing="2"
        fill="rgba(200,169,110,0.6)" text-anchor="middle" dominant-baseline="middle">CIPHER VAULT</text>
</svg>`;
}

// ─── Whop checkout for vault ──────────────────────────────────────────────────

const WHOP_API_BASE = "https://api.whop.com/api/v2";

/**
 * Create a Whop one-time checkout for a vault item.
 * Passes vault_purchase_id in metadata so the webhook can identify the purchase.
 */
export async function provisionVaultCheckout(params: {
  vaultPurchaseId: string;
  itemTitle:       string;
  priceCents:      number;
  redirectUrl:     string;
}): Promise<{ whop_product_id: string; whop_checkout_id: string; whop_checkout_url: string } | null> {
  const apiKey    = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_API_KEY;

  if (!apiKey || !companyId) {
    console.warn("[vault] WHOP_API_KEY not set");
    return null;
  }

  const headers = {
    Authorization:  `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  async function whopPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${WHOP_API_BASE}${path}`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Whop ${path} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  try {
    const product = await whopPost<{ id: string; slug: string }>("/products", {
      name:        params.itemTitle,
      description: `Unlock this exclusive content on CIPHER`,
      company_id:  companyId,
      visibility:  "visible",
    });

    const plan = await whopPost<{
      id: string;
      access_pass: { id: string; slug: string };
    }>("/plans", {
      product_id:     product.id,
      plan_type:      "one_time",
      initial_price:  (params.priceCents / 100).toFixed(2),
      currency:       "usd",
      billing_period: 0,
      redirect_url:   params.redirectUrl,
      metadata: {
        vault_purchase_id: params.vaultPurchaseId,
      },
    });

    const slug        = plan.access_pass?.slug?.trim() ?? product.slug?.trim() ?? "";
    if (!slug) return null;

    const checkoutUrl = `https://whop.com/checkout/${slug}/?redirect_url=${encodeURIComponent(params.redirectUrl)}`;

    return {
      whop_product_id:  product.id,
      whop_checkout_id: plan.id,
      whop_checkout_url: checkoutUrl,
    };
  } catch (err) {
    console.warn("[vault] provisionVaultCheckout failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Supabase Storage helpers ────────────────────────────────────────────────

export function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(`[vault] Missing required environment variables: ${missing.join(", ")}`);
  }

  const safeSupabaseUrl = supabaseUrl as string;
  const safeServiceRoleKey = serviceRoleKey as string;

  return createServiceClient(
    safeSupabaseUrl,
    safeServiceRoleKey
  );
}

/**
 * Generate a short-lived signed URL for a vault original (private bucket).
 * Expires after 1 hour (3600s).
 */
export async function getOriginalSignedUrl(filePath: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(VAULT_ORIGINALS_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error || !data) {
    console.error("[vault] Failed to create signed URL:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Return the public URL for a vault preview (public bucket).
 */
export function getPreviewPublicUrl(previewPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("[vault] Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return `${supabaseUrl}/storage/v1/object/public/${VAULT_PREVIEWS_BUCKET}/${previewPath}`;
}

// ─── Price formatting ─────────────────────────────────────────────────────────

export function formatVaultPrice(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}
