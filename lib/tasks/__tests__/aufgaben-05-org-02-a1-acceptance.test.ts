/**
 * AUFGABEN-05-ORG-02-A1 — security acceptance & hardening matrix.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskReadWhere,
  canManageTask,
  canReadTask,
  canReadTaskSeries,
  EMPTY_TASK_AUTH_SCOPE,
  hasTenantWideClubTaskRead,
  loadTaskAuthScope,
  orgReadableUnitIds,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { loadTaskWorkspace } from "../workspace-service";

const orgMocks = vi.hoisted(() => ({
  loadOrgUnitIds: vi.fn(),
  orgUnitFindMany: vi.fn(),
  userRoleFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: orgMocks.loadOrgUnitIds,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnit: { findMany: orgMocks.orgUnitFindMany },
    userRole: { findMany: orgMocks.userRoleFindMany },
    task: {
      findFirst: orgMocks.taskFindFirst,
      findMany: orgMocks.taskFindMany,
    },
    taskSeries: { findFirst: orgMocks.taskSeriesFindFirst },
    user: { findFirst: orgMocks.userFindFirst },
  },
}));

vi.mock("../context-presentation", () => ({
  resolveTaskContextPresentation: vi.fn().mockResolvedValue(null),
}));

vi.mock("../task-follow-service", () => ({
  getTaskFollowState: vi.fn(async () => ({ isFollowing: false, followerCount: 0 })),
  getTaskFollowStateForVisibleTask: vi.fn(async () => ({
    isFollowing: false,
    followerCount: 0,
  })),
}));

vi.mock("../task-document-reference-service", () => ({
  listTaskDocumentReferences: vi.fn(async () => []),
  listTaskDocumentReferencesForVisibleTask: vi.fn(async () => []),
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const USER = "user-actor";
const OTHER = "user-other";

const ROOT = "org-root";
const SPORT = "org-sport";
const JUNIORS = "org-juniors";
const F2 = "org-f2";
const SENIORS = "org-seniors";
const FINANCE = "org-finance";

function ctx(
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

function record(
  overrides: Partial<TaskAuthorizationRecord> = {},
): TaskAuthorizationRecord {
  return {
    tenantId: TENANT_A,
    createdByUserId: OTHER,
    assigneeUserIds: [],
    visibilityScope: TaskVisibilityScope.CLUB,
    orgUnitId: null,
    ...overrides,
  };
}

/** Mirrors buildTaskReadWhere OR branches for parity checks (in-memory). */
function matchesBuildTaskReadWhere(
  task: TaskAuthorizationRecord,
  serviceCtx: ReturnType<typeof ctx>,
): boolean {
  if (task.tenantId !== serviceCtx.tenantId) return false;

  const direct =
    task.createdByUserId === serviceCtx.userId ||
    task.assigneeUserIds.includes(serviceCtx.userId);
  if (direct) return true;

  if (
    hasTenantWideClubTaskRead(serviceCtx) &&
    task.visibilityScope === TaskVisibilityScope.CLUB
  ) {
    return true;
  }

  const orgIds = orgReadableUnitIds(serviceCtx.auth ?? EMPTY_TASK_AUTH_SCOPE);
  if (
    orgIds.length > 0 &&
    task.visibilityScope === TaskVisibilityScope.ORG_UNIT &&
    task.orgUnitId &&
    orgIds.includes(task.orgUnitId)
  ) {
    if (
      task.orgUnitTenantId != null &&
      task.orgUnitTenantId !== serviceCtx.tenantId
    ) {
      return false;
    }
    return true;
  }

  return false;
}

describe("AUFGABEN-05-ORG-02-A1 canonical org scope loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgMocks.loadOrgUnitIds.mockResolvedValue([]);
    orgMocks.userRoleFindMany.mockResolvedValue([]);
  });

  const hierarchy = [
    { id: ROOT, parentId: null },
    { id: SPORT, parentId: ROOT },
    { id: JUNIORS, parentId: SPORT },
    { id: F2, parentId: JUNIORS },
    { id: SENIORS, parentId: SPORT },
    { id: FINANCE, parentId: ROOT },
  ];

  it("propagates new org unit membership on fresh auth load without task sync", async () => {
    orgMocks.orgUnitFindMany.mockResolvedValue(hierarchy);
    orgMocks.loadOrgUnitIds.mockResolvedValueOnce([SPORT]).mockResolvedValueOnce([SPORT, F2]);

    const first = await loadTaskAuthScope(USER, TENANT_A);
    const second = await loadTaskAuthScope(USER, TENANT_A);

    expect(first.memberOrgUnitIds).toEqual([SPORT]);
    expect(second.memberOrgUnitIds).toEqual([SPORT, F2]);
  });

  it("THIS_ORG_UNIT scoped role covers only the assigned unit", async () => {
    orgMocks.orgUnitFindMany.mockResolvedValue(hierarchy);
    orgMocks.userRoleFindMany.mockResolvedValue([
      {
        orgUnitId: SPORT,
        scopeMode: "THIS_ORG_UNIT",
        role: {
          rolePermissions: [
            { permission: { key: PERMISSIONS.TASKS_VIEW } },
          ],
        },
      },
    ]);

    const auth = await loadTaskAuthScope(USER, TENANT_A);
    expect(auth.permissionReadOrgUnitIds.sort()).toEqual([SPORT].sort());
    expect(auth.permissionReadOrgUnitIds).not.toContain(JUNIORS);
    expect(auth.permissionReadOrgUnitIds).not.toContain(FINANCE);
  });

  it("THIS_ORG_UNIT_AND_DESCENDANTS expands current hierarchy on each load", async () => {
    orgMocks.orgUnitFindMany.mockResolvedValue(hierarchy);
    orgMocks.userRoleFindMany.mockResolvedValue([
      {
        orgUnitId: SPORT,
        scopeMode: "THIS_ORG_UNIT_AND_DESCENDANTS",
        role: {
          rolePermissions: [
            { permission: { key: PERMISSIONS.TASKS_MANAGE } },
          ],
        },
      },
    ]);

    const auth = await loadTaskAuthScope(USER, TENANT_A);
    expect(auth.permissionManageOrgUnitIds).toEqual(
      expect.arrayContaining([SPORT, JUNIORS, F2, SENIORS]),
    );
    expect(auth.permissionManageOrgUnitIds).not.toContain(FINANCE);
  });

  it("reflects hierarchy move without task row updates", async () => {
    const beforeMove = [
      { id: ROOT, parentId: null },
      { id: SPORT, parentId: ROOT },
      { id: JUNIORS, parentId: ROOT },
    ];
    const afterMove = [
      { id: ROOT, parentId: null },
      { id: SPORT, parentId: ROOT },
      { id: JUNIORS, parentId: SPORT },
    ];

    orgMocks.userRoleFindMany.mockResolvedValue([
      {
        orgUnitId: SPORT,
        scopeMode: "THIS_ORG_UNIT_AND_DESCENDANTS",
        role: {
          rolePermissions: [
            { permission: { key: PERMISSIONS.TASKS_VIEW } },
          ],
        },
      },
    ]);

    orgMocks.orgUnitFindMany.mockResolvedValueOnce(beforeMove);
    const beforeAuth = await loadTaskAuthScope(USER, TENANT_A);
    expect(beforeAuth.permissionReadOrgUnitIds).toContain(SPORT);
    expect(beforeAuth.permissionReadOrgUnitIds).not.toContain(JUNIORS);

    orgMocks.orgUnitFindMany.mockResolvedValueOnce(afterMove);
    const afterAuth = await loadTaskAuthScope(USER, TENANT_A);
    expect(afterAuth.permissionReadOrgUnitIds).toContain(JUNIORS);
  });

  it("excludes archived org units from scoped expansion graph", async () => {
    orgMocks.orgUnitFindMany.mockResolvedValue([
      { id: SPORT, parentId: ROOT },
    ]);
    orgMocks.loadOrgUnitIds.mockResolvedValue([SPORT]);

    const auth = await loadTaskAuthScope(USER, TENANT_A);
    expect(auth.memberOrgUnitIds).toEqual([SPORT]);
  });
});

describe("AUFGABEN-05-ORG-02-A1 query vs row policy parity", () => {
  const fixtures: TaskAuthorizationRecord[] = [
    record({ visibilityScope: TaskVisibilityScope.CLUB }),
    record({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: FINANCE,
      orgUnitTenantId: TENANT_A,
    }),
    record({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: FINANCE,
      orgUnitTenantId: TENANT_B,
    }),
    record({ visibilityScope: TaskVisibilityScope.ORG_UNIT, orgUnitId: null }),
    record({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
    record({ createdByUserId: USER, visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
    record({ assigneeUserIds: [USER], visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY }),
  ];

  const contexts = [
    ctx([PERMISSIONS.TASKS_VIEW]),
    ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
    ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [FINANCE] }),
    ctx([PERMISSIONS.TASKS_VIEW], {
      permissionReadOrgUnitIds: [FINANCE],
      permissionManageOrgUnitIds: [FINANCE],
    }),
    ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
  ];

  for (const serviceCtx of contexts) {
    it(`canReadTask matches buildTaskReadWhere for fixture set (${serviceCtx.permissionKeys.join(",")})`, () => {
      for (const task of fixtures) {
        expect(canReadTask(serviceCtx, task)).toBe(
          matchesBuildTaskReadWhere(task, serviceCtx),
        );
      }
      expect(buildTaskReadWhere(serviceCtx).tenantId).toBe(TENANT_A);
    });
  }
});

describe("AUFGABEN-05-ORG-02-A1 ASSIGNEES_ONLY attack matrix", () => {
  const confidential = record({
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
  });

  const attackContexts = [
    ctx([PERMISSIONS.TASKS_VIEW]),
    ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]),
    ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
    ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [FINANCE] }),
    ctx([PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [FINANCE] }),
    ctx([PERMISSIONS.TASKS_VIEW], {
      permissionManageOrgUnitIds: [FINANCE],
      permissionReadOrgUnitIds: [FINANCE],
    }),
    ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE], {
      memberOrgUnitIds: [FINANCE],
      permissionManageOrgUnitIds: [FINANCE],
      permissionReadOrgUnitIds: [FINANCE],
    }),
  ];

  for (const attackCtx of attackContexts) {
    it(`denies unrelated actor (${attackCtx.permissionKeys.join("+")})`, () => {
      expect(canReadTask(attackCtx, confidential)).toBe(false);
      expect(canManageTask(attackCtx, confidential)).toBe(false);
    });
  }

  it("allows read when explicitly assigned; manage stays policy-bound", () => {
    const assigned = record({
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      assigneeUserIds: [USER],
    });
    const assigneeCtx = ctx([PERMISSIONS.TASKS_VIEW]);
    expect(canReadTask(assigneeCtx, assigned)).toBe(true);
    expect(canManageTask(assigneeCtx, assigned)).toBe(false);
    expect(
      canManageTask(ctx([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]), assigned),
    ).toBe(false);
  });
});

describe("AUFGABEN-05-ORG-02-A1 foreign org corruption", () => {
  it("denies org-derived read when org unit tenant mismatches task tenant", () => {
    const corrupted = record({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: FINANCE,
      orgUnitTenantId: TENANT_B,
    });
    const member = ctx([PERMISSIONS.TASKS_VIEW], { memberOrgUnitIds: [FINANCE] });
    expect(canReadTask(member, corrupted)).toBe(false);
    expect(
      canReadTask(ctx([PERMISSIONS.TASKS_VIEW]), {
        ...corrupted,
        createdByUserId: USER,
      }),
    ).toBe(true);
  });
});

describe("AUFGABEN-05-ORG-02-A1 series row policy", () => {
  it("ASSIGNEES_ONLY series row denies view_all; assignee reads", () => {
    const series = {
      tenantId: TENANT_A,
      createdByUserId: OTHER,
      assigneeUserIds: [] as string[],
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      orgUnitId: null,
    };
    expect(canReadTaskSeries(ctx([PERMISSIONS.TASKS_VIEW_ALL]), series)).toBe(false);
    expect(
      canReadTaskSeries(
        ctx([PERMISSIONS.TASKS_VIEW]),
        { ...series, assigneeUserIds: [USER] },
      ),
    ).toBe(true);
  });
});

describe("AUFGABEN-05-ORG-02-A1 super admin without tenant task perms", () => {
  it("denies all scopes when permission keys and auth scope are empty", () => {
    const empty = ctx([]);
    for (const scope of [
      TaskVisibilityScope.CLUB,
      TaskVisibilityScope.ORG_UNIT,
      TaskVisibilityScope.ASSIGNEES_ONLY,
    ]) {
      expect(canReadTask(empty, record({ visibilityScope: scope, orgUnitId: FINANCE }))).toBe(
        false,
      );
    }
  });
});

describe("AUFGABEN-05-ORG-02-A1 subtask parent confidentiality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgMocks.taskFindMany.mockResolvedValue([]);
    orgMocks.userFindFirst.mockResolvedValue(null);
    orgMocks.taskSeriesFindFirst.mockResolvedValue(null);
  });

  it("hides parent title when child is readable but parent is not", async () => {
    const child = {
      id: "child-1",
      tenantId: TENANT_A,
      title: "Visible child",
      description: null,
      status: "OPEN",
      priority: "NORMAL",
      dueAt: null,
      completedAt: null,
      contextType: null,
      contextId: null,
      parentTaskId: "parent-secret",
      taskSeriesId: null,
      orgUnitId: null,
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      createdByUserId: OTHER,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      assignees: [
        {
          userId: USER,
          firstName: "A",
          lastName: "B",
          assignedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    orgMocks.taskFindFirst.mockResolvedValue({
      ...child,
      reminder1At: null,
      reminder2At: null,
      reminder1PresetKey: null,
      reminder2PresetKey: null,
      orgUnit: null,
      assignees: [
        {
          userId: USER,
          assignedAt: new Date("2026-01-01T00:00:00.000Z"),
          user: { id: USER, firstName: "A", lastName: "B" },
        },
      ],
    });

    orgMocks.taskFindMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      const ids = args?.where?.id?.in;
      if (ids?.includes("parent-secret")) {
        return [
          {
            id: "parent-secret",
            title: "CONFIDENTIAL_PARENT",
            tenantId: TENANT_A,
            createdByUserId: OTHER,
            visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
            orgUnitId: null,
            orgUnit: { tenantId: TENANT_A },
            assignees: [{ userId: OTHER }],
          },
        ];
      }
      return [];
    });

    const bundle = await loadTaskWorkspace(
      ctx([PERMISSIONS.TASKS_VIEW]),
      "child-1",
      "de",
      "Europe/Zurich",
    );

    expect(bundle.task.id).toBe("child-1");
    expect(bundle.parentTask).toBeNull();
  });
});
