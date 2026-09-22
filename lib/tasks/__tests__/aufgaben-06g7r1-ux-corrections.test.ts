/**
 * AUFGABEN-06G7R1 — UX corrections + creator attribution contract tests (C01–C32).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { taskDescriptionToSafeHtml } from "@/lib/tasks/task-description";
import { taskStatusPresentation } from "@/lib/tasks/management-presentation";
import {
  TASK_CREATOR_UNAVAILABLE_LABEL,
  TASK_LEGACY_ASSIGNEE_LABEL,
} from "@/lib/tasks/task-creator-labels";
import { formatTaskResponsibleDisplayName } from "@/lib/tasks/task-assignee-display";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const checklistDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Long checklist label that should wrap inline" }],
            },
          ],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet" }] }],
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Numbered" }] }],
        },
      ],
    },
  ],
});

describe("AUFGABEN-06G7R1 contracts", () => {
  it("C01–C04 — checklist horizontal layout contract; bullet/ordered lists preserved", () => {
    const html = taskDescriptionToSafeHtml(checklistDoc);
    expect(html).toContain("task-description-task-item-checkbox");
    expect(html).toContain("task-description-task-item-text");
    expect(html).toMatch(/<li class="task-description-task-item"[^>]*><label class="task-description-task-item-checkbox">/);
    expect(html).toMatch(/<div class="task-description-task-item-text">Long checklist/);
    expect(html).toMatch(/<ul>/);
    expect(html).toMatch(/<ol>/);
    const css = read("app/globals.css");
    expect(css).toContain("display: flex");
    expect(css).toContain("li[data-type=\"taskItem\"] > div");
  });

  it("C05–C08 — assignee source is Person-linked, legacy label for unlinked accounts", () => {
    const queries = read("lib/tasks/queries.ts");
    expect(queries).toContain("listEligibleTaskAssigneePersons");
    expect(queries).not.toContain("tenantMembership.findMany");
    const assigneeDisplay = read("lib/tasks/task-assignee-display.ts");
    expect(assigneeDisplay).toContain("TASK_LEGACY_ASSIGNEE_LABEL");
    expect(read("lib/tasks/eligible-task-assignee-persons.ts")).toContain("userId: { not: null }");
    expect(formatTaskResponsibleDisplayName({
      userFirstName: "Michael",
      userLastName: "Duijster",
      linkedPerson: { firstName: "Michael", lastName: "Duijster" },
      tenantName: "FC Allschwil",
    })).toBe("Michael Duijster");
  });

  it("C09 — requirement ROLE audience remains in audience builder", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain('kind="role"');
    expect(builder).toContain("PopoverContent");
  });

  it("C10–C13 — canonical semantic status presentation with icons", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const) {
      const p = taskStatusPresentation(status);
      expect(p.icon).toBeTruthy();
      expect(p.iconClassName).toMatch(/text-/);
      expect(p.label.length).toBeGreaterThan(0);
    }
    expect(read("components/admin/aufgaben/TaskStatusLabel.tsx")).toContain("taskStatusPresentation");
  });

  it("C14–C18 — audience selectors use portalled popover", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("PopoverContent");
    expect(read("components/ui/Popover.tsx")).toContain("FloatingPortal");
    expect(builder).toContain("requirement-audience-add-${kind}");
    expect(builder).toContain('kind="team"');
    expect(builder).toContain('kind="orgUnit"');
    expect(builder).toContain('kind="role"');
    expect(builder).toContain('kind="targetGroup"');
  });

  it("C19–C22 — task creator is server-derived and immutable in update input", () => {
    const service = read("lib/tasks/task-service.ts");
    expect(service).toContain("createdByUserId: ctx.userId");
    expect(service).not.toMatch(/input\.createdByUserId/);
    const types = read("lib/tasks/types.ts");
    expect(types).not.toContain("createdByUserId?:");
  });

  it("C23–C27 — requirement creator is server-derived on create", () => {
    const service = read("lib/requirements/requirement-service.ts");
    expect(service).toContain("createdByUserId: ctx.userId");
    expect(service).not.toMatch(/input\.createdByUserId/);
  });

  it("C28 — entity-linked contextual task creation uses canonical create action", () => {
    const dialog = read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx");
    expect(dialog).toContain("createContextualAufgabeAction");
  });

  it("C29–C30 — NULL creator and person resolution labels", () => {
    expect(TASK_CREATOR_UNAVAILABLE_LABEL).toBe("Ersteller nicht verfügbar");
    const person = formatTaskResponsibleDisplayName({
      userFirstName: "FC Allschwil",
      userLastName: "Club Admin",
      linkedPerson: { firstName: "Michael", lastName: "Duijster" },
      tenantName: "FC Allschwil",
    });
    expect(person).toBe("Michael Duijster");
  });

  it("C31–C32 — creator metadata module does not import authorization grants", () => {
    const creatorModule = read("lib/tasks/task-creator-display.ts");
    expect(creatorModule).not.toContain("canManage");
    expect(creatorModule).not.toContain("permissionKeys");
  });
});
