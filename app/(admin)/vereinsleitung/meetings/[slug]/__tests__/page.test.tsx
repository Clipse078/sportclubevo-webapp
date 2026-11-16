/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  meetingDetailWorkspaceApprovalFixture,
  meetingDetailWorkspaceMeetingFixture,
  meetingDetailWorkspaceSubEntitiesFixture,
} from "@/lib/meetings/__tests__/fixtures/meeting-detail-workspace-fixtures";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  requireActiveTenantId: vi.fn(),
  getActiveTenant: vi.fn(),
}));

vi.mock("@/lib/visibility/get-actor-context", () => ({
  getActorContext: vi.fn(),
}));

vi.mock("@/lib/meetings/queries", () => ({
  getMeetingBySlug: vi.fn(),
  getMeetingSubEntities: vi.fn(),
}));

vi.mock("@/lib/meetings/meeting-approval-workspace-data", () => ({
  getMeetingApprovalWorkspaceData: vi.fn(),
}));

vi.mock("@/lib/meetings/meeting-person-payload", () => ({
  resolvePersonIdForUser: vi.fn(),
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: vi.fn(() => ({
    hasTenantDeletionAuthority: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn(),
}));

vi.mock("@/lib/meetings/load-meeting-pendenzen", () => ({
  loadMeetingPendenzenSnapshot: vi.fn(),
}));

vi.mock("@/components/admin/meetings/workspace/MeetingWorkspace", () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="meeting-workspace">{title}</div>
  ),
}));

vi.mock("@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell", () => ({
  MeetingWorkspaceDirtyShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="meeting-dirty-shell">{children}</div>
  ),
}));

vi.mock("@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel", () => ({
  default: () => <div data-testid="related-tasks-panel" />,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

import MeetingDetailPage from "../page";
import { auth } from "@/auth";
import { requireActiveTenantId, getActiveTenant } from "@/lib/tenants/active-tenant";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getMeetingBySlug, getMeetingSubEntities } from "@/lib/meetings/queries";
import { getMeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import { resolvePersonIdForUser } from "@/lib/meetings/meeting-person-payload";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadMeetingPendenzenSnapshot } from "@/lib/meetings/load-meeting-pendenzen";

describe("/vereinsleitung/meetings/[slug] page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", activeTenantId: "tenant-1", permissionKeys: [] },
    } as never);
    vi.mocked(requireActiveTenantId).mockResolvedValue("tenant-1");
    vi.mocked(getActiveTenant).mockResolvedValue({
      locale: "de-CH",
      timezone: "Europe/Zurich",
    } as never);
    vi.mocked(getActorContext).mockResolvedValue({
      tenantId: "tenant-1",
      permissionKeys: ["meetings.view"],
    } as never);
    vi.mocked(resolvePersonIdForUser).mockResolvedValue("person-1");
    vi.mocked(getTaskServiceContext).mockResolvedValue({} as never);
    vi.mocked(loadMeetingPendenzenSnapshot).mockResolvedValue({
      openCount: 0,
      overdueCount: 0,
    } as never);
  });

  it("calls notFound when the meeting is not visible — no sample fallback UI", async () => {
    vi.mocked(getMeetingBySlug).mockResolvedValue(null);

    await expect(
      MeetingDetailPage({ params: Promise.resolve({ slug: "fixture-missing" }) }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalled();
    expect(getMeetingSubEntities).not.toHaveBeenCalled();
  });

  it("renders MeetingWorkspace with real record identity when load succeeds", async () => {
    vi.mocked(getMeetingBySlug).mockResolvedValue(meetingDetailWorkspaceMeetingFixture);
    vi.mocked(getMeetingSubEntities).mockResolvedValue(meetingDetailWorkspaceSubEntitiesFixture);
    vi.mocked(getMeetingApprovalWorkspaceData).mockResolvedValue(meetingDetailWorkspaceApprovalFixture);

    const ui = await MeetingDetailPage({
      params: Promise.resolve({ slug: meetingDetailWorkspaceMeetingFixture.slug }),
    });
    render(ui);

    expect(screen.getByTestId("meeting-dirty-shell")).toBeTruthy();
    expect(screen.getByTestId("meeting-workspace")).toBeTruthy();
    expect(screen.getAllByText("Fixture Vorstandssitzung").length).toBeGreaterThan(0);
    expect(screen.queryByText("16. April 2024")).toBeNull();
    expect(screen.queryByText("Michael Weber")).toBeNull();
  });
});