/**
 * @vitest-environment jsdom
 * W08-07A — render boundary: WorkspaceFolderTreePanel mounts without server function props.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceFolderTreePanel } from "@/components/admin/workspace/WorkspaceFolderTreePanel";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/(admin)/dashboard/workspace/actions", () => ({
  moveWorkspaceFolderAction: vi.fn(),
  createChildWorkspaceFolderAction: vi.fn(),
}));

const folders: WorkspaceFolderDto[] = [
  {
    id: "folder-a",
    name: "Alpha",
    parentId: null,
    description: null,
    displayOrder: 0,
    createdByUserId: null,
    updatedByUserId: null,
    children: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("WorkspaceFolderTreePanel W08-07A runtime boundary", () => {
  it("renders selected-folder subfolder affordance without function-valued props", () => {
    render(
      <WorkspaceFolderTreePanel
        folders={folders}
        selectedFolderId="folder-a"
        canManage={true}
      />,
    );

    expect(screen.getByRole("link", { name: /Alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "toggleButton" })).toBeInTheDocument();
  });

  it("does not show subfolder affordance when canManage is false", () => {
    render(
      <WorkspaceFolderTreePanel
        folders={folders}
        selectedFolderId="folder-a"
        canManage={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /createSubfolder/i })).not.toBeInTheDocument();
  });
});
