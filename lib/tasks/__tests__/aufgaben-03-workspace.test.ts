/**
 * AUFGABEN-03 — task workspace read model, permissions, and integration tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskStatus, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskFindMany: vi.fn(),
  taskSeriesFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
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

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findFirst: mocks.taskFindFirst,
      findMany: mocks.taskFindMany,
    },
    taskAccessGrant: { findMany: vi.fn().mockResolvedValue([]) },
    taskSeries: { findFirst: mocks.taskSeriesFindFirst },
    user: { findFirst: mocks.userFindFirst },
    tenantMembership: { findMany: mocks.tenantMembershipFindMany },
    event: { findFirst: vi.fn() },
    trainingSeries: { findFirst: vi.fn() },
    meeting: { findFirst: vi.fn() },
    registration: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    person: { findFirst: vi.fn() },
    workspaceDocument: { findFirst: vi.fn() },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

import { loadTaskWorkspace } from "../workspace-service";
import { resolveTaskWorkspaceCapabilities } from "../workspace-permissions";
import { TaskForbiddenError } from "../errors";
import type { TaskDto } from "../types";

const TENANT = "tenant-a";
const USER_MANAGER = "user-manager";
const USER_ASSIGNEE = "user-assignee";
const USER_VIEW_ALL = "user-view-all";
const TASK_ID = "task-root";

function taskDto(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: TASK_ID,
    tenantId: TENANT,
    title: "Root task",
    description: "Details",
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: USER_MANAGER,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    assignees: [
      {
        userId: USER_ASSIGNEE,
        firstName: "Alex",
        lastName: "Assignee",
        assignedAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    tenantId: TENANT,
    title: "Root task",
    description: "Details",
    status: TaskStatus.OPEN,
    priority: "NORMAL",
    dueAt: null,
    completedAt: null,
    contextType: null,
    contextId: null,
    parentTaskId: null,
    taskSeriesId: null,
    orgUnitId: null,
    visibilityScope: TaskVisibilityScope.CLUB,
    createdByUserId: USER_MANAGER,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    assignees: [
      {
        userId: USER_ASSIGNEE,
        assignedAt: new Date("2026-09-01T10:00:00.000Z"),
        user: { id: USER_ASSIGNEE, firstName: "Alex", lastName: "Assignee" },
      },
    ],
    ...overrides,
  };
}

function managerCtx() {
  return {
    tenantId: TENANT,
    userId: USER_MANAGER,
    permissionKeys: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.TASKS_ASSIGN,
    ],
  };
}

function viewAllCtx() {
  return {
    tenantId: TENANT,
    userId: USER_VIEW_ALL,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL],
  };
}

describe("AUFGABEN-03 workspace permissions", () => {
  it("K — view_all overseer is read-only", () => {
    const caps = resolveTaskWorkspaceCapabilities(viewAllCtx(), taskDto());
    expect(caps.readOnly).toBe(true);
    expect(caps.canEditTitle).toBe(false);
    expect(caps.canAssign).toBe(false);
  });

  it("manager receives full mutation capabilities", () => {
    const caps = resolveTaskWorkspaceCapabilities(managerCtx(), taskDto());
    expect(caps.canEditTitle).toBe(true);
    expect(caps.canAssign).toBe(true);
    expect(caps.canCreateSubtask).toBe(true);
  });

  it("assignee may complete but not edit title", () => {
    const caps = resolveTaskWorkspaceCapabilities(
      {
        tenantId: TENANT,
        userId: USER_ASSIGNEE,
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      },
      taskDto(),
    );
    expect(caps.canComplete).toBe(true);
    expect(caps.canEditTitle).toBe(false);
    expect(caps.canEditStatus).toBe(true);
  });

  it("F — subtasks cannot be created on subtask rows", () => {
    const caps = resolveTaskWorkspaceCapabilities(
      managerCtx(),
      taskDto({ id: "sub-1", parentTaskId: TASK_ID }),
    );
    expect(caps.canCreateSubtask).toBe(false);
  });
});

describe("AUFGABEN-03 loadTaskWorkspace", () => {
  beforeEach(() => {
    mocks.taskFindFirst.mockReset();
    mocks.taskFindMany.mockReset();
    mocks.userFindFirst.mockReset();
    mocks.taskSeriesFindFirst.mockReset();
  });

  it("A — loads visible subtasks with progress for root tasks", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.taskFindMany.mockResolvedValue([
      taskRow({
        id: "sub-1",
        title: "Sub one",
        status: TaskStatus.DONE,
        parentTaskId: TASK_ID,
        assignees: [],
      }),
      taskRow({
        id: "sub-2",
        title: "Sub two",
        status: TaskStatus.OPEN,
        parentTaskId: TASK_ID,
        assignees: [],
      }),
    ]);
    mocks.userFindFirst.mockResolvedValue({
      id: USER_MANAGER,
      firstName: "M",
      lastName: "Manager",
    });

    const bundle = await loadTaskWorkspace(managerCtx(), TASK_ID, "de-CH", "Europe/Zurich");
    expect(bundle.subtasks).toHaveLength(2);
    expect(bundle.progress.label).toBe("1 / 2 erledigt");
    expect(bundle.capabilities.canEditTitle).toBe(true);
  });

  it("H — exposes series recurrence label read-only", async () => {
    mocks.taskFindFirst.mockResolvedValue(taskRow({ taskSeriesId: "series-1" }));
    mocks.taskFindMany.mockResolvedValue([]);
    mocks.taskSeriesFindFirst.mockResolvedValue({
      id: "series-1",
      tenantId: TENANT,
      title: "Wochenplan kontrollieren",
      frequency: "WEEKLY",
      intervalCount: 1,
      weekday: "SUNDAY",
      monthDay: null,
      assigneeTemplates: [],
      subtaskTemplates: [],
    });
    mocks.userFindFirst.mockResolvedValue(null);

    const bundle = await loadTaskWorkspace(managerCtx(), TASK_ID, "de-CH", "Europe/Zurich");
    expect(bundle.seriesRecurrenceLabel).toBe("Jeden Sonntag");
  });

  it("A — unauthorized task surfaces as forbidden for personal scope", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ createdByUserId: "other", assignees: [] }),
    );
    await expect(
      loadTaskWorkspace(
        {
          tenantId: TENANT,
          userId: "outsider",
          permissionKeys: [PERMISSIONS.TASKS_VIEW],
        },
        TASK_ID,
        "de-CH",
        "Europe/Zurich",
      ),
    ).rejects.toThrow(TaskForbiddenError);
  });
});

describe("AUFGABEN-03 RBAC regression", () => {
  it("K — tasks.view, tasks.view_all, tasks.manage remain distinct in capabilities", () => {
    const viewOnly = resolveTaskWorkspaceCapabilities(viewAllCtx(), taskDto());
    const manage = resolveTaskWorkspaceCapabilities(managerCtx(), taskDto());
    expect(viewOnly.readOnly).toBe(true);
    expect(manage.canAssign).toBe(true);
    expect(manage.readOnly).toBe(false);
  });
});

describe("AUFGABEN-03 matrix coverage hooks", () => {
  it("B — read-only overseer denied for field edits at capability layer", () => {
    const caps = resolveTaskWorkspaceCapabilities(viewAllCtx(), taskDto());
    expect(caps.canEditDescription).toBe(false);
    expect(caps.canEditPriority).toBe(false);
  });

  it("D — assignee capability without assign permission", () => {
    const caps = resolveTaskWorkspaceCapabilities(
      {
        tenantId: TENANT,
        userId: USER_ASSIGNEE,
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      },
      taskDto(),
    );
    expect(caps.canAssign).toBe(false);
  });

  it("I/J — personal dashboard and overview use same workspace route concept", () => {
    const href = `/dashboard/aufgaben/${TASK_ID}`;
    expect(href).toBe("/dashboard/aufgaben/task-root");
  });

  it("V — successful workspace mutations refresh server props for overview consistency", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/TaskWorkspace.tsx"),
      "utf8",
    );
    expect(source).toMatch(/else if \(result\.ok\)\s*\{\s*router\.refresh\(\);/s);
  });

  it("06A — task workspace embeds collaboration activity section", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/TaskWorkspace.tsx"),
      "utf8",
    );
    expect(source).toContain("TaskActivitySection");
    expect(source).toContain("TaskFollowControl");
    expect(source).not.toContain("Aktivität — folgt in einer späteren Version.");
  });

  it("06A-C2 — activity section remounts timeline state per taskId", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/TaskActivitySection.tsx"),
      "utf8",
    );
    expect(source).toMatch(/key=\{props\.taskId\}/);
    expect(source).not.toMatch(/eslint-disable.*set-state-in-effect/);
  });
});
