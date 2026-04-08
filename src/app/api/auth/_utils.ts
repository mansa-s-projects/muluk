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

type RedirectSanitizeOptions = {
  fallback?: string;
  allowOnboardingToken?: boolean;
  allowedOrigins?: string[];
};

/**
 * Restricts user-supplied redirect targets to safe values:
 * - relative app paths starting with a single '/'
 * - same-origin or allowlisted absolute URLs (normalized to path+query+hash)
 * - optional internal onboarding sentinel token
 */
export function sanitizeOAuthRedirect(
  req: NextRequest,
  redirect: string | null | undefined,
  options: RedirectSanitizeOptions = {}
): string {
  const fallback = options.fallback ?? "/";
  const raw = String(redirect ?? "").trim();

  if (!raw) return fallback;
  if (/[\r\n]/.test(raw)) return fallback;

  if (options.allowOnboardingToken && raw === "onboarding") {
    return "onboarding";
  }

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return fallback;

    const requestOrigin = req.nextUrl.origin;
    const allowlist = new Set([requestOrigin, ...(options.allowedOrigins ?? [])]);
    if (!allowlist.has(parsed.origin)) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
export function popupCloseResponse(
  success: boolean,
  platform: string,
  error?: string,
  cookiesToClear: string[] = []
): Response {
  const safePlatform = escapeHtml(platform);
  const safeError = error ? escapeHtml(error) : "";
  const html = `<!DOCTYPE html>
<html><head><title>${success ? "Connected" : "Error"}</title></head>
<body style="background:#0a0a0b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div id="wrap" style="text-align:center">
<div style="font-size:48px;margin-bottom:16px">${success ? "✓" : "✕"}</div>
<div style="font-size:18px;margin-bottom:8px">${success ? `${safePlatform} connected` : "Connection failed"}</div>
${safeError ? `<div style="font-size:13px;color:#888">${safeError}</div>` : ""}
<div id="msg" style="font-size:12px;color:#666;margin-top:16px">This window will close automatically...</div>
<div id="fallback" style="display:none;margin-top:20px">
  <button onclick="window.close()" style="padding:10px 24px;background:#c8a96e;color:#120c00;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-right:10px">Close Tab</button>
  <button onclick="window.location.href='/dashboard'" style="padding:10px 24px;background:transparent;color:#c8a96e;border:1px solid #c8a96e;border-radius:8px;font-size:13px;cursor:pointer">Go to Dashboard</button>
</div>
</div>
<script>
(function(){
  function showFallback(){
    document.getElementById('msg').style.display='none';
    document.getElementById('fallback').style.display='block';
  }
  // Only attempt auto-close if the window was script-opened (has an opener)
  if(window.opener && !window.opener.closed){
    setTimeout(function(){
      try{ window.close(); }catch(e){}
      // If we're still here after a short delay, close silently failed — show fallback
      setTimeout(showFallback, 300);
    }, 1500);
  } else {
    // Not a popup — show fallback immediately
    showFallback();
  }
})();
</script>
</body></html>`;

  const response = new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });

  for (const cookieName of cookiesToClear) {
    response.headers.append(
      "Set-Cookie",
      `${cookieName}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    );
  }

  return response;
}
