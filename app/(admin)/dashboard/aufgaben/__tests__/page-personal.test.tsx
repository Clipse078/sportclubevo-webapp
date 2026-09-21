/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard/aufgaben",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/personal-actions/require-module-access", () => ({
  requirePersonalActionsModuleAccess: vi.fn().mockResolvedValue({
    session: { user: { id: "parent-user" } },
    tenantId: "tenant-1",
    capabilities: {
      taskManagement: false,
      personalInbox: true,
      moduleAccess: true,
      permissionKeys: [],
    },
  }),
}));

vi.mock("@/lib/personal-actions", () => ({
  countPersonalActions: vi.fn().mockResolvedValue({
    totalActionable: 1,
    taskActionable: 0,
    attendanceActionable: 1,
  }),
  loadPersonalActions: vi.fn().mockResolvedValue([
    {
      id: "pa-att",
      sourceType: "ATTENDANCE_RESPONSE",
      sourceId: null,
      subject: { personId: "child-1", displayName: "James" },
      title: "Training F2",
      subtitle: "Training · F2",
      dueAt: null,
      status: "ACTIONABLE",
      href: null,
      actionKind: "PARTICIPATION_RESPONSE",
      context: {
        teamDisplayName: "F2",
        eventTitle: "Training F2",
        eventStartAt: "2026-09-21T15:00:00.000Z",
      },
    },
  ]),
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich", locale: "de-CH" }),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn(),
}));

vi.mock("@/components/admin/aufgaben/MeineAufgabenQuickCreateDialog", () => ({
  default: () => null,
}));

import AufgabenPage from "../page";

describe("AUFGABEN-05-UI — parent-only Aufgaben page", () => {
  it("K — parent-only ?bereich=verwaltung stays on personal inbox", async () => {
    const jsx = await AufgabenPage({
      searchParams: Promise.resolve({ bereich: "verwaltung" }),
    });
    render(jsx);

    expect(screen.getByTestId("personal-actions-inbox")).toBeInTheDocument();
    expect(screen.queryByTestId("aufgaben-management-workspace")).toBeNull();
    expect(screen.queryByTestId("aufgaben-scope-toggle")).toBeNull();
  });

  it("L — unknown bereich falls back to personal inbox", async () => {
    const jsx = await AufgabenPage({
      searchParams: Promise.resolve({ bereich: "foo" }),
    });
    render(jsx);
    expect(screen.getByTestId("personal-actions-inbox")).toBeInTheDocument();
  });

  it("P — renders personal inbox without management workspace", async () => {
    const jsx = await AufgabenPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("personal-actions-inbox")).toBeInTheDocument();
    expect(screen.getByText("Teilnahme für James bestätigen")).toBeInTheDocument();
    expect(screen.queryByTestId("aufgaben-management-workspace")).toBeNull();
    expect(screen.queryByTestId("aufgaben-scope-toggle")).toBeNull();
  });
});
