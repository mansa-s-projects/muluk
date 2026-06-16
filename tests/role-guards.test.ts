import { describe, expect, it } from "vitest";
import {
  getRoleFromUser,
  isBypassPath,
  isPublicRoute,
  shouldNoIndex,
} from "../src/lib/auth/role-guards";

describe("role guard route classification", () => {
  it("identifies public and protected routes", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/john")).toBe(true);
    expect(isPublicRoute("/john/vault")).toBe(true);
  });

  it("marks bypass paths correctly", () => {
    expect(isBypassPath("/api/health")).toBe(true);
    expect(isBypassPath("/favicon.ico")).toBe(true);
    expect(isBypassPath("/images/logo.png")).toBe(true);
    expect(isBypassPath("/dashboard")).toBe(false);
  });

  it("applies noindex policy to protected sections", () => {
    expect(shouldNoIndex("/dashboard")).toBe(true);
    expect(shouldNoIndex("/admin")).toBe(true);
    expect(shouldNoIndex("/john")).toBe(false);
  });
});

describe("role extraction", () => {
  it("falls back to supporter for missing or invalid roles", () => {
    expect(getRoleFromUser(null)).toBe("supporter");
    expect(getRoleFromUser({ app_metadata: { role: "invalid" } })).toBe("supporter");
  });

  it("accepts valid app metadata role", () => {
    expect(getRoleFromUser({ app_metadata: { role: "admin" } })).toBe("admin");
  });
});
