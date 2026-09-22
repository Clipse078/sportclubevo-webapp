/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params?.name ? `${key}:${params.name}` : key,
}));

const fetchMock = vi.fn();

import { WorkspaceAccessManagementDialog } from "@/components/admin/workspace/WorkspaceAccessManagementDialog";

const viewModel = {
  resource: {
    id: "folder-1",
    resourceType: "FOLDER" as const,
    name: "Finanzen",
    parentId: null,
    parentName: null,
  },
  policyMode: WorkspaceAccessInheritanceMode.EXPLICIT,
  policyModeLabel: "Eingeschränkt",
  canManage: true,
  explicitGrants: [],
  effectiveAccess: [
    {
      audienceKind: "ORGANISATION" as const,
      audienceLabel: "Organisation",
      audienceKey: "ORGANISATION",
      effectiveLevel: "VIEW" as const,
      effectiveLevelLabel: "Lesen",
      sourceLabel: "Direkt",
      cappedByAncestor: false,
      ancestorCapLabel: null,
    },
  ],
  inheritedAccess: [
    {
      audienceKind: "TEAM" as const,
      audienceLabel: "U17",
      level: "VIEW" as const,
      levelLabel: "Lesen",
      inheritedFromResourceId: "root",
      inheritedFromResourceName: "Root",
      inheritedFromResourceType: "FOLDER" as const,
    },
  ],
  inheritDescription: "Eingeschränkt",
  restrictionSeedGrants: [{ subjectType: "ORGANISATION" as const, accessLevel: "VIEW" as const }],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("WorkspaceAccessManagementDialog", () => {
  it("W03-A1-13 inherited section is read-only (no remove on inherited rows)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ accessManagement: viewModel }),
    });
    render(
      <WorkspaceAccessManagementDialog
        open
        onClose={vi.fn()}
        resourceType="FOLDER"
        resourceId="folder-1"
        resourceName="Finanzen"
      />,
    );
    await waitFor(() => expect(screen.getByText("inheritedReadOnlyHint")).toBeInTheDocument());
    expect(screen.queryAllByRole("button", { name: "removeGrant" })).toHaveLength(0);
  });

  it("W03-A1-21 return to inheritance refreshes via PUT", async () => {
    const inheritView = {
      ...viewModel,
      policyMode: WorkspaceAccessInheritanceMode.INHERIT,
      explicitGrants: [],
    };
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          accessManagement: init?.method === "PUT" ? inheritView : viewModel,
        }),
      }),
    );
    const onSaved = vi.fn();
    render(
      <WorkspaceAccessManagementDialog
        open
        onClose={vi.fn()}
        resourceType="FOLDER"
        resourceId="folder-1"
        resourceName="Finanzen"
        onSaved={onSaved}
      />,
    );
    await screen.findByText("inheritedReadOnlyHint");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "returnToInheritance" }));
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const putCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT",
    );
    expect(putCall).toBeTruthy();
    const body = JSON.parse(String((putCall?.[1] as RequestInit).body)) as {
      accessInheritanceMode: string;
    };
    expect(body.accessInheritanceMode).toBe("INHERIT");
  });
});
