import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClubEventGovernanceUserDetailHref,
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
} from "@/lib/club-events/governance/club-event-governance-people-access-context";
import {
  buildPersonDetailTabHref,
  buildPersonDetailTabNavigationConfig,
  resolvePersonDetailDefaultTab,
} from "@/lib/admin/users/person-detail-workspace-config";
import { resolveContextTabFromSearchParams } from "@/lib/context-tabs/url";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C-R6 — person detail contextual workspace", () => {
  it("A — person detail uses SceContextTabs workspace", () => {
    const page = read("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(page).toContain("PersonDetailWorkspace");
    expect(page).toContain("buildPersonDetailTabNavigationConfig");
    expect(read("components/admin/users/PersonDetailWorkspace.tsx")).toContain("SceContextTabsBoundary");
  });

  it("B — default tab is overview for normal entry", () => {
    expect(
      resolvePersonDetailDefaultTab({ fromClubEventGovernance: false, hasLinkedPerson: true }),
    ).toBe("uebersicht");
    const config = buildPersonDetailTabNavigationConfig({
      showClubEventGovernance: true,
      defaultTab: "uebersicht",
    });
    expect(
      resolveContextTabFromSearchParams({
        tabParam: null,
        defaultTab: config.defaultTab,
        visibleTabs: config.tabs,
      }),
    ).toBe("uebersicht");
  });

  it("C — governance return context defaults to Veranstaltungs-Freigaben tab", () => {
    expect(
      resolvePersonDetailDefaultTab({ fromClubEventGovernance: true, hasLinkedPerson: true }),
    ).toBe("veranstaltungs-freigaben");
    const href = buildClubEventGovernanceUserDetailHref("user-42");
    expect(href).toContain(`returnContext=${CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT}`);
    expect(href).toContain("tab=veranstaltungs-freigaben");
  });

  it("D — Einstellungen öffnen deep link includes governance tab", () => {
    const governanceView = read(
      "components/admin/users/people-access/ClubEventGovernancePeopleAccessView.tsx",
    );
    expect(governanceView).toContain("buildClubEventGovernanceUserDetailHref");
    expect(buildClubEventGovernanceUserDetailHref("u1")).toMatch(/tab=veranstaltungs-freigaben/);
  });

  it("E — returnContext preserved in tab href builder", () => {
    expect(
      buildPersonDetailTabHref({
        userId: "u1",
        tab: "zugriff",
        returnContext: CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
      }),
    ).toContain("returnContext=club-event-governance");
    expect(
      buildPersonDetailTabHref({
        userId: "u1",
        tab: "rollen-funktionen",
      }),
    ).not.toContain("returnContext=");
  });

  it("F — governance section uses toggles and single-choice publication control", () => {
    const governance = read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx");
    expect(governance).toContain("SwitchToggle");
    expect(governance).toContain("SceSegmentedControl");
    expect(governance).toContain("Veranstaltungen erstellen");
    expect(governance).not.toContain('type="checkbox"');
    expect(governance).not.toContain("ClubEventValidatorPoolSection");
    expect(governance).toContain("Freigabeberechtigte verwalten");
    expect(governance).toContain("CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF");
  });

  it("G — zero-validator guard preserved client-side", () => {
    const governance = read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx");
    expect(governance).toContain("validatorCount === 0");
  });

  it("H — effective access moved to Zugriff tab with progressive disclosure", () => {
    const page = read("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(page).toContain("PersonNavEffectiveAccessCard");
    expect(page).toContain("PersonClubEventGovernanceSection");
    expect(page).toContain("PersonDetailWorkspace");
    const accessView = read("components/admin/users/PersonNavEffectiveAccessView.tsx");
    expect(accessView).toContain("collapsible");
    expect(accessView).toContain("<details");
  });

  it("I — context tabs preserve non-tab query params in hook", () => {
    const hook = read("lib/context-tabs/use-context-detail-tab.tsx");
    expect(hook).toContain("searchParams.forEach");
    expect(hook).toContain("CONTEXT_TAB_QUERY_PARAM");
  });

  it("J — back link preserves governance return context", () => {
    const page = read("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(page).toContain("Zurück zu Veranstaltungs-Freigaben");
    expect(page).toContain("CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF");
  });

  it("K — tab ids cover roles, bereiche, governance, zugriff", () => {
    const config = buildPersonDetailTabNavigationConfig({
      showClubEventGovernance: true,
      defaultTab: "uebersicht",
    });
    const keys = config.tabs.map((t) => t.key);
    expect(keys).toEqual([
      "uebersicht",
      "rollen-funktionen",
      "bereiche",
      "veranstaltungs-freigaben",
      "zugriff",
    ]);
  });
});
