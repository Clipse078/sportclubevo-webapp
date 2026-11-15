/**
 * SCE-CD-04R4 — Vereinsentwicklung readability, navigation clarity and task workspace labels.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildNavigationDomainsFromSections,
  NAVIGATION_DOMAIN_DEFINITIONS,
} from "@/lib/nav/app-navigation-domains";
import {
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  CD_NAV_COPY,
  CD_OVERVIEW_SHORTCUT_COPY,
  CD_SPRINT_WORKSPACE_COPY,
  CD_TASK_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import { formatTaskPriorityLabel } from "@/lib/tasks/management-labels";
import { taskWorkspaceContextSectionLabel } from "@/lib/tasks/task-workspace-context-section-labels";
import { TaskContextType } from "@prisma/client";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const STRATEGIC_WITH_VL = [
  ...Object.values(PERMISSIONS),
] as const;

function clubDomainWithVereinsentwicklung() {
  const sections = getVisibleNavSections([...STRATEGIC_WITH_VL], "club", {
    vereinsleitungWorkspace: true,
  });
  const domains = buildNavigationDomainsFromSections(
    sections,
    NAVIGATION_DOMAIN_DEFINITIONS,
  );
  return domains.find((d) => d.id === "club") ?? null;
}

describe("SCE-CD-04R5 PKG-01 navigation copy", () => {
  it("documents overview shortcuts without claiming Strategiekonzeption completion", () => {
    expect(CD_NAV_COPY.strategyOverview).toBe("Strategie");
    expect(CD_OVERVIEW_SHORTCUT_COPY.strategyDescription).toMatch(/Fortschrittsübersicht/);
    expect(read("components/admin/club-development/ClubDevelopmentOverview.tsx")).toContain(
      "/vereinsleitung/strategie",
    );
    expect(read("app/(admin)/vereinsleitung/strategie/page.tsx")).toContain("StrategyAuthoringPanel");
    expect(read("components/admin/club-development/StrategyOverviewPanel.tsx")).toContain(
      "targetId=",
    );
    expect(read("app/(admin)/vereinsleitung/vorhaben/page.tsx")).toContain("loadVorhabenWorkspace");
    expect(read("app/(admin)/vereinsleitung/vorhaben/page.tsx")).not.toContain("PKG-02");
  });
});

describe("SCE-CD-04R4 mega-menu destination clarity", () => {
  it("omits synthetic hub overview when an explicit child shares the same href", () => {
    const club = clubDomainWithVereinsentwicklung();
    expect(club).toBeTruthy();
    const items = resolveDomainSecondaryNavItems(club!);
    const vereinsentwicklung = items.find((item) => item.headerGroupId === "vereinsentwicklung");
    expect(vereinsentwicklung).toBeTruthy();

    const l3 = resolveDomainPanelRightColumnEntries(club!, vereinsentwicklung!);
    const labels = l3.map((entry) => entry.label);
    const hrefs = l3.map((entry) => entry.href);

    expect(labels.filter((label) => label === "Übersicht")).toHaveLength(1);
    expect(labels.some((label) => label === "Vereinsentwicklung Übersicht")).toBe(false);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    expect(labels).toEqual([
      "Übersicht",
      "Strategie",
      "Pläne & Ziele",
      "Vorhaben & Prioritäten",
      "Vorhaben & Aufgaben",
      "Umsetzungsplanung",
      "Sitzungen",
      "Prozesse & Richtlinien",
    ]);
  });

  it("keeps Organisation as a direct Verein destination without an owned L3 column", () => {
    const club = clubDomainWithVereinsentwicklung();
    const organisation = resolveDomainSecondaryNavItems(club!).find((i) => i.label === "Organisation");
    expect(organisation).toMatchObject({
      key: "organisation",
      href: "/dashboard/org-units",
    });
    expect(resolveDomainPanelRightColumnEntries(club!, organisation!)).toEqual([]);
  });

  it("styles L3 destination links with interface typography", () => {
    const css = read("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/\.sce-domain-nav-panel-l3-link[\s\S]*font-family: var\(--font-sans\)/);
    expect(css).toMatch(/\.sce-domain-nav-panel-l3-link[\s\S]*text-transform: none/);
    expect(css).toMatch(/\.sce-domain-nav-panel-section-title[\s\S]*font-family: var\(--font-display\)/);
  });
});

describe("SCE-CD-04R4 sprint workspace and priority presentation", () => {
  it("shortens contextual sprint workspace copy", () => {
    expect(CD_SPRINT_WORKSPACE_COPY.startPhase).toBe("Phase starten");
    expect(CD_SPRINT_WORKSPACE_COPY.removeFromPhase).toBe("Aus Phase entfernen");
    expect(CD_SPRINT_WORKSPACE_COPY.tasksInPhase).toBe("Aufgaben");
  });

  it("localises raw priority enums for planning rows", () => {
    expect(formatTaskPriorityLabel("NORMAL")).toBe("Normal");
    expect(read("lib/club-development/sprints/sprint-planning-memberships.ts")).toContain(
      "formatTaskPriorityLabel",
    );
  });

  it("does not repeat sprint title in workspace header shell", () => {
    const header = read("components/admin/club-development/DevelopmentSprintWorkspaceHeader.tsx");
    expect(header).not.toMatch(/<h1[^>]*>\{title\}/);
    expect(read("components/admin/club-development/DevelopmentSprintWorkspaceShell.tsx")).not.toContain(
      "title={sprint.title}",
    );
  });
});

describe("SCE-CD-04R4 dedicated task page", () => {
  it("uses one editable priority control without redundant adjacent label", () => {
    const field = read("components/admin/aufgaben/TaskPriorityField.tsx");
    expect(field).toContain("showAdjacentIcon");
    expect(field).toMatch(/showAdjacentIcon \? <TaskPriorityIconLabel/);
  });

  it("uses contextual section labels and assigned phase copy", () => {
    expect(taskWorkspaceContextSectionLabel(TaskContextType.INITIATIVE)).toBe("Zugehöriges Vorhaben");
    expect(CD_TASK_WORKSPACE_COPY.assignedImplementationPhase).toBe("Zugeordnete Umsetzungsphase");
    expect(read("components/admin/aufgaben/TaskWorkspaceAssociationsSection.tsx")).toContain(
      "CD_SPRINT_STATUS_LABELS",
    );
    expect(read("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("CD_TASK_WORKSPACE_COPY.dueAt");
    expect(read("components/admin/aufgaben/TaskReminderFields.tsx")).toContain("Fällig am");
    expect(read("components/admin/aufgaben/TaskReminderFields.tsx")).not.toMatch(/>Deadline</);
  });

  it("preserves safe returnTo navigation contract", () => {
    expect(read("lib/tasks/task-navigation.ts")).toContain("returnTo");
    expect(read("components/admin/club-development/SprintTaskTitleLink.tsx")).toContain("returnTo");
  });

  it("shows one linked context title without repeating it in the open affordance", () => {
    const workspace = read("components/admin/aufgaben/TaskWorkspace.tsx");
    expect(workspace).toContain('aria-label={`${context.title ?? context.typeLabel} öffnen`}');
    expect(workspace).not.toMatch(/\{context\.title \?\? context\.typeLabel\} öffnen →/);
  });

  it("uses Anbieter-Zuordnung for provider mapping navigation", () => {
    expect(read("lib/nav/nav-config.ts")).toContain('label: "Anbieter-Zuordnung"');
    expect(read("lib/nav/nav-config.ts")).not.toContain("Anbieter-Mapping");
  });
});