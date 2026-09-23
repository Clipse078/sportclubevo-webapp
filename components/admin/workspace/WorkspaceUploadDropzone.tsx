"use client";

import { UploadCloud } from "lucide-react";
import {
  useState,
  type DragEvent,
} from "react";
import { useTranslations } from "next-intl";

import { isExternalFileDrag } from "@/lib/workspace/drag-transfer";
import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";

export type WorkspaceUploadDropState =
  | "idle"
  | "drag_active"
  | "uploading"
  | "success"
  | "partial_failure"
  | "failure";

type WorkspaceUploadDropzoneProps = {
  /** @deprecated folderId from provider */
  folderId?: string;
  folderName?: string;
  disabled?: boolean;
  expanded?: boolean;
  onUploadComplete?: (documentId: string | null) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onUploadStateChange?: (state: WorkspaceUploadDropState) => void;
};

export function WorkspaceUploadDropzone({
  folderName,
  disabled = false,
  expanded = false,
  onDragStateChange,
  onUploadStateChange,
}: WorkspaceUploadDropzoneProps) {
  const t = useTranslations("Workspace.upload");
  const {
    canUpload,
    isUploading,
    uploadFiles,
    openFilePicker,
    folderName: ctxFolderName,
  } = useWorkspaceUploadContext();
  const effectiveDisabled = disabled || !canUpload;
  const displayFolder = folderName ?? ctxFolderName;

  const [isDragging, setIsDragging] = useState(false);

  function setDragging(value: boolean) {
    setIsDragging(value);
    onDragStateChange?.(value);
    if (value) onUploadStateChange?.("drag_active");
    else if (!isUploading) onUploadStateChange?.("idle");
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (effectiveDisabled || isUploading) return;
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
    onUploadStateChange?.("uploading");
    await uploadFiles(files);
    onUploadStateChange?.("success");
  }

  const dragTitle = displayFolder
    ? t("dragOverFolderTitle", { folder: displayFolder })
    : t("dragOverTitle");

  if (expanded) {
    return (
      <div
        role="button"
        tabIndex={effectiveDisabled ? -1 : 0}
        aria-disabled={effectiveDisabled || isUploading}
        className={`flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? "border-[var(--blue)] bg-[var(--blue-light)]"
            : "border-[var(--border-strong)] bg-[var(--surface)]"
        } ${
          effectiveDisabled || isUploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-[var(--blue)] hover:bg-[var(--surface-2)]"
        }`}
        onClick={() => {
          if (!effectiveDisabled && !isUploading) openFilePicker();
        }}
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
        <p className="mt-1 text-xs text-[var(--muted)]">{t("dropzoneHintMulti")}</p>
      </div>
    );
  }

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
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[var(--surface)]/95 px-6 py-4 shadow-lg ring-1 ring-[var(--blue)]/20">
              <UploadCloud className="h-8 w-8 text-[var(--blue)]" />
              <p className="text-sm font-semibold text-[var(--blue)]">
                {dragTitle}
              </p>
              <p className="text-xs text-[var(--text-2)]">{t("dragOverSubtitle")}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
