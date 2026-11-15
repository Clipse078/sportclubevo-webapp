import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runSceDesignSystemGovernance } from "@/lib/design-system/sce-design-system-governance-runner";
import {
  SCE_VEREINSENTWICKLUNG_WORKSPACE_GOVERNANCE_PATHS,
  collectVereinsentwicklungWorkspaceViolations,
} from "../sce-vereinsentwicklung-visual-governance";
import { SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS } from "../sce-contextual-create-governance";
import {
  SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS,
  SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS,
} from "../vorhaben-inline-create-layout";
import { buildDevelopmentSprintBreadcrumbs } from "../sprint-workspace-chrome";
import { pathnameMatchesVereinsentwicklungNavHref } from "../vereinsentwicklung-nav-path-aliases";
import { isNavigationHrefActive } from "@/lib/nav/app-navigation-model";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-06 UX consistency (Vorhaben + Umsetzungsphasen)", () => {
  it("uses one shared collapsible create with full-width shell across entry points", () => {
    const shared = read("components/admin/initiatives/CreateInitiativeWorkspaceCollapsibleCard.tsx");
    const backlog = read("components/admin/club-development/InitiativeBacklogCreateCard.tsx");
    const vorhaben = read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx");
    const prioritaeten = read("components/admin/club-development/InitiativeBacklogWorkspace.tsx");
    expect(shared).toContain("InitiativeForm");
    expect(shared).toContain("SCE_VORHABEN_INLINE_CREATE_SHELL_CLASS");
    expect(shared).toContain("SCE_VORHABEN_INLINE_CREATE_FORM_INNER_CLASS");
    expect(shared).not.toContain("max-w-xl");
    expect(shared).not.toContain("justify-end");
    expect(backlog).toContain("CreateInitiativeWorkspaceCollapsibleCard");
    expect(vorhaben).toContain("CreateInitiativeWorkspaceCollapsibleCard");
    expect(prioritaeten).toContain('variant="prioritaeten"');
    expect(prioritaeten).toContain("CreateInitiativeWorkspaceCollapsibleCard");
  });

  it("InitiativeForm supports priority payloads and compact composer disclosure", () => {
    const form = read("components/admin/initiatives/InitiativeForm.tsx");
    expect(form).toContain("prioritaetenFields");
    expect(form).toContain("composerCompact");
    expect(form).toContain("expectedOutcome");
    expect(form).toContain("backlogPriority");
    expect(form).toContain("initiative-form-advanced-toggle");
    expect(form).toContain("Vorhaben erstellen");
  });

  it("removes instructional Prioritäten banner and Backlog create copy", () => {
    const control = read("components/admin/club-development/VorhabenPrioritaetenControl.tsx");
    expect(control).not.toContain("Vorhaben ausklappen");
    expect(control).not.toContain("<p");
    const copy = read("lib/club-development/product-copy.ts");
    expect(copy).not.toContain("im Backlog");
    expect(copy).toContain('createAction: "Vorhaben erstellen"');
  });

  it("uses Ziel filter chip and accessible loading states", () => {
    expect(read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx")).toContain(
      "VorhabenZielFilterChip",
    );
    expect(read("components/admin/club-development/InitiativeBacklogWorkspace.tsx")).toContain(
      "VorhabenZielFilterChip",
    );
    expect(read("components/admin/club-development/VorhabenWorkspaceLoadingState.tsx")).toContain("role=\"status\"");
    expect(read("components/admin/club-development/InitiativeBacklogWorkspace.tsx")).toContain(
      "vorhaben-backlog-retry",
    );
  });

  it("phase routes share breadcrumbs, segmented nav, and Phasenziel copy", () => {
    const crumbs = buildDevelopmentSprintBreadcrumbs("phase-a", "Q1 Umsetzung", "board");
    expect(crumbs[0]?.label).toBe("Vereinsentwicklung");
    expect(crumbs[2]?.label).toBe("Umsetzungsphasen");
    expect(crumbs.at(-1)?.label).toBe("Aufgabenboard");
    expect(read("components/admin/club-development/DevelopmentSprintWorkspaceNav.tsx")).toContain(
      "SceSegmentedControl",
    );
    expect(read("components/admin/club-development/DevelopmentSprintWorkspaceHeader.tsx")).toContain(
      "phaseGoalLabel",
    );
    expect(read("app/(admin)/vereinsleitung/sprints/[slug]/board/page.tsx")).not.toContain("Kanban");
    expect(read("components/admin/club-development/DevelopmentSprintBoard.tsx")).not.toContain("sprintTitle");
  });

  it("keeps Vorhaben & Umsetzung nav active on sprint detail routes", () => {
    expect(
      pathnameMatchesVereinsentwicklungNavHref(
        "/vereinsleitung/sprints/demo-phase/board",
        "/vereinsleitung/vorhaben-und-umsetzung",
      ),
    ).toBe(true);
    expect(
      isNavigationHrefActive(
        "/vereinsleitung/sprints/demo-phase/rueckblick",
        "/vereinsleitung/vorhaben-und-umsetzung",
      ),
    ).toBe(true);
  });

  it("passes governance on migrated workspace paths", () => {
    const result = runSceDesignSystemGovernance({
      files: [...SCE_VEREINSENTWICKLUNG_WORKSPACE_GOVERNANCE_PATHS],
    });
    expect(result.violations).toHaveLength(0);
    for (const file of SCE_CONTEXTUAL_CREATE_INLINE_ENTRY_PATHS) {
      expect(collectVereinsentwicklungWorkspaceViolations(file, read(file))).toHaveLength(0);
    }
  });
});