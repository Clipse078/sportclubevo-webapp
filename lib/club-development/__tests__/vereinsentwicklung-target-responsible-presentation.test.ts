import { describe, expect, it } from "vitest";
import { formatTargetResponsiblePresentation } from "../vereinsentwicklung-target-responsible-presentation";
import { buildVereinsentwicklungTargetTaskCreateHref } from "../vereinsentwicklung-target-task-create-routing";

describe("Ziel responsible presentation (PR #1017 PO feedback)", () => {
  it("shows Nicht zugewiesen when assignee label is absent", () => {
    expect(formatTargetResponsiblePresentation(null)).toBe("Nicht zugewiesen");
    expect(formatTargetResponsiblePresentation("")).toBe("Nicht zugewiesen");
  });

  it("builds full-page TARGET contextual create with returnTo and orgEinheit", () => {
    const href = buildVereinsentwicklungTargetTaskCreateHref({
      targetId: "cmwpanrjn000008l6jhpjhjb4",
      returnTo: "/vereinsleitung/strategie-und-ziele?ansicht=ziele",
      orgUnitId: "cmslki2q4000104l87hu4qqbs",
    });
    expect(href).toContain("/dashboard/aufgaben/neu");
    expect(href).toContain("contextType=TARGET");
    expect(href).toContain("cmwpanrjn000008l6jhpjhjb4");
    expect(href).toContain("returnTo=");
    expect(href).toContain("orgEinheit=cmslki2q4000104l87hu4qqbs");
  });
});