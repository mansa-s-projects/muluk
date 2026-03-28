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
