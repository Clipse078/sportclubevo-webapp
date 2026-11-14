/**
 * @vitest-environment jsdom
 *
 * SCE-CD-04R3 — Vereinsentwicklung terminology and mega-menu scrim.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  CD_SPRINT_WORKSPACE_COPY,
  CD_TASK_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import { loadTaskWorkspacePageData } from "@/lib/tasks/task-workspace-page";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: vi.fn(async () => undefined),
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: vi.fn(async () => ({ locale: "de-CH", timezone: "Europe/Zurich" })),
}));
vi.mock("@/lib/tasks/queries", () => ({
  listEligibleTaskAssignees: vi.fn(async () => []),
}));
vi.mock("@/lib/tasks/task-org-options", () => ({
  loadTaskOrgUnitMutationOptions: vi.fn(async () => []),
  resolveTaskOrgUnitPresentationBatch: vi.fn(async () => new Map()),
}));
vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn(async () => ({ tenantId: "t1", userId: "u1", permissionKeys: [] })),
}));
vi.mock("@/lib/tasks/workspace-service", () => ({
  loadTaskWorkspace: vi.fn(async () => ({
    task: { orgUnitId: null, visibilityScope: "ORGANISATION" },
    associations: { primaryInitiative: null, currentSprints: [], sprintHistory: [] },
  })),
}));
vi.mock("@/lib/tasks/management-navigation", () => ({
  resolveTaskManagementQuery: vi.fn(() => ({})),
  buildTaskManagementHref: vi.fn(() => "/dashboard/aufgaben"),
}));
vi.mock("@/lib/tasks/visibility", () => ({
  hasTaskPermission: vi.fn(() => false),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/org-units",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/admin/branding/SidebarPlatformBrand", () => ({
  default: () => <div data-testid="sce-brand" />,
}));
vi.mock("@/components/admin/layout/AdminPageActions", () => ({
  default: () => null,
}));
vi.mock("@/components/admin/notifications/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell" />,
}));
vi.mock("@/components/admin/layout/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));
vi.mock("@/lib/nav/use-primary-nav-layout-tier", () => ({
  usePrimaryNavLayoutTier: () => "desktop",
  maxInlineDomainsForTier: () => 8,
}));

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const adminKeys = Object.values(PERMISSIONS);

describe("SCE-CD-04R3 product copy anchors", () => {
  it("exposes task workspace and sprint vocabulary", () => {
    expect(CD_TASK_WORKSPACE_COPY.returnToImplementationPhase).toBe(
      "Zurück zur Umsetzungsphase",
    );
    expect(CD_SPRINT_WORKSPACE_COPY.tabTaskBoard).toBe("Aufgabenboard");
    expect(read("lib/nav/nav-config.ts")).toContain("Vorhaben & Prioritäten");
    expect(read("lib/nav/nav-config.ts")).toContain("Umsetzungsplanung");
  });

  it("task associations section uses Umsetzungsphase labels", () => {
    const section = read("components/admin/aufgaben/TaskWorkspaceAssociationsSection.tsx");
    expect(section).toContain("CD_TASK_WORKSPACE_COPY.currentImplementationPhase");
    expect(section).toContain("CD_TASK_WORKSPACE_COPY.priorImplementationPhases");
    expect(section).not.toContain("Aktuelle Sprint-Zuordnung");
  });

  it("uses Einordnung, Kennzahlen and Vereinsführung presentation labels", () => {
    const backlog = read("components/admin/club-development/InitiativeBacklogWorkspace.tsx");
    expect(backlog).toContain("CD_INITIATIVE_COPY.dispositionFilter");
    expect(backlog).not.toMatch(/>Disposition</);
    expect(read("components/admin/targets/TargetForm.tsx")).toContain("Vereinsführung");
    expect(read("components/admin/targets/TargetForm.tsx")).toContain("Kennzahlen");
    expect(read("lib/club-development/sprints/sprint-service.ts")).toContain("CD_SPRINT_API_COPY");
    expect(read("components/admin/initiatives/InitiativeGovernanceBanner.tsx")).toContain(
      "Prüfung & Freigabe",
    );
  });

  it("preserves safe returnTo routing contract", () => {
    expect(read("lib/tasks/task-navigation.ts")).toContain("returnTo");
    expect(read("components/admin/club-development/SprintTaskTitleLink.tsx")).toContain(
      "returnTo",
    );
  });
});

describe("SCE-CD-04R3 mega-menu scrim", () => {
  it("renders scrim when domain panel opens and closes on scrim click", async () => {
    const user = userEvent.setup();
    render(
      <div className="sce-authenticated-app-shell" data-sce-theme="white">
        <AppShellNavigation
          permissionKeys={adminKeys}
          workspaceContext="club"
          clubName="SC Cham"
          logoUrl="/crests/cham.svg"
          firstName="Test"
          lastName="User"
          email="test@example.com"
        />
        <main data-testid="page-content">Dashboard</main>
      </div>,
    );

    const clubButton = screen.getByRole("button", { name: /domains\.club/i });
    await user.click(clubButton);

    const scrim = screen.getByTestId("sce-domain-nav-overlay-scrim");
    expect(scrim).toBeInTheDocument();
    expect(read("app/(admin)/global-app-navigation.css")).toContain(
      "sce-domain-nav-overlay-scrim",
    );

    await user.click(scrim);
    expect(screen.queryByTestId("sce-domain-nav-overlay-scrim")).not.toBeInTheDocument();
  });

  it("white-theme menu panel uses subtle border and shadow", () => {
    const css = read("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\[data-sce-theme="white"\] \.sce-domain-nav-panel[\s\S]*border-bottom:/,
    );
    expect(css).toMatch(/box-shadow: 0 10px 24px/);
  });
});

describe("SCE-CD-04R3 return label", () => {
  it("labels sprint return navigation for dedicated task pages", async () => {
    const result = await loadTaskWorkspacePageData("task-1", {
      returnTo: "/vereinsleitung/sprints/test-sprint/board",
    });
    expect(result).toMatchObject({
      kind: "ok",
      returnContextLabel: CD_TASK_WORKSPACE_COPY.returnToImplementationPhase,
    });
  });
});