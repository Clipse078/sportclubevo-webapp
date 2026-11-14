import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIdListFromForm } from "@/lib/tasks/task-access-grants";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE-CD-04 PO UAT corrections", () => {
  it("task org picker is inline without modal sheet mount", () => {
    const picker = read("components/admin/aufgaben/TaskOrgUnitMultiPicker.tsx");
    expect(picker).toContain("SceInlineOrgUnitMultiPicker");
    expect(picker).not.toContain("SceChipMultiSelectorField");
    expect(picker).not.toContain("SceListSelectorPanel");
    expect(picker).not.toContain("dialogTitle");
    expect(read("components/sce/list-selector/SceInlineOrgUnitMultiPicker.tsx")).toContain(
      "Organisationseinheit suchen",
    );
  });

  it("task create surfaces share TaskOrgVisibilityFields org selector", () => {
    const surfaces = [
      "components/admin/aufgaben/AufgabenFullCreateClient.tsx",
      "components/admin/aufgaben/AufgabenFullCreateCollapsibleCard.tsx",
      "components/admin/aufgaben/contextual/ContextualTaskCreateFormBody.tsx",
      "components/admin/aufgaben/TaskSeriesCreateClient.tsx",
      "components/admin/aufgaben/TaskSeriesWorkspace.tsx",
    ];
    for (const file of surfaces) {
      expect(read(file)).toContain("TaskOrgVisibilityFields");
    }
  });

  it("backlog and sprint pages keep create actions visible when lists are empty", () => {
    const backlogPage = read("app/(admin)/vereinsleitung/initiativen/backlog/page.tsx");
    expect(backlogPage).not.toMatch(/isEmpty=\{initialInitiatives\.length/);
    expect(backlogPage).toContain("InitiativeBacklogWorkspace");

    const sprintsPage = read("app/(admin)/vereinsleitung/sprints/page.tsx");
    expect(sprintsPage).not.toMatch(/isEmpty=\{listItems\.length/);
    expect(sprintsPage).toContain("DevelopmentSprintCreateCard");
  });

  it("strategy page exposes target creation for managers", () => {
    const page = read("app/(admin)/vereinsleitung/strategie/page.tsx");
    expect(page).toContain("/vereinsleitung/targets/new");
    expect(page).toContain("TARGETS_MANAGE");
    expect(page).toContain("emptyAction");
  });

  it("client fetch distinguishes auth, server and connection failures", () => {
    const helper = read("lib/club-development/client-fetch.ts");
    expect(helper).toContain("Deine Sitzung ist abgelaufen");
    expect(helper).toContain("Verbindungsfehler");
    expect(helper).not.toContain("Netzwerkfehler");
  });

  it("initiative create uses robust slug fallback", () => {
    expect(read("app/api/initiatives/route.ts")).toContain("slugifyInitiativeTitle");
  });

  it("preserves multi org-unit grant ids from inline hidden field", () => {
    expect(parseIdListFromForm("org-a,org-b")).toEqual(["org-a", "org-b"]);
    expect(parseIdListFromForm("org-a, org-b")).toEqual(["org-a", "org-b"]);
  });

  it("sprint close and bulk planning use German product copy", () => {
    const detail = read("components/admin/club-development/DevelopmentSprintDetailWorkspace.tsx");
    const closePanel = read("components/admin/club-development/SprintClosePanel.tsx");
    const nav = read("components/admin/club-development/DevelopmentSprintWorkspaceNav.tsx");
    expect(detail).toContain("SprintBulkTaskPlanningPanel");
    expect(detail).toContain("CD_SPRINT_WORKSPACE_COPY.removeFromPhase");
    expect(read("components/admin/club-development/SprintBulkTaskPlanningPanel.tsx")).toContain(
      "Aufgaben hinzufügen",
    );
    expect(detail).not.toContain("(KEEP)");
    expect(detail).not.toContain("(REMOVE)");
    expect(closePanel).toContain("Offene Aufgaben ins Backlog zurückgeben");
    expect(closePanel).toContain("Zielergebnis");
    expect(nav).toContain("CD_SPRINT_WORKSPACE_COPY.tabReview");
    expect(read("components/admin/club-development/SprintBulkTaskPlanningPanel.tsx")).toContain(
      "Ohne Vorhaben",
    );
  });

  it("accessible light-theme errors on club-development forms", () => {
    expect(read("components/admin/club-development/ClubDevelopmentFormError.tsx")).toContain("text-rose-900");
    expect(read("components/admin/club-development/InitiativeBacklogCreateCard.tsx")).toContain(
      "ClubDevelopmentFormError",
    );
    expect(read("components/admin/club-development/InitiativeBacklogCreateCard.tsx")).toContain(
      "Vorhaben im Backlog erfassen",
    );
  });

  it("sprint board cards link tasks and show assignees without card-level drag", () => {
    const board = read("components/admin/club-development/DevelopmentSprintBoard.tsx");
    expect(board).toContain("SprintTaskTitleLink");
    expect(board).toContain("SprintTaskAssigneeDisplay");
    expect(board).toContain("sprint-board-drag-handle");
    expect(board).not.toMatch(/<article[\s\S]*draggable=\{draggable\}/);
    expect(read("components/admin/club-development/SprintTaskAssigneeDisplay.tsx")).toContain("Verantwortlich");
    expect(read("components/admin/club-development/SprintTaskAssigneeDisplay.tsx")).toContain("Nicht zugewiesen");
    const titleLink = read("components/admin/club-development/SprintTaskTitleLink.tsx");
    expect(titleLink).toContain("taskWorkspaceHref");
    expect(titleLink).toContain("returnTo");
  });

  it("dedicated task route uses full page workspace without dialog shell", () => {
    const page = read("app/(admin)/dashboard/aufgaben/[taskId]/page.tsx");
    expect(page).not.toContain("SCE_DIALOG_WORKSPACE_PANEL");
    expect(page).toContain('presentation="page"');
    expect(read("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("DetailPagePattern");
    expect(read("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("data-task-workspace-page-body");
  });

  it("task status badges use white-theme semantic tokens", () => {
    const presentation = read("lib/tasks/management-presentation.ts");
    expect(presentation).toContain("--sce-color-status-info");
    expect(presentation).not.toContain("sky-950");
  });

  it("sprint planning rows reuse canonical task links and assignee presentation", () => {
    const planning = read("components/admin/club-development/DevelopmentSprintDetailWorkspace.tsx");
    const bulk = read("components/admin/club-development/SprintBulkTaskPlanningPanel.tsx");
    expect(planning).toContain("SprintTaskTitleLink");
    expect(planning).toContain("SprintTaskAssigneeDisplay");
    expect(bulk).toContain("SprintTaskTitleLink");
    expect(bulk).toContain("SprintTaskAssigneeDisplay");
    expect(read("lib/club-development/sprints/sprint-task-assignee.ts")).toContain(
      "loadTaskResponsibleDisplayNamesByUserIds",
    );
    expect(read("lib/club-development/sprints/sprint-board.ts")).toContain("mapTaskAssigneeRowsToViewModels");
  });

  it("widens shared header tenant brand rail without shrinking nav typography", () => {
    const css = read("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*--sce-nav-brand-rail-width:\s*clamp/);
    expect(css).toContain("calc(var(--sce-nav-brand-rail-width) - 3rem)");
    const identity = read("components/admin/layout/HeaderTenantIdentity.tsx");
    expect(identity).not.toContain("max-w-[min(100%,18rem)]");
  });
});