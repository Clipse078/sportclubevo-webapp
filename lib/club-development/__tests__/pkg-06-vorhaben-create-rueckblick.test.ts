import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-06 Vorhaben workspace inline create + Rückblick deep links", () => {
  it("Vorhaben lens uses workspace collapsible create without ComposerDialog", () => {
    const workspace = read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx");
    const card = read("components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard.tsx");
    expect(workspace).toContain("CreateInitiativeWorkspaceCollapsibleCard");
    expect(workspace).not.toContain("CreateInitiativeComposerDialog");
    expect(card).toContain("SceClubDevelopmentContextualCreateCollapsibleShell");
    expect(card).toContain('data-sce-contextual-create-flow="inline-collapsible"');
    expect(card).toContain("InitiativeForm");
    expect(card).not.toContain("Dialog");
  });

  it("passes optional Ziel filter for contextual link after create", () => {
    const workspace = read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx");
    const page = read("app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx");
    const card = read("components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard.tsx");
    expect(workspace).toContain("filterTarget");
    expect(page).toContain("filterTarget");
    expect(card).toContain("initiative-links");
  });

  it("Umsetzungsphasen list links Rückblick from consolidated workspace", () => {
    const list = read("components/admin/club-development/DevelopmentSprintList.tsx");
    expect(list).toContain("/rueckblick");
    expect(list).toContain("reviewQuickLink");
    expect(list).toContain("SprintBoardQuickLink");
  });
});