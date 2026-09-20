/**
 * AUFGABEN-05-ORG-02-A2 — final confidentiality edge acceptance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma, TaskStatus } from "@prisma/client";
import { TaskStatus as TaskStatusEnum, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  canReadTaskSeries,
  EMPTY_TASK_AUTH_SCOPE,
  loadTaskAuthScope,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import {
  getTaskManagementSummary,
  listTaskManagementItems,
  listTaskSeriesManagementRows,
} from "../management-service";
import { parseTaskManagementQuery } from "../management-navigation";
import {
  completeTask,
  getTask,
  listMyTasks,
} from "../task-service";
import { getTaskSeriesForRead } from "../task-series-service";
import { ParentHasOpenSubtasksError, TaskForbiddenError } from "../errors";

const mocks = vi.hoisted(() => ({
  taskCount: vi.fn(),
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  taskSeriesFindMany: vi.fn(),
  loadOrgUnitIds: vi.fn(),
  orgUnitFindMany: vi.fn(),
  userRoleFindMany: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  auditCreate: vi.fn(),
  getAuthorizedPersonIdsForUser: vi.fn(),
  loadAttendanceObligationCandidates: vi.fn(),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: mocks.loadOrgUnitIds,
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
    orgUnit: { findMany: mocks.orgUnitFindMany },
    userRole: { findMany: mocks.userRoleFindMany },
    task: {
      count: mocks.taskCount,
      findMany: mocks.taskFindMany,
      findFirst: mocks.taskFindFirst,
      update: mocks.taskUpdate,
    },
    taskSeries: {
      findFirst: mocks.taskSeriesFindFirst,
      findMany: mocks.taskSeriesFindMany,
    },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    auditLog: { create: mocks.auditCreate },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        task: {
          update: mocks.taskUpdate,
        },
        auditLog: { create: mocks.auditCreate },
      }),
    ),
  },
}));

vi.mock("@/lib/audit/audit-record", () => ({
  writeAuditRecord: vi.fn(),
}));

import { attendancePersonalActionSource } from "@/lib/personal-actions/sources/attendance-source";

const TENANT_A = "tenant-a";
const USER = "matrix-z-user";
const OTHER = "user-other";

const ORG_VORSTAND = "org-vorstand";
const ORG_F2 = "org-f2";
const ORG_FINANCE = "org-finance";

const SENTINEL_FINANCE = "CONFIDENTIAL_FINANCE_SENTINEL";
const SENTINEL_BOARD = "CONFIDENTIAL_BOARD_SENTINEL";

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
    orgUnitTenantId: row.orgUnit?.tenantId ?? TENANT_A,
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
  if (where.parentTaskId === null && row.parentTaskId !== null) return false;
  if (where.parentTaskId && row.parentTaskId !== where.parentTaskId) return false;
  if (typeof where.status === "string" && row.status !== where.status) return false;
  if (where.status && typeof where.status === "object" && "in" in where.status) {
    const statuses = where.status.in as TaskStatus[];
    if (!statuses.includes(row.status)) return false;
  }
  if (where.title && typeof where.title === "object" && "contains" in where.title) {
    const needle = String(where.title.contains).toLowerCase();
    if (!row.title.toLowerCase().includes(needle)) return false;
  }
  if (where.assignees?.some?.userId) {
    const uid = where.assignees.some.userId;
    if (!row.assignees.some((a) => a.userId === uid)) return false;
  }
  if (where.dueAt && typeof where.dueAt === "object") {
    if ("lt" in where.dueAt && where.dueAt.lt instanceof Date) {
      if (!row.dueAt || row.dueAt >= where.dueAt.lt) return false;
    }
    if ("gte" in where.dueAt && where.dueAt.gte instanceof Date) {
      if (!row.dueAt || row.dueAt < where.dueAt.gte) return false;
    }
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

function serviceCtx(
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
) {
  return {
    tenantId: TENANT_A,
    userId: USER,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function assertNoSentinelLeak(payload: unknown, sentinels: string[]) {
  const text = JSON.stringify(payload);
  for (const sentinel of sentinels) {
    expect(text.includes(sentinel)).toBe(false);
  }
}

describe("AUFGABEN-05-ORG-02-A2 sentinel search via Task Center query path", () => {
  const confidentialFixtures: FixtureRow[] = [
    taskRow({
      id: "finance-org",
      title: SENTINEL_FINANCE,
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
      orgUnit: { tenantId: TENANT_A },
    }),
    taskRow({
      id: "board-assignees",
      title: SENTINEL_BOARD,
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    }),
    taskRow({
      id: "club-visible",
      title: "CLUB_TASK_CONFIDENTIAL_FINANCE_SENTINEL decoy",
      visibilityScope: TaskVisibilityScope.CLUB,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([]);
  });

  it("ASSIGNEES_ONLY hidden from unrelated tasks.view_all user", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({
      view: "ALLE",
      q: SENTINEL_BOARD,
    });
    const result = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    expect(result.pageCount).toBe(1);
    assertNoSentinelLeak(result, [SENTINEL_BOARD]);
  });

  it("ASSIGNEES_ONLY hidden from unrelated tasks.manage user", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]);
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_BOARD });
    const result = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    assertNoSentinelLeak(result, [SENTINEL_BOARD]);
  });

  it("ORG_UNIT hidden from unrelated org actor", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_F2] });
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_FINANCE });
    const result = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    assertNoSentinelLeak(result, [SENTINEL_FINANCE]);
  });

  it("ORG_UNIT visible to legitimate owning-unit actor", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_FINANCE] });
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_FINANCE });
    const result = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.task.title).toBe(SENTINEL_FINANCE);
  });

  it("CLUB visible according to view_all semantics", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({
      view: "ALLE",
      q: "CLUB_TASK_CONFIDENTIAL_FINANCE_SENTINEL",
    });
    const result = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    expect(result.totalCount).toBe(1);
  });

  it("ROWS_COUNTS_PARITY: KPI totals stay zero for unauthorized sentinel search", async () => {
    const ctx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);
    installTaskFixtureEngine(confidentialFixtures, ctx);
    const query = parseTaskManagementQuery({ view: "ALLE", q: SENTINEL_BOARD });
    const list = await listTaskManagementItems(ctx, query, "Europe/Zurich", "de-CH");
    const summary = await getTaskManagementSummary(ctx, "Europe/Zurich");
    expect(list.totalCount).toBe(0);
    expect(summary.open).toBe(1);
    expect(summary.overdue).toBe(0);
    expect(summary.dueThisWeek).toBe(0);
    assertNoSentinelLeak(list, [SENTINEL_BOARD]);
  });
});

describe("AUFGABEN-05-ORG-02-A2 stale org membership access", () => {
  const staleTaskId = "org-unit-stale-task";
  const staleRow = taskRow({
    id: staleTaskId,
    title: "Finance org task",
    visibilityScope: TaskVisibilityScope.ORG_UNIT,
    orgUnitId: ORG_FINANCE,
    orgUnit: { tenantId: TENANT_A },
  });

  const withMembership = serviceCtx([PERMISSIONS.TASKS_VIEW], {
    memberOrgUnitIds: [ORG_FINANCE],
  });
  const withoutMembership = serviceCtx([PERMISSIONS.TASKS_VIEW], {
    memberOrgUnitIds: [],
  });
  const assigneeAfterRemoval = serviceCtx([PERMISSIONS.TASKS_VIEW], {
    memberOrgUnitIds: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([]);
  });

  it("BEFORE_MEMBERSHIP_REMOVAL: actor reads org-unit task", async () => {
    expect(canReadTask(withMembership, authFromRow(staleRow))).toBe(true);
    mocks.taskFindFirst.mockResolvedValue(staleRow);
    const dto = await getTask(withMembership, staleTaskId);
    expect(dto.id).toBe(staleTaskId);
  });

  it("AFTER_MEMBERSHIP_REMOVAL: detail/search/list/count/KPI deny org access", async () => {
    expect(canReadTask(withoutMembership, authFromRow(staleRow))).toBe(false);

    mocks.taskFindFirst.mockResolvedValue(staleRow);
    await expect(getTask(withoutMembership, staleTaskId)).rejects.toBeInstanceOf(
      TaskForbiddenError,
    );

    installTaskFixtureEngine([staleRow], withoutMembership);
    const query = parseTaskManagementQuery({ view: "ALLE", q: "Finance org task" });
    const list = await listTaskManagementItems(
      withoutMembership,
      query,
      "Europe/Zurich",
      "de-CH",
    );
    expect(list.items).toHaveLength(0);
    expect(list.totalCount).toBe(0);

    const summary = await getTaskManagementSummary(withoutMembership, "Europe/Zurich");
    expect(summary.open).toBe(0);
  });

  it("ASSIGNEE_DIRECT_ACCESS preserved when org membership removed", async () => {
    const assignedRow = {
      ...staleRow,
      assignees: [
        {
          userId: USER,
          tenantId: TENANT_A,
          assignedAt: new Date(),
          user: { id: USER, firstName: "A", lastName: "B" },
        },
      ],
    };
    mocks.taskFindFirst.mockResolvedValue(assignedRow);
    const dto = await getTask(assigneeAfterRemoval, staleTaskId);
    expect(dto.id).toBe(staleTaskId);
  });

  it("fresh loadTaskAuthScope reflects membership removal", async () => {
    mocks.orgUnitFindMany.mockResolvedValue([]);
    mocks.loadOrgUnitIds.mockResolvedValueOnce([ORG_FINANCE]).mockResolvedValueOnce([]);
    mocks.userRoleFindMany.mockResolvedValue([]);

    const before = await loadTaskAuthScope(USER, TENANT_A);
    const after = await loadTaskAuthScope(USER, TENANT_A);
    expect(before.memberOrgUnitIds).toEqual([ORG_FINANCE]);
    expect(after.memberOrgUnitIds).toEqual([]);
  });
});

describe("AUFGABEN-05-ORG-02-A2 multi-role matrix Z (additive union)", () => {
  const matrixCtx = serviceCtx(
    [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TRAININGS_MANAGE,
    ],
    {
      permissionReadOrgUnitIds: [ORG_VORSTAND],
      permissionManageOrgUnitIds: [ORG_VORSTAND],
      memberOrgUnitIds: [ORG_F2],
    },
  );

  const tasks = {
    vorstandOrg: taskRow({
      id: "t-vorstand",
      title: "Vorstand org task",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_VORSTAND,
      orgUnit: { tenantId: TENANT_A },
    }),
    f2Org: taskRow({
      id: "t-f2",
      title: "F2 org task",
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_F2,
      orgUnit: { tenantId: TENANT_A },
    }),
    financeOrg: taskRow({
      id: "t-finance",
      title: SENTINEL_FINANCE,
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_FINANCE,
      orgUnit: { tenantId: TENANT_A },
    }),
    assignedConfidential: taskRow({
      id: "t-assigned-conf",
      title: "Assigned confidential",
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      assignees: [
        {
          userId: USER,
          tenantId: TENANT_A,
          assignedAt: new Date(),
          user: { id: USER, firstName: "V", lastName: "P" },
        },
      ],
    }),
    unrelatedConfidential: taskRow({
      id: "t-unrelated-conf",
      title: SENTINEL_BOARD,
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    }),
    personalAssigned: taskRow({
      id: "t-personal",
      title: "Personal assigned",
      visibilityScope: TaskVisibilityScope.CLUB,
      assignees: [
        {
          userId: USER,
          tenantId: TENANT_A,
          assignedAt: new Date(),
          user: { id: USER, firstName: "V", lastName: "P" },
        },
      ],
    }),
    manageableUnassigned: taskRow({
      id: "t-manageable-unassigned",
      title: "Manageable club task",
      visibilityScope: TaskVisibilityScope.CLUB,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installTaskFixtureEngine(Object.values(tasks), matrixCtx);
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: USER }]);
  });

  it("simultaneous capability union across org, assignee, and personal views", async () => {
    expect(canReadTask(matrixCtx, authFromRow(tasks.vorstandOrg))).toBe(true);
    expect(canReadTask(matrixCtx, authFromRow(tasks.f2Org))).toBe(true);
    expect(canReadTask(matrixCtx, authFromRow(tasks.financeOrg))).toBe(false);
    expect(canReadTask(matrixCtx, authFromRow(tasks.assignedConfidential))).toBe(true);
    expect(canReadTask(matrixCtx, authFromRow(tasks.unrelatedConfidential))).toBe(false);

    const meine = await listMyTasks(matrixCtx, { openOnly: true });
    expect(meine.map((t) => t.id).sort()).toEqual(
      [tasks.personalAssigned.id, tasks.assignedConfidential.id].sort(),
    );
    expect(meine.some((t) => t.id === tasks.manageableUnassigned.id)).toBe(false);

    const query = parseTaskManagementQuery({ view: "MEINE" });
    const meineList = await listTaskManagementItems(
      matrixCtx,
      query,
      "Europe/Zurich",
      "de-CH",
    );
    expect(meineList.totalCount).toBe(2);
    expect(meineList.items.every((i) => i.task.assignees.some((a) => a.userId === USER))).toBe(
      true,
    );

    mocks.getAuthorizedPersonIdsForUser.mockResolvedValue(["child-a"]);
    mocks.loadAttendanceObligationCandidates.mockImplementation(
      async (_tenantId: string, personIds: string[]) => {
        const all = [
          {
            personId: "child-a",
            personDisplayName: "Child A",
            teamSeasonId: "ts-f2",
            teamDisplayName: "F2",
            eventKind: "MATCH" as const,
            eventId: "match-child-a",
            eventTitle: "Child A match",
            eventStartAt: new Date("2026-09-25T18:00:00.000Z"),
            responseId: null,
            responseStatus: "OPEN" as const,
          },
          {
            personId: "player-other",
            personDisplayName: "Other player",
            teamSeasonId: "ts-f2",
            teamDisplayName: "F2",
            eventKind: "MATCH" as const,
            eventId: "match-other",
            eventTitle: "Other match",
            eventStartAt: new Date("2026-09-26T18:00:00.000Z"),
            responseId: null,
            responseStatus: "OPEN" as const,
          },
        ];
        return all.filter((row) => personIds.includes(row.personId));
      },
    );

    const attendance = await attendancePersonalActionSource.loadActionable({
      tenantId: TENANT_A,
      userId: USER,
      permissionKeys: matrixCtx.permissionKeys,
      now: new Date("2026-09-20T12:00:00.000Z"),
    });
    expect(attendance.some((a) => a.subject?.personId === "child-a")).toBe(true);
    expect(attendance.some((a) => a.subject?.personId === "player-other")).toBe(false);
    expect(mocks.getAuthorizedPersonIdsForUser).toHaveBeenCalledWith(TENANT_A, USER);

    expect(matrixCtx.permissionKeys).toEqual(
      expect.arrayContaining([
        PERMISSIONS.TASKS_VIEW_ALL,
        PERMISSIONS.TRAININGS_MANAGE,
      ]),
    );
  });
});

describe("AUFGABEN-05-ORG-02-A2 hidden subtask completion semantics", () => {
  const parentId = "parent-readable";
  const parentRow = taskRow({
    id: parentId,
    title: "Parent P",
    visibilityScope: TaskVisibilityScope.ORG_UNIT,
    orgUnitId: ORG_F2,
    orgUnit: { tenantId: TENANT_A },
    assignees: [
      {
        userId: USER,
        tenantId: TENANT_A,
        assignedAt: new Date(),
        user: { id: USER, firstName: "A", lastName: "ctor" },
      },
    ],
  });

  const actorCtx = serviceCtx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [ORG_F2] });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue(parentRow);
    mocks.tenantMembershipFindMany.mockResolvedValue([{ userId: USER }]);
  });

  it("blocks completion without revealing hidden actionable child", async () => {
    mocks.taskFindMany.mockResolvedValue([
      { status: TaskStatusEnum.DONE },
      { status: TaskStatusEnum.OPEN },
    ]);

    await expect(completeTask(actorCtx, parentId)).rejects.toBeInstanceOf(
      ParentHasOpenSubtasksError,
    );

    const childQuery = mocks.taskFindMany.mock.calls[0]?.[0]?.where;
    expect(childQuery).toEqual({
      tenantId: TENANT_A,
      parentTaskId: parentId,
    });
    expect(childQuery).not.toHaveProperty("AND");
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });

  it("allows completion when all children are terminal (visible universe aligned)", async () => {
    mocks.taskFindMany.mockResolvedValue([{ status: TaskStatusEnum.DONE }]);
    mocks.taskUpdate.mockResolvedValue({
      ...parentRow,
      status: TaskStatusEnum.DONE,
      completedAt: new Date(),
    });

    const dto = await completeTask(actorCtx, parentId);
    expect(dto.status).toBe(TaskStatusEnum.DONE);
  });
});

describe("AUFGABEN-05-ORG-02-A2 series fallback fail-closed", () => {
  const actorCtx = serviceCtx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]);

  const assigneesOnlySeries = {
    id: "series-assignees",
    tenantId: TENANT_A,
    title: "CONFIDENTIAL SERIES CONFIG",
    createdByUserId: OTHER,
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    assigneeTemplates: [],
    subtaskTemplates: [],
    frequency: "WEEKLY",
    intervalCount: 1,
    weekday: "MONDAY",
    monthDay: null,
    status: "ACTIVE",
    occurrences: [{ dueAt: new Date() }],
    _count: { occurrences: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskSeriesFindMany.mockResolvedValue([]);
    mocks.taskSeriesFindFirst.mockResolvedValue(null);
  });

  it("ASSIGNEES_ONLY series with CLUB occurrence does not expose series container", async () => {
    expect(
      canReadTaskSeries(actorCtx, {
        tenantId: TENANT_A,
        createdByUserId: OTHER,
        assigneeUserIds: [],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
      }),
    ).toBe(false);

    await expect(getTaskSeriesForRead(actorCtx, assigneesOnlySeries.id)).rejects.toThrow();

    const query = parseTaskManagementQuery({
      view: "WIEDERKEHREND",
      q: "CONFIDENTIAL SERIES",
    });
    const list = await listTaskSeriesManagementRows(actorCtx, query);
    expect(list.rows).toHaveLength(0);
    expect(list.totalCount).toBe(0);
  });

  it("ORG_UNIT series with CLUB occurrence does not expose series metadata", async () => {
    expect(
      canReadTaskSeries(actorCtx, {
        tenantId: TENANT_A,
        createdByUserId: OTHER,
        assigneeUserIds: [],
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_FINANCE,
      }),
    ).toBe(false);

    mocks.taskSeriesFindMany.mockResolvedValue([]);
    const query = parseTaskManagementQuery({ view: "WIEDERKEHREND", q: "ORG SERIES" });
    const list = await listTaskSeriesManagementRows(actorCtx, query);
    expect(list.rows).toHaveLength(0);
    assertNoSentinelLeak(list, ["ORG SERIES SECRET"]);
  });
});

describe("AUFGABEN-05-ORG-02-A2 org unit single source of truth", () => {
  it("loadTaskAuthScope resolves membership via canonical org queries only", async () => {
    mocks.orgUnitFindMany.mockResolvedValue([{ id: ORG_F2, parentId: null }]);
    mocks.loadOrgUnitIds.mockResolvedValue([ORG_F2]);
    mocks.userRoleFindMany.mockResolvedValue([]);

    const auth = await loadTaskAuthScope(USER, TENANT_A);
    expect(auth.memberOrgUnitIds).toEqual([ORG_F2]);
    expect(mocks.loadOrgUnitIds).toHaveBeenCalledWith(USER, TENANT_A);
    expect(mocks.orgUnitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_A, status: { not: "ARCHIVED" } },
      }),
    );
  });
});
