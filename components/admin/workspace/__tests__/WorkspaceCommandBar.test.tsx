/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/admin/workspace/WorkspaceUploadContext", () => ({
  useWorkspaceUploadContext: () => ({
    canUpload: true,
    isUploading: false,
    openFilePicker: vi.fn(),
  }),
}));

vi.mock("@/app/(admin)/dashboard/workspace/actions", () => ({
  createRootWorkspaceFolderAction: vi.fn(),
  createChildWorkspaceFolderAction: vi.fn(),
}));

import { buildActiveFolderCommandContext } from "@/lib/workspace/command/workspace-command-context";
import { WorkspaceCommandBar } from "@/components/admin/workspace/WorkspaceCommandBar";

describe("WorkspaceCommandBar", () => {
  it("shows upload and new menu for active folder without selection", () => {
    const context = buildActiveFolderCommandContext({
      folderId: "f1",
      folderName: "Root",
      canUpload: true,
      canCreateFolder: true,
      canManageFolder: false,
      canDelete: false,
    });

    render(
      <WorkspaceCommandBar context={context} selectedDocument={null} />,
    );

    expect(screen.getByText("newMenu")).toBeTruthy();
    expect(screen.getByText("uploadLabel")).toBeTruthy();
  });
});
