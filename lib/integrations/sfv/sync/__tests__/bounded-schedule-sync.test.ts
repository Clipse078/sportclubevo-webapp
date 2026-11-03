/**
 * Unit tests for bounded STAGE schedule refresh orchestration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListEnabled = vi.fn();
const mockSyncForWindow = vi.fn();

vi.mock("../../tenant-config-repository", () => ({
  listEnabledSfvConfigTenantIds: mockListEnabled,
}));

vi.mock("../schedule", () => ({
  syncSfvScheduleForWindow: mockSyncForWindow,
}));

const { runBoundedSfvScheduleSync } = await import("../bounded-schedule-sync");

beforeEach(() => {
  vi.clearAllMocks();
  mockListEnabled.mockResolvedValue(["fc-allschwil"]);
});

describe("runBoundedSfvScheduleSync", () => {
  it("rejects unknown tenant", async () => {
    mockListEnabled.mockResolvedValue(["other-tenant"]);

    const outcome = await runBoundedSfvScheduleSync({
      tenantId: "fc-allschwil",
      seasonId: 2027,
      dateFrom: "2026-08-01",
      dateTo: "2026-11-03",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe("TENANT_NOT_ENABLED");
    }
    expect(mockSyncForWindow).not.toHaveBeenCalled();
  });

  it("rejects windows exceeding maximum span", async () => {
    const outcome = await runBoundedSfvScheduleSync({
      tenantId: "fc-allschwil",
      seasonId: 2027,
      dateFrom: "2024-01-01",
      dateTo: "2027-01-01",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe("INVALID_DATE_WINDOW");
    }
  });

  it("delegates valid window to syncSfvScheduleForWindow with inclusive end", async () => {
    mockSyncForWindow.mockResolvedValue({
      fetched: 10,
      updated: 3,
      created: 0,
    });

    const outcome = await runBoundedSfvScheduleSync({
      tenantId: "fc-allschwil",
      seasonId: 2027,
      dateFrom: "2026-08-01",
      dateTo: "2026-11-03",
    });

    expect(outcome.ok).toBe(true);
    expect(mockSyncForWindow).toHaveBeenCalledWith(
      "fc-allschwil",
      expect.objectContaining({
        seasonId: 2027,
        inclusiveDateUntil: true,
      }),
    );
  });
});
