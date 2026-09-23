import { useCallback, useRef, useState } from "react";

import {
  WorkspaceUploadError,
  uploadWorkspaceFile,
} from "@/lib/workspace/upload-client";

export type WorkspaceUploadFailure = {
  fileName: string;
  message: string;
};

export type WorkspaceUploadBatchPhase = "idle" | "uploading" | "done";

export type WorkspaceUploadBatchState = {
  phase: WorkspaceUploadBatchPhase;
  total: number;
  completed: number;
  failed: WorkspaceUploadFailure[];
  currentFileName: string | null;
};

export const initialWorkspaceUploadBatchState: WorkspaceUploadBatchState = {
  phase: "idle",
  total: 0,
  completed: 0,
  failed: [],
  currentFileName: null,
};

export type ResolveUploadErrorMessage = (err: unknown) => string;

type UseWorkspaceUploadBatchOptions = {
  folderId: string;
  resolveErrorMessage: ResolveUploadErrorMessage;
  onBatchComplete?: (lastDocumentId: string | null) => void;
};

export function useWorkspaceUploadBatch({
  folderId,
  resolveErrorMessage,
  onBatchComplete,
}: UseWorkspaceUploadBatchOptions) {
  const [state, setState] = useState<WorkspaceUploadBatchState>(
    initialWorkspaceUploadBatchState,
  );
  const inFlightRef = useRef(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (inFlightRef.current || files.length === 0) return;

      inFlightRef.current = true;
      setState({
        phase: "uploading",
        total: files.length,
        completed: 0,
        failed: [],
        currentFileName: files[0]?.name ?? null,
      });

      let lastDocumentId: string | null = null;
      const failures: WorkspaceUploadFailure[] = [];
      let completed = 0;

      for (const file of files) {
        setState((prev) => ({
          ...prev,
          currentFileName: file.name,
        }));

        try {
          const result = await uploadWorkspaceFile({ file, folderId });
          lastDocumentId = result.document?.id ?? lastDocumentId;
        } catch (uploadError) {
          failures.push({
            fileName: file.name,
            message: resolveErrorMessage(uploadError),
          });
        }

        completed += 1;
        setState((prev) => ({
          ...prev,
          completed,
          failed: [...failures],
        }));
      }

      inFlightRef.current = false;
      setState((prev) => ({
        ...prev,
        phase: "done",
        currentFileName: null,
      }));

      if (completed > failures.length) {
        onBatchComplete?.(lastDocumentId);
      }

      return {
        lastDocumentId,
        failures,
        allFailed: failures.length === files.length,
        partialFailure: failures.length > 0 && failures.length < files.length,
      };
    },
    [folderId, onBatchComplete, resolveErrorMessage],
  );

  const resetBatchState = useCallback(() => {
    setState(initialWorkspaceUploadBatchState);
  }, []);

  const isUploading = state.phase === "uploading";

  return {
    state,
    isUploading,
    uploadFiles,
    resetBatchState,
  };
}

export function isWorkspaceUploadError(err: unknown): err is WorkspaceUploadError {
  return err instanceof WorkspaceUploadError;
}
