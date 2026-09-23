"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";

type WorkspaceUploadProgressProps = {
  onDismiss?: () => void;
};

export function WorkspaceUploadProgress({ onDismiss }: WorkspaceUploadProgressProps) {
  const t = useTranslations("Workspace.upload");
  const { state, resetBatchState } = useWorkspaceUploadContext();

  useEffect(() => {
    if (state.phase !== "done") return;
    const timer = setTimeout(() => {
      resetBatchState();
      onDismiss?.();
    }, 8000);
    return () => clearTimeout(timer);
  }, [state.phase, resetBatchState, onDismiss]);

  if (state.phase === "idle") return null;

  const { total, completed, failed, currentFileName } = state;
  const failureCount = failed.length;
  const inProgress = state.phase === "uploading";

  let statusMessage: string;
  if (inProgress) {
    statusMessage =
      total === 1
        ? t("progressSingleUploading")
        : t("progressBatchUploading", { total });
  } else if (failureCount === 0) {
    statusMessage =
      total === 1
        ? t("successMessage")
        : t("progressAllSuccess", { count: total });
  } else if (failureCount === total) {
    statusMessage =
      total === 1
        ? t("progressSingleFailed")
        : t("progressAllFailed", { count: total });
  } else {
    statusMessage = t("progressPartial", {
      completed: completed - failureCount,
      total,
      failed: failureCount,
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-2)]"
    >
      <p className="font-medium text-[var(--text)]">{statusMessage}</p>
      {inProgress && currentFileName ? (
        <p className="mt-0.5 truncate text-[var(--muted)]">
          {t("progressCurrentFile", { name: currentFileName })}
        </p>
      ) : null}
      {!inProgress && total > 1 ? (
        <p className="mt-0.5 text-[var(--muted)]">
          {t("progressCompletedCount", { completed, total })}
        </p>
      ) : null}
      {failureCount > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[var(--sce-danger)]">
          {failed.map((f) => (
            <li key={`${f.fileName}:${f.message}`}>
              {f.fileName}: {f.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
