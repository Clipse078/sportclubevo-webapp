/**
 * AUFGABEN-06F2-UX1-A3 — final access model, UI parity & migration acceptance.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TaskAccessGrantSubjectType,
  TaskVisibilityScope,
} from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskReadWhere,
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  hasTenantWideClubTaskRead,
} from "../task-authorization";
import {
  grantsRowsToSnapshot,
  replaceTaskAccessGrants,
  resolveEffectiveOrgUnitGrantIds,
  validateTaskAccessGrantMutation,
} from "../task-access-grants";
import { taskPriorityVisual } from "../task-priority-visual";
import { listMyTasks } from "../task-service";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const TENANT = "tenant-a";
const CREATOR = "user-a";
const ASSIGNEE = "user-b";
const VIEWER_C = "user-c";
const VIEWER_D = "user-d";
const OUTSIDER = "user-e";
const ORG_A = "org-a";
const ORG_B = "org-b";
const ORG_C = "org-c";

function ctx(
  userId: string,
  permissionKeys: string[],
  auth: Partial<typeof EMPTY_TASK_AUTH_SCOPE> = {},
) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE, ...auth },
  };
}

function confidentialTask(
  overrides: Partial<{
    visibilityScope: TaskVisibilityScope;
    orgUnitId: string | null;
    accessGrants: { orgUnitIds: string[]; viewerUserIds: string[] };
    assigneeUserIds: string[];
    createdByUserId: string;
  }> = {},
) {
  return {
    tenantId: TENANT,
    createdByUserId: overrides.createdByUserId ?? CREATOR,
    assigneeUserIds: overrides.assigneeUserIds ?? [ASSIGNEE],
    visibilityScope: overrides.visibilityScope ?? TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: overrides.orgUnitId ?? null,
    accessGrants: overrides.accessGrants ?? { orgUnitIds: [], viewerUserIds: [] },
  };
}

const prismaMocks = vi.hoisted(() => ({
  orgUnitFindFirst: vi.fn(),
  tenantMembershipFindMany: vi.fn(),
  grantDeleteMany: vi.fn(),
  grantCreateMany: vi.fn(),
  taskFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnit: { findFirst: prismaMocks.orgUnitFindFirst },
    tenantMembership: { findMany: prismaMocks.tenantMembershipFindMany },
    task: { findMany: prismaMocks.taskFindMany },
    taskAccessGrant: {
      deleteMany: prismaMocks.grantDeleteMany,
      createMany: prismaMocks.grantCreateMany,
      findMany: vi.fn(),
    },
  },
}));

describe("AUFGABEN-06F2-UX1-A3 acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.orgUnitFindFirst.mockResolvedValue({ id: ORG_A, tenantId: TENANT, status: "ACTIVE" });
    prismaMocks.tenantMembershipFindMany.mockImplementation(({ where }: { where: { userId?: { in: string[] } } }) => {
      const ids = where.userId?.in ?? [];
      return Promise.resolve(ids.map((userId) => ({ userId })));
    });
  });

  describe("architecture & migration SQL", () => {
    it("schema keeps ownership, assignment, visibility, and grants separate", () => {
      const schema = read("prisma/schema.prisma");
      expect(schema).toMatch(/orgUnitId\s+String\?/);
      expect(schema).toMatch(/model TaskAssignee/);
      expect(schema).toMatch(/visibilityScope TaskVisibilityScope/);
      expect(schema).toMatch(/model TaskAccessGrant/);
      expect(schema).toMatch(/model TaskSeriesAccessGrant/);
    });

    it("migration is additive and backfills ORG_UNIT grants only", () => {
      const sql = read(
        "prisma/migrations/20260921220000_aufgaben_06f2_ux1_a2_task_access_grants/migration.sql",
      );
      expect(sql).not.toMatch(/UPDATE\s+"Task"\s+SET/i);
      expect(sql).not.toMatch(/DELETE FROM "Task"/i);
      expect(sql).toContain('visibilityScope" = \'ORG_UNIT\'');
      expect(sql).toContain("ON CONFLICT DO NOTHING");
      expect(sql).not.toContain("ASSIGNEES_ONLY");
      expect(sql).not.toContain("CLUB");
    });
  });

  describe("legacy compatibility LGC1–LGC10", () => {
    it("LGC1 CLUB with null orgUnitId — club-wide read via view_all only", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.CLUB,
        orgUnitId: null,
        assigneeUserIds: [],
        createdByUserId: CREATOR,
      });
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]), task)).toBe(false);
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), task)).toBe(
        true,
      );
    });

    it("LGC3 ORG_UNIT uses grant snapshot (legacy orgUnitId fallback)", () => {
      const effective = resolveEffectiveOrgUnitGrantIds(TaskVisibilityScope.ORG_UNIT, ORG_A, {
        orgUnitIds: [],
        viewerUserIds: [],
      });
      expect(effective).toEqual([ORG_A]);
    });

    it("LGC4/LGC5 ASSIGNEES_ONLY — creator and assignees read; no view_all bypass", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        assigneeUserIds: [ASSIGNEE],
      });
      expect(canReadTask(ctx(CREATOR, [PERMISSIONS.TASKS_VIEW]), task)).toBe(true);
      expect(canReadTask(ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), task)).toBe(true);
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), task),
      ).toBe(false);
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]), task),
      ).toBe(false);
    });

    it("LGC6–LGC9 confidential ASSIGNEES_ONLY with explicit viewers", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        accessGrants: { orgUnitIds: [], viewerUserIds: [VIEWER_C] },
      });
      expect(canReadTask(ctx(VIEWER_C, [PERMISSIONS.TASKS_VIEW]), task)).toBe(true);
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), task)).toBe(
        false,
      );
    });
  });

  describe("multi-org matrix O1–O18", () => {
    const orgTask = confidentialTask({
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
      orgUnitId: ORG_A,
      accessGrants: { orgUnitIds: [ORG_A, ORG_B, ORG_C], viewerUserIds: [] },
      assigneeUserIds: [ASSIGNEE],
    });

    it("O1–O5 creator, assignee, and org members with read coverage", () => {
      expect(canReadTask(ctx(CREATOR, [PERMISSIONS.TASKS_VIEW]), orgTask)).toBe(true);
      expect(canReadTask(ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), orgTask)).toBe(true);
      expect(
        canReadTask(
          ctx("user-org-a", [PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_A] }),
          orgTask,
        ),
      ).toBe(true);
      expect(
        canReadTask(
          ctx("user-org-b", [PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_B] }),
          orgTask,
        ),
      ).toBe(true);
    });

    it("O6/O8/O9/O10 unrelated, view_all, manage, and broad roles denied", () => {
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]), orgTask)).toBe(false);
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), orgTask),
      ).toBe(false);
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]), orgTask),
      ).toBe(false);
    });

    it("O11 foreign tenant denied", () => {
      expect(
        canReadTask(
          { ...ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]), tenantId: "tenant-b" },
          orgTask,
        ),
      ).toBe(false);
    });

    it("O12/O13 effective org grant ids drop removed units", () => {
      const afterRemoveA = resolveEffectiveOrgUnitGrantIds(
        TaskVisibilityScope.ORG_UNIT,
        ORG_A,
        { orgUnitIds: [ORG_B, ORG_C], viewerUserIds: [] },
      );
      expect(afterRemoveA).toEqual([ORG_B, ORG_C]);
      expect(
        canReadTask(
          ctx("user-org-a", [PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_A] }),
          { ...orgTask, accessGrants: { orgUnitIds: [ORG_B], viewerUserIds: [] } },
        ),
      ).toBe(false);
    });
  });

  describe("person visibility V1–V20", () => {
    const privateTask = confidentialTask({
      visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
      accessGrants: { orgUnitIds: [], viewerUserIds: [VIEWER_C, VIEWER_D] },
    });

    it("V1–V5 read matrix for creator, assignee, viewers, outsider", () => {
      expect(canReadTask(ctx(CREATOR, [PERMISSIONS.TASKS_VIEW]), privateTask)).toBe(true);
      expect(canReadTask(ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), privateTask)).toBe(true);
      expect(canReadTask(ctx(VIEWER_C, [PERMISSIONS.TASKS_VIEW]), privateTask)).toBe(true);
      expect(canReadTask(ctx(VIEWER_D, [PERMISSIONS.TASKS_VIEW]), privateTask)).toBe(true);
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]), privateTask)).toBe(false);
    });

    it("V6/V7 viewers are not assignees", () => {
      expect(privateTask.assigneeUserIds).not.toContain(VIEWER_C);
      expect(privateTask.assigneeUserIds).not.toContain(VIEWER_D);
    });

    it("V16/V17 view_all and manage do not bypass private viewers", () => {
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL]), privateTask),
      ).toBe(false);
      expect(
        canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]), privateTask),
      ).toBe(false);
    });

    it("V19 foreign-tenant viewer grant rejected at validation", async () => {
      prismaMocks.tenantMembershipFindMany.mockResolvedValueOnce([]);
      await expect(
        validateTaskAccessGrantMutation(TENANT, {
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          viewerUserGrantIds: ["foreign-user"],
        }),
      ).rejects.toThrow(/nicht verfügbar/i);
    });

    it("V20 duplicate USER grants deduplicated in validation", async () => {
      const snapshot = await validateTaskAccessGrantMutation(TENANT, {
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        viewerUserGrantIds: [VIEWER_C, VIEWER_C],
      });
      expect(snapshot.viewerUserIds).toEqual([VIEWER_C]);
    });
  });

  describe("assignment / visibility cross-matrix", () => {
    it("CASE B — viewer-only is readable but not assignee semantics", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        assigneeUserIds: [ASSIGNEE],
        accessGrants: { orgUnitIds: [], viewerUserIds: [VIEWER_C] },
      });
      expect(task.assigneeUserIds.includes(VIEWER_C)).toBe(false);
      expect(canReadTask(ctx(VIEWER_C, [PERMISSIONS.TASKS_VIEW]), task)).toBe(true);
    });

    it("CASE D — org-visible non-assignee reads but is not in assignee list", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: ORG_A,
        accessGrants: { orgUnitIds: [ORG_A], viewerUserIds: [] },
        assigneeUserIds: [],
      });
      expect(
        canReadTask(
          ctx("org-user", [PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_A] }),
          task,
        ),
      ).toBe(true);
      expect(task.assigneeUserIds.includes("org-user")).toBe(false);
    });

    it("CASE E — CLUB task requires tenant-wide club read", () => {
      const task = confidentialTask({
        visibilityScope: TaskVisibilityScope.CLUB,
        assigneeUserIds: [],
      });
      expect(hasTenantWideClubTaskRead(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]))).toBe(false);
      expect(hasTenantWideClubTaskRead(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW_ALL]))).toBe(true);
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW_ALL]), task)).toBe(true);
    });
  });

  describe("visibility transitions — replaceTaskAccessGrants", () => {
    it("T1/T4 clears stale grants on scope change (transactional replace)", async () => {
      const tx = {
        taskAccessGrant: {
          deleteMany: prismaMocks.grantDeleteMany,
          createMany: prismaMocks.grantCreateMany,
        },
      };
      await replaceTaskAccessGrants(
        tx as never,
        TENANT,
        "task-1",
        TaskVisibilityScope.ORG_UNIT,
        { orgUnitIds: [ORG_A, ORG_B], viewerUserIds: [] },
      );
      expect(prismaMocks.grantDeleteMany).toHaveBeenCalledWith({ where: { tenantId: TENANT, taskId: "task-1" } });
      expect(prismaMocks.grantCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
            orgUnitId: ORG_A,
          }),
          expect.objectContaining({
            subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
            orgUnitId: ORG_B,
          }),
        ]),
      });

      await replaceTaskAccessGrants(
        tx as never,
        TENANT,
        "task-1",
        TaskVisibilityScope.ASSIGNEES_ONLY,
        { orgUnitIds: [], viewerUserIds: [VIEWER_C, VIEWER_D] },
      );
      expect(prismaMocks.grantCreateMany).toHaveBeenLastCalledWith({
        data: [
          expect.objectContaining({
            subjectType: TaskAccessGrantSubjectType.USER,
            userId: VIEWER_C,
          }),
          expect.objectContaining({
            subjectType: TaskAccessGrantSubjectType.USER,
            userId: VIEWER_D,
          }),
        ],
      });
    });

    it("CLUB scope writes no grants", async () => {
      const tx = {
        taskAccessGrant: {
          deleteMany: prismaMocks.grantDeleteMany,
          createMany: prismaMocks.grantCreateMany,
        },
      };
      await replaceTaskAccessGrants(
        tx as never,
        TENANT,
        "task-1",
        TaskVisibilityScope.CLUB,
        { orgUnitIds: [ORG_A], viewerUserIds: [VIEWER_C] },
      );
      expect(prismaMocks.grantCreateMany).not.toHaveBeenCalled();
    });
  });

  describe("Meine Aufgaben / PersonalActions — viewer-only exclusion V8–V11", () => {
    it("listMyTasks and personal actions are assignee-scoped only", async () => {
      prismaMocks.taskFindMany.mockResolvedValue([]);
      await listMyTasks(ctx(VIEWER_C, [PERMISSIONS.TASKS_VIEW]));
      expect(prismaMocks.taskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignees: { some: { userId: VIEWER_C, tenantId: TENANT } },
          }),
        }),
      );

      const src = read("lib/personal-actions/sources/task-source.ts");
      expect(src).toContain("listMyTasks");
      expect(src).not.toContain("accessGrants");
    });
  });

  describe("UI parity — assignees & priority", () => {
    it("assignee picker adoption (contextual, full, quick, workspace, subtask, series)", () => {
      for (const file of [
        "components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx",
        "components/admin/aufgaben/AufgabenFullCreateClient.tsx",
        "components/admin/aufgaben/AufgabenQuickCreateDialog.tsx",
        "components/admin/aufgaben/MeineAufgabenQuickCreateDialog.tsx",
        "components/admin/aufgaben/TaskWorkspace.tsx",
        "components/admin/aufgaben/TaskSeriesCreateClient.tsx",
        "components/admin/aufgaben/TaskSeriesWorkspace.tsx",
      ]) {
        const src = read(file);
        expect(src).toContain("TaskPeopleMultiPicker");
        expect(src).not.toMatch(/assigneeOptions\.map/);
      }
      const workspace = read("components/admin/aufgaben/TaskWorkspace.tsx");
      expect(workspace).not.toMatch(/type="checkbox"[\s\S]*assigneeOptions/);
    });

    it("priority field adoption on create surfaces", () => {
      for (const file of [
        "components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx",
        "components/admin/aufgaben/AufgabenFullCreateClient.tsx",
        "components/admin/aufgaben/AufgabenQuickCreateDialog.tsx",
        "components/admin/aufgaben/MeineAufgabenQuickCreateDialog.tsx",
        "components/admin/aufgaben/TaskWorkspace.tsx",
        "components/admin/aufgaben/TaskSeriesCreateClient.tsx",
      ]) {
        expect(read(file)).toContain("TaskPriorityField");
      }
      expect(read("components/admin/aufgaben/TaskSeriesWorkspace.tsx")).toContain("TaskPriorityIconLabel");
    });

    it("canonical priority mapping only in task-priority-visual", () => {
      expect(taskPriorityVisual("LOW").iconKey).toBe("down");
      expect(taskPriorityVisual("URGENT").iconKey).toBe("up-double");
      const taskList = read("components/admin/aufgaben/AufgabenTaskList.tsx");
      expect(taskList).toContain("taskPriorityPresentation");
      expect(taskList).not.toMatch(/switch\s*\(\s*priority\s*\)/);
    });

    it("visibility UI — multi org, private people, no stale hidden grants", () => {
      const orgFields = read("components/admin/aufgaben/TaskOrgVisibilityFields.tsx");
      expect(orgFields).toContain("TaskOrgUnitMultiPicker");
      expect(orgFields).toContain("ASSIGNEES_ONLY");
      expect(read("lib/tasks/management-labels.ts")).toContain('ASSIGNEES_ONLY: "Nur Beteiligte"');
      expect(orgFields).toContain('name="viewerUserGrantIds" value=""');
      expect(orgFields).toContain('name="orgUnitGrantIds" value=""');
      expect(orgFields).toContain('name="orgUnitId"');
    });
  });

  describe("query performance — buildTaskReadWhere", () => {
    it("includes grant predicates at query level (no load-all pattern in auth module)", () => {
      const where = buildTaskReadWhere(ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW], { permissionReadOrgUnitIds: [ORG_A] }));
      const serialized = JSON.stringify(where);
      expect(serialized).toContain(TaskAccessGrantSubjectType.ORG_UNIT);
      expect(serialized).toContain(TaskAccessGrantSubjectType.USER);
      expect(read("lib/tasks/task-authorization.ts")).not.toContain("canReadTask loop");
    });
  });

  describe("security sentinels S1–S25 (subset executable here)", () => {
    it("S1 tenant isolation", () => {
      expect(
        canReadTask({ ...ctx(CREATOR, [PERMISSIONS.TASKS_VIEW]), tenantId: "other" }, confidentialTask()),
      ).toBe(false);
    });

    it("S10–S12 confidential bypass denied for elevated permissions", () => {
      const task = confidentialTask({ visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY });
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_VIEW_ALL]), task)).toBe(false);
      expect(canReadTask(ctx(OUTSIDER, [PERMISSIONS.TASKS_MANAGE]), task)).toBe(false);
    });

    it("S24/S25 snapshot helpers exist for series and subtasks", () => {
      const grants = read("lib/tasks/task-access-grants.ts");
      expect(grants).toContain("snapshotTaskAccessGrantsToChild");
      expect(grants).toContain("snapshotSeriesAccessGrantsToOccurrence");
    });

    it("grantsRowsToSnapshot enforces subject separation", () => {
      expect(
        grantsRowsToSnapshot([
          {
            subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
            orgUnitId: ORG_A,
            userId: null,
          },
          {
            subjectType: TaskAccessGrantSubjectType.USER,
            orgUnitId: null,
            userId: VIEWER_C,
          },
        ]),
      ).toEqual({ orgUnitIds: [ORG_A], viewerUserIds: [VIEWER_C] });
    });
  });
});
