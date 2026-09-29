/**
 * @vitest-environment jsdom
 *
 * ACCESS-ONBOARDING-03E — Toggle-only tenant role permission editor
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NavAlignedPermissionEditor, {
  buildNavPermissionPresentationFromModuleGroups,
} from "@/components/admin/roles/NavAlignedPermissionEditor";
import PermissionMatrixFields from "@/components/admin/roles/PermissionMatrixFields";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/PermissionMatrixFields";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function buildModuleGroups(keys: string[]): PermissionMatrixModuleGroup[] {
  return [
    {
      module: "TEST",
      permissions: keys.map((key, index) => ({
        id: String(index + 1),
        key,
        name: key,
        module: "TEST",
      })),
    },
  ];
}

const ROLE_EDITOR_CATALOG = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.ORG_MANAGE,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_MANAGE,
  PERMISSIONS.PEOPLE_VIEW,
  PERMISSIONS.PEOPLE_MANAGE,
  PERMISSIONS.COMPETITIONS_VIEW,
  PERMISSIONS.COMPETITIONS_MANAGE,
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.TRAININGS_DELETE,
  PERMISSIONS.EVENTS_VIEW,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.EVENTS_DELETE,
  PERMISSIONS.MATCHES_DELETE,
  PERMISSIONS.TOURNAMENTS_DELETE,
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.WORKSPACE_MANAGE,
  PERMISSIONS.REGISTRATIONS_VIEW,
  PERMISSIONS.REGISTRATIONS_EDIT,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.INFOBOARD_MANAGE,
  PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.SEASONS_VIEW,
  PERMISSIONS.SEASONS_MANAGE,
  PERMISSIONS.FACILITIES_VIEW,
  PERMISSIONS.FACILITIES_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
  PERMISSIONS.FIXTURES_VIEW,
];

const moduleGroups = buildModuleGroups(ROLE_EDITOR_CATALOG);

function renderEditor(
  selectedKeys: string[] = [],
  onChange = vi.fn(),
) {
  return render(
    <NavAlignedPermissionEditor
      moduleGroups={moduleGroups}
      selectedKeys={new Set(selectedKeys)}
      onChange={onChange}
    />,
  );
}

describe("NavAlignedPermissionEditor — ACCESS-ONBOARDING-03E", () => {
  it("renders zero checkbox inputs in the normal permission editor", () => {
    renderEditor();
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("uses shared SwitchThumb toggles for Ansehen and Verwalten", () => {
    renderEditor();

    expect(screen.getAllByText("Ansehen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verwalten").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bearbeiten")).toBeNull();

    const switches = document.querySelectorAll('[role="switch"]');
    expect(switches.length).toBeGreaterThan(0);
  });

  it("uses shared toggles for advanced binary permissions", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: /Tagesbetrieb/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Spielbetrieb")).toBeTruthy();

    const advancedSections = screen.getAllByRole("button", { name: /Erweiterte Rechte/i });
    fireEvent.click(advancedSections[0]!);

    const switches = document.querySelectorAll('[role="switch"]');
    expect(switches.length).toBeGreaterThan(2);
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("enabling Verwalten also enables Ansehen for dependent permissions", () => {
    const onChange = vi.fn();
    renderEditor([], onChange);

    const teamsManageToggle = screen.getAllByRole("switch", {
      name: /Teams verwalten/i,
      hidden: true,
    })[0]!;
    fireEvent.click(teamsManageToggle);

    expect(onChange).toHaveBeenCalled();
    const nextKeys = onChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect(nextKeys.has(PERMISSIONS.TEAMS_MANAGE)).toBe(true);
    expect(nextKeys.has(PERMISSIONS.TEAMS_VIEW)).toBe(true);
  });

  it("disabling Ansehen removes Verwalten when manage depends on view", () => {
    const onChange = vi.fn();
    renderEditor([PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_MANAGE], onChange);

    const teamsViewToggle = screen.getAllByRole("switch", {
      name: /Teams ansehen/i,
      hidden: true,
    })[0]!;
    fireEvent.click(teamsViewToggle);

    expect(onChange).toHaveBeenCalled();
    const nextKeys = onChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect(nextKeys.has(PERMISSIONS.TEAMS_VIEW)).toBe(false);
    expect(nextKeys.has(PERMISSIONS.TEAMS_MANAGE)).toBe(false);
  });

  it("preserves Spielbetrieb shared events permission grouping inside Tagesbetrieb", () => {
    renderEditor();

    expect(screen.getByText("Spielbetrieb")).toBeTruthy();
    expect(screen.getByText(/MatchCenter · TournamentCenter · Veranstaltungen/)).toBeTruthy();
  });

  it("expands Tagesbetrieb by default and keeps other sections collapsed", () => {
    renderEditor();

    const tagesbetriebToggle = screen.getByRole("button", { name: /Tagesbetrieb/i });
    const websiteToggle = screen.getByRole("button", { name: /Öffentliche Kanäle/i });

    expect(tagesbetriebToggle).toHaveAttribute("aria-expanded", "true");
    expect(websiteToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Vereinsdaten")).toBeTruthy();
  });

  it("shows concise product labels instead of long technical joins", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Alles einblenden/i }));
    expect(screen.getByText("Vereinsdaten")).toBeTruthy();
    const presentation = buildNavPermissionPresentationFromModuleGroups(moduleGroups);
    expect(
      presentation.sections
        .flatMap((section) => section.units)
        .some((unit) => unit.label === "Mitglieder"),
    ).toBe(true);
    expect(
      screen.queryByText(/Organisationseinheiten · Zielgruppen · Vereine/),
    ).toBeNull();
  });

  it("renders section status labels and module count badges", () => {
    renderEditor();

    expect(screen.getAllByText(/Module/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nicht aktiv|Teilweise aktiv|Aktiv/).length).toBeGreaterThan(0);
  });

  it("exposes bulk expand and clear controls", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Alles einblenden" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alle deaktivieren" })).toBeTruthy();
  });

  it("shows selected count on collapsed sections with active permissions", () => {
    renderEditor([PERMISSIONS.EVENTS_MANAGE]);

    const tagesbetriebToggle = screen.getByRole("button", { name: /Tagesbetrieb/i });
    fireEvent.click(tagesbetriebToggle);
    expect(tagesbetriebToggle).toHaveAttribute("aria-expanded", "false");
    expect(tagesbetriebToggle.textContent).toMatch(/Teilweise aktiv|Aktiv/);
  });

  it("renders advanced permissions behind Erweiterte Rechte disclosure", () => {
    renderEditor();

    const advancedDisclosure = screen.getAllByRole("button", { name: /Erweiterte Rechte/i })[0]!;
    expect(advancedDisclosure).toHaveAttribute("aria-expanded", "false");
  });

  it("renders supplemental permissions in a secondary disclosure", () => {
    renderEditor();

    expect(screen.getAllByText("Weitere Zugriffsrechte").length).toBeGreaterThan(0);
    expect(screen.queryByText("Weitere Berechtigungen")).toBeNull();
  });

  it("create and edit flows share the same toggle-only PermissionMatrixFields wrapper", () => {
    const onChange = vi.fn();
    render(
      <PermissionMatrixFields
        moduleGroups={moduleGroups}
        selectedKeys={new Set()}
        onChange={onChange}
      />,
    );

    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(document.querySelectorAll('[role="switch"]').length).toBeGreaterThan(0);

    expect(screen.getByText("Spielbetrieb")).toBeTruthy();
  });

  it("renders Funktionen with a registered module icon (ACCESS-ONBOARDING-03K1)", () => {
    const groups = buildModuleGroups([...ROLE_EDITOR_CATALOG, PERMISSIONS.FUNCTIONS_MANAGE]);

    expect(() =>
      render(
        <NavAlignedPermissionEditor
          moduleGroups={groups}
          selectedKeys={new Set()}
          onChange={vi.fn()}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText("Funktionen")).toBeTruthy();
  });
});
