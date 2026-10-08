import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  PILOT_FORBIDDEN_PERMISSION_KEYS,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";

const SANDRA_KEYS = new Set(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys);
const PATRICK_KEYS = [...PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys];

function diff(a: Set<string>, b: Set<string>) {
  return [...a].filter((k) => !b.has(k)).sort();
}

describe("P1_PRESIDENT_PILOT_ACCESS_01 — Präsident (Pilot) access model", () => {
  const patrickSet = new Set(PATRICK_KEYS);

  it("PRESIDENT_BASELINE — includes Sandra operational capability set", () => {
    for (const key of SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys) {
      expect(patrickSet.has(key)).toBe(true);
    }
    expect(PATRICK_KEYS).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(PATRICK_KEYS).toContain(PERMISSIONS.TRAININGS_VIEW);
    expect(PATRICK_KEYS).toContain(PERMISSIONS.EVENTS_VIEW);
  });

  it("PRESIDENT_DOCUMENTS — workspace.view resolves for Dokumenten-Workspace nav", () => {
    expect(PATRICK_KEYS).toContain(PERMISSIONS.WORKSPACE_VIEW);
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.WORKSPACE_MANAGE);
    const sections = getVisibleNavSections(PATRICK_KEYS);
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/workspace");
  });

  it("PRESIDENT_INFOBOARD — operational management overview (R9R1)", () => {
    expect(PATRICK_KEYS).toContain(PERMISSIONS.INFOBOARD_VIEW);
    expect(PATRICK_KEYS).toContain(PERMISSIONS.INFOBOARD_MANAGE);
    const sections = getVisibleNavSections(PATRICK_KEYS);
    const hrefs = sections.flatMap((s) =>
      s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );
    expect(hrefs).toContain("/dashboard/infoboard");
    expect(hrefs).toContain("/dashboard/infoboard/preview");
  });

  it("PRESIDENT_REGISTRATIONS — Neue Anmeldungen view + edit", () => {
    expect(PATRICK_KEYS).toContain(PERMISSIONS.REGISTRATIONS_VIEW);
    expect(PATRICK_KEYS).toContain(PERMISSIONS.REGISTRATIONS_EDIT);
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.REGISTRATIONS_DELETE);
    const sections = getVisibleNavSections(PATRICK_KEYS);
    const hrefs = sections.flatMap((s) =>
      s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );
    expect(hrefs).toContain("/dashboard/registrations");
  });

  it("PRESIDENT_NO_IMPERSONATION", () => {
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.USERS_IMPERSONATE_TENANT);
  });

  it("PRESIDENT_NO_ROLE_ADMIN", () => {
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.ROLES_MANAGE);
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.ROLES_ASSIGN);
  });

  it("PRESIDENT_NO_PEOPLE_ADMIN", () => {
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.PEOPLE_VIEW);
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.PEOPLE_MANAGE);
    expect(PATRICK_KEYS).not.toContain(PERMISSIONS.USERS_MANAGE_MEMBERSHIPS);
  });

  it("planning navigation — Wochenplaner, Trainings, Spiele, Turniere, Veranstaltungen", () => {
    const sections = getVisibleNavSections(PATRICK_KEYS);
    const hrefs = sections.flatMap((s) =>
      s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );
    expect(hrefs).toContain("/dashboard/planner/week");
    expect(hrefs).toContain("/dashboard/training");
    expect(hrefs).toContain("/dashboard/matchcenter");
    expect(hrefs).toContain("/dashboard/tournamentcenter");
    expect(hrefs).toContain("/dashboard/veranstaltungen");
  });

  it("Sandra template unchanged — Spielbetrieb forbidden keys stay excluded", () => {
    for (const key of PILOT_FORBIDDEN_PERMISSION_KEYS) {
      expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).not.toContain(key);
    }
  });

  it("permission diff helper — Sandra baseline subset of Patrick", () => {
    expect(diff(SANDRA_KEYS, patrickSet)).toEqual([]);
    const patrickOnly = diff(patrickSet, SANDRA_KEYS);
    expect(patrickOnly).toEqual(
      [
        PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE,
        PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_VIEW,
        PERMISSIONS.NEWS_MANAGE,
        PERMISSIONS.ORG_VIEW,
        PERMISSIONS.REGISTRATIONS_EDIT,
        PERMISSIONS.REGISTRATIONS_VIEW,
      ].sort(),
    );
  });
});
