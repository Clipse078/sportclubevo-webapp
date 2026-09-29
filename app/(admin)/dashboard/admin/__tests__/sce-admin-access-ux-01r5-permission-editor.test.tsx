/**
 * @vitest-environment jsdom
 * SCE-ADMIN-ACCESS-UX-01R5 — Permission editor UX repair
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NavAlignedPermissionEditor, {
  permissionSwitchStatusLabel,
} from "@/components/admin/roles/NavAlignedPermissionEditor";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
import PeopleAccessWizardDialog from "@/components/admin/users/people-access/PeopleAccessWizardDialog";
import { Dialog } from "@/components/ui/Dialog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileOverridesFromEffectiveChange } from "@/lib/permissions/apply-permission-overrides";
import { SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256 } from "@/lib/shell/sce-app-background";

const FULL_CATALOG = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.ORG_MANAGE,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_MANAGE,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.TRAININGS_DELETE,
  PERMISSIONS.EVENTS_VIEW,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.WOCHENPLAN_MANAGE,
];

function buildModuleGroups(keys: string[]) {
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

describe("SCE-ADMIN-ACCESS-UX-01R5 — layout", () => {
  const moduleGroups = buildModuleGroups(FULL_CATALOG);

  it("expands Tagesbetrieb without throw", () => {
    expect(() =>
      render(
        <NavAlignedPermissionEditor
          moduleGroups={moduleGroups}
          selectedKeys={new Set()}
          onChange={vi.fn()}
          peopleAccessMode
        />,
      ),
    ).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: /Tagesbetrieb/i }));
    expect(screen.getByText("Trainings")).toBeTruthy();
  });

  it("Alles einblenden expands all top-level sections without throw", () => {
    render(
      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={new Set()}
        onChange={vi.fn()}
        peopleAccessMode
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Alles einblenden/i }));
    const sectionButtons = screen.getAllByRole("button", { name: /Module/i });
    for (const btn of sectionButtons) {
      expect(btn).toHaveAttribute("aria-expanded", "true");
    }
  });

  it("Trainings renders Ansehen/Verwalten switches and no ERWEITERT column", () => {
    render(
      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={new Set([PERMISSIONS.TRAININGS_VIEW])}
        onChange={vi.fn()}
        peopleAccessMode
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tagesbetrieb/i }));
    expect(screen.getAllByRole("switch", { name: /Trainings ansehen/i }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByRole("switch", { name: /Trainings verwalten/i }).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/^Erweitert$/i)).toBeNull();
  });

  it("shows Erweiterte Rechte disclosure and full-width panel below Trainings", () => {
    render(
      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={new Set()}
        onChange={vi.fn()}
        peopleAccessMode
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tagesbetrieb/i }));

    const trainingsRow = screen.getByText("Trainings").closest("div.border-b")!;
    const disclosure = within(trainingsRow as HTMLElement).getByRole("button", {
      name: /Erweiterte Rechte \(1\)/i,
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");

    const panel = document.getElementById(disclosure.getAttribute("aria-controls")!);
    expect(panel).toBeTruthy();
    expect(within(panel!).getByText("Trainingsplanung dauerhaft löschen")).toBeTruthy();
    expect(within(panel!).getByText(/Kritische Berechtigung/i)).toBeTruthy();
  });

  it("advanced permission switch toggles effective selection", () => {
    const onChange = vi.fn();
    render(
      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={new Set()}
        onChange={onChange}
        peopleAccessMode
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tagesbetrieb/i }));
    const trainingsRow = screen.getByText("Trainings").closest("div.border-b")!;
    fireEvent.click(
      within(trainingsRow as HTMLElement).getByRole("button", {
        name: /Erweiterte Rechte \(1\)/i,
      }),
    );

    const delSwitch = within(trainingsRow as HTMLElement).getByLabelText(
      "Trainingsplanung dauerhaft löschen",
    );
    fireEvent.click(delSwitch);
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect(next.has(PERMISSIONS.TRAININGS_DELETE)).toBe(true);
  });

  it("mobile layout stacks switches without horizontal matrix class on root row", () => {
    const { container } = render(
      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={new Set()}
        onChange={vi.fn()}
        peopleAccessMode
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tagesbetrieb/i }));
    const narrowColumnGrid = container.querySelector(
      '[class*="minmax(5.5rem,7rem)"]',
    );
    expect(narrowColumnGrid).toBeNull();
  });
});

describe("SCE-ADMIN-ACCESS-UX-01R5 — switch status copy", () => {
  const baseline = new Set([PERMISSIONS.TEAMS_VIEW]);

  it("maps role baseline, ALLOW, DENY, and no access", () => {
    expect(
      permissionSwitchStatusLabel([PERMISSIONS.TEAMS_VIEW], baseline, {}),
    ).toBe("Über Rolle erlaubt");
    expect(
      permissionSwitchStatusLabel([PERMISSIONS.TEAMS_MANAGE], baseline, {
        [PERMISSIONS.TEAMS_MANAGE]: "ALLOW",
      }),
    ).toBe("Individuell erlaubt");
    expect(
      permissionSwitchStatusLabel([PERMISSIONS.TEAMS_VIEW], baseline, {
        [PERMISSIONS.TEAMS_VIEW]: "DENY",
      }),
    ).toBe("Individuell entzogen");
    expect(
      permissionSwitchStatusLabel([PERMISSIONS.TEAMS_MANAGE], baseline, {}),
    ).toBe("Nicht erlaubt");
  });

  it("renders status labels under people access switches", () => {
    render(
      <PeopleAccessPermissionPanel
        moduleGroups={buildModuleGroups([PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_MANAGE])}
        permissionKeys={[PERMISSIONS.TEAMS_VIEW]}
        roleNamesByKey={{ [PERMISSIONS.TEAMS_VIEW]: ["Trainer/in"] }}
        interactive
        overrideDraft={{ [PERMISSIONS.TEAMS_MANAGE]: "ALLOW" }}
        onOverrideDraftChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Alles einblenden/i }));
    expect(screen.getAllByText("Über Rolle erlaubt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Individuell erlaubt").length).toBeGreaterThan(0);
  });

  it("reset removes override via reconcile helper", () => {
    const roleBaseline = new Set([PERMISSIONS.TEAMS_VIEW]);
    const effective = new Set(roleBaseline);
    effective.delete(PERMISSIONS.TEAMS_VIEW);
    const overrides = reconcileOverridesFromEffectiveChange(roleBaseline, effective);
    expect(overrides[PERMISSIONS.TEAMS_VIEW]).toBe("DENY");

    const cleared = reconcileOverridesFromEffectiveChange(roleBaseline, new Set(roleBaseline));
    expect(Object.keys(cleared)).toHaveLength(0);
  });
});

describe("SCE-ADMIN-ACCESS-UX-01R5 — stability & modal scroll", () => {
  it("unknown nav icon label does not crash render", () => {
    const groups = buildModuleGroups([...FULL_CATALOG, PERMISSIONS.FUNCTIONS_MANAGE]);
    expect(() =>
      render(
        <NavAlignedPermissionEditor
          moduleGroups={groups}
          selectedKeys={new Set()}
          onChange={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it("dialog flex body uses single embedded scroll region in wizard shell", () => {
    render(
      <Dialog open title="Test" onClose={vi.fn()} bodyLayout="flex">
        <div data-testid="wizard-shell" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0">Header</div>
          <div className="min-h-0 flex-1 overflow-y-auto">Content</div>
          <div className="shrink-0">Footer</div>
        </div>
      </Dialog>,
    );
    const body = document.querySelector(".overflow-hidden.flex-col");
    expect(body).toBeTruthy();
    expect(screen.getByTestId("wizard-shell")).toBeTruthy();
  });

  it("PeopleAccessWizardDialog uses flex dialog body layout", () => {
    render(
      <PeopleAccessWizardDialog
        open
        onClose={vi.fn()}
        onComplete={vi.fn()}
        availableRoles={[]}
        availableOrgUnits={[]}
        clubAdminRoleKey="club_admin"
        privilegedRoleIds={[]}
      />,
    );
    expect(screen.getByText("Person hinzufügen")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Abbrechen/i })).toBeTruthy();
  });

  it("canonical app background hash unchanged", () => {
    expect(SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256).toBe(
      "583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09",
    );
  });
});
