/**
 * @vitest-environment jsdom
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uploadFiles: vi.fn(),
  openFilePicker: vi.fn(),
  canUpload: true,
  isUploading: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/admin/workspace/WorkspaceUploadContext", () => ({
  useWorkspaceUploadContext: () => ({
    canUpload: mocks.canUpload,
    isUploading: mocks.isUploading,
    uploadFiles: mocks.uploadFiles,
    openFilePicker: mocks.openFilePicker,
    folderName: "Docs",
  }),
}));

import { WorkspaceUploadDropzone } from "@/components/admin/workspace/WorkspaceUploadDropzone";

describe("WorkspaceUploadDropzone W09-01", () => {
  it("overlay dropzone does not intercept pointer events while idle", () => {
    const { container } = render(<WorkspaceUploadDropzone />);
    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("overlay enables pointer events during external file drag", () => {
    const { container } = render(<WorkspaceUploadDropzone />);
    const overlay = container.firstElementChild as HTMLElement;

    fireEvent.dragEnter(overlay, {
      dataTransfer: {
        types: ["Files"],
        files: [new File(["a"], "a.pdf", { type: "application/pdf" })],
      },
    });

    expect(overlay.style.pointerEvents).toBe("auto");
  });

  it("drop invokes shared uploadFiles orchestration with multiple files", async () => {
    mocks.uploadFiles.mockResolvedValue(undefined);
    const { container } = render(<WorkspaceUploadDropzone />);
    const overlay = container.firstElementChild as HTMLElement;

    const fileA = new File(["a"], "a.pdf", { type: "application/pdf" });
    const fileB = new File(["b"], "b.pdf", { type: "application/pdf" });

    fireEvent.drop(overlay, {
      dataTransfer: {
        types: ["Files"],
        files: [fileA, fileB],
      },
    });

    expect(mocks.uploadFiles).toHaveBeenCalledWith([fileA, fileB]);
  });

  it("VIEW actor — idle overlay keeps pointer-events none (no upload affordance)", () => {
    mocks.canUpload = false;
    const { container } = render(<WorkspaceUploadDropzone disabled />);
    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.style.pointerEvents).toBe("none");
    mocks.canUpload = true;
  });
});
