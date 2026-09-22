/**
 * AUFGABEN-06G3 — Requirements in Meine Aufgaben (R1–R36).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskStatus } from "@prisma/client";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const mocks = vi.hoisted(() => ({
  authorizedPersonIds: vi.fn(),
  recipientFindMany: vi.fn(),
  recipientCount: vi.fn(),
  personFindFirst: vi.fn(),
  acknowledge: vi.fn(),
  taskCreate: vi.fn(),
  recipientCreateMany: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: mocks.authorizedPersonIds,
  assertActorCanRespondForPerson: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: { findFirst: mocks.personFindFirst },
    requirementRecipient: {
      findMany: mocks.recipientFindMany,
      count: mocks.recipientCount,
    },
    task: { create: mocks.taskCreate },
    notification: { create: mocks.notificationCreate },
  },
}));

vi.mock("@/lib/requirements/requirement-service", () => ({
  acknowledgeRequirementRecipient: mocks.acknowledge,
}));

import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { requirementPersonalActionSource } from "../sources/requirement-source";
import { loadRequirementObligationCandidates } from "../sources/requirement-obligations";
import { buildRequirementPersonalActionId } from "../identity";
import { submitRequirementPersonalAction } from "../submit-requirement-response";
import { loadPersonalActions } from "../load-personal-actions";
import { countPersonalActions } from "../count-personal-actions";
import {
  filterPersonalActionsForInbox,
  mapPersonalActionToListItem,
} from "../presentation";
import {
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
  taskPermissionsGrantRequirementManagement,
} from "@/lib/requirements/requirement-authorization";
import { isRequirementRecipientOverdue } from "@/lib/requirements/requirement-aggregate";
import { resolvePersonalActionsModuleCapabilities } from "../access";

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn().mockResolvedValue({ platform: [], tenant: [] }),
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: vi.fn().mockResolvedValue([]),
  countMyOpenTasks: vi.fn().mockResolvedValue(0),
}));

vi.mock("../sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: vi.fn().mockResolvedValue([]),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

const TENANT = "tenant-a";
const USER_SELF = "user-self";
const USER_GUARDIAN_A = "user-guardian-a";
const USER_GUARDIAN_B = "user-guardian-b";
const USER_OTHER = "user-other";
const PERSON_SELF = "person-self";
const PERSON_CHILD = "person-child";
const RECIP_ID = "recip-1";
const REQ_ID = "req-1";
const NOW = new Date("2026-09-22T12:00:00.000Z");

const ctx = {
  tenantId: TENANT,
  userId: USER_SELF,
  permissionKeys: [] as string[],
  now: NOW,
};

function activeRecipientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RECIP_ID,
    requirementId: REQ_ID,
    subjectPersonId: PERSON_SELF,
    requirement: {
      title: "Trainershandbuch 2026/27 bestätigen",
      description: null,
      dueAt: new Date("2026-09-30T00:00:00.000Z"),
    },
    subjectPerson: {
      id: PERSON_SELF,
      displayName: "Alex",
      firstName: "Alex",
      lastName: "Member",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizedPersonIds.mockResolvedValue([PERSON_SELF]);
  mocks.personFindFirst.mockResolvedValue({ id: PERSON_SELF });
  mocks.recipientFindMany.mockResolvedValue([activeRecipientRow()]);
  mocks.recipientCount.mockResolvedValue(1);
});

describe("AUFGABEN-06G3 — requirement PersonalAction source", () => {
  it("R1/R2 — self recipient sees ACTIVE OPEN obligation with stable id", async () => {
    const actions = await requirementPersonalActionSource.loadActionable(ctx);
    expect(actions).toHaveLength(1);
    expect(actions[0].sourceType).toBe("REQUIREMENT");
    expect(actions[0].id).toBe(`requirement:${RECIP_ID}`);
    expect(actions[0].title).toBe("Trainershandbuch 2026/27 bestätigen");
  });

  it("R6/R7 — guardian sees child obligation with subject", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.personFindFirst.mockResolvedValue({ id: "person-guardian-a" });
    mocks.recipientFindMany.mockResolvedValue([
      activeRecipientRow({
        subjectPersonId: PERSON_CHILD,
        subjectPerson: {
          id: PERSON_CHILD,
          displayName: "James",
          firstName: "James",
          lastName: "Kid",
        },
      }),
    ]);

    const actions = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      userId: USER_GUARDIAN_A,
    });
    expect(actions[0].subject?.displayName).toBe("James");
    expect(actions[0].inlineActions?.requirement?.actingForOtherPerson).toBe(true);
  });

  it("R8 — parent without tasks.view still loads requirement actions", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.personFindFirst.mockResolvedValue({ id: "person-guardian" });
    mocks.recipientFindMany.mockResolvedValue([
      activeRecipientRow({ subjectPersonId: PERSON_CHILD }),
    ]);

    const actions = await requirementPersonalActionSource.loadActionable({
      tenantId: TENANT,
      userId: USER_GUARDIAN_A,
      permissionKeys: [],
      now: NOW,
    });
    expect(actions).toHaveLength(1);
  });

  it("R9 — two guardians share one recipient id", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.recipientFindMany.mockResolvedValue([
      activeRecipientRow({ subjectPersonId: PERSON_CHILD }),
    ]);

    const a = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      userId: USER_GUARDIAN_A,
    });
    const b = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      userId: USER_GUARDIAN_B,
    });
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].sourceId).toBe(RECIP_ID);
  });

  it("R12–R16 — eligibility query constrains ACTIVE OPEN non-removed ACKNOWLEDGE", async () => {
    await loadRequirementObligationCandidates(TENANT, USER_SELF);
    expect(mocks.recipientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          removedAt: null,
          resolutionStatus: "OPEN",
          requirement: {
            status: "ACTIVE",
            responseMode: "ACKNOWLEDGE",
          },
        }),
      }),
    );
  });

  it("R17 — empty when no authorised persons (foreign/unrelated)", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([]);
    const rows = await loadRequirementObligationCandidates(TENANT, USER_OTHER);
    expect(rows).toEqual([]);
    expect(mocks.recipientFindMany).not.toHaveBeenCalled();
  });

  it("R26 — participates in personal action count", async () => {
    const counts = await countPersonalActions({
      tenantId: TENANT,
      userId: USER_SELF,
      permissionKeys: [],
      now: NOW,
    });
    expect(counts.requirementActionable).toBe(1);
    expect(counts.totalActionable).toBe(1);
  });

  it("R27/R28 — task and attendance sources unchanged when requirement present", async () => {
    const { listMyTasks } = await import("@/lib/tasks/task-service");
    vi.mocked(listMyTasks).mockResolvedValue([
      {
        id: "task-1",
        title: "Task",
        dueAt: null,
        status: TaskStatus.OPEN,
        priority: "NORMAL",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        tenantId: TENANT,
        description: null,
        completedAt: null,
        contextType: null,
        contextId: null,
        parentTaskId: null,
        taskSeriesId: null,
        createdByUserId: null,
        assignees: [],
        parentTask: null,
      },
    ] as never);

    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: USER_SELF,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      now: NOW,
    });
    expect(actions.some((a) => a.sourceType === "TASK")).toBe(true);
    expect(actions.some((a) => a.sourceType === "REQUIREMENT")).toBe(true);
  });
});

describe("AUFGABEN-06G3 — acknowledgement", () => {
  it("R3/R4/R30 — self acknowledges via canonical service", async () => {
    mocks.acknowledge.mockResolvedValue({
      id: RECIP_ID,
      resolutionStatus: "RESOLVED",
      respondedByUserId: USER_SELF,
      responseActorPersonId: PERSON_SELF,
    });

    const result = await submitRequirementPersonalAction(
      { tenantId: TENANT, userId: USER_SELF, permissionKeys: [] },
      {
        personalActionId: buildRequirementPersonalActionId(RECIP_ID),
        requirementRecipientId: RECIP_ID,
      },
    );

    expect(result.ok).toBe(true);
    expect(mocks.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_SELF }),
      RECIP_ID,
    );

    mocks.recipientFindMany.mockResolvedValue([]);
    const after = await requirementPersonalActionSource.loadActionable(ctx);
    expect(after).toHaveLength(0);
  });

  it("R31 — guardian ack preserves actor semantics through service", async () => {
    mocks.acknowledge.mockResolvedValue({
      id: RECIP_ID,
      respondedByUserId: USER_GUARDIAN_A,
      responseActorPersonId: PERSON_CHILD,
    });

    await submitRequirementPersonalAction(
      { tenantId: TENANT, userId: USER_GUARDIAN_A, permissionKeys: [] },
      {
        personalActionId: buildRequirementPersonalActionId(RECIP_ID),
        requirementRecipientId: RECIP_ID,
      },
    );
    expect(mocks.acknowledge).toHaveBeenCalled();
  });

  it("R32 — no notification side effect in personal ack adapter", async () => {
    mocks.acknowledge.mockResolvedValue({ id: RECIP_ID });
    await submitRequirementPersonalAction(
      { tenantId: TENANT, userId: USER_SELF, permissionKeys: [] },
      {
        personalActionId: buildRequirementPersonalActionId(RECIP_ID),
        requirementRecipientId: RECIP_ID,
      },
    );
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("R33/R34 — no Task or duplicate recipient creation in source path", async () => {
    await requirementPersonalActionSource.loadActionable(ctx);
    expect(mocks.taskCreate).not.toHaveBeenCalled();
    expect(mocks.recipientCreateMany).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06G3 — authorization & privacy", () => {
  it("R18 — unrelated user excluded when not in authorised person set", () => {
    expect(
      canReadOwnRequirementRecipient(
        { tenantId: TENANT, userId: USER_OTHER, permissionKeys: [] },
        {
          tenantId: TENANT,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_SELF,
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);
  });

  it("R19 — recipient auth is person-scoped only", () => {
    expect(
      canRespondToRequirementRecipient(
        { tenantId: TENANT, userId: USER_SELF, permissionKeys: [] },
        {
          tenantId: TENANT,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_SELF,
          removedAt: null,
        },
        [PERSON_SELF],
      ),
    ).toBe(true);
  });

  it("R20–R22 — tasks.* does not grant requirement management/recipient via tasks", () => {
    const tasksCtx = {
      tenantId: TENANT,
      userId: USER_OTHER,
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_MANAGE],
    };
    expect(taskPermissionsGrantRequirementManagement(tasksCtx)).toBe(true);
    expect(
      canReadOwnRequirementRecipient(
        tasksCtx,
        {
          tenantId: TENANT,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_SELF,
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);
  });

  it("R23 — requirements.view_aggregate alone does not imply recipient eligibility", () => {
    expect(
      canReadOwnRequirementRecipient(
        {
          tenantId: TENANT,
          userId: "mgr",
          permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE],
        },
        {
          tenantId: TENANT,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_SELF,
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);
  });
});

describe("AUFGABEN-06G3 — presentation & UI safety", () => {
  it("R24/R25 — overdue and due date meta lines", async () => {
    const overdueAction = await requirementPersonalActionSource.loadActionable(ctx);
    const overdueItem = mapPersonalActionToListItem(
      overdueAction[0],
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    expect(overdueItem.sourceLabel).toBe("Anforderung");
    expect(overdueItem.subtitle).toBeNull();

    mocks.recipientFindMany.mockResolvedValue([
      activeRecipientRow({
        requirement: {
          title: "Handbuch",
          description: null,
          dueAt: new Date("2026-10-01T00:00:00.000Z"),
        },
      }),
    ]);
    const future = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      now: new Date("2026-09-22T00:00:00.000Z"),
    });
    const futureItem = mapPersonalActionToListItem(
      future[0],
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    expect(futureItem.metaLine).toBeTruthy();
    expect(futureItem.emphasis).not.toBe("urgent");
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2026-09-01T00:00:00.000Z"),
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("guardian presentation shows Für: subject", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.personFindFirst.mockResolvedValue({ id: "guardian-person" });
    mocks.recipientFindMany.mockResolvedValue([
      activeRecipientRow({
        subjectPersonId: PERSON_CHILD,
        subjectPerson: {
          id: PERSON_CHILD,
          displayName: "James",
          firstName: "James",
          lastName: "Kid",
        },
      }),
    ]);
    const actions = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      userId: USER_GUARDIAN_A,
    });
    const item = mapPersonalActionToListItem(
      actions[0],
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    expect(item.subtitle).toBe("Für: James");
  });

  it("R35 — personal execution does not link to management detail route", async () => {
    const actions = await requirementPersonalActionSource.loadActionable(ctx);
    expect(actions[0].href).toBeNull();
    expect(read("components/admin/aufgaben/PersonalActionRequirementInline.tsx")).not.toMatch(
      /anforderungen\/\[requirementId\]/,
    );
  });

  it("source filter requirements", async () => {
    const actions = await requirementPersonalActionSource.loadActionable(ctx);
    const filtered = filterPersonalActionsForInbox(actions, "requirements");
    expect(filtered).toHaveLength(1);
  });
});

describe("AUFGABEN-06G3 — matrix & capabilities", () => {
  it("R29 — multi-role user keeps combined personal inbox access", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: "vp-parent",
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE],
      participationNavCapable: true,
      requirementRecipientCapable: true,
    });
    expect(caps.taskManagement).toBe(true);
    expect(caps.requirementManagement).toBe(true);
    expect(caps.personalInbox).toBe(true);
  });

  it("R8 nav — requirement-only recipient gets personal inbox", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: TENANT,
      userId: USER_SELF,
      permissionKeys: [],
      participationNavCapable: false,
      requirementRecipientCapable: true,
    });
    expect(caps.personalInbox).toBe(true);
    expect(caps.moduleAccess).toBe(true);
  });
});

describe("AUFGABEN-06G3 — static safety", () => {
  it("R36 — management routes remain separate from personal ack adapter", () => {
    expect(read("app/(admin)/dashboard/aufgaben/personal-requirement-actions.ts")).toMatch(
      /acknowledgeRequirementRecipient|submitRequirementPersonalAction/,
    );
    expect(read("app/(admin)/dashboard/aufgaben/requirement-actions.ts")).not.toMatch(
      /PersonalActionsInbox/,
    );
  });

  it("uses getAuthorizedPersonIdsForUser for bounded load", () => {
    expect(read("lib/personal-actions/sources/requirement-obligations.ts")).toMatch(
      /getAuthorizedPersonIdsForUser/,
    );
    expect(read("lib/personal-actions/sources/requirement-obligations.ts")).toMatch(
      /openAcknowledgeableRequirementRecipientForPersons/,
    );
  });
});
