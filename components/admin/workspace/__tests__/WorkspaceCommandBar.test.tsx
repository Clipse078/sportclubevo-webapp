/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const uploadMocks = vi.hoisted(() => ({
  openFilePicker: vi.fn(),
  canUpload: true,
  isUploading: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/admin/workspace/WorkspaceUploadContext", () => ({
  useWorkspaceUploadContext: () => ({
    canUpload: uploadMocks.canUpload,
    isUploading: uploadMocks.isUploading,
    isUploadingNewVersion: false,
    openFilePicker: uploadMocks.openFilePicker,
    openNewVersionFilePicker: vi.fn(),
  }),
}));

vi.mock("@/app/(admin)/dashboard/workspace/actions", () => ({
  createRootWorkspaceFolderAction: vi.fn(),
  createChildWorkspaceFolderAction: vi.fn(),
}));

import {
  buildActiveFolderCommandContext,
  withDocumentSelection,
} from "@/lib/workspace/command/workspace-command-context";
import { WorkspaceDocumentStatus } from "@prisma/client";

import { WorkspaceCommandBar } from "@/components/admin/workspace/WorkspaceCommandBar";

function editActorContext() {
  return buildActiveFolderCommandContext({
    folderId: "f1",
    folderName: "Root",
    canUpload: true,
    canCreateFolder: true,
    canManageFolder: false,
    canDelete: false,
  });
}

function viewActorContext() {
  return buildActiveFolderCommandContext({
    folderId: "f1",
    folderName: "Root",
    canUpload: false,
    canCreateFolder: false,
    canManageFolder: false,
    canDelete: false,
  });
}

function manageActorContext() {
  return buildActiveFolderCommandContext({
    folderId: "f1",
    folderName: "Root",
    canUpload: true,
    canCreateFolder: true,
    canManageFolder: true,
    canDelete: true,
  });
}

describe("WorkspaceCommandBar W09-01 acceptance", () => {
  it("EDIT actor — active folder shows + Neu and Hochladen", () => {
    uploadMocks.canUpload = true;
    render(
      <WorkspaceCommandBar context={editActorContext()} selectedDocument={null} />,
    );

    expect(screen.getByText("newMenu")).toBeTruthy();
    expect(screen.getByText("uploadLabel")).toBeTruthy();
  });

  it("EDIT actor — Hochladen invokes shared file picker orchestration", () => {
    uploadMocks.canUpload = true;
    uploadMocks.openFilePicker.mockClear();
    render(
      <WorkspaceCommandBar context={editActorContext()} selectedDocument={null} />,
    );

    fireEvent.click(screen.getByText("uploadLabel"));
    expect(uploadMocks.openFilePicker).toHaveBeenCalledTimes(1);
  });

  it("EDIT actor — + Neu opens create-folder dialog via menu item", () => {
    uploadMocks.canUpload = true;
    render(
      <WorkspaceCommandBar context={editActorContext()} selectedDocument={null} />,
    );

    fireEvent.click(screen.getByText("newMenu"));
    fireEvent.click(screen.getByText("menuItemLabel"));

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("VIEW actor — hides upload/create and may show permission hint", () => {
    uploadMocks.canUpload = false;
    render(
      <WorkspaceCommandBar context={viewActorContext()} selectedDocument={null} />,
    );

    expect(screen.queryByText("newMenu")).toBeNull();
    expect(screen.queryByText("uploadLabel")).toBeNull();
    expect(screen.getByText("noEditPermissionHint")).toBeTruthy();
  });

  it("MANAGE actor — retains upload/create without promoting permanent delete in toolbar", () => {
    uploadMocks.canUpload = true;
    render(
      <WorkspaceCommandBar
        context={manageActorContext()}
        selectedDocument={null}
      />,
    );

    expect(screen.getByText("newMenu")).toBeTruthy();
    expect(screen.getByText("uploadLabel")).toBeTruthy();
    expect(screen.queryByText("permanentDelete")).toBeNull();
    expect(screen.queryByText("deleteForever")).toBeNull();
  });

  it("document selected — contextual download/history only, no upload/create", () => {
    uploadMocks.canUpload = true;
    const ctx = withDocumentSelection(editActorContext(), {
      id: "doc-1",
      hasCurrentVersion: true,
      canEditDocument: true,
      canManageAccess: false,
    });

    render(
      <WorkspaceCommandBar
        context={ctx}
        selectedDocument={{
          id: "doc-1",
          name: "Plan.pdf",
          folderId: "f1",
          status: WorkspaceDocumentStatus.ACTIVE,
          currentVersionId: "v1",
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          currentVersion: {
            id: "v1",
            versionNumber: 1,
            filename: "Plan.pdf",
            mimeType: "application/pdf",
            sizeBytes: 100,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        }}
      />,
    );

    expect(screen.getByText("download")).toBeTruthy();
    expect(screen.getByText("versionHistory")).toBeTruthy();
    expect(screen.queryByText("newMenu")).toBeNull();
    expect(screen.queryByText("uploadLabel")).toBeNull();
  });

  it("ARCHIVED view — read-only hint, no mutation commands", () => {
    const ctx = buildActiveFolderCommandContext({
      folderId: "f1",
      folderName: "Root",
      canUpload: true,
      canCreateFolder: true,
      canManageFolder: false,
      canDelete: false,
      lifecycleView: "archived",
    });

    render(<WorkspaceCommandBar context={ctx} selectedDocument={null} />);

    expect(screen.getByText("lifecycleReadOnlyHint")).toBeTruthy();
    expect(screen.queryByText("uploadLabel")).toBeNull();
    expect(screen.queryByText("newMenu")).toBeNull();
  });

  it("TRASH view — read-only hint, no mutation commands", () => {
    const ctx = buildActiveFolderCommandContext({
      folderId: "f1",
      folderName: "Root",
      canUpload: true,
      canCreateFolder: true,
      canManageFolder: false,
      canDelete: false,
      lifecycleView: "trash",
    });

    render(<WorkspaceCommandBar context={ctx} selectedDocument={null} />);

    expect(screen.getByText("lifecycleReadOnlyHint")).toBeTruthy();
    expect(screen.queryByText("uploadLabel")).toBeNull();
  });

  it("does not render deferred W09-02 or placeholder controls", () => {
    uploadMocks.canUpload = true;
    render(
      <WorkspaceCommandBar context={editActorContext()} selectedDocument={null} />,
    );

    expect(screen.queryByText(/Aufgabe/i)).toBeNull();
    expect(screen.queryByText(/Anforderung/i)).toBeNull();
    expect(screen.queryByText(/DEMNAECHST/i)).toBeNull();
    expect(screen.queryByText(/Sortieren/i)).toBeNull();
    expect(screen.queryByText(/Ansicht/i)).toBeNull();
  });
});
