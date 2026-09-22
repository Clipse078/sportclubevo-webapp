/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard/aufgaben",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/personal-actions/require-module-access", () => ({
  requirePersonalActionsModuleAccess: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
    tenantId: "tenant-1",
    capabilities: {
      taskManagement: true,
      requirementManagement: false,
      personalInbox: true,
      moduleAccess: true,
      permissionKeys: ["tasks.view", "tasks.create", "tasks.assign", "tasks.manage"],
    },
  }),
}));

vi.mock("@/lib/personal-actions", () => ({
  loadPersonalActions: vi.fn().mockResolvedValue([]),
  countPersonalActions: vi.fn().mockResolvedValue({
    totalActionable: 0,
    taskActionable: 0,
    attendanceActionable: 0,
  }),
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: ["tasks.view", "tasks.create", "tasks.assign", "tasks.manage"],
  }),
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: vi.fn().mockResolvedValue({ timezone: "Europe/Zurich", locale: "de-CH" }),
}));

vi.mock("@/lib/tasks/task-org-options", () => ({
  loadTaskOrgUnitFilterOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/admin/aufgaben/MeineAufgabenQuickCreateDialog", () => ({
  default: () => null,
}));

vi.mock("@/lib/tasks/queries", () => ({
  listEligibleTaskAssignees: vi.fn().mockResolvedValue([
    {
      userId: "user-2",
      firstName: "Sam",
      lastName: "Staff",
      email: "sam@example.com",
    },
  ]),
}));

vi.mock("@/lib/tasks/management-service", () => ({
  TASK_MANAGEMENT_PAGE_SIZE: 25,
  getTaskManagementSummary: vi.fn().mockResolvedValue({
    open: 3,
    overdue: 1,
    dueThisWeek: 2,
    myOpen: 1,
  }),
  listTaskManagementItems: vi.fn().mockResolvedValue({
    items: [
      {
        task: {
          id: "task-1",
          tenantId: "tenant-1",
          title: "Material bestellen",
          description: null,
          status: "OPEN",
          priority: "NORMAL",
          dueAt: null,
          completedAt: null,
          contextType: null,
          contextId: null,
          parentTaskId: null,
          taskSeriesId: null,
          createdByUserId: "user-1",
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T10:00:00.000Z",
          assignees: [],
        },
        parentTask: null,
        subtasks: [],
        progress: {
          completedCount: 0,
          totalCount: 0,
          percent: 0,
          label: "0 / 0 erledigt",
        },
        seriesRecurrenceLabel: null,
        context: null,
        expandable: false,
      },
    ],
    totalCount: 1,
    page: 1,
    pageCount: 1,
  }),
  listTaskSeriesManagementRows: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
}));

vi.mock("@/lib/requirements/server-context", () => ({
  getRequirementServiceContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: ["requirements.view", "requirements.manage", "requirements.view_aggregate"],
  }),
}));
vi.mock("@/lib/requirements/requirement-authorization", () => ({
  canCreateRequirement: vi.fn().mockReturnValue(true),
}));
vi.mock("@/lib/requirements/management-service", () => ({
  getRequirementManagementSummary: vi.fn(),
  listRequirementManagementItems: vi.fn(),
}));

import AufgabenPage from "../page";
import { requirePersonalActionsModuleAccess } from "@/lib/personal-actions/require-module-access";
import { getRequirementManagementSummary, listRequirementManagementItems } from "@/lib/requirements/management-service";

describe("AUFGABEN-02 — Aufgaben management page", () => {
  it("renders personal inbox by default for authorized users", async () => {
    const jsx = await AufgabenPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByTestId("personal-actions-inbox")).toBeInTheDocument();
    expect(screen.getByTestId("personal-inbox-empty")).toBeInTheDocument();
  });

  it("M1 renders requirements workspace when bereich=anforderungen", async () => {
    vi.mocked(requirePersonalActionsModuleAccess).mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      tenantId: "tenant-1",
      capabilities: {
        taskManagement: true,
        requirementManagement: true,
        personalInbox: true,
        moduleAccess: true,
        permissionKeys: ["requirements.view", "requirements.manage", "requirements.view_aggregate"],
      },
    });
    vi.mocked(getRequirementManagementSummary).mockResolvedValueOnce({
      active: 2,
      openRecipients: 5,
      overdue: 1,
      completed: 3,
    });
    vi.mocked(listRequirementManagementItems).mockResolvedValueOnce({
      items: [],
      totalCount: 0,
      page: 1,
      pageCount: 1,
    });
    const jsx = await AufgabenPage({
      searchParams: Promise.resolve({ bereich: "anforderungen" }),
    });
    render(jsx);
    expect(screen.getByTestId("requirements-management-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("aufgaben-bereich-anforderungen")).toHaveAttribute("aria-current", "page");
  });

  it("renders management workspace when bereich=verwaltung", async () => {
    const jsx = await AufgabenPage({
      searchParams: Promise.resolve({ bereich: "verwaltung", view: "MEINE" }),
    });
    render(jsx);
    expect(screen.getByTestId("aufgaben-management-workspace")).toBeInTheDocument();
    expect(screen.getByText("Material bestellen")).toBeInTheDocument();
    expect(screen.getByTestId("aufgaben-view-meine")).toHaveAttribute("aria-current", "true");
  });
});
