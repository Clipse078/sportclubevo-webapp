import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPersonDetailTabHref,
  buildPersonDetailTabNavigationConfig,
  resolvePersonDetailDefaultTab,
} from "@/lib/admin/users/person-detail-workspace-config";
import {
  buildPersonDetailZugriffHref,
  buildPersonQuickViewTabNavigationConfig,
} from "@/lib/admin/users/person-quick-view-config";
import { resolvePersonClubEventGovernanceOverview } from "@/lib/admin/users/person-detail-governance-summary";
import { buildPersonDetailAccessOverviewLine } from "@/lib/admin/users/person-detail-access-summary";
import { CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT } from "@/lib/club-events/governance/club-event-governance-people-access-context";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C-R7 — person workspace UX polish", () => {
  it("A — canonical person detail tab model preserved", () => {
    const config = buildPersonDetailTabNavigationConfig({
      showClubEventGovernance: true,
      defaultTab: "uebersicht",
    });
    expect(config.tabs.map((t) => t.key)).toEqual([
      "uebersicht",
      "rollen-funktionen",
      "bereiche",
      "veranstaltungs-freigaben",
      "zugriff",
    ]);
    expect(resolvePersonDetailDefaultTab({ fromClubEventGovernance: false, hasLinkedPerson: true })).toBe(
      "uebersicht",
    );
    expect(resolvePersonDetailDefaultTab({ fromClubEventGovernance: true, hasLinkedPerson: true })).toBe(
      "veranstaltungs-freigaben",
    );
  });

  it("B — overview administrative summary and deep links", () => {
    const overview = read("components/admin/users/PersonDetailOverviewTab.tsx");
    expect(overview).toContain("person-overview-link-rollen");
    expect(overview).toContain("person-overview-link-bereiche");
    expect(overview).toContain("person-overview-link-zugriff");
    expect(overview).toContain("person-overview-club-event-governance");
    expect(overview).not.toContain("PERMISSIONS.");
    const line = buildPersonDetailAccessOverviewLine([
      {
        label: "Spielbetrieb",
        modules: ["Teams", "Matchcenter"],
        items: [{ label: "Teams", access: "Lesen" }],
      },
    ]);
    expect(line).toContain("Teams");
  });

  it("C — governance overview resolver for linked persons", () => {
    const summary = resolvePersonClubEventGovernanceOverview({
      clubEventTypePolicy: {
        activityType: "CLUB_EVENT",
        defaultPublicationAuthority: "DIRECT_PUBLISH",
        validatorPersonIds: [],
        creatorPolicies: [
          {
            personId: "p1",
            createEnabled: true,
            publicationAuthority: "APPROVAL_REQUIRED",
          },
        ],
      },
      personId: "p1",
    });
    expect(summary.createLabel).toBe("Ja");
    expect(summary.publicationLabel).toBe("Freigabe erforderlich");
  });

  it("D — bereiche empty state and managed add path", () => {
    const page = read("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(page).toContain("PersonBereicheEmptyState");
    expect(page).toContain("ScopedRoleManagementControl");
    const scoped = read("components/admin/users/ScopedRoleManagementControl.tsx");
    expect(scoped).toContain("Zuständigkeit hinzufügen");
    expect(scoped).toContain("Keine Bereiche zugewiesen");
  });

  it("E — governance consequence copy, validator context, zero-validator guard", () => {
    const governance = read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx");
    expect(governance).toContain("SwitchToggle");
    expect(governance).toContain("SceSegmentedControl");
    expect(governance).toContain("fachlichen Validierung");
    expect(governance).toContain("menschliche Freigabe");
    expect(governance).toContain("person-club-event-approval-context");
    expect(governance).toContain("Keine freigabeberechtigte Person hinterlegt");
    expect(governance).toContain("validatorCount === 0");
    expect(governance).not.toContain('type="checkbox"');
    const route = read("app/api/admin/sce/activity-governance/club-event/route.ts");
    expect(route).toContain("validatorPeople");
  });

  it("F — effective access explanation, grouping, provenance", () => {
    const panel = read("components/admin/users/PersonNavEffectiveAccessPanel.tsx");
    expect(panel).toContain("Effektiver Zugriff ist das Ergebnis");
    const view = read("components/admin/users/PersonNavEffectiveAccessView.tsx");
    expect(view).toContain("<details");
    expect(view).toContain("provenance");
    const resolver = read("lib/admin/users/person-nav-effective-access.ts");
    expect(resolver).toContain("Über Rolle");
    expect(resolver).toContain("Individuell erlaubt");
  });

  it("G — quick view limited IA and canonical destinations", () => {
    const quickConfig = buildPersonQuickViewTabNavigationConfig();
    expect(quickConfig.tabs.map((t) => t.key)).toEqual(["uebersicht", "rollen", "zugriff"]);
    const drawer = read("components/admin/users/people-access/PersonAccessDrawer.tsx");
    expect(drawer).toContain("SceContextTabsBoundary");
    expect(drawer).toContain("person-quick-view-nav");
    expect(drawer).not.toContain("Aktivität");
    expect(drawer).not.toContain("PersonClubEventGovernanceSection");
    expect(drawer).not.toContain("Technische Berechtigungsschlüssel");
    expect(drawer).toContain("buildPersonDetailZugriffHref");
    expect(buildPersonDetailZugriffHref("u1")).toBe("/dashboard/admin/users/u1?tab=zugriff");
    const list = read("components/admin/users/TenantUsersSearchableList.tsx");
    expect(list).toContain("buildPersonDetailZugriffHref");
  });

  it("H — tab href preserves returnContext", () => {
    expect(
      buildPersonDetailTabHref({
        userId: "u1",
        tab: "uebersicht",
        returnContext: CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
      }),
    ).toContain("returnContext=club-event-governance");
  });

  it("I — accessibility: context tabs in detail and quick view", () => {
    expect(read("components/admin/users/PersonDetailWorkspace.tsx")).toContain("SceContextTabsBoundary");
    expect(read("components/admin/users/people-access/PersonAccessDrawer.tsx")).toContain('tabStateMode="local"');
    expect(read("lib/context-tabs/ContextTabPanel.tsx")).toContain('role="tabpanel"');
  });
});
