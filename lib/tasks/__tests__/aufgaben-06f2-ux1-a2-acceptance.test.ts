/**
 * AUFGABEN-06F2-UX1-A2 — task access & UX hardening acceptance (structural).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TaskAccessGrantSubjectType, TaskVisibilityScope } from "@prisma/client";
import {
  buildTaskReadWhere,
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
} from "../task-authorization";
import { grantsRowsToSnapshot, resolveEffectiveOrgUnitGrantIds } from "../task-access-grants";
import { taskPriorityVisual } from "../task-priority-visual";
import { SCE_TASK_RICH_CONTENT_CLASS } from "../task-description-rich-content";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("AUFGABEN-06F2-UX1-A2 acceptance", () => {
  it("L1–L3 rich content contract is shared between editor and renderer", () => {
    const editor = read("components/admin/aufgaben/TaskDescriptionEditor.tsx");
    const content = read("components/admin/aufgaben/TaskDescriptionContent.tsx");
    const css = read("app/globals.css");
    expect(editor).toContain("SCE_TASK_RICH_CONTENT_CLASS");
    expect(content).toContain("SCE_TASK_RICH_CONTENT_CLASS");
    expect(css).toContain(".sce-task-rich-content ul:not(.task-description-checklist)");
    expect(css).toContain(".sce-task-rich-content ol");
    expect(css).toContain(".task-description-checklist");
  });

  it("E1/E2 Mod+K link shortcut uses canonical toolbar link handler", () => {
    const editor = read("components/admin/aufgaben/TaskDescriptionEditor.tsx");
    expect(editor).toMatch(/metaKey.*ctrlKey.*["']k["']/i);
    expect(editor).toContain("onAddLink={addLink}");
    expect(editor).toContain("isAllowedEditorLinkHref");
  });

  it("A1 assignee picker uses tenant people search, not role preload dropdown", () => {
    const create = read("components/admin/aufgaben/AufgabenFullCreateClient.tsx");
    expect(create).toContain("TaskPeopleMultiPicker");
    expect(create).not.toMatch(/assigneeOptions\.map/);
    const picker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    expect(picker).toContain("searchQuickCreateAssigneesAction");
  });

  it("P1–P4 canonical priority visual tokens", () => {
    expect(taskPriorityVisual("LOW").className).toContain("sky");
    expect(taskPriorityVisual("NORMAL").iconKey).toBe("right");
    expect(taskPriorityVisual("HIGH").className).toContain("amber");
    expect(taskPriorityVisual("URGENT").className).toContain("red");
    expect(read("lib/tasks/management-presentation.ts")).toContain("task-priority-visual");
  });

  it("schema defines TaskAccessGrant with ORG_UNIT and USER subjects", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model TaskAccessGrant/);
    expect(schema).toMatch(/model TaskSeriesAccessGrant/);
    expect(schema).toMatch(/enum TaskAccessGrantSubjectType/);
  });

  it("O6/O7 multi org-unit read via grants", () => {
    const ctx = {
      tenantId: "t1",
      userId: "u1",
      permissionKeys: ["tasks.view"],
      auth: {
        ...EMPTY_TASK_AUTH_SCOPE,
        permissionReadOrgUnitIds: ["org-a"],
      },
    };
    expect(
      canReadTask(ctx, {
        tenantId: "t1",
        createdByUserId: "other",
        assigneeUserIds: [],
        visibilityScope: TaskVisibilityScope.ORG_UNIT,
        orgUnitId: "org-legacy",
        accessGrants: { orgUnitIds: ["org-a", "org-b"], viewerUserIds: [] },
      }),
    ).toBe(true);
    expect(
      resolveEffectiveOrgUnitGrantIds(TaskVisibilityScope.ORG_UNIT, "org-legacy", {
        orgUnitIds: ["org-a"],
        viewerUserIds: [],
      }),
    ).toEqual(["org-a"]);
  });

  it("V3/V4 viewer grant read without assignee semantics", () => {
    const ctx = {
      tenantId: "t1",
      userId: "viewer",
      permissionKeys: ["tasks.view"],
      auth: EMPTY_TASK_AUTH_SCOPE,
    };
    expect(
      canReadTask(ctx, {
        tenantId: "t1",
        createdByUserId: "creator",
        assigneeUserIds: ["assignee"],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
        accessGrants: { orgUnitIds: [], viewerUserIds: ["viewer"] },
      }),
    ).toBe(true);
    expect(
      canReadTask(ctx, {
        tenantId: "t1",
        createdByUserId: "creator",
        assigneeUserIds: ["assignee"],
        visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
        orgUnitId: null,
        accessGrants: { orgUnitIds: [], viewerUserIds: [] },
      }),
    ).toBe(false);
  });

  it("buildTaskReadWhere includes explicit user and org grants", () => {
    const where = buildTaskReadWhere({
      tenantId: "t1",
      userId: "u1",
      permissionKeys: ["tasks.view"],
      auth: { ...EMPTY_TASK_AUTH_SCOPE, permissionReadOrgUnitIds: ["org-a"] },
    });
    const serialized = JSON.stringify(where);
    expect(serialized).toContain(TaskAccessGrantSubjectType.USER);
    expect(serialized).toContain(TaskAccessGrantSubjectType.ORG_UNIT);
  });

  it("grantsRowsToSnapshot maps subject types", () => {
    expect(
      grantsRowsToSnapshot([
        {
          subjectType: TaskAccessGrantSubjectType.ORG_UNIT,
          orgUnitId: "o1",
          userId: null,
        },
        {
          subjectType: TaskAccessGrantSubjectType.USER,
          orgUnitId: null,
          userId: "u2",
        },
      ]),
    ).toEqual({ orgUnitIds: ["o1"], viewerUserIds: ["u2"] });
  });
});
