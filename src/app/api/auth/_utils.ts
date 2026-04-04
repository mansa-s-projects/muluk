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

  if (typeof hex !== "string" || !hex) {
    throw new Error("Encrypted token payload must be a non-empty hex string");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Encrypted token payload contains non-hex characters");
  }
  if (hex.length % 2 !== 0) {
    throw new Error("Encrypted token payload must have an even hex length");
  }
  // 12-byte IV + 16-byte auth tag + minimum 1-byte ciphertext = 29 bytes = 58 hex chars.
  if (hex.length < 58) {
    throw new Error("Encrypted token payload is too short");
  }

  const keyBuf = Buffer.from(hexKey, "hex");
  const buf = Buffer.from(hex, "hex");
  if (buf.length < 29) {
    throw new Error("Encrypted token payload is too short after decode");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

/**
 * Returns an HTML response that displays a success/error message and auto-closes the popup window.
 * Used for OAuth callbacks when the flow was initiated from a popup (e.g., onboarding).
 */
export function popupCloseResponse(success: boolean, platform: string, error?: string): Response {
  const html = `<!DOCTYPE html>
<html><head><title>${success ? "Connected" : "Error"}</title></head>
<body style="background:#0a0a0b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center">
<div style="font-size:48px;margin-bottom:16px">${success ? "✓" : "✕"}</div>
<div style="font-size:18px;margin-bottom:8px">${success ? `${platform} connected` : "Connection failed"}</div>
${error ? `<div style="font-size:13px;color:#888">${error}</div>` : ""}
<div style="font-size:12px;color:#666;margin-top:16px">This window will close automatically...</div>
</div>
<script>setTimeout(()=>window.close(),1500)</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
