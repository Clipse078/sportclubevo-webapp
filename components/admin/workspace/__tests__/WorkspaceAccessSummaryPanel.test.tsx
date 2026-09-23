/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

const fetchMock = vi.fn();

import { WorkspaceAccessSummaryPanel } from "@/components/admin/workspace/WorkspaceAccessSummaryPanel";

const summary = {
  resourceId: "folder-1",
  resourceType: "FOLDER" as const,
  policyMode: WorkspaceAccessInheritanceMode.INHERIT,
  policyModeHeadline: "Geerbt von: Vereinsleitung",
  inheritanceDescription: "Zugriff wird vom Ordner «Vereinsleitung» übernommen.",
  parentName: "Vereinsleitung",
  moreCount: 0,
  effectiveAccess: [
    {
      audienceKind: "TEAM" as const,
      audienceLabel: "Junioren F2",
      audienceKey: "TEAM:t1",
      effectiveLevel: "EDIT" as const,
      effectiveLevelLabel: "Bearbeiten",
      configuredLevel: null,
      configuredLevelLabel: null,
      sourceLabel: "Geerbt",
      whyLabel: "Über Team · Junioren F2",
      cappedByAncestor: false,
      ancestorCapLabel: null,
      pathCount: 1,
      isInherited: true,
    },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("WorkspaceAccessSummaryPanel W09-04", () => {
  it("renders inheritance headline and effective access with why label", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary }),
    });
    render(
      <WorkspaceAccessSummaryPanel
        resourceType="FOLDER"
        resourceId="folder-1"
        canManageAccess
        onManageAccess={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("Geerbt von: Vereinsleitung")).toBeInTheDocument(),
    );
    expect(screen.getByText("Über Team · Junioren F2")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-access-manage-button")).toBeInTheDocument();
  });

  it("shows inherited badge without edit controls on rows", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary }),
    });
    render(
      <WorkspaceAccessSummaryPanel
        resourceType="FOLDER"
        resourceId="folder-1"
        canManageAccess={false}
      />,
    );
    await waitFor(() => expect(screen.getByText("inheritedBadge")).toBeInTheDocument());
    expect(screen.queryByTestId("workspace-access-manage-button")).toBeNull();
  });
});
