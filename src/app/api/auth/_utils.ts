import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export function randomToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

export function sha256Base64Url(input: string) {
  const digest = crypto.createHash("sha256").update(input).digest("base64");
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function appBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
}

export function dashboardUrl(req: NextRequest, params?: Record<string, string>) {
  const url = new URL("/dashboard", appBaseUrl(req));
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url.searchParams.set(k, v);
    });
  }
  return url;
}

export function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, init).then(async res => {
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      throw new Error(typeof parsed === "string" ? parsed : JSON.stringify(parsed));
    }
    return parsed as T;
  });
}

/**
 * AES-256-GCM encryption for OAuth tokens stored in the database.
 * TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).
 */
export function encryptToken(value: string): string {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hexKey || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("TOKEN_ENCRYPTION_KEY missing or invalid - expected a 64-char hex string");
  }

  const keyBuf = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("hex");
}

export function decryptToken(hex: string): string {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hexKey || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("TOKEN_ENCRYPTION_KEY missing or invalid - expected a 64-char hex string");
  }

  const keyBuf = Buffer.from(hexKey, "hex");
  const buf = Buffer.from(hex, "hex");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}
