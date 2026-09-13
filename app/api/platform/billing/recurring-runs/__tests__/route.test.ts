import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
  runRecurringBilling: vi.fn(),
  getRecurringBillingAutomationStatus: vi.fn(),
  listRecentBillingRecurringRuns: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/security/platform-superadmin", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
}));

vi.mock("@/lib/billing/recurring/recurring-billing-service", () => ({
  runRecurringBilling: mocks.runRecurringBilling,
  getRecurringBillingAutomationStatus: mocks.getRecurringBillingAutomationStatus,
}));

vi.mock("@/lib/billing/recurring/recurring-billing-repository", () => ({
  listRecentBillingRecurringRuns: mocks.listRecentBillingRecurringRuns,
}));

describe("platform recurring-runs routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: true,
      actorUserId: "admin-1",
    });
    mocks.isPlatformSuperAdmin.mockResolvedValue(true);
  });

  it("POST dry-run delegates to runRecurringBilling", async () => {
    mocks.runRecurringBilling.mockResolvedValue({
      runKey: "run-1",
      summary: { mode: "DRY_RUN", results: [] },
    });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/platform/billing/recurring-runs", {
        method: "POST",
        body: JSON.stringify({ mode: "DRY_RUN" }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mocks.runRecurringBilling).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "DRY_RUN", trigger: "MANUAL" }),
    );
  });

  it("GET rejects non-superadmin", async () => {
    mocks.isPlatformSuperAdmin.mockResolvedValue(false);
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});
