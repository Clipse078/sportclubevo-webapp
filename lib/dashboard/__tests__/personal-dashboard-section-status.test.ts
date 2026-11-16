import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const loadProgramme = vi.fn();
const loadWork = vi.fn();
const loadSecondary = vi.fn();
const readModelEnabled = vi.fn(() => false);

vi.mock("@/lib/dashboard/personal-dashboard-section-loaders", () => ({
  personalDashboardUsesSharedReadModelCore: () => readModelEnabled(),
  loadPersonalDashboardProgrammeSection: (...args: unknown[]) => loadProgramme(...args),
  loadPersonalDashboardWorkSection: (...args: unknown[]) => loadWork(...args),
  loadPersonalDashboardSecondarySection: (...args: unknown[]) => loadSecondary(...args),
}));

import {
  loadPersonalDashboardAttentionSectionOutcome,
  loadPersonalDashboardProgrammeSectionOutcome,
  loadPersonalDashboardSecondarySectionOutcome,
  loadPersonalDashboardTasksSectionOutcome,
  personalDashboardSectionLoadingSemantics,
} from "@/lib/dashboard/personal-dashboard-section-status";

const ctx = {
  tenantId: "tenant-1",
  userId: "user-1",
  actor: { tenantId: "tenant-1", userId: "user-1", permissionKeys: [PERMISSIONS.TASKS_VIEW] },
  fmtCfg: { locale: "de-CH", timezone: "Europe/Zurich" },
  permissionKeys: [PERMISSIONS.TASKS_VIEW] as const,
};

describe("personal-dashboard section outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readModelEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    readModelEnabled.mockReturnValue(false);
  });

  it("maps programme unsupported to unavailable (not empty success)", async () => {
    loadProgramme.mockResolvedValue({
      groups: [],
      programmeSupported: false,
      programmeItems: [],
      monthParam: "2026-11",
      navigation: { previousMonthHref: "/", nextMonthHref: "/", todayHref: "/" },
    });

    const outcome = await loadPersonalDashboardProgrammeSectionOutcome(ctx);
    expect(outcome).toEqual({
      kind: "unavailable",
      section: "programme",
      reason: "not_supported",
    });
  });

  it("maps programme success with no rows to empty success", async () => {
    loadProgramme.mockResolvedValue({
      groups: [],
      programmeSupported: true,
      programmeItems: [],
      monthParam: "2026-11",
      navigation: { previousMonthHref: "/", nextMonthHref: "/", todayHref: "/" },
    });

    const outcome = await loadPersonalDashboardProgrammeSectionOutcome(ctx);
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.isEmpty).toBe(true);
    }
  });

  it("maps loader throws to retryable failure", async () => {
    loadProgramme.mockRejectedValue(new Error("timeout"));

    const outcome = await loadPersonalDashboardProgrammeSectionOutcome(ctx);
    expect(outcome.kind).toBe("failed");
    if (outcome.kind === "failed") {
      expect(outcome.retryable).toBe(true);
      expect(outcome.section).toBe("programme");
    }
  });

  it("recovery: failure then success on retry", async () => {
    loadProgramme
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({
        groups: [{ dayKey: "d", labelKind: "today", items: [{ id: "1" }] }],
        programmeSupported: true,
        programmeItems: [],
        monthParam: "2026-11",
        navigation: { previousMonthHref: "/", nextMonthHref: "/", todayHref: "/" },
      });

    const failed = await loadPersonalDashboardProgrammeSectionOutcome(ctx);
    expect(failed.kind).toBe("failed");

    const recovered = await loadPersonalDashboardProgrammeSectionOutcome(ctx);
    expect(recovered.kind).toBe("success");
  });

  it("distinguishes attention unauthorized from failed load", async () => {
    loadWork.mockResolvedValue({
      attention: { authorized: false, items: [], totalCount: 0, viewAllHref: null },
      tasks: { authorized: false, preview: [] },
    });

    const outcome = await loadPersonalDashboardAttentionSectionOutcome(ctx);
    expect(outcome).toEqual({
      kind: "unavailable",
      section: "attention",
      reason: "not_authorized",
    });
  });

  it("marks attention operational degradation without treating it as empty failure", async () => {
    loadWork.mockResolvedValue({
      attention: {
        authorized: true,
        items: [{ id: "a", title: "t", sourceType: "TASK" }],
        totalCount: 1,
        viewAllHref: "/inbox",
        operationalSourcesDegraded: true,
      },
      tasks: { authorized: true, preview: [] },
    });

    const attention = await loadPersonalDashboardAttentionSectionOutcome(ctx);
    expect(attention.kind).toBe("success");
    if (attention.kind === "success") {
      expect(attention.degraded).toBe(true);
      expect(attention.isEmpty).toBe(false);
    }
  });

  it("maps tasks unauthorized to unavailable", async () => {
    loadWork.mockResolvedValue({
      attention: { authorized: false, items: [], totalCount: 0, viewAllHref: null },
      tasks: { authorized: false, preview: [] },
    });

    const outcome = await loadPersonalDashboardTasksSectionOutcome(ctx);
    expect(outcome).toEqual({
      kind: "unavailable",
      section: "tasks",
      reason: "not_authorized",
    });
  });

  it("secondary failure is isolated from quick-access composition", async () => {
    loadSecondary.mockRejectedValue(new Error("db down"));
    const outcome = await loadPersonalDashboardSecondarySectionOutcome(ctx);
    expect(outcome.kind).toBe("failed");
  });

  it("documents shared read-model core (not independent fetches)", () => {
    readModelEnabled.mockReturnValue(true);
    expect(personalDashboardSectionLoadingSemantics().sharedReadModelCore).toBe(true);
  });
});