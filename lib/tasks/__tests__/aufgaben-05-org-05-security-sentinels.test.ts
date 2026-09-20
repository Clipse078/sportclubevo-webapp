/**
 * AUFGABEN-05-ORG-05 — permanent organisational Task security sentinels (S1–S17).
 *
 * Compact regression suite for tenant isolation, confidentiality, propagation locks,
 * personal surfaces, and multi-role additive behavior. Detailed matrices live in
 * ORG-01–ORG-04; this file names high-value sentinels for future development.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma, TaskStatus } from "@prisma/client";
import { TaskStatus as TaskStatusEnum, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { canSeeMeeting } from "@/lib/meetings/queries";
import {
  canManageTask,
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { validateTaskContext } from "../context-validation";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import { getTask, listMyTasks, updateTask } from "../task-service";
import { listTaskManagementItems } from "../management-service";
import { parseTaskManagementQuery } from "../management-navigation";
import { loadTaskOrgUnitFilterOptions } from "../task-org-options";
import { loadTaskDeadlineProjections } from "@/lib/personal-agenda/task-projections";
import { attendancePersonalActionSource } from "@/lib/personal-actions/sources/attendance-source";

const mocks = vi.hoisted(() => ({
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  transaction: vi.fn(),
  orgUnitFindMany: vi.fn(),
  orgUnitFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  auditCreate: vi.fn(),
  meetingFindFirst: vi.fn(),
  getAuthorizedPersonIdsForUser: vi.fn(),
  loadAttendanceObligationCandidates: vi.fn(),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: mocks.getAuthorizedPersonIdsForUser,
}));

vi.mock("@/lib/personal-actions/sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: mocks.loadAttendanceObligationCandidates,
  filterActionableAttendanceCandidates: mocks.filterActionableAttendanceCandidates,
}));

vi.mock("../context-presentation", () => ({
  resolveTaskContextsBatch: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnit: { findMany: mocks.orgUnitFindMany, findFirst: mocks.orgUnitFindFirst },
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
      findFirst: mocks.taskFindFirst,
      update: mocks.taskUpdate,
      findFirstOrThrow: mocks.taskFindFirst,
    },
    meeting: { findFirst: mocks.meetingFindFirst },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    tenant: { findUnique: vi.fn().mockResolvedValue({ locale: "de-CH", timezone: "Europe/Zurich" }) },
    auditLog: { create: mocks.auditCreate },
    taskAssignee: { createMany: vi.fn() },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/notifications/task-producer", () => ({
  computeNewAssigneeRows: vi.fn(() => []),
  emitTaskAssignmentNotifications: vi.fn(),
  emitTaskDeadlineChangedNotifications: vi.fn(),
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const USER = "sentinel-user";
const OTHER = "user-other";
const ORG_FINANCE = "org-finance";
const ORG_VORSTAND = "org-vorstand";
const ORG_F2 = "org-f2";

const SENTINEL_ASSIGNEES = "ORG05_S1_S2_ASSIGNEES_ONLY_SENTINEL";
const SENTINEL_ORG_UNIT = "ORG05_S3_ORG_UNIT_CONFIDENTIAL_SENTINEL";

function serviceCtx(
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
  userId = USER,
  tenantId = TENANT_A,
) {
  return {
    tenantId,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT_A,
    createdByUserId: OTHER,
    assigneeUserIds: [],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    ...overrides,
  };
}

type FixtureRow = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "NORMAL";
  dueAt: Date | null;
  completedAt: Date | null;
  contextType: null;
  contextId: null;
  parentTaskId: string | null;
  taskSeriesId: string | null;
  orgUnitId: string | null;
  visibilityScope: TaskVisibilityScope;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  assignees: Array<{
    userId: string;
    tenantId: string;
    assignedAt: Date;
    user: { id: string; firstName: string; lastName: string };
  }>;
  orgUnit?: { tenantId: string } | null;
};

function taskRow(overrides: Partial<FixtureRow> & { id: string; title: string }): FixtureRow {
  return {
    tenantId: TENANT_A,
    description: null,
    status: TaskStatusEnum.OPEN,
    priority: "NORMAL",
    dueAt: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: OTHER,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    assignees: [],
    orgUnit: null,
    ...overrides,
  };
}

function authFromRow(row: FixtureRow): TaskAuthorizationRecord {
  return {
    tenantId: row.tenantId,
    createdByUserId: row.createdByUserId,
    assigneeUserIds: row.assignees.map((a) => a.userId),
    visibilityScope: row.visibilityScope,
    orgUnitId: row.orgUnitId,
    orgUnitTenantId: row.orgUnit?.tenantId ?? row.tenantId,
  };
}

function isTaskVisibilityWhere(clause: Prisma.TaskWhereInput): boolean {
  return Boolean(
    clause.OR?.some(
      (b) =>
        "createdByUserId" in b ||
        "visibilityScope" in b ||
        ("assignees" in b && b.assignees && "some" in b.assignees),
    ),
  );
}

function evalTaskWhere(
  row: FixtureRow,
  where: Prisma.TaskWhereInput,
  ctx: ReturnType<typeof serviceCtx>,
): boolean {
  if (where.AND) {
    const clauses = Array.isArray(where.AND) ? where.AND : [where.AND];
    return clauses.every((w) => evalTaskWhere(row, w, ctx));
  }
  if (where.OR) {
    if (isTaskVisibilityWhere(where)) {
      return canReadTask(ctx, authFromRow(row));
    }
    return where.OR.some((w) => evalTaskWhere(row, w, ctx));
  }
  if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
  if (where.title && typeof where.title === "object" && "contains" in where.title) {
    const needle = String(where.title.contains).toLowerCase();
    if (!row.title.toLowerCase().includes(needle)) return false;
  }
  if (where.assignees?.some?.userId) {
    const uid = where.assignees.some.userId;
    if (!row.assignees.some((a) => a.userId === uid)) return false;
  }
  return true;
}

function installTaskFixtureEngine(fixtures: FixtureRow[], ctx: ReturnType<typeof serviceCtx>) {
  const filter = (where: Prisma.TaskWhereInput) =>
    fixtures.filter((row) => evalTaskWhere(row, where, ctx));
  mocks.taskCount.mockImplementation(async ({ where }: { where: Prisma.TaskWhereInput }) =>
    filter(where).length,
  );
  mocks.taskFindMany.mockImplementation(
    async ({ where }: { where: Prisma.TaskWhereInput }) => filter(where),
  );
}

function assertNoSentinelLeak(payload: unknown, sentinels: string[]) {
  const text = JSON.stringify(payload);
  for (const sentinel of sentinels) {
    expect(text.includes(sentinel)).toBe(false);
  }
}

describe("AUFGABEN-05-ORG-05 security sentinels", () => {
  describe("S1 — foreign tenant Task hidden", () => {
    it("denies read for cross-tenant record", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
      expect(
        canReadTask(ctx, {
          tenantId: TENANT_B,
          createdByUserId: OTHER,
          assigneeUserIds: [],
          visibilityScope: TaskVisibilityScope.CLUB,
          orgUnitId: null,
        }),
      ).toBe(false);
    });

    it("denies direct detail load for foreign tenant row", async () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
      mocks.taskFindFirst.mockResolvedValue(
        taskRow({
          id: "foreign-task",
          title: "Foreign tenant task",
          tenantId: TENANT_B,
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      );
      await expect(getTask(ctx, "foreign-task")).rejects.toBeInstanceOf(TaskForbiddenError);
    });
  });

  describe("S2 — view_all cannot read ASSIGNEES_ONLY", () => {
    it("blocks tenant-wide read actor", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
      expect(
        canReadTask(
          ctx,
          authRecord({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
        ),
      ).toBe(false);
    });
  });

  describe("S3 — tenant-wide manage cannot read confidential ORG_UNIT without relationship", () => {
    it("blocks manage-only actor on unrelated org unit", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {
        memberOrgUnitIds: [ORG_F2],
      });
      expect(
        canReadTask(
          ctx,
          authRecord({
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: ORG_FINANCE,
            orgUnitTenantId: TENANT_A,
          }),
        ),
      ).toBe(false);
    });
  });

  describe("S4 — direct assignee can read assigned confidential Task", () => {
    it("allows ASSIGNEES_ONLY for assignee", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW]);
      expect(
        canReadTask(
          ctx,
          authRecord({
            visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
            assigneeUserIds: [USER],
          }),
        ),
      ).toBe(true);
    });
  });

  describe("S5 — unrelated OrgUnit manager cannot read confidential Task", () => {
    it("denies scoped manager on different org branch", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], {
        permissionManageOrgUnitIds: [ORG_VORSTAND],
        memberOrgUnitIds: [ORG_VORSTAND],
      });
      expect(
        canReadTask(
          ctx,
          authRecord({
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: ORG_FINANCE,
            orgUnitTenantId: TENANT_A,
          }),
        ),
      ).toBe(false);
    });
  });

  describe("S6 — scoped authorized manager can manage correct ORG_UNIT Task", () => {
    it("allows manage when scoped to owning org unit", () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {
        memberOrgUnitIds: [ORG_FINANCE],
        permissionManageOrgUnitIds: [ORG_FINANCE],
      });
      const task = authRecord({
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
        orgUnitTenantId: TENANT_A,
      });
      expect(canReadTask(ctx, task)).toBe(true);
      expect(canManageTask(ctx, task)).toBe(true);
    });
  });

  describe("S7 — ASSIGNEES_ONLY not leaked via count/filter", () => {
    const fixtures = [
      taskRow({
        id: "sentinel-board",
        title: SENTINEL_ASSIGNEES,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      }),
      taskRow({
        id: "club-decoy",
        title: "Public club task",
        visibilityScope: TaskVisibilityScope.CLUB,
      }),
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("hides sentinel from management search and totals", async () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
      installTaskFixtureEngine(fixtures, ctx);
      const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_ASSIGNEES });
      const list = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
      expect(list.items).toHaveLength(0);
      expect(list.totalCount).toBe(0);
      assertNoSentinelLeak(list, [SENTINEL_ASSIGNEES]);
    });

    it("does not expose unauthorized org units in filter picker", async () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_F2] });
      mocks.orgUnitFindMany.mockResolvedValue([
        { id: ORG_F2, name: "F2", parentId: null, level: 1, sortOrder: 0 },
        { id: ORG_FINANCE, name: SENTINEL_ORG_UNIT, parentId: null, level: 1, sortOrder: 1 },
      ]);
      mocks.taskFindMany.mockResolvedValue([]);
      const options = await loadTaskOrgUnitFilterOptions(ctx);
      expect(options.map((o) => o.id)).toEqual([ORG_F2]);
      assertNoSentinelLeak(options, [SENTINEL_ORG_UNIT]);
    });
  });

  describe("S8 — propagation-locked subtask cannot be published CLUB", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_FINANCE, status: "ACTIVE" });
      mocks.tenantMembershipFindMany.mockResolvedValue([]);
    });

    it("rejects CLUB escalation on subtask", async () => {
      mocks.taskFindFirst.mockResolvedValue(
        taskRow({
          id: "sub-locked",
          title: "Locked sub",
          parentTaskId: "parent-1",
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          orgUnitId: null,
        }),
      );
      await expect(
        updateTask(serviceCtx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "sub-locked", {
          visibilityScope: TaskVisibilityScope.CLUB,
          orgUnitId: null,
        }),
      ).rejects.toMatchObject({ name: "TaskForbiddenError" });
      expect(mocks.taskUpdate).not.toHaveBeenCalled();
    });
  });

  describe("S9 — generated occurrence cannot be published CLUB", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_FINANCE, status: "ACTIVE" });
      mocks.tenantMembershipFindMany.mockResolvedValue([]);
    });

    it("rejects visibility mutation on series occurrence", async () => {
      mocks.taskFindFirst.mockResolvedValue(
        taskRow({
          id: "occ-1",
          title: "Occurrence",
          taskSeriesId: "series-1",
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
          orgUnit: { tenantId: TENANT_A },
        }),
      );
      await expect(
        updateTask(serviceCtx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW]), "occ-1", {
          visibilityScope: TaskVisibilityScope.CLUB,
        }),
      ).rejects.toMatchObject({ name: "TaskForbiddenError" });
      expect(mocks.taskUpdate).not.toHaveBeenCalled();
    });
  });

  describe("S10 — unchanged security values do not block legitimate locked-task edit", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_FINANCE, status: "ACTIVE" });
      mocks.tenantMembershipFindMany.mockResolvedValue([]);
      mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          task: { update: mocks.taskUpdate },
          auditLog: { create: mocks.auditCreate },
          tenant: { findUnique: vi.fn() },
        }),
      );
      mocks.auditCreate.mockResolvedValue({});
    });

    it("allows title update when org metadata unchanged on locked subtask", async () => {
      mocks.taskFindFirst.mockResolvedValue(
        taskRow({
          id: "sub-1",
          title: "Before",
          parentTaskId: "parent-1",
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
          orgUnit: { tenantId: TENANT_A },
        }),
      );
      mocks.taskUpdate.mockResolvedValue(
        taskRow({
          id: "sub-1",
          title: "After",
          parentTaskId: "parent-1",
          visibilityScope: TaskVisibilityScope.ORG_UNIT,
          orgUnitId: ORG_FINANCE,
          orgUnit: { tenantId: TENANT_A },
        }),
      );
      const manageCtx = serviceCtx([PERMISSIONS.TASKS_MANAGE, PERMISSIONS.TASKS_VIEW], {
        memberOrgUnitIds: [ORG_FINANCE],
        permissionManageOrgUnitIds: [ORG_FINANCE],
      });
      await updateTask(manageCtx, "sub-1", {
        title: "After",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      });
      expect(mocks.taskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "After" }),
        }),
      );
    });
  });

  describe("S11 — known unreadable MEETING cannot be attached", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(canSeeMeeting).mockReturnValue(false);
      mocks.meetingFindFirst.mockResolvedValue({
        id: "mtg-hidden",
        visibilityScope: "RESTRICTED",
        createdByUserId: OTHER,
        visibleRoleRefs: [],
        visibleUserRefs: [],
        visibleTeamRefs: [],
        visibleOrgUnitRefs: [],
        visiblePersonRefs: [],
        visibleTargetGroupRefs: [],
      });
    });

    it("rejects attach for unreadable meeting", async () => {
      await expect(
        validateTaskContext(
          serviceCtx([PERMISSIONS.TASKS_CREATE, PERMISSIONS.MEETINGS_VIEW]),
          "MEETING",
          "mtg-hidden",
        ),
      ).rejects.toThrow(TaskValidationError);
    });
  });

  describe("S12 — notification/deep link does not bypass Task authorization", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("getTask re-checks authorization on open (revoked org membership)", async () => {
      const row = taskRow({
        id: "deep-link-task",
        title: SENTINEL_ORG_UNIT,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
        orgUnit: { tenantId: TENANT_A },
      });
      mocks.taskFindFirst.mockResolvedValue(row);
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [] });
      await expect(getTask(ctx, "deep-link-task")).rejects.toBeInstanceOf(TaskForbiddenError);
    });
  });

  describe("S13 — OrgUnit membership does not populate Meine Aufgaben with unrelated Tasks", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: USER }]);
    });

    it("listMyTasks stays assignee-scoped despite org membership", async () => {
      const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL], {
        memberOrgUnitIds: [ORG_FINANCE, ORG_F2],
      });
      mocks.taskFindMany.mockResolvedValue([]);
      const tasks = await listMyTasks(ctx, { openOnly: true });
      expect(tasks).toEqual([]);
      expect(mocks.taskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignees: { some: { userId: USER, tenantId: TENANT_A } },
          }),
        }),
      );
      expect(mocks.taskFindMany.mock.calls[0]![0].where.OR).toBeUndefined();
    });
  });

  describe("S14 — OrgUnit membership does not populate Agenda", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("agenda task query remains assignee-only", async () => {
      await loadTaskDeadlineProjections({
        tenantId: TENANT_A,
        userId: USER,
        rangeStart: new Date("2026-01-01"),
        rangeEnd: new Date("2026-12-31"),
        tasksViewAuthorized: true,
      });
      expect(mocks.taskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignees: { some: { userId: USER, tenantId: TENANT_A } },
          }),
        }),
      );
      expect(mocks.taskFindMany.mock.calls[0]![0].where.visibilityScope).toBeUndefined();
    });
  });

  describe("S15 — membership removal revokes fresh access", () => {
    const staleRow = taskRow({
      id: "stale-org-task",
      title: "Finance task",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
      orgUnit: { tenantId: TENANT_A },
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("denies after membership removed", async () => {
      const withoutMembership = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [] });
      expect(canReadTask(withoutMembership, authFromRow(staleRow))).toBe(false);
      mocks.taskFindFirst.mockResolvedValue(staleRow);
      await expect(getTask(withoutMembership, staleRow.id)).rejects.toBeInstanceOf(
        TaskForbiddenError,
      );
    });
  });

  describe("S16 — explicit VP + Trainer + Parent Matrix Z remains additive", () => {
    const matrixUser = "matrix-z-vp-trainer-parent";
    const matrixCtx = serviceCtx(
      [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TRAININGS_MANAGE,
      ],
      {
        permissionReadOrgUnitIds: [ORG_VORSTAND],
        permissionManageOrgUnitIds: [ORG_VORSTAND],
        memberOrgUnitIds: [ORG_F2],
      },
      matrixUser,
    );

    const matrixFixtures = [
      taskRow({
        id: "t-vorstand",
        title: "Vorstand org task",
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_VORSTAND,
        orgUnit: { tenantId: TENANT_A },
      }),
      taskRow({
        id: "t-finance-hidden",
        title: SENTINEL_ORG_UNIT,
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
        orgUnit: { tenantId: TENANT_A },
      }),
      taskRow({
        id: "t-assigned",
        title: "VP assigned confidential",
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        assignees: [
          {
            userId: matrixUser,
            tenantId: TENANT_A,
            assignedAt: new Date(),
            user: { id: matrixUser, firstName: "V", lastName: "P" },
          },
        ],
      }),
      taskRow({
        id: "t-unrelated-conf",
        title: SENTINEL_ASSIGNEES,
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      }),
    ];

    beforeEach(() => {
      vi.clearAllMocks();
      installTaskFixtureEngine(matrixFixtures, matrixCtx);
      mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: matrixUser }]);
    });

    it("combines scoped management, assignee tasks, and parent attendance without persona switch", async () => {
      expect(canReadTask(matrixCtx, authFromRow(matrixFixtures[0]!))).toBe(true);
      expect(canReadTask(matrixCtx, authFromRow(matrixFixtures[1]!))).toBe(false);
      expect(canReadTask(matrixCtx, authFromRow(matrixFixtures[2]!))).toBe(true);
      expect(canReadTask(matrixCtx, authFromRow(matrixFixtures[3]!))).toBe(false);

      mocks.taskFindMany.mockImplementation(async ({ where }: { where: Prisma.TaskWhereInput }) =>
        matrixFixtures.filter((row) => evalTaskWhere(row, where, matrixCtx)),
      );
      const meine = await listMyTasks(matrixCtx, { openOnly: true });
      expect(meine.map((t) => t.id)).toEqual(["t-assigned"]);

      mocks.getAuthorizedPersonIdsForUser.mockResolvedValue(["child-a"]);
      mocks.loadAttendanceObligationCandidates.mockImplementation(
        async (_tenantId: string, personIds: string[]) => {
          const rows = [
            {
              personId: "child-a",
              personDisplayName: "Child A",
              teamSeasonId: "ts-f2",
              teamDisplayName: "F2",
              eventKind: "MATCH" as const,
              eventId: "match-a",
              eventTitle: "Child match",
              eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
              responseId: null,
              responseStatus: "OPEN" as const,
            },
            {
              personId: "player-other",
              personDisplayName: "Other",
              teamSeasonId: "ts-f2",
              teamDisplayName: "F2",
              eventKind: "MATCH" as const,
              eventId: "match-b",
              eventTitle: "Other match",
              eventStartAt: new Date("2026-09-26T18:00:00.000Z"),
              responseId: null,
              responseStatus: "OPEN" as const,
            },
          ];
          return rows.filter((r) => personIds.includes(r.personId));
        },
      );

      const attendance = await attendancePersonalActionSource.loadActionable({
        tenantId: TENANT_A,
        userId: matrixUser,
        permissionKeys: matrixCtx.permissionKeys,
        now: new Date("2026-09-20T12:00:00.000Z"),
      });
      expect(attendance.some((a) => a.subject?.personId === "child-a")).toBe(true);
      expect(attendance.some((a) => a.subject?.personId === "player-other")).toBe(false);

      const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_ASSIGNEES });
      const list = await listTaskManagementItems(matrixCtx, query, "Europe/Zurich", "de-CH");
      expect(list.totalCount).toBe(0);
      assertNoSentinelLeak(list, [SENTINEL_ASSIGNEES, SENTINEL_ORG_UNIT]);
    });
  });

  describe("S17 — Super Admin has no blanket confidentiality bypass", () => {
    const superAdminLike = serviceCtx(
      [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_VIEW_ALL,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.MEETINGS_VIEW,
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.PEOPLE_VIEW,
        PERMISSIONS.WORKSPACE_VIEW,
        PERMISSIONS.WORKSPACE_MANAGE,
      ],
      { memberOrgUnitIds: [], permissionManageOrgUnitIds: [] },
    );

    it("ASSIGNEES_ONLY remains confidential without direct relationship", () => {
      expect(
        canReadTask(
          superAdminLike,
          authRecord({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
        ),
      ).toBe(false);
    });

    it("ORG_UNIT remains governed by org relationship", () => {
      expect(
        canReadTask(
          superAdminLike,
          authRecord({
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: ORG_FINANCE,
            orgUnitTenantId: TENANT_A,
          }),
        ),
      ).toBe(false);
    });

    it("cannot manage confidential ORG_UNIT without scoped authority", () => {
      expect(
        canManageTask(
          superAdminLike,
          authRecord({
            visibilityScope: TaskVisibilityScope.ORG_UNIT,
            orgUnitId: ORG_FINANCE,
            orgUnitTenantId: TENANT_A,
          }),
        ),
      ).toBe(false);
    });
  });
});
