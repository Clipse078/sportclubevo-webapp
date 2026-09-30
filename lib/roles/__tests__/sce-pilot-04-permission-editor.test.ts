import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildNavPermissionPresentation,
  togglePermissionKey,
  type PermissionCatalogRow,
} from "@/lib/roles/nav-permission-presentation";
import { findMissingDelegatedPermissions } from "@/lib/roles/delegation-utils";

function catalogRow(key: string, moduleName = "TRAININGS"): PermissionCatalogRow {
  return { id: key, key, name: key, module: moduleName };
}

/** Catalog slice covering Sandra's approved pilot grant set. */
const PILOT_CATALOG: PermissionCatalogRow[] = [
  PERMISSIONS.SEASONS_VIEW,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.FACILITIES_VIEW,
  PERMISSIONS.TASKS_VIEW,
  "requirements.view",
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.COMMUNICATION_CLUB_VIEW,
  PERMISSIONS.NEWS_VIEW,
  PERMISSIONS.WEBSITE_VIEW,
  PERMISSIONS.INFOBOARD_VIEW,
  PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
  PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_VIEW,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
].map((key) =>
  catalogRow(
    key,
    key.startsWith("news.")
      ? "NEWS"
      : key.startsWith("website.")
        ? "WEBSITE"
        : key.startsWith("infoboard.")
          ? "INFOBOARD"
          : key.startsWith("communication.")
            ? "COMMUNICATION"
            : key.startsWith("requirements.")
              ? "REQUIREMENTS"
              : key.startsWith("planning.")
                ? "TRAININGS"
                : "TEAMS",
  ),
);

describe("SCE-PILOT-04 — approved pilot permissions in role editor", () => {
  it("exposes allocation view/manage under Wochenplaner with selectable toggles", () => {
    const presentation = buildNavPermissionPresentation(PILOT_CATALOG);
    const tagesbetrieb = presentation.sections.find((section) => section.label === "Tagesbetrieb");
    const wochenplaner = tagesbetrieb?.units.find((unit) => unit.label === "Wochenplaner");

    expect(wochenplaner).toBeDefined();
    expect(wochenplaner?.isDerived).not.toBe(true);
    expect(
      wochenplaner?.standardControls.find((control) => control.kind === "view")?.permissionKeys,
    ).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW);
    expect(
      wochenplaner?.standardControls.find((control) => control.kind === "manage")?.permissionKeys,
    ).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(wochenplaner?.derivedNote).toBeUndefined();
  });

  it("does not bundle allocation-only grants into Trainings or Spielbetrieb manage", () => {
    const selected = new Set([
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    ]);

    expect(selected.has(PERMISSIONS.TRAININGS_MANAGE)).toBe(false);
    expect(selected.has(PERMISSIONS.EVENTS_MANAGE)).toBe(false);
    expect(selected.has(PERMISSIONS.WOCHENPLAN_MANAGE)).toBe(false);

    const withManage = togglePermissionKey(selected, PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE, true);
    expect(withManage.has(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW)).toBe(true);
    expect(withManage.has(PERMISSIONS.TRAININGS_VIEW)).toBe(false);
  });

  it("maps read-only content view keys to Öffentliche Kanäle units", () => {
    const presentation = buildNavPermissionPresentation([
      ...PILOT_CATALOG,
      catalogRow(PERMISSIONS.NEWS_MANAGE, "NEWS"),
      catalogRow(PERMISSIONS.WEBSITE_MANAGE, "WEBSITE"),
      catalogRow(PERMISSIONS.INFOBOARD_MANAGE, "INFOBOARD"),
    ]);

    const oeffentlich = presentation.sections.find(
      (section) => section.label === "Öffentliche Kanäle",
    );
    const news = oeffentlich?.units.find((unit) => unit.label === "News");
    const publizieren = oeffentlich?.units.find((unit) => unit.label === "Publizieren");
    const infoboard = oeffentlich?.units.find((unit) => unit.label === "Infoboard");

    expect(
      news?.standardControls.find((c) => c.kind === "view")?.permissionKeys,
    ).toContain(PERMISSIONS.NEWS_VIEW);
    expect(
      publizieren?.standardControls.find((c) => c.kind === "view")?.permissionKeys,
    ).toContain(PERMISSIONS.WEBSITE_VIEW);
    expect(
      infoboard?.standardControls.find((c) => c.kind === "view")?.permissionKeys,
    ).toContain(PERMISSIONS.INFOBOARD_VIEW);
  });

  it("keeps pilot allocation keys out of the supplemental catch-all when nav-mapped", () => {
    const presentation = buildNavPermissionPresentation(PILOT_CATALOG);
    const supplementalKeys =
      presentation.supplementalUnit?.standardControls.flatMap((c) => c.permissionKeys) ?? [];

    expect(supplementalKeys).not.toContain(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW);
    expect(supplementalKeys).not.toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
  });

  it("rejects forged assignment of permissions the operator does not hold", () => {
    const actor = [PERMISSIONS.ROLES_MANAGE, PERMISSIONS.TEAMS_VIEW];
    const forged = findMissingDelegatedPermissions(actor, [
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    ]);
    expect(forged).toEqual([PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE]);
  });
});
