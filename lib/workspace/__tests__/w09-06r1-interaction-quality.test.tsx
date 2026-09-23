/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, unknown>) => {
    const full = params ? `${ns}.${key}:${JSON.stringify(params)}` : `${ns}.${key}`;
    return full;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/admin/workspace/WorkspaceCollaborationProvider", () => ({
  useOptionalWorkspaceFavoritesContext: () => ({
    isFavorite: () => false,
    isPending: () => false,
    toggleFavorite: vi.fn(),
  }),
}));

vi.mock("@/components/admin/workspace/WorkspaceUploadContext", () => ({
  useWorkspaceUploadContext: () => ({
    openNewVersionFilePicker: vi.fn(),
  }),
}));

import { WorkspaceDocumentRow } from "@/components/admin/workspace/WorkspaceDocumentRow";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";

const now = new Date();
const baseDoc: WorkspaceDocumentListItemDto = {
  id: "doc-1",
  folderId: "folder-1",
  name: "Statuten.pdf",
  status: "ACTIVE",
  currentVersionId: "v1",
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: now,
  updatedAt: now,
  canEditDocument: true,
  canManageAccess: false,
  currentVersion: {
    id: "v1",
    versionNumber: 1,
    filename: "Statuten.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    createdAt: now,
    scan: undefined,
  },
};

describe("W09-06R1 row interaction", () => {
  it("shows rename affordance for EDIT actor", () => {
    render(
      <table>
        <tbody>
          <WorkspaceDocumentRow document={baseDoc} />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("workspace-row-rename")).toBeInTheDocument();
  });

  it("hides rename affordance for VIEW-only actor", () => {
    render(
      <table>
        <tbody>
          <WorkspaceDocumentRow
            document={{ ...baseDoc, canEditDocument: false }}
          />
        </tbody>
      </table>,
    );
    expect(screen.queryByTestId("workspace-row-rename")).toBeNull();
  });

  it("keeps overflow menu trigger reachable in row layout", () => {
    render(
      <table>
        <tbody>
          <WorkspaceDocumentRow document={baseDoc} isSelected />
        </tbody>
      </table>,
    );
    expect(
      screen.getByRole("button", {
        name: /Workspace\.actions\.menuAriaLabel/,
      }),
    ).toBeInTheDocument();
  });
});
