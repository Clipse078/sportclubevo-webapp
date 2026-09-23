/**
 * @vitest-environment jsdom
 * AUFGABEN-06F2-A1 — Workspace document URL synchronization (§17).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import { WorkspaceClientShell } from "../WorkspaceClientShell";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, params?: { count?: number }) => {
    if (key === "documents.countPlural" && params?.count != null) {
      return `${namespace}.${key}:${params.count}`;
    }
    return `${namespace}.${key}`;
  },
}));

vi.mock("../WorkspaceBreadcrumbs", () => ({
  WorkspaceBreadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("../WorkspaceDocumentTable", () => ({
  WorkspaceDocumentTable: ({
    onSelectDocument,
  }: {
    onSelectDocument: (id: string) => void;
  }) => (
    <div>
      <button type="button" data-testid="select-doc-a" onClick={() => onSelectDocument("doc-a")}>
        Doc A
      </button>
      <button type="button" data-testid="select-doc-b" onClick={() => onSelectDocument("doc-b")}>
        Doc B
      </button>
    </div>
  ),
}));

vi.mock("../WorkspaceFilePreview", () => ({
  WorkspaceFilePreview: () => <div data-testid="file-preview" />,
}));

function doc(id: string): WorkspaceDocumentListItemDto {
  return {
    id,
    folderId: "folder-1",
    name: id,
    status: "ACTIVE",
    currentVersionId: `${id}-v1`,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    currentVersion: {
      id: `${id}-v1`,
      versionNumber: 1,
      filename: `${id}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  };
}

const baseProps = {
  documents: [doc("doc-a"), doc("doc-b")],
  folderId: "folder-1",
  folderName: "Folder",
  folderCreatedAt: "2026-01-01T00:00:00.000Z",
  folderUpdatedAt: "2026-01-01T00:00:00.000Z",
  folderPath: [{ id: "folder-1", name: "Folder" }],
  canManage: false,
};

describe("WorkspaceClientShell document URL sync", () => {
  it("select document A pushes folder and document=A", () => {
    routerPush.mockClear();
    render(
      <WorkspaceClientShell
        {...baseProps}
        initialSelectedDocumentId="doc-a"
        documentInspectorSlot={<div data-testid="document-inspector">panel</div>}
      />,
    );
    expect(screen.getByTestId("document-inspector")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("select-doc-b"));
    expect(routerPush).toHaveBeenCalledWith(
      "/dashboard/workspace?folder=folder-1&document=doc-b",
      { scroll: false },
    );
  });

  it("select document B updates URL to document=B", () => {
    routerPush.mockClear();
    render(<WorkspaceClientShell {...baseProps} initialSelectedDocumentId={null} />);
    fireEvent.click(screen.getByTestId("select-doc-b"));
    expect(routerPush).toHaveBeenLastCalledWith(
      "/dashboard/workspace?folder=folder-1&document=doc-b",
      { scroll: false },
    );
  });

  it("deselect clears document from URL while keeping folder", () => {
    routerPush.mockClear();
    render(<WorkspaceClientShell {...baseProps} initialSelectedDocumentId="doc-a" />);
    fireEvent.click(screen.getByTestId("select-doc-a"));
    expect(routerPush).toHaveBeenLastCalledWith("/dashboard/workspace?folder=folder-1", {
      scroll: false,
    });
    expect(screen.queryByTestId("document-inspector")).not.toBeInTheDocument();
  });

  it("document not in current folder list does not render inspector slot", () => {
    render(
      <WorkspaceClientShell
        {...baseProps}
        initialSelectedDocumentId="doc-foreign"
        documentInspectorSlot={<div data-testid="document-inspector">panel</div>}
      />,
    );
    expect(screen.queryByTestId("document-inspector")).not.toBeInTheDocument();
  });
});
