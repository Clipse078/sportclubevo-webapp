"use client";

import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";

type WorkspaceEmptyStateProps = {
  isDragging?: boolean;
  canManage?: boolean;
};

export function WorkspaceDocumentEmptyState({
  isDragging = false,
  canManage = false,
}: WorkspaceEmptyStateProps) {
  const t = useTranslations("Workspace");
  const { canUpload, isUploading, openFilePicker, folderName } =
    useWorkspaceUploadContext();

  const showUpload = canManage && canUpload;

  return (
    <div
      className={[
        "flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center transition-colors duration-150",
        isDragging ? "bg-[var(--blue-light)]/40" : "",
      ].join(" ")}
      aria-live="polite"
    >
      <div
        className={[
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-150",
          isDragging ? "bg-[var(--blue)] text-white" : "bg-[var(--surface-2)] text-[var(--blue)]",
        ].join(" ")}
      >
        {isUploading ? (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <UploadCloud className="h-8 w-8" aria-hidden="true" />
        )}
      </div>

      <h2 className="mt-5 text-base font-semibold text-[var(--text)]">
        {isUploading ? t("upload.uploadingLabel") : t("emptyState.title")}
      </h2>

      {showUpload && !isUploading ? (
        <>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-2)]">
            {t("emptyState.description")}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("emptyState.dropHint", { folder: folderName })}
          </p>
          <button
            type="button"
            onClick={openFilePicker}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            {t("commandBar.uploadLabel")}
          </button>
        </>
      ) : null}
    </div>
  );
}
