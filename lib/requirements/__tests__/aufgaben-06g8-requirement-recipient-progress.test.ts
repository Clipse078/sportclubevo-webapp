/**
 * AUFGABEN-06G8 — Requirement recipient & progress UX contract tests (P01–P35).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  calculateRequirementResolvedPercent,
  computeRequirementAggregate,
  isRequirementRecipientOverdue,
} from "../requirement-aggregate";
import {
  canListRequirementRecipients,
  canReadRequirementAggregate,
} from "../requirement-authorization";
import {
  listRequirementRecipientMatrix,
  loadRequirementAudienceOriginLabels,
} from "../management-service";
import {
  formatRequirementOverviewProgressLabel,
  formatRequirementProgressLabel,
} from "../presentation";
import {
  resolveRequirementRecipientManagementStatus,
  sortRequirementRecipientMatrixRows,
} from "../recipient-progress-presentation";
import { RequirementForbiddenError } from "../errors";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

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

const mocks = vi.hoisted(() => ({
  requirementFindFirst: vi.fn(),
  recipientFindMany: vi.fn(),
  recipientCount: vi.fn(),
  personFindMany: vi.fn(),
  teamFindMany: vi.fn(),
  orgUnitFindMany: vi.fn(),
  roleFindMany: vi.fn(),
  targetGroupFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    requirement: { findFirst: mocks.requirementFindFirst },
    requirementRecipient: {
      findMany: mocks.recipientFindMany,
      count: mocks.recipientCount,
    },
    person: { findMany: mocks.personFindMany },
    team: { findMany: mocks.teamFindMany },
    orgUnit: { findMany: mocks.orgUnitFindMany },
    role: { findMany: mocks.roleFindMany },
    targetGroup: { findMany: mocks.targetGroupFindMany },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.personFindMany.mockResolvedValue([]);
  mocks.teamFindMany.mockResolvedValue([]);
  mocks.orgUnitFindMany.mockResolvedValue([]);
  mocks.roleFindMany.mockResolvedValue([]);
  mocks.targetGroupFindMany.mockResolvedValue([]);
});

describe("AUFGABEN-06G8 — aggregate & progress (P01–P10, P29, P31)", () => {
  it("P01/P02 — progress derives from RequirementRecipient counts", async () => {
    mocks.recipientCount
      .mockResolvedValueOnce(24)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(2);
    const db = { requirementRecipient: { count: mocks.recipientCount } } as never;
    const aggregate = await computeRequirementAggregate(db, TENANT, "req-1");
    expect(aggregate.totalRecipients).toBe(24);
    expect(aggregate.resolvedCount).toBe(18);
    expect(aggregate.openCount).toBe(6);
    expect(aggregate.overdueCount).toBe(2);
  });

  it("P03/P04 — completed/open counts from canonical resolutionStatus", async () => {
    mocks.recipientCount.mockResolvedValue(0);
    const db = { requirementRecipient: { count: mocks.recipientCount } } as never;
    await computeRequirementAggregate(db, TENANT, "req-1");
    const calls = mocks.recipientCount.mock.calls.map((c) => c[0]?.where);
    expect(calls[1]).toMatchObject({ resolutionStatus: "OPEN" });
    expect(calls[2]).toMatchObject({ resolutionStatus: "RESOLVED" });
  });

  it("P05/P06 — overdue uses canonical dueAt <= now", () => {
    const now = new Date("2026-09-22T12:00:00.000Z");
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: now,
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("P07 — completed recipient is not overdue", () => {
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2026-09-01T00:00:00.000Z"),
        recipientResolutionStatus: "RESOLVED",
        recipientRemovedAt: null,
        now: new Date("2026-09-22T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("P08 — removed recipient excluded via removedAt null filter", async () => {
    mocks.requirementFindFirst.mockResolvedValue({
      id: "req-1",
      tenantId: TENANT,
      status: "ACTIVE",
      dueAt: null,
      createdByUserId: "mgr",
    });
    mocks.recipientFindMany.mockResolvedValue([]);
    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
    });
    expect(mocks.recipientFindMany.mock.calls[0]?.[0]?.where?.removedAt).toBeNull();
  });

  it("P09/P10 — percentage handles zero and partial completion", () => {
    expect(calculateRequirementResolvedPercent(0, 0)).toBe(0);
    expect(calculateRequirementResolvedPercent(18, 24)).toBe(75);
  });

  it("P29 — no persisted aggregate counters in schema", () => {
    expect(read("prisma/schema.prisma")).not.toMatch(/model RequirementProgress/);
    expect(read("prisma/schema.prisma")).not.toMatch(/resolvedCount\s+Int/);
  });

  it("P31 — overview progress label uses canonical aggregate", () => {
    expect(
      formatRequirementOverviewProgressLabel({
        totalRecipients: 24,
        openCount: 6,
        resolvedCount: 18,
        acknowledgedCount: 18,
        overdueCount: 2,
        resolvedPercent: 75,
      }),
    ).toBe("18 / 24 erledigt · 75 %");
  });
});

describe("AUFGABEN-06G8 — recipient matrix (P11–P18, P30, P32–P35)", () => {
  const baseRequirement = {
    id: "req-1",
    tenantId: TENANT,
    status: "ACTIVE" as const,
    dueAt: new Date("2026-09-30T00:00:00.000Z"),
    createdByUserId: "mgr",
  };

  const sampleRecipients = [
    {
      id: "r-open",
      subjectPersonId: "p-open",
      resolutionStatus: "OPEN" as const,
      responseValue: null,
      respondedAt: null,
      responseActorPersonId: null,
      removedAt: null,
    },
    {
      id: "r-done",
      subjectPersonId: "p-done",
      resolutionStatus: "RESOLVED" as const,
      responseValue: "ACKNOWLEDGED",
      respondedAt: new Date("2026-09-22T15:42:00.000Z"),
      responseActorPersonId: "p-guardian",
      removedAt: null,
    },
  ];

  beforeEach(() => {
    mocks.requirementFindFirst.mockResolvedValue(baseRequirement);
    mocks.recipientFindMany.mockResolvedValue(sampleRecipients);
    mocks.personFindMany.mockResolvedValue([
      {
        id: "p-open",
        firstName: "Sandra",
        lastName: "Müller",
        displayName: null,
        email: null,
      },
      {
        id: "p-done",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: null,
        email: null,
      },
      {
        id: "p-guardian",
        firstName: "Parent",
        lastName: "Duijster",
        displayName: null,
        email: null,
      },
    ]);
  });

  it("P11/P12 — batch person names without role labels", async () => {
    const result = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
      now: new Date("2026-09-22T00:00:00.000Z"),
    });
    expect(result.rows.map((r) => r.subjectDisplayName)).toContain("Michael Duijster");
    expect(result.rows.map((r) => r.subjectDisplayName)).not.toContain("FC Admin");
    expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
  });

  it("P13 — search applies server-side subjectPerson filter", async () => {
    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "Sandra",
      page: 1,
    });
    const where = mocks.recipientFindMany.mock.calls[0]?.[0]?.where;
    expect(where.subjectPerson.OR).toBeDefined();
  });

  it("P14/P15/P16 — status filters", async () => {
    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "OPEN",
      search: "",
      page: 1,
    });
    expect(mocks.recipientFindMany.mock.calls[0]?.[0]?.where.resolutionStatus).toBe("OPEN");

    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ACKNOWLEDGED",
      search: "",
      page: 1,
    });
    expect(mocks.recipientFindMany.mock.calls[1]?.[0]?.where.responseValue).toBe("ACKNOWLEDGED");

    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "OVERDUE",
      search: "",
      page: 1,
      now: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(mocks.recipientFindMany.mock.calls[2]?.[0]?.where.requirement.dueAt).toEqual({
      lte: expect.any(Date),
    });
  });

  it("P17/P30 — matrix uses snapshot table, not live audience resolver", () => {
    const svc = read("lib/requirements/management-service.ts");
    expect(svc).toMatch(/requirementRecipient\.findMany/);
    expect(svc).not.toMatch(/resolveRequirementAudiencePersonIds/);
    expect(read("components/admin/aufgaben/RequirementDetailWorkspace.tsx")).not.toMatch(
      /resolveRequirementAudiencePersonIds/,
    );
  });

  it("P18 — post-activation changes handled at activation layer (static)", () => {
    expect(read("lib/requirements/requirement-service.ts")).toMatch(/requirementRecipient\.createMany/);
    expect(read("lib/requirements/management-service.ts")).not.toMatch(/playerSquadMember/);
  });

  it("P32 — single batched person lookup for matrix rows", async () => {
    await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
    });
    expect(mocks.personFindMany).toHaveBeenCalledTimes(1);
  });

  it("P33 — pagination is deterministic", async () => {
    const many = Array.from({ length: 55 }, (_, i) => ({
      id: `r-${i}`,
      subjectPersonId: `p-${i}`,
      resolutionStatus: "OPEN" as const,
      responseValue: null,
      respondedAt: null,
      responseActorPersonId: null,
      removedAt: null,
    }));
    mocks.recipientFindMany.mockResolvedValue(many);
    mocks.personFindMany.mockResolvedValue(
      many.map((r, i) => ({
        id: r.subjectPersonId,
        firstName: `Person${i}`,
        lastName: "Test",
        displayName: null,
        email: null,
      })),
    );
    const page1 = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
      pageSize: 50,
    });
    const page2 = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 2,
      pageSize: 50,
    });
    expect(page1.rows).toHaveLength(50);
    expect(page2.rows).toHaveLength(5);
    expect(page1.pageCount).toBe(2);
  });

  it("P34 — draft requirement returns empty matrix", async () => {
    mocks.requirementFindFirst.mockResolvedValue({
      ...baseRequirement,
      status: "DRAFT",
    });
    const result = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
    });
    expect(result.rows).toHaveLength(0);
    expect(mocks.recipientFindMany).not.toHaveBeenCalled();
  });

  it("P35 — completion timestamp uses respondedAt", async () => {
    const result = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
    });
    const done = result.rows.find((r) => r.id === "r-done");
    expect(done?.respondedAt).toBe("2026-09-22T15:42:00.000Z");
  });
});

describe("AUFGABEN-06G8 — audience origin & guardian (P19–P24)", () => {
  it("P20 — audience origin loader is informational", async () => {
    mocks.personFindMany.mockResolvedValue([
      {
        id: "p1",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: null,
        email: null,
      },
    ]);
    mocks.teamFindMany.mockResolvedValue([{ id: "t1", name: "F2", shortName: "F2" }]);
    const labels = await loadRequirementAudienceOriginLabels(TENANT, {
      draftAudiencePersonIds: ["p1"],
      draftAudienceTeamIds: ["t1"],
      draftAudienceOrgUnitIds: [],
      draftAudienceRoleIds: [],
      draftAudienceTargetGroupIds: [],
    });
    expect(labels.teams[0]?.label).toBe("F2");
    expect(labels.persons[0]?.label).toBe("Michael Duijster");
    expect(read("components/admin/aufgaben/RequirementAudienceOriginPanel.tsx")).toMatch(
      /Beim Aktivieren wurden/,
    );
  });

  it("P21/P22 — personal action id seam shares requirement recipient identity", () => {
    expect(buildRequirementPersonalActionId("recip-1")).toBe("requirement:recip-1");
    expect(read("lib/requirements/requirement-service.ts")).toMatch(/respondedAt/);
    expect(read("lib/requirements/requirement-service.ts")).toMatch(/resolutionStatus:\s*"RESOLVED"/);
  });

  it("P23/P24 — subject person remains canonical in matrix mapping", async () => {
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
        subjectPersonId: "child",
        resolutionStatus: "RESOLVED",
        responseValue: "ACKNOWLEDGED",
        respondedAt: new Date(),
        responseActorPersonId: "guardian",
        removedAt: null,
      },
    ]);
    mocks.personFindMany.mockResolvedValue([
      { id: "child", firstName: "James", lastName: "Example", displayName: null, email: null },
      { id: "guardian", firstName: "Parent", lastName: "Example", displayName: null, email: null },
    ]);
    const result = await listRequirementRecipientMatrix(managerCtx(), {
      requirementId: "req-1",
      filter: "ALL",
      search: "",
      page: 1,
    });
    expect(result.rows[0]?.subjectPersonId).toBe("child");
    expect(result.rows[0]?.subjectDisplayName).toBe("James Example");
    expect(result.rows[0]?.actorDisplayName).toBe("Parent Example");
  });
});

describe("AUFGABEN-06G8 — permissions & creator (P25–P28)", () => {
  it("P25 — creator display uses task creator helper", () => {
    expect(read("lib/requirements/management-service.ts")).toMatch(/resolveTaskCreatorDisplayNamesByUserIds/);
  });

  it("P26 — creator does not grant matrix permission", () => {
    const record = { tenantId: TENANT, createdByUserId: "creator" };
    expect(
      canListRequirementRecipients(
        { tenantId: TENANT, userId: "creator", permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW] },
        record,
      ),
    ).toBe(false);
  });

  it("P27/P28 — foreign tenant denied", async () => {
    mocks.requirementFindFirst.mockResolvedValue(null);
    await expect(
      listRequirementRecipientMatrix(managerCtx(), {
        requirementId: "req-foreign",
        filter: "ALL",
        search: "",
        page: 1,
      }),
    ).rejects.toBeInstanceOf(RequirementForbiddenError);
  });
});

describe("AUFGABEN-06G8 — presentation sorting (P33 extension)", () => {
  it("sorts overdue before open before completed", () => {
    const sorted = sortRequirementRecipientMatrixRows(
      [
        {
          subjectDisplayName: "Zara",
          managementStatus: "COMPLETED",
          respondedAt: "2026-09-01T00:00:00.000Z",
        },
        {
          subjectDisplayName: "Anna",
          managementStatus: "OVERDUE",
          respondedAt: null,
        },
        {
          subjectDisplayName: "Ben",
          managementStatus: "OPEN",
          respondedAt: null,
        },
      ],
      "ATTENTION",
    );
    expect(sorted.map((r) => r.managementStatus)).toEqual(["OVERDUE", "OPEN", "COMPLETED"]);
  });

  it("P34 draft progress label does not fake snapshot", () => {
    expect(formatRequirementProgressLabel(null, 0, "DRAFT")).toBe("0 Personen ausgewählt");
  });

  it("management status derives overdue vs open", () => {
    expect(
      resolveRequirementRecipientManagementStatus({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2026-09-01T00:00:00.000Z"),
        resolutionStatus: "OPEN",
        removedAt: null,
        now: new Date("2026-09-22T00:00:00.000Z"),
      }),
    ).toBe("OVERDUE");
  });
});

describe("AUFGABEN-06G8 — authorization read aggregate (P26 extension)", () => {
  it("aggregate read requires explicit permission", () => {
    const record = { tenantId: TENANT, createdByUserId: "mgr" };
    expect(
      canReadRequirementAggregate(
        { tenantId: TENANT, userId: "u", permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE] },
        record,
      ),
    ).toBe(true);
  });
});
