/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/workspace/upload-client", () => ({
  uploadWorkspaceFile: vi.fn(),
  WorkspaceUploadError: class WorkspaceUploadError extends Error {
    readonly code: string | undefined;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { uploadWorkspaceFile } from "@/lib/workspace/upload-client";
import { useWorkspaceUploadBatch } from "@/lib/workspace/upload-orchestration";

describe("useWorkspaceUploadBatch", () => {
  it("uploads multiple files sequentially and reports partial failure", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWorkspaceUploadBatch({
        folderId: "folder-1",
        resolveErrorMessage: (e) =>
          e instanceof Error ? e.message : "unknown",
        onBatchComplete: onComplete,
      }),
    );

    vi.mocked(uploadWorkspaceFile)
      .mockResolvedValueOnce({ document: { id: "d1", name: "a.pdf" } })
      .mockRejectedValueOnce(new Error("fail-b"));

    const files = [
      new File(["a"], "a.pdf", { type: "application/pdf" }),
      new File(["b"], "b.pdf", { type: "application/pdf" }),
    ];

    await act(async () => {
      const summary = await result.current.uploadFiles(files);
      expect(summary?.partialFailure).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.state.completed).toBe(2);
      expect(result.current.state.failed).toHaveLength(1);
    });

    expect(onComplete).toHaveBeenCalledWith("d1");
  });
});
