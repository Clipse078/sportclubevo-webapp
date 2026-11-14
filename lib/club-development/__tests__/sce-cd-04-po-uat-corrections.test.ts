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

  it("accessible light-theme errors on club-development forms", () => {
    expect(read("components/admin/club-development/ClubDevelopmentFormError.tsx")).toContain("text-rose-900");
    expect(read("components/admin/club-development/InitiativeBacklogCreateCard.tsx")).toContain(
      "ClubDevelopmentFormError",
    );
  });
});