"use client";

import { UploadCloud } from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslations } from "next-intl";

import { isExternalFileDrag } from "@/lib/workspace/drag-transfer";
import {
  WorkspaceUploadError,
  uploadWorkspaceFile,
} from "@/lib/workspace/upload-client";

export type WorkspaceUploadDropState =
  | "idle"
  | "drag_active"
  | "uploading"
  | "success"
  | "partial_failure"
  | "failure";

type WorkspaceUploadDropzoneProps = {
  folderId: string;
  folderName?: string;
  disabled?: boolean;
  expanded?: boolean;
  onUploadComplete?: (documentId: string | null) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onUploadStateChange?: (state: WorkspaceUploadDropState) => void;
};

export function WorkspaceUploadDropzone({
  folderId,
  folderName,
  disabled = false,
  expanded = false,
  onUploadComplete,
  onDragStateChange,
  onUploadStateChange,
}: WorkspaceUploadDropzoneProps) {
  const t = useTranslations("Workspace.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);

  function setDropState(state: WorkspaceUploadDropState) {
    onUploadStateChange?.(state);
  }

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

  function setDragging(value: boolean) {
    setIsDragging(value);
    onDragStateChange?.(value);
    if (value) {
      setDropState("drag_active");
    } else if (!isUploading) {
      setDropState("idle");
    }
  }

  async function uploadFiles(files: File[]) {
    if (disabled || isUploading || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setFailedFiles([]);
    setDropState("uploading");

    let lastDocumentId: string | null = null;
    const failures: string[] = [];

    for (const file of files) {
      try {
        const result = await uploadWorkspaceFile({ file, folderId });
        lastDocumentId = result.document?.id ?? lastDocumentId;
      } catch (uploadError) {
        failures.push(`${file.name}: ${resolveErrorMessage(uploadError)}`);
      }
    }

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (failures.length === 0) {
      setDropState("success");
      onUploadComplete?.(lastDocumentId);
    } else if (failures.length < files.length) {
      setFailedFiles(failures);
      setError(t("partialFailureMessage"));
      setDropState("partial_failure");
      onUploadComplete?.(lastDocumentId);
    } else {
      setFailedFiles(failures);
      setError(failures[0] ?? t("errorGeneric"));
      setDropState("failure");
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled || isUploading) return;
    if (!isExternalFileDrag(event.dataTransfer)) return;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isExternalFileDrag(event.dataTransfer)) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!isExternalFileDrag(event.dataTransfer)) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    await uploadFiles(files);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list?.length) return;
    await uploadFiles(Array.from(list));
  }

  function openFilePicker() {
    if (!disabled && !isUploading) inputRef.current?.click();
  }

  const dragTitle = folderName
    ? t("dragOverFolderTitle", { folder: folderName })
    : t("dragOverTitle");

  if (!expanded) {
    return (
      <div
        className={`absolute inset-0 z-[5] rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-[var(--blue)] bg-[var(--blue-light)]/40"
            : "border-transparent"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-hidden={!isDragging}
        style={{ pointerEvents: isDragging ? "auto" : "none" }}
      >
        {isDragging ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/90 px-6 py-4 shadow-lg ring-1 ring-[var(--blue)]/20">
              <UploadCloud className="h-8 w-8 text-[var(--blue)]" />
              <p className="text-sm font-semibold text-[var(--blue)]">
                {dragTitle}
              </p>
              <p className="text-xs text-[var(--text-2)]">{t("dragOverSubtitle")}</p>
            </div>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only pointer-events-auto"
          aria-hidden="true"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {error ? (
          <p
            role="alert"
            className="pointer-events-auto px-5 pb-3 text-xs leading-5 text-[var(--sce-danger)]"
          >
            {error}
          </p>
        ) : null}

        {failedFiles.length > 0 ? (
          <ul className="pointer-events-auto px-5 pb-3 text-xs text-[var(--sce-danger)]">
            {failedFiles.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || isUploading}
        className={`flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? "border-[var(--blue)] bg-[var(--blue-light)]"
            : "border-[var(--border-strong)] bg-[var(--surface)]"
        } ${
          disabled || isUploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-[var(--blue)] hover:bg-[var(--surface-2)]"
        }`}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className="h-8 w-8 text-[var(--blue)]" aria-hidden="true" />

        <p className="mt-3 text-sm font-semibold text-[var(--text)]">
          {isUploading ? t("uploadingLabel") : t("dropzoneTitle")}
        </p>

        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("dropzoneHintMulti")}
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden="true"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs leading-5 text-[var(--sce-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
