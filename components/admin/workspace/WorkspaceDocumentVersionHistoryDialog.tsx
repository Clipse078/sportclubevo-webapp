"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";
import { WORKSPACE_VERSION_UPLOADER_UNAVAILABLE } from "@/lib/workspace/version/version-uploader-public-dto";

import {
  formatWorkspaceDateTime,
  formatWorkspaceFileSize,
} from "./workspace-document-formatters";
import { WorkspaceVersionScanBadge } from "./WorkspaceVersionScanBadge";
import type { WorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";

type WorkspaceDocumentVersionHistoryItem = {
  id: string;
  versionNumber: number;
  createdAt: string;
  uploader: {
    displayName: string;
  };
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  status: string;
  isCurrent: boolean;
  restoredFromVersionId?: string | null;
  scan?: WorkspaceVersionScanPublicDto;
};

type WorkspaceDocumentVersionHistoryResponse = {
  versions?: WorkspaceDocumentVersionHistoryItem[];
  error?: string;
};

type WorkspaceDocumentVersionHistoryDialogProps = {
  documentId: string;
  documentName: string;
  open: boolean;
  onClose: () => void;
  canRestore?: boolean;
};

export function WorkspaceDocumentVersionHistoryDialog({
  documentId,
  documentName,
  open,
  onClose,
  canRestore = false,
}: WorkspaceDocumentVersionHistoryDialogProps) {
  const t = useTranslations("Workspace.versionHistory");
  const [versions, setVersions] = useState<
    WorkspaceDocumentVersionHistoryItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(
    null,
  );
  const requestIdRef = useRef(0);

  const loadVersions = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workspace/documents/${encodeURIComponent(documentId)}/versions`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );

      const data = (await response.json().catch(() => null)) as
        | WorkspaceDocumentVersionHistoryResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Versionsverlauf konnte nicht geladen werden.");
      }

      if (requestIdRef.current !== requestId) return;

      setVersions(
        Array.isArray(data?.versions) ? data.versions : [],
      );
    } catch (caughtError) {
      if (requestIdRef.current !== requestId) return;

      setVersions([]);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Versionsverlauf konnte nicht geladen werden.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
    // t is intentionally excluded — next-intl guarantees stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      setLoading(false);
      setError(null);
      setVersions([]);
      setRestoreBusyId(null);
      return;
    }

    void loadVersions();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadVersions, open]);

  function downloadVersion(versionId: string) {
    window.location.assign(
      `/api/workspace/documents/${encodeURIComponent(documentId)}/download?versionId=${encodeURIComponent(versionId)}`,
    );
  }

  function previewVersion(versionId: string) {
    window.open(
      `/api/workspace/documents/${encodeURIComponent(documentId)}/preview?versionId=${encodeURIComponent(versionId)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function restoreVersion(versionId: string) {
    if (!canRestore || restoreBusyId) return;

    if (!window.confirm(t("restoreConfirm"))) {
      return;
    }

    setRestoreBusyId(versionId);

    try {
      const response = await fetch(
        `/api/workspace/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/restore`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? t("restoreError"));
      }

      await loadVersions();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("restoreError"),
      );
    } finally {
      setRestoreBusyId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("dialogTitle")}
      description={documentName}
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("closeButton")}
        </Button>
      }
    >
      <div aria-live="polite">
        {loading ? (
          <div
            className="flex min-h-40 items-center justify-center"
            role="status"
            aria-label={t("loadingAriaLabel")}
          >
            <Loader2
              className="h-6 w-6 animate-spin text-[var(--sce-primary)]"
              aria-hidden="true"
            />
          </div>
        ) : null}

        {!loading && error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t("loadingError")}</p>
                <p className="mt-1 text-sm">{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => void loadVersions()}
                >
                  {t("retryButton")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && versions.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center text-[var(--muted)]">
            {t("noVersions")}
          </div>
        ) : null}

        {!loading && !error && versions.length > 0 ? (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {versions.map((version) => {
              const uploaderLabel =
                version.uploader.displayName.trim() ||
                WORKSPACE_VERSION_UPLOADER_UNAVAILABLE;

              return (
                <li
                  key={version.id}
                  className="px-4 py-3"
                  data-testid={`workspace-version-history-row-${version.versionNumber}`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-[var(--text)]">
                      v{version.versionNumber}
                    </span>
                    {version.isCurrent ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        {t("statusCurrent")}
                      </span>
                    ) : null}
                    {version.restoredFromVersionId ? (
                      <span className="text-xs text-[var(--muted)]">
                        {t("restoredFromLabel")}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    {uploaderLabel}
                    {" · "}
                    {formatWorkspaceDateTime(version.createdAt)}
                    {" · "}
                    {formatWorkspaceFileSize(version.sizeBytes)}
                  </p>

                  <p
                    className="mt-1 truncate text-xs text-[var(--muted)]"
                    title={version.filename}
                  >
                    {version.filename}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <WorkspaceVersionScanBadge scan={version.scan} compact />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadVersion(version.id)}
                      >
                        {t("downloadVersion")}
                      </Button>
                      {isWorkspaceInlinePreviewSupported(
                        version.mimeType,
                      ) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => previewVersion(version.id)}
                        >
                          {t("previewVersion")}
                        </Button>
                      ) : null}
                      {canRestore && !version.isCurrent ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={restoreBusyId === version.id}
                          onClick={() => void restoreVersion(version.id)}
                        >
                          {t("restoreVersion")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Dialog>
  );
}
