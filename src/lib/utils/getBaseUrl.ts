export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const envUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!envUrl) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000";
    }
    throw new Error("NEXT_PUBLIC_BASE_URL must be set in non-development environments");
  }

  try {
    return new URL(envUrl).origin;
  } catch {
    throw new Error("NEXT_PUBLIC_BASE_URL is invalid");
  }
}
