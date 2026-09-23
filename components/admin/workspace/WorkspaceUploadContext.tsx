"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

import {
  initialWorkspaceUploadBatchState,
  useWorkspaceUploadBatch,
  type WorkspaceUploadBatchState,
} from "@/lib/workspace/upload-orchestration";
import {
  WorkspaceUploadError,
  uploadWorkspaceDocumentVersion,
} from "@/lib/workspace/upload-client";

type WorkspaceUploadContextValue = {
  folderId: string;
  folderName: string;
  canUpload: boolean;
  state: WorkspaceUploadBatchState;
  isUploading: boolean;
  isUploadingNewVersion: boolean;
  uploadFiles: (files: File[]) => Promise<unknown>;
  resetBatchState: () => void;
  openFilePicker: () => void;
  openNewVersionFilePicker: (documentId: string) => void;
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
  const newVersionInputRef = useRef<HTMLInputElement | null>(null);
  const newVersionDocumentIdRef = useRef<string | null>(null);
  const [isUploadingNewVersion, setIsUploadingNewVersion] = useState(false);

  const { state, isUploading, uploadFiles, resetBatchState } =
    useWorkspaceUploadBatch({
      folderId,
      resolveErrorMessage,
      onBatchComplete: onUploadComplete,
    });

  const uploadNewVersion = useCallback(
    async (documentId: string, file: File) => {
      setIsUploadingNewVersion(true);
      try {
        await uploadWorkspaceDocumentVersion({ documentId, file });
        onUploadComplete?.(documentId);
      } catch (err) {
        if (err instanceof WorkspaceUploadError) {
          throw err;
        }
        throw new WorkspaceUploadError(resolveErrorMessage(err));
      } finally {
        setIsUploadingNewVersion(false);
      }
    },
    [onUploadComplete, resolveErrorMessage],
  );

  const value = useMemo<WorkspaceUploadContextValue>(
    () => ({
      folderId,
      folderName,
      canUpload,
      state: canUpload ? state : initialWorkspaceUploadBatchState,
      isUploading: canUpload && isUploading,
      isUploadingNewVersion,
      uploadFiles: canUpload ? uploadFiles : async () => undefined,
      resetBatchState,
      openFilePicker: () => {
        if (canUpload && !isUploading && !isUploadingNewVersion) {
          fileInputRef.current?.click();
        }
      },
      openNewVersionFilePicker: (documentId: string) => {
        if (isUploading || isUploadingNewVersion) return;
        newVersionDocumentIdRef.current = documentId;
        newVersionInputRef.current?.click();
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
      isUploadingNewVersion,
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
          disabled={isUploading || isUploadingNewVersion}
          onChange={async (event) => {
            const list = event.target.files;
            if (!list?.length) return;
            await uploadFiles(Array.from(list));
            event.target.value = "";
          }}
        />
      ) : null}
      <input
        ref={(el) => {
          newVersionInputRef.current = el;
        }}
        type="file"
        className="sr-only"
        aria-label={t("newVersionFileInputAriaLabel")}
        disabled={isUploading || isUploadingNewVersion}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const documentId = newVersionDocumentIdRef.current;
          event.target.value = "";
          newVersionDocumentIdRef.current = null;
          if (!file || !documentId) return;
          try {
            await uploadNewVersion(documentId, file);
          } catch (err) {
            console.error("[workspace] new version upload failed", err);
          }
        }}
      />
    </WorkspaceUploadContext.Provider>
  );
}
