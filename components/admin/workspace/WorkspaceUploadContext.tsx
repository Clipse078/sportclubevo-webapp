"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

import {
  initialWorkspaceUploadBatchState,
  useWorkspaceUploadBatch,
  type WorkspaceUploadBatchState,
} from "@/lib/workspace/upload-orchestration";
import { WorkspaceUploadError } from "@/lib/workspace/upload-client";

type WorkspaceUploadContextValue = {
  folderId: string;
  folderName: string;
  canUpload: boolean;
  state: WorkspaceUploadBatchState;
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<unknown>;
  resetBatchState: () => void;
  openFilePicker: () => void;
  registerFileInput: (input: HTMLInputElement | null) => void;
};

const WorkspaceUploadContext = createContext<WorkspaceUploadContextValue | null>(
  null,
);

export function useWorkspaceUploadContext(): WorkspaceUploadContextValue {
  const ctx = useContext(WorkspaceUploadContext);
  if (!ctx) {
    throw new Error("useWorkspaceUploadContext requires WorkspaceUploadProvider");
  }
  return ctx;
}

type WorkspaceUploadProviderProps = {
  folderId: string;
  folderName: string;
  canUpload: boolean;
  onUploadComplete?: (documentId: string | null) => void;
  children: ReactNode;
};

export function WorkspaceUploadProvider({
  folderId,
  folderName,
  canUpload,
  onUploadComplete,
  children,
}: WorkspaceUploadProviderProps) {
  const t = useTranslations("Workspace.upload");

  function resolveErrorMessage(err: unknown): string {
    if (err instanceof WorkspaceUploadError) {
      switch (err.code) {
        case "WORKSPACE_UPLOAD_STORAGE_NOT_CONFIGURED":
          return t("errorStorageNotConfigured");
        case "WORKSPACE_FOLDER_NOT_FOUND":
          return t("errorFolderNotFound");
        case "WORKSPACE_UPLOAD_TOO_LARGE":
          return t("errorTooLarge");
        case "WORKSPACE_UPLOAD_INVALID_FILE":
          return t("errorInvalidFile");
        case "WORKSPACE_UPLOAD_CONFLICT":
          return t("errorConflict");
        case "WORKSPACE_UPLOAD_PERSISTENCE_FAILED":
          return t("errorPersistenceFailed");
        default:
          return err.message;
      }
    }
    if (err instanceof Error) return err.message;
    return t("errorGeneric");
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { state, isUploading, uploadFiles, resetBatchState } =
    useWorkspaceUploadBatch({
      folderId,
      resolveErrorMessage,
      onBatchComplete: onUploadComplete,
    });

  const value = useMemo<WorkspaceUploadContextValue>(
    () => ({
      folderId,
      folderName,
      canUpload,
      state: canUpload ? state : initialWorkspaceUploadBatchState,
      isUploading: canUpload && isUploading,
      uploadFiles: canUpload ? uploadFiles : async () => undefined,
      resetBatchState,
      openFilePicker: () => {
        if (canUpload && !isUploading) fileInputRef.current?.click();
      },
      registerFileInput: (input) => {
        fileInputRef.current = input;
      },
    }),
    [
      canUpload,
      folderId,
      folderName,
      isUploading,
      resetBatchState,
      state,
      uploadFiles,
    ],
  );

  return (
    <WorkspaceUploadContext.Provider value={value}>
      {children}
      {canUpload ? (
        <input
          ref={(el) => {
            fileInputRef.current = el;
          }}
          type="file"
          multiple
          className="sr-only"
          aria-label={t("fileInputAriaLabel")}
          disabled={isUploading}
          onChange={async (event) => {
            const list = event.target.files;
            if (!list?.length) return;
            await uploadFiles(Array.from(list));
            event.target.value = "";
          }}
        />
      ) : null}
    </WorkspaceUploadContext.Provider>
  );
}
