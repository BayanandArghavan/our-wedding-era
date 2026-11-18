import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { safeNextPath } = await import("@/lib/site");

describe("safeNextPath (open-redirect protection)", () => {
  it("keeps local paths", () => {
    expect(safeNextPath("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });
  it("drops other hosts", () => {
    expect(safeNextPath("//evil.example/steal")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });
  it("reduces absolute URLs to their path", () => {
    expect(safeNextPath("https://evil.example/setup")).toBe("/setup");
  });
});
