/**
 * AUFGABEN-06G7 — Requirements creation UX + Aufgaben UX polish (U01–U25).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAccountIdentityName } from "@/lib/people/identity";
import { formatTaskResponsibleDisplayName } from "@/lib/tasks/task-assignee-display";
import { TASK_ROW_ACTION_PRESENTATION } from "@/lib/tasks/task-row-action-presentation";
import { SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL } from "@/lib/shell/responsive-layout";
import { taskDescriptionToSafeHtml } from "@/lib/tasks/task-description";
import { requirementHasExplicitReminderSchedule } from "@/lib/requirements/requirement-reminder-schedule";
import { resolveRequirementAudiencePersonIdsFromDraftRows } from "@/lib/requirements/requirement-audience";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("AUFGABEN-06G7 UX contracts", () => {
  it("U01/U02 — task responsibility uses Person-first display and people picker search", () => {
    const label = formatTaskResponsibleDisplayName({
      userFirstName: "FC Allschwil",
      userLastName: "Club Admin",
      linkedPerson: { firstName: "Michael", lastName: "Duijster" },
      tenantName: "FC Allschwil",
    });
    expect(label).toBe("Michael Duijster");

    const picker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    expect(picker).toContain("searchQuickCreateAssigneesAction");
    expect(picker).toContain("displayName");
  });

  it("U03 — ROLE_AUDIENCE role labels remain role names in audience builder", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain('typeLabel="Rolle"');
    expect(builder).not.toContain("formatTaskResponsibleDisplayName");
  });

  it("U04 — task row actions expose semantic icon intent without auth changes", () => {
    expect(TASK_ROW_ACTION_PRESENTATION.complete.intent).toBe("complete");
    expect(TASK_ROW_ACTION_PRESENTATION.delete.intent).toBe("delete");
    const list = read("components/admin/aufgaben/AufgabenTaskList.tsx");
    expect(list).toContain("data-action-intent");
    expect(list).not.toContain("PERMISSIONS.");
  });

  it("U05/U06 — Aufgaben create/edit dialogs use wide form sizing contract", () => {
    expect(SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL).toContain("sce-dialog-variant-form");
    const create = read("components/admin/aufgaben/AufgabenQuickCreateDialog.tsx");
    const meine = read("components/admin/aufgaben/MeineAufgabenQuickCreateDialog.tsx");
    expect(create).toContain("SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL");
    expect(meine).toContain("SCE_AUFGABEN_TASK_FORM_DIALOG_PANEL");
    expect(create).toContain('data-dialog-size="aufgaben-form"');
  });

  it("U07/U08/U09 — checklist rows inline; bullets/numbered lists unchanged", () => {
    const html = taskDescriptionToSafeHtml(
      JSON.stringify({
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
        ],
      }),
    );
    expect(html).toContain("task-description-task-item-label");
    expect(html).toContain("task-description-task-item-text");
    expect(html).toMatch(/<ul class="task-description-checklist">/);
    expect(html).toMatch(/<ul>/);
    expect(html).not.toMatch(/<span class="task-description-task-item-text"><p>/);
  });

  it("U10–U14 — requirement form exposes all audience selector types", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("RequirementPersonMultiPicker");
    expect(builder).toContain("requirement-audience-add-${kind}");
    expect(builder).toContain('kind="team"');
    expect(builder).toContain('kind="orgUnit"');
    expect(builder).toContain('kind="role"');
    expect(builder).toContain('kind="targetGroup"');
  });

  it("U15/U16 — mixed audiences call canonical preview API and dedupe explicit persons", () => {
    const previewModule = read("lib/requirements/requirement-audience-preview.ts");
    expect(previewModule).toContain("resolveRequirementAudiencePersonIdsFromSnapshot");
    expect(previewModule).not.toMatch(/from \"react\"/);

    expect(
      resolveRequirementAudiencePersonIdsFromDraftRows([
        { personId: "p1" },
        { personId: "p2" },
        { personId: "p1" },
      ]),
    ).toEqual(["p1", "p2"]);
  });

  it("U18/U19 — requirement reminder UI maps to canonical schedule without obligation coupling", () => {
    const create = read("components/admin/aufgaben/RequirementCreateClient.tsx");
    expect(create).toContain("TaskReminderFields");
    expect(create).not.toContain("RequirementRecipient");
    expect(
      requirementHasExplicitReminderSchedule({
        remindersConfigured: true,
        reminder1At: null,
        reminder2At: null,
      }),
    ).toBe(false);
  });

  it("U20/U21 — audience editing does not create recipients; activation snapshots remain server-side", () => {
    const actions = read("app/(admin)/dashboard/aufgaben/requirement-actions.ts");
    expect(actions).toContain("setRequirementDraftAudienceSelectors");
    expect(actions).toContain("activateRequirement");
    expect(actions).not.toContain("requirementRecipient.create");
    expect(actions).toContain("previewRequirementDraftAudience");
  });

  it("U25 — no second audience resolver in UI layer", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("previewRequirementDraftAudienceAction");
    expect(builder).not.toContain("resolveTeamAudiencePersonIds");
  });

  it("identity helper avoids tenant-derived role labels for account display", () => {
    const identity = resolveAccountIdentityName({
      linkedPerson: null,
      sessionFirstName: "FC Allschwil",
      sessionLastName: "Club Admin",
      tenantName: "FC Allschwil",
    });
    expect(identity.firstName).toBe("Mein Konto");
  });
});
