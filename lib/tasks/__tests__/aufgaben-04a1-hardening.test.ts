/**
 * AUFGABEN-04A1 — operational context acceptance & hardening.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateTaskContext } from "../context-validation";
import { canAttachTaskContext, canUseTaskContextSelector } from "../context-access";
import { resolveTaskContextsBatch } from "../context-resolution";
import { searchTaskContextOptions } from "../context-selector-service";
import { buildOperationalContextHref } from "../context-registry";
import { TaskValidationError } from "../errors";
import type { TaskServiceContext } from "../types";

const prismaMocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  eventFindMany: vi.fn(),
  trainingSeriesFindFirst: vi.fn(),
  trainingSeriesFindMany: vi.fn(),
  teamFindFirst: vi.fn(),
  personFindFirst: vi.fn(),
  personFindMany: vi.fn(),
  workspaceDocumentFindFirst: vi.fn(),
  workspaceDocumentFindMany: vi.fn(),
  meetingFindFirst: vi.fn(),
  meetingFindMany: vi.fn(),
  registrationFindFirst: vi.fn(),
  registrationFindMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  loadOrgUnitIds: vi.fn(),
  loadTargetGroupIds: vi.fn(),
  canSeeMeeting: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: {
      findFirst: prismaMocks.eventFindFirst,
      findMany: prismaMocks.eventFindMany,
    },
    trainingSeries: {
      findFirst: prismaMocks.trainingSeriesFindFirst,
      findMany: prismaMocks.trainingSeriesFindMany,
    },
    meeting: {
      findFirst: prismaMocks.meetingFindFirst,
      findMany: prismaMocks.meetingFindMany,
    },
    registration: {
      findFirst: prismaMocks.registrationFindFirst,
      findMany: prismaMocks.registrationFindMany,
    },
    team: { findFirst: prismaMocks.teamFindFirst, findMany: vi.fn() },
    person: {
      findFirst: prismaMocks.personFindFirst,
      findMany: prismaMocks.personFindMany,
    },
    workspaceDocument: {
      findFirst: prismaMocks.workspaceDocumentFindFirst,
      findMany: prismaMocks.workspaceDocumentFindMany,
    },
    tenant: { findUnique: prismaMocks.tenantFindUnique },
  },
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: prismaMocks.loadOrgUnitIds,
  loadTargetGroupIds: prismaMocks.loadTargetGroupIds,
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: prismaMocks.canSeeMeeting,
}));

const TENANT_A = "tenant-a";

function ctx(perms: string[], tenantId = TENANT_A): TaskServiceContext {
  return { tenantId, userId: "user-1", permissionKeys: perms };
}

function createPerms(operational: string) {
  return [PERMISSIONS.TASKS_CREATE, operational];
}

describe("AUFGABEN-04A1 context selector capability", () => {
  it("requires tasks.create or tasks.manage", () => {
    expect(canUseTaskContextSelector(ctx([PERMISSIONS.TASKS_VIEW]))).toBe(false);
    expect(canUseTaskContextSelector(ctx([PERMISSIONS.TASKS_CREATE]))).toBe(true);
    expect(canUseTaskContextSelector(ctx([PERMISSIONS.TASKS_MANAGE]))).toBe(true);
  });
});

describe("AUFGABEN-04A1 event subtype validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MATCH rejects TOURNAMENT event id", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      validateTaskContext(
        ctx(createPerms(PERMISSIONS.EVENTS_VIEW)),
        "MATCH",
        "evt-tournament",
      ),
    ).rejects.toThrow(TaskValidationError);
    expect(prismaMocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt-tournament", tenantId: TENANT_A, type: "MATCH" },
      }),
    );
  });

  it("TOURNAMENT rejects MATCH event id", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      validateTaskContext(
        ctx(createPerms(PERMISSIONS.EVENTS_VIEW)),
        "TOURNAMENT",
        "evt-match",
      ),
    ).rejects.toThrow(TaskValidationError);
    expect(prismaMocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt-match", tenantId: TENANT_A, type: "TOURNAMENT" },
      }),
    );
  });

  it("CLUB_EVENT requires Event.type OTHER", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue(null);
    await expect(
      validateTaskContext(
        ctx(createPerms(PERMISSIONS.EVENTS_VIEW)),
        "CLUB_EVENT",
        "evt-match",
      ),
    ).rejects.toThrow(TaskValidationError);
    expect(prismaMocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt-match", tenantId: TENANT_A, type: "OTHER" },
      }),
    );
  });
});

describe("AUFGABEN-04A1 cross-tenant validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of [
      prismaMocks.eventFindFirst,
      prismaMocks.trainingSeriesFindFirst,
      prismaMocks.teamFindFirst,
      prismaMocks.personFindFirst,
      prismaMocks.workspaceDocumentFindFirst,
      prismaMocks.meetingFindFirst,
      prismaMocks.registrationFindFirst,
    ]) {
      mock.mockResolvedValue(null);
    }
  });

  const cases = [
    ["MATCH", PERMISSIONS.EVENTS_VIEW, prismaMocks.eventFindFirst] as const,
    ["TRAINING", PERMISSIONS.TRAININGS_VIEW, prismaMocks.trainingSeriesFindFirst] as const,
    ["TOURNAMENT", PERMISSIONS.EVENTS_VIEW, prismaMocks.eventFindFirst] as const,
    ["CLUB_EVENT", PERMISSIONS.EVENTS_VIEW, prismaMocks.eventFindFirst] as const,
    ["TEAM", PERMISSIONS.TEAMS_VIEW, prismaMocks.teamFindFirst] as const,
    ["PERSON", PERMISSIONS.PEOPLE_VIEW, prismaMocks.personFindFirst] as const,
    ["DOCUMENT", PERMISSIONS.WORKSPACE_VIEW, prismaMocks.workspaceDocumentFindFirst] as const,
    ["MEETING", PERMISSIONS.MEETINGS_VIEW, prismaMocks.meetingFindFirst] as const,
    ["REGISTRATION", PERMISSIONS.REGISTRATIONS_VIEW, prismaMocks.registrationFindFirst] as const,
  ];

  it.each(cases)(
    "%s rejects when entity is not in task tenant",
    async (type, perm, mockFn) => {
      mockFn.mockResolvedValue(null);
      await expect(
        validateTaskContext(ctx(createPerms(perm)), type as "MATCH", "foreign-id"),
      ).rejects.toThrow(TaskValidationError);
    },
  );
});

describe("AUFGABEN-04A1 attach authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.loadOrgUnitIds.mockResolvedValue([]);
    prismaMocks.loadTargetGroupIds.mockResolvedValue([]);
  });

  it("rejects MATCH without events.view", async () => {
    await expect(
      validateTaskContext(ctx([PERMISSIONS.TASKS_CREATE]), "MATCH", "m1"),
    ).rejects.toThrow(TaskValidationError);
    expect(canAttachTaskContext(ctx([PERMISSIONS.TASKS_CREATE]), "MATCH")).toBe(false);
  });

  it("MEETING — rejects known-but-unreadable meeting id", async () => {
    prismaMocks.meetingFindFirst.mockResolvedValue({
      id: "mtg-hidden",
      visibilityScope: "RESTRICTED",
      createdByUserId: "other",
      visibleRoleRefs: [],
      visibleUserRefs: [],
      visibleTeamRefs: [],
      visibleOrgUnitRefs: [],
      visiblePersonRefs: [],
      visibleTargetGroupRefs: [],
    });
    prismaMocks.canSeeMeeting.mockReturnValue(false);
    await expect(
      validateTaskContext(
        ctx(createPerms(PERMISSIONS.MEETINGS_VIEW)),
        "MEETING",
        "mtg-hidden",
      ),
    ).rejects.toThrow(TaskValidationError);
  });
});

describe("AUFGABEN-04A1 resolution privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.loadOrgUnitIds.mockResolvedValue([]);
    prismaMocks.loadTargetGroupIds.mockResolvedValue([]);
  });

  it("PERSON — no name leak without people.view", async () => {
    prismaMocks.personFindMany.mockResolvedValue([
      {
        id: "p1",
        firstName: "Secret",
        lastName: "Person",
        displayName: "Secret Person",
      },
    ]);
    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW]),
      [{ contextType: "PERSON", contextId: "p1" }],
      "de-CH",
      "Europe/Zurich",
    );
    const row = map.get("PERSON:p1");
    expect(row?.title).toBeNull();
    expect(row?.href).toBeNull();
    expect(row?.compactSecondary).toBe("Person");
  });

  it("DOCUMENT — no title leak without workspace.view", async () => {
    prismaMocks.workspaceDocumentFindMany.mockResolvedValue([
      { id: "d1", name: "Private Doc" },
    ]);
    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW]),
      [{ contextType: "DOCUMENT", contextId: "d1" }],
      "de-CH",
      "Europe/Zurich",
    );
    const row = map.get("DOCUMENT:d1");
    expect(row?.title).toBeNull();
    expect(row?.href).toBeNull();
  });

  it("MATCH with TOURNAMENT row is unavailable, not mislabeled", async () => {
    prismaMocks.eventFindMany.mockResolvedValue([
      {
        id: "shared",
        type: "TOURNAMENT",
        title: "Cup Final",
        startAt: new Date("2026-09-27T08:00:00.000Z"),
        allDay: false,
      },
    ]);
    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]),
      [{ contextType: "MATCH", contextId: "shared" }],
      "de-CH",
      "Europe/Zurich",
    );
    const row = map.get("MATCH:shared");
    expect(row?.unavailable).toBe(true);
    expect(row?.title).toBe("Kontext nicht mehr verfügbar");
    expect(row?.href).toBeNull();
  });

  it("MEETING — hidden meeting does not leak title", async () => {
    prismaMocks.meetingFindMany.mockResolvedValue([
      {
        id: "mtg-1",
        slug: "secret",
        title: "Board only",
        meetingDate: new Date("2026-09-27T08:00:00.000Z"),
        visibilityScope: "RESTRICTED",
        createdByUserId: "other",
        visibleRoleRefs: [],
        visibleUserRefs: [],
        visibleTeamRefs: [],
        visibleOrgUnitRefs: [],
        visiblePersonRefs: [],
        visibleTargetGroupRefs: [],
      },
    ]);
    prismaMocks.canSeeMeeting.mockReturnValue(false);
    const map = await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.MEETINGS_VIEW]),
      [{ contextType: "MEETING", contextId: "mtg-1" }],
      "de-CH",
      "Europe/Zurich",
    );
    const row = map.get("MEETING:mtg-1");
    expect(row?.title).toBeNull();
    expect(row?.href).toBeNull();
  });
});

describe("AUFGABEN-04A1 batch resolution query shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.loadOrgUnitIds.mockResolvedValue([]);
    prismaMocks.loadTargetGroupIds.mockResolvedValue([]);
    prismaMocks.eventFindMany.mockResolvedValue([]);
    prismaMocks.personFindMany.mockResolvedValue([]);
  });

  it("groups event contexts into one findMany", async () => {
    const refs = [
      { contextType: "MATCH" as const, contextId: "m1" },
      { contextType: "MATCH" as const, contextId: "m2" },
      { contextType: "TOURNAMENT" as const, contextId: "t1" },
      { contextType: "PERSON" as const, contextId: "p1" },
      { contextType: "PERSON" as const, contextId: "p2" },
    ];
    await resolveTaskContextsBatch(
      ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW, PERMISSIONS.PEOPLE_VIEW]),
      refs,
      "de-CH",
      "Europe/Zurich",
    );
    expect(prismaMocks.eventFindMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.personFindMany).toHaveBeenCalledTimes(1);
  });
});

describe("AUFGABEN-04A1 selector bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.eventFindMany.mockResolvedValue([]);
  });

  it("caps event search at 20 by default", async () => {
    await searchTaskContextOptions(
      ctx(createPerms(PERMISSIONS.EVENTS_VIEW)),
      "MATCH",
      "",
    );
    expect(prismaMocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it("returns empty when operational permission missing", async () => {
    const options = await searchTaskContextOptions(
      ctx([PERMISSIONS.TASKS_CREATE]),
      "MATCH",
      "",
    );
    expect(options).toEqual([]);
    expect(prismaMocks.eventFindMany).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-04A1 canonical hrefs", () => {
  it("MATCH and TRAINING routes match registry", () => {
    expect(buildOperationalContextHref("MATCH", { id: "e1" })).toBe(
      "/dashboard/matchcenter/e1",
    );
    expect(buildOperationalContextHref("TRAINING", { id: "s1" })).toBe(
      "/dashboard/training/series/s1/edit",
    );
  });
});
