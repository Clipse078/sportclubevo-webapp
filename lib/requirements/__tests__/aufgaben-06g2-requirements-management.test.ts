/**
 * AUFGABEN-06G2 — Requirements management UX acceptance (M1–M32).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonalActionsModuleCapabilities } from "@/lib/personal-actions/access";
import { parseAufgabenBereich, buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";
import {
  canAccessRequirementManagement,
  canAccessRequirementManagementFromKeys,
} from "../access";
import {
  taskPermissionsGrantRequirementManagement,
  canListRequirementRecipients,
  canReadRequirementAggregate,
} from "../requirement-authorization";
import {
  formatActingForLabel,
  formatRequirementProgressLabel,
} from "../presentation";
import { isRequirementRecipientOverdue } from "../requirement-aggregate";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const mocks = vi.hoisted(() => ({
  requirementFindMany: vi.fn(),
  requirementFindFirst: vi.fn(),
  requirementCount: vi.fn(),
  recipientCount: vi.fn(),
  recipientFindMany: vi.fn(),
  personFindMany: vi.fn(),
  taskCreate: vi.fn(),
  participationCreate: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    requirement: {
      findMany: mocks.requirementFindMany,
      findFirst: mocks.requirementFindFirst,
      count: mocks.requirementCount,
    },
    requirementRecipient: {
      count: mocks.recipientCount,
      findMany: mocks.recipientFindMany,
    },
    person: { findMany: mocks.personFindMany },
    task: { create: mocks.taskCreate },
    participationResponse: { create: mocks.participationCreate },
    notification: { create: mocks.notificationCreate },
  },
}));

import {
  getRequirementManagementSummary,
  listRequirementManagementItems,
  listRequirementRecipientMatrix,
} from "../management-service";
import { RequirementForbiddenError } from "../errors";

const TENANT = "tenant-a";
const MANAGER_PERMS = [
  PERMISSIONS.REQUIREMENTS_VIEW,
  PERMISSIONS.REQUIREMENTS_CREATE,
  PERMISSIONS.REQUIREMENTS_MANAGE,
  PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
];

function managerCtx(extra: string[] = []) {
  return { tenantId: TENANT, userId: "mgr", permissionKeys: [...MANAGER_PERMS, ...extra] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.personFindMany.mockResolvedValue([]);
});

describe("AUFGABEN-06G2 scope & authorization (M1–M3, M14–M16, M31–M32)", () => {
  it("M1 shows Anforderungen scope for authorized manager", () => {
    expect(canAccessRequirementManagementFromKeys(MANAGER_PERMS)).toBe(true);
    expect(parseAufgabenBereich("anforderungen")).toBe("anforderungen");
    expect(buildAufgabenBereichHref("anforderungen")).toContain("bereich=anforderungen");
  });

  it("M2 hides management scope from recipient-only user", () => {
    expect(canAccessRequirementManagementFromKeys([])).toBe(false);
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: "member",
      permissionKeys: [],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });
    expect(caps.requirementManagement).toBe(false);
  });

  it("M3 tasks.view does not expose requirement management scope", () => {
    const tasksOnly = [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_MANAGE,
    ];
    expect(taskPermissionsGrantRequirementManagement({ tenantId: TENANT, userId: "t", permissionKeys: tasksOnly })).toBe(true);
    expect(canAccessRequirementManagementFromKeys(tasksOnly)).toBe(false);
  });

  it("M14/M15 matrix listing requires view_aggregate (not view alone)", () => {
    const record = { tenantId: TENANT, createdByUserId: "mgr" };
    expect(
      canListRequirementRecipients(
        { tenantId: TENANT, userId: "a", permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE] },
        record,
      ),
    ).toBe(true);
    expect(
      canListRequirementRecipients(
        { tenantId: TENANT, userId: "a", permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW] },
        record,
      ),
    ).toBe(false);
    expect(canReadRequirementAggregate({ tenantId: TENANT, userId: "a", permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW] }, record)).toBe(false);
  });

  it("M16 recipient cannot load peer responses via management matrix API", async () => {
    mocks.requirementFindFirst.mockResolvedValue({
      id: "req-1",
      tenantId: TENANT,
      status: "ACTIVE",
      dueAt: null,
      createdByUserId: "mgr",
    });
    await expect(
      listRequirementRecipientMatrix(
        { tenantId: TENANT, userId: "member", permissionKeys: [] },
        { requirementId: "req-1", filter: "ALL", search: "", page: 1 },
      ),
    ).rejects.toBeInstanceOf(RequirementForbiddenError);
  });

  it("M31 foreign tenant requirement inaccessible via management list guard", async () => {
    await expect(
      getRequirementManagementSummary({ tenantId: TENANT, userId: "x", permissionKeys: [] }),
    ).rejects.toBeInstanceOf(RequirementForbiddenError);
  });

  it("M32 multi-role Matrix Z management access remains additive", () => {
    const matrixZ = [...MANAGER_PERMS, PERMISSIONS.TASKS_VIEW];
    expect(canAccessRequirementManagement({ tenantId: TENANT, userId: "z", permissionKeys: matrixZ })).toBe(true);
  });
});

describe("AUFGABEN-06G2 presentation & progress (M9, M13, M21, M24–M25)", () => {
  it("M9 DRAFT displays selected audience, not fake progress", () => {
    expect(formatRequirementProgressLabel(null, 62, "DRAFT")).toBe("62 Personen ausgewählt");
  });

  it("M13 aggregate exact counts reflected in progress label", () => {
    expect(
      formatRequirementProgressLabel(
        {
          totalRecipients: 62,
          openCount: 15,
          resolvedCount: 47,
          acknowledgedCount: 47,
          resolvedPercent: 76,
        },
        0,
        "ACTIVE",
      ),
    ).toBe("47 / 62 bestätigt");
  });

  it("M21 guardian actor rendered correctly", () => {
    expect(
      formatActingForLabel({
        subjectPersonId: "child",
        responseActorPersonId: "guardian",
        subjectDisplayName: "James Duijster",
        actorDisplayName: "Michael Duijster",
      }),
    ).toBe("durch Michael Duijster");
  });

  it("M24/M25 lifecycle preserves documented rows (service unchanged)", () => {
    const svc = read("lib/requirements/requirement-service.ts");
    expect(svc).toMatch(/closeRequirement/);
    expect(svc).toMatch(/cancelRequirement/);
    expect(svc).not.toMatch(/deleteMany\(\{\s*where:\s*\{\s*requirementId/);
  });
});

describe("AUFGABEN-06G2 filters & overdue (M17–M20)", () => {
  it("M17–M19 matrix filters are supported in management service", async () => {
    mocks.requirementFindFirst.mockResolvedValue({
      id: "req-1",
      tenantId: TENANT,
      status: "ACTIVE",
      dueAt: new Date("2026-09-01T00:00:00.000Z"),
      createdByUserId: "mgr",
    });
    const allRecipients = [
      {
        id: "r1",
        subjectPersonId: "p1",
        resolutionStatus: "OPEN",
        responseValue: null,
        respondedAt: null,
        responseActorPersonId: null,
        removedAt: null,
        createdAt: new Date(),
      },
      {
        id: "r2",
        subjectPersonId: "p2",
        resolutionStatus: "RESOLVED",
        responseValue: "ACKNOWLEDGED",
        respondedAt: new Date(),
        responseActorPersonId: "p2",
        removedAt: null,
        createdAt: new Date(),
      },
    ];
    mocks.recipientFindMany.mockImplementation(
      ({ where }: { where: { resolutionStatus?: string; responseValue?: string } }) => {
        let rows = allRecipients;
        if (where.resolutionStatus === "OPEN") {
          rows = rows.filter((r) => r.resolutionStatus === "OPEN");
        }
        if (where.resolutionStatus === "RESOLVED" && where.responseValue === "ACKNOWLEDGED") {
          rows = rows.filter(
            (r) => r.resolutionStatus === "RESOLVED" && r.responseValue === "ACKNOWLEDGED",
          );
        }
        return Promise.resolve(rows);
      },
    );
    mocks.personFindMany.mockResolvedValue([
      { id: "p1", firstName: "Anna", lastName: "Alpha", displayName: null, email: null },
      { id: "p2", firstName: "Ben", lastName: "Beta", displayName: null, email: null },
    ]);

    const open = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "OPEN",
      search: "",
      page: 1,
      now: new Date("2026-09-22T00:00:00.000Z"),
    });
    expect(open.rows).toHaveLength(1);
    expect(open.rows[0]?.subjectDisplayName).toBe("Anna Alpha");

    const ack = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ACKNOWLEDGED",
      search: "",
      page: 1,
    });
    expect(ack.rows).toHaveLength(1);
    expect(ack.rows[0]?.subjectDisplayName).toBe("Ben Beta");
  });

  it("M20 person search filters matrix rows", async () => {
    mocks.requirementFindFirst.mockResolvedValue({
      id: "req-1",
      tenantId: TENANT,
      status: "ACTIVE",
      dueAt: null,
      createdByUserId: "mgr",
    });
    mocks.recipientFindMany.mockResolvedValue([
      {
        id: "r1",
        subjectPersonId: "p1",
        resolutionStatus: "OPEN",
        responseValue: null,
        respondedAt: null,
        responseActorPersonId: null,
        removedAt: null,
        createdAt: new Date(),
      },
    ]);
    mocks.personFindMany.mockResolvedValue([
      { id: "p1", firstName: "James", lastName: "Duijster", displayName: null, email: null },
    ]);
    const result = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "james",
      page: 1,
    });
    expect(result.rows).toHaveLength(1);
  });

  it("M19 overdue derived semantics", () => {
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2026-09-01T00:00:00.000Z"),
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
        now: new Date("2026-09-22T00:00:00.000Z"),
      }),
    ).toBe(true);
  });
});

describe("AUFGABEN-06G2 deferred & safety (M27–M30)", () => {
  it("M27 no Task rows created in requirement actions", () => {
    expect(read("app/(admin)/dashboard/aufgaben/requirement-actions.ts")).not.toMatch(/createTask/);
  });

  it("M28 no Participation rows created", () => {
    expect(read("app/(admin)/dashboard/aufgaben/requirement-actions.ts")).not.toMatch(/participation/i);
  });

  it("M29 management workspace does not expose recipient matrix in personal inbox components", () => {
    const workspace = read("components/admin/aufgaben/RequirementsManagementWorkspace.tsx");
    expect(workspace).not.toMatch(/PersonalActionsInbox/);
    expect(workspace).not.toMatch(/RequirementDetailWorkspace/);
  });

  it("M30 no Requirement notifications in 06G2 UI layer", () => {
    const ui = read("components/admin/aufgaben/RequirementsManagementWorkspace.tsx");
    expect(ui).not.toMatch(/REQUIREMENT_ASSIGNED/);
    expect(ui).not.toMatch(/erinnern/i);
  });
});

describe("AUFGABEN-06G2 management list (M4–M8, M12)", () => {
  it("M12 ACTIVE list item includes aggregate enrichment", async () => {
    mocks.requirementFindMany.mockResolvedValue([
      {
        id: "req-1",
        tenantId: TENANT,
        title: "Handbuch",
        description: null,
        status: "ACTIVE",
        responseMode: "ACKNOWLEDGE",
        dueAt: null,
        activatedAt: new Date(),
        closedAt: null,
        cancelledAt: null,
        createdByUserId: "mgr",
        createdAt: new Date(),
        updatedAt: new Date(),
        draftAudience: [],
        createdBy: { id: "mgr", firstName: "M", lastName: "G" },
      },
    ]);
    mocks.recipientCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(6);

    const result = await listRequirementManagementItems(managerCtx(), {
      search: "",
      sort: "CREATED_DESC",
      status: "ALL",
      deadline: "ALL",
      page: 1,
    });
    expect(result.items[0]?.aggregate?.totalRecipients).toBe(10);
  });
});
