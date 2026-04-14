export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Try NEXT_PUBLIC_BASE_URL first, fall back to NEXT_PUBLIC_SITE_URL
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!envUrl) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000";
    }
    throw new Error("NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL must be set in non-development environments");
  }

  try {
    return new URL(envUrl).origin;
  } catch {
    throw new Error(`Invalid base URL: ${envUrl}`);
  }
}
