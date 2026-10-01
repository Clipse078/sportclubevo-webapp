import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  loadPersonalActionsModuleCapabilities: vi.fn(),
  countPersonalActions: vi.fn(),
  loadPersonalActions: vi.fn(),
  loadDomainOperationalAttention: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/personal-actions/access", () => ({
  loadPersonalActionsModuleCapabilities: mocks.loadPersonalActionsModuleCapabilities,
}));

vi.mock("@/lib/personal-actions", () => ({
  countPersonalActions: mocks.countPersonalActions,
  loadPersonalActions: mocks.loadPersonalActions,
}));

vi.mock("@/lib/domain-attention/load-domain-operational-attention", () => ({
  loadDomainOperationalAttention: mocks.loadDomainOperationalAttention,
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

import { loadDashboardPersonalWork } from "../load-dashboard-personal-work";

describe("DASHBOARD-05 — loadDashboardPersonalWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.loadDomainOperationalAttention.mockResolvedValue({ items: [], failedSourceKeys: [] });
  });

  it("C — without personal inbox but operational items yields authorized attention", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: false,
      permissionKeys: [PERMISSIONS.REGISTRATIONS_MANAGE],
    });
    mocks.loadDomainOperationalAttention.mockResolvedValue({
      items: [
        {
          id: "domain-attn:training:participation-outstanding:training-session:ts-1",
          tenantId: "tenant-a",
          domainKey: "training",
          attentionKind: "participation-outstanding",
          contextEntityType: "training-session",
          contextEntityId: "ts-1",
          title: "F2 · Training Mittwoch",
          summary: "4 Rückmeldungen ausstehend",
          severity: "info",
          count: 4,
          dueAt: null,
          deepLink: "/dashboard/training",
          actions: [
            {
              actionKey: "training.participation.remind-not-responded",
              label: "Erinnerung senden",
              executionKind: "COMMUNICATION_SEND",
              requiredPermissions: [],
            },
          ],
        },
      ],
      failedSourceKeys: [],
    });

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "admin-user",
    });

    expect(work.attention.authorized).toBe(true);
    expect(work.attention.totalCount).toBe(1);
    expect(work.attention.items[0]?.sourceType).toBe("DOMAIN_OPERATIONAL");
    expect(work.tasks.authorized).toBe(false);
    expect(mocks.loadPersonalActions).not.toHaveBeenCalled();
  });

  it("A — surfaces urgent tasks and obligations; preview excludes attention tasks", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 3,
      taskActionable: 2,
      attendanceActionable: 1,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([
      {
        id: "task:overdue",
        sourceType: "TASK",
        sourceId: "overdue",
        title: "Overdue task",
        subtitle: null,
        dueAt: "2026-09-20T08:00:00.000Z",
        status: "ACTIONABLE",
        href: "/dashboard/aufgaben/overdue",
        actionKind: "TASK",
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
      {
        id: "task:later",
        sourceType: "TASK",
        sourceId: "later",
        title: "Later task",
        subtitle: null,
        dueAt: "2026-10-01T08:00:00.000Z",
        status: "ACTIONABLE",
        href: "/dashboard/aufgaben/later",
        actionKind: "TASK",
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
      {
        id: "participation:p1",
        sourceType: "ATTENDANCE_RESPONSE",
        sourceId: null,
        title: "Training",
        subtitle: null,
        dueAt: null,
        status: "ACTIONABLE",
        href: "/dashboard/participation/x",
        actionKind: "PARTICIPATION_RESPONSE",
        context: { teamDisplayName: "F2" },
      },
    ]);

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "user-a",
      now: new Date("2026-09-24T12:00:00.000Z"),
      locale: "de-CH",
      timeZone: "Europe/Zurich",
    });

    expect(work.attention.authorized).toBe(true);
    expect(work.attention.totalCount).toBe(2);
    expect(work.attention.items.map((i) => i.id)).toEqual(
      expect.arrayContaining(["task:overdue", "participation:p1"]),
    );
    expect(work.tasks.preview.map((p) => p.id)).toEqual(["task:later"]);
    expect(work.tasks.count).toBe(2);
  });

  it("E — tenant isolation passes tenantId to personal-actions", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 0,
      taskActionable: 0,
      attendanceActionable: 0,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([]);

    await loadDashboardPersonalWork({
      tenantId: "tenant-b",
      userId: "user-a",
    });

    expect(mocks.loadPersonalActions).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-b", userId: "user-a" }),
    );
  });

  it("merges personal and operational attention without id collision", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 1,
      taskActionable: 1,
      attendanceActionable: 0,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([
      {
        id: "task:one",
        sourceType: "TASK",
        sourceId: "one",
        title: "My task",
        subtitle: null,
        dueAt: "2026-09-20T08:00:00.000Z",
        status: "ACTIONABLE",
        href: "/dashboard/aufgaben/one",
        actionKind: "TASK",
        createdAt: "2026-09-01T00:00:00.000Z",
        priority: "NORMAL",
      },
    ]);
    mocks.loadDomainOperationalAttention.mockResolvedValue({
      items: [
        {
          id: "domain-attn:spielbetrieb:participation-outstanding:event:e1",
          tenantId: "tenant-a",
          domainKey: "spielbetrieb",
          attentionKind: "participation-outstanding",
          contextEntityType: "event",
          contextEntityId: "e1",
          title: "F2 · Spiel Sonntag",
          summary: "2 Rückmeldungen ausstehend",
          severity: "info",
          count: 2,
          dueAt: null,
          deepLink: "/teams",
          actions: [],
        },
      ],
      failedSourceKeys: [],
    });

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "user-a",
      now: new Date("2026-09-24T12:00:00.000Z"),
    });

    expect(work.attention.totalCount).toBe(2);
    expect(work.attention.items.map((i) => i.sourceType).sort()).toEqual([
      "DOMAIN_OPERATIONAL",
      "TASK",
    ]);
  });

  it("D — surfaces operational source degradation without implying all clear", async () => {
    mocks.loadPersonalActionsModuleCapabilities.mockResolvedValue({
      personalInbox: true,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
    });
    mocks.countPersonalActions.mockResolvedValue({
      totalActionable: 0,
      taskActionable: 0,
      attendanceActionable: 0,
      requirementActionable: 0,
    });
    mocks.loadPersonalActions.mockResolvedValue([]);
    mocks.loadDomainOperationalAttention.mockResolvedValue({
      items: [],
      failedSourceKeys: ["training"],
    });

    const work = await loadDashboardPersonalWork({
      tenantId: "tenant-a",
      userId: "user-a",
    });

    expect(work.attention.authorized).toBe(true);
    expect(work.attention.items).toHaveLength(0);
    expect(work.attention.operationalSourcesDegraded).toBe(true);
  });
});
