import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runSceDesignSystemGovernance } from "@/lib/design-system/sce-design-system-governance-runner";
import {
  SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS,
  SCE_CONTEXTUAL_CREATE_OVERLAY_INVENTORY,
  collectContextualCreateEntryViolations,
} from "../sce-contextual-create-governance";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 contextual inline collapsible create (SCE rule)", () => {
  it("Ziel Vorhaben section uses inline collapsible card at trigger location", () => {
    const section = read("components/admin/targets/TargetInitiativeLinksSection.tsx");
    const card = read("components/admin/initiatives/CreateInitiativeContextualCollapsibleCard.tsx");
    expect(section).toContain("CreateInitiativeContextualCollapsibleCard");
    expect(section).not.toContain("CreateInitiativeComposerDialog");
    expect(section).not.toContain("SceClubDevelopmentComposerShell");
    expect(card).toContain("SceClubDevelopmentContextualCreateCollapsibleShell");
    expect(card).toContain("SceClubDevelopmentInlineDirtyCloseProvider");
    expect(read("components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell.tsx")).toContain(
      'data-sce-contextual-create-flow="inline-collapsible"',
    );
    expect(card).toContain("preselectedTarget");
    expect(card).toContain("/initiative-links");
  });

  it("Strategie Schwerpunkt create links to full-page Ziel anlegen", () => {
    const strategy = read("components/admin/club-development/StrategyAuthoringPanel.tsx");
    expect(strategy).toContain("buildVereinsentwicklungZielNeuHref");
    expect(strategy).not.toContain("CreateTargetComposerDialog");
    expect(strategy).toContain('data-sce-contextual-create-flow="full-page"');
  });

  it("shared shell exposes aria-expanded and aria-controls without Dialog portal", () => {
    const shell = read("components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell.tsx");
    expect(shell).toContain("aria-expanded");
    expect(shell).toContain("aria-controls");
    expect(shell).not.toContain("Dialog");
    expect(shell).not.toContain("overflow-y-auto");
    expect(shell).not.toContain("role=\"dialog\"");
  });

  it("PASS — governance on migrated contextual create entry paths", () => {
    const result = runSceDesignSystemGovernance({
      files: [...SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS],
    });
    expect(result.violations.filter((v) => v.ruleId === "SCE-DS-GOV-CONTEXTUAL-CREATE-001")).toHaveLength(
      0,
    );
  });

  it("FAIL — violation fixture pattern (modal composer in entry path)", () => {
    const findings = collectContextualCreateEntryViolations(
      "components/admin/targets/TargetInitiativeLinksSection.tsx",
      '<CreateInitiativeComposerDialog open contextualLink',
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it("Ziele workspace list links to full-page create instead of modal", () => {
    const panel = read("components/admin/club-development/ZieleWorkspacePanel.tsx");
    expect(panel).toContain("buildVereinsentwicklungZielNeuHref");
    expect(panel).not.toContain("CreateTargetComposerDialog");
    expect(panel).not.toContain("CreateTargetTrigger");
  });

  it("documents remaining overlay inventory without claiming full-app migration", () => {
    expect(SCE_CONTEXTUAL_CREATE_OVERLAY_INVENTORY.length).toBeGreaterThanOrEqual(3);
    expect(SCE_CONTEXTUAL_CREATE_OVERLAY_INVENTORY.some((row) => row.component === "CreateTargetComposerDialog")).toBe(
      true,
    );
  });
});