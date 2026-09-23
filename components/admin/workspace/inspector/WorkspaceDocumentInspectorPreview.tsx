"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentInspectorDocumentDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import {
  resolveWorkspaceFileType,
  type WorkspaceFileCategory,
} from "@/lib/workspace/file-type-util";
import { WorkspaceFileIcon } from "@/components/admin/workspace/WorkspaceFileIcon";
import {
  WorkspaceVersionScanBadge,
  workspaceScanBlocksContentDelivery,
} from "@/components/admin/workspace/WorkspaceVersionScanBadge";
import { Dialog } from "@/components/ui/Dialog";

type Props = {
  document: WorkspaceDocumentInspectorDocumentDto;
  folderName?: string;
};

function PreviewBlockedNotice({
  scan,
  reasonKey,
}: {
  scan: NonNullable<WorkspaceDocumentInspectorDocumentDto["currentVersion"]>["scan"];
  reasonKey: string;
}) {
  const t = useTranslations("Workspace.scan");
  return (
    <div
      className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center"
      data-testid="workspace-inspector-preview-blocked"
    >
      <WorkspaceVersionScanBadge scan={scan} />
      <p className="text-xs text-[var(--text-2)]">
        {reasonKey === "blocked"
          ? t("previewBlockedInfected")
          : reasonKey === "checkFailed"
            ? t("previewBlockedCheckFailed")
            : t("previewBlockedGeneric")}
      </p>
    </div>
  );
}

function CompactImagePreview({
  documentId,
  altText,
  expandedTitle,
}: {
  documentId: string;
  altText: string;
  expandedTitle: string;
}) {
  const t = useTranslations("Workspace.preview");
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [expanded, setExpanded] = useState(false);
  const previewUrl = `/api/workspace/documents/${encodeURIComponent(documentId)}/preview`;

  return (
    <>
      <div className="relative flex max-h-40 min-h-[7rem] items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-2)]">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={t("expandPreview")}
          data-testid="workspace-inspector-preview-expand"
          onClick={() => setExpanded(true)}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        {status === "loading" ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--blue)]" />
        ) : null}
        {status === "error" ? (
          <p className="px-3 text-xs text-[var(--muted)]">{t("previewNotAvailable")}</p>
        ) : null}
        <img
          src={previewUrl}
          alt={altText}
          className={`max-h-40 w-full object-contain ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      </div>
      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        title={expandedTitle}
        size="lg"
      >
        <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-[var(--surface-2)] p-4">
          <img src={previewUrl} alt={altText} className="max-h-[65vh] max-w-full object-contain" />
        </div>
      </Dialog>
    </>
  );
}

function CompactPdfPreview({ documentId, expandedTitle }: { documentId: string; expandedTitle: string }) {
  const t = useTranslations("Workspace.preview");
  const [status, setStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [expanded, setExpanded] = useState(false);
  const previewUrl = `/api/workspace/documents/${encodeURIComponent(documentId)}/preview`;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        {status !== "unavailable" ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            aria-label={t("expandPreview")}
            data-testid="workspace-inspector-preview-expand"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {status === "unavailable" ? (
          <div className="flex min-h-[7rem] flex-col items-center justify-center gap-2 p-4 text-center">
            <WorkspaceFileIcon category="pdf" size="lg" />
            <p className="text-xs text-[var(--muted)]">{t("previewNotAvailableHint")}</p>
          </div>
        ) : (
          <iframe
            title="PDF Vorschau"
            src={previewUrl}
            className="h-40 w-full border-0 bg-white"
            onLoad={() => setStatus("available")}
            onError={() => setStatus("unavailable")}
          />
        )}
      </div>
      <Dialog open={expanded} onClose={() => setExpanded(false)} title={expandedTitle} size="workspace">
        <iframe title="PDF Vorschau" src={previewUrl} className="h-[70vh] w-full border-0 bg-white" />
      </Dialog>
    </>
  );
}

function CompactFallbackPreview({
  category,
  label,
}: {
  category: WorkspaceFileCategory;
  label: string;
}) {
  const t = useTranslations("Workspace.preview");
  return (
    <div className="flex min-h-[5rem] items-center gap-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface-2)]/80 px-3 py-3">
      <WorkspaceFileIcon category={category} size="md" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--text-2)]">{t("previewNotAvailableHint")}</p>
      </div>
    </div>
  );
}

export function WorkspaceDocumentInspectorPreview({ document }: Props) {
  const ft = useTranslations("Workspace.fileTypes");
  const currentVersion = document.currentVersion;
  const scan = currentVersion?.scan;
  const mimeType = currentVersion?.mimeType ?? "application/octet-stream";
  const fileTypeInfo = resolveWorkspaceFileType(mimeType, currentVersion?.filename);

  function categoryLabel(): string {
    switch (fileTypeInfo.category) {
      case "pdf":
        return ft("pdf");
      case "word":
        return ft("word");
      case "excel":
        return ft("excel");
      case "powerpoint":
        return ft("powerpoint");
      case "image":
        return ft("image");
      case "text":
        return ft("text");
      default:
        return ft("unknown");
    }
  }

  const label = categoryLabel();

  if (workspaceScanBlocksContentDelivery(scan)) {
    const reason =
      scan?.contentAvailabilityReason === "BLOCKED"
        ? "blocked"
        : scan?.contentAvailabilityReason === "CHECK_FAILED"
          ? "checkFailed"
          : "generic";
    return <PreviewBlockedNotice scan={scan} reasonKey={reason} />;
  }

  if (fileTypeInfo.category === "image") {
    return <CompactImagePreview documentId={document.id} altText={document.name} expandedTitle={document.name} />;
  }
  if (fileTypeInfo.category === "pdf") {
    return <CompactPdfPreview documentId={document.id} expandedTitle={document.name} />;
  }
  return <CompactFallbackPreview category={fileTypeInfo.category} label={label} />;
}
