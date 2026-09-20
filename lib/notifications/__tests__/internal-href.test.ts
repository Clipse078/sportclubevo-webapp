import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/security-link-url", () => ({
  resolveSecurityLinkBaseUrl: () => new URL("https://app.example.com"),
}));

describe("notification internal href", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects protocol-relative and external href values", async () => {
    const { assertSafeInternalNotificationHref } = await import("../internal-href");
    expect(() => assertSafeInternalNotificationHref("//evil.example/phish")).toThrow();
    expect(() => assertSafeInternalNotificationHref("javascript:alert(1)")).toThrow();
    expect(() => assertSafeInternalNotificationHref("https://evil.example/x")).toThrow();
  });

  it("builds absolute URLs from trusted base and canonical paths", async () => {
    const { buildNotificationAbsoluteHref } = await import("../internal-href");
    expect(buildNotificationAbsoluteHref("/dashboard/aufgaben/task-1")).toBe(
      "https://app.example.com/dashboard/aufgaben/task-1",
    );
  });
});
