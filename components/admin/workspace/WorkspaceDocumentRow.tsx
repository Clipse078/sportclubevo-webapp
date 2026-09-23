"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import { resolveWorkspaceFileType } from "@/lib/workspace/file-type-util";
import type { DocumentInspectorWorkflowCapabilitiesDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";
import type { WorkspaceListColumnPrefs } from "@/lib/workspace/ui/workspace-view-preferences";
import type { WorkspaceListDensity } from "@/lib/workspace/ui/workspace-view-preferences";

import { WorkspaceDocumentActions } from "./WorkspaceDocumentActions";
import { WorkspaceDocumentRenameDialog } from "./WorkspaceDocumentRenameDialog";
import { WorkspaceFileIcon } from "./WorkspaceFileIcon";
import {
  formatWorkspaceDate,
  formatWorkspaceFileSize,
} from "./workspace-document-formatters";
import { WorkspaceVersionScanBadge } from "./WorkspaceVersionScanBadge";

type WorkspaceDocumentRowProps = {
  document: WorkspaceDocumentListItemDto;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  canManageAccess?: boolean;
  folders?: WorkspaceFolderDto[];
  currentFolderLabel?: string;
  density?: WorkspaceListDensity;
  columns?: WorkspaceListColumnPrefs;
  workflowCapabilities?: DocumentInspectorWorkflowCapabilitiesDto;
  taskCreateDialogProps?: Omit<
    ContextualTaskCreateDialogProps,
    "open" | "onOpenChange"
  > | null;
  onCreateRequirement?: () => void;
};

function renameAffordanceClass(isSelected: boolean): string {
  return [
    "pointer-coarse:opacity-100 opacity-0 transition-opacity duration-100",
    "group-hover:opacity-100 group-focus-within:opacity-100",
    isSelected ? "opacity-100" : "",
  ].join(" ");
}

export function WorkspaceDocumentRow({
  document,
  isSelected = false,
  onSelect,
  canManageAccess = false,
  folders = [],
  currentFolderLabel = "",
  density = "comfortable",
  columns,
  workflowCapabilities = { canCreateTask: false, canCreateRequirement: false },
  taskCreateDialogProps = null,
  onCreateRequirement,
}: WorkspaceDocumentRowProps) {
  const ft = useTranslations("Workspace.fileTypes");
  const tActions = useTranslations("Workspace.actions");
  const [renameOpen, setRenameOpen] = useState(false);
  const currentVersion = document.currentVersion;
  const mimeType = currentVersion?.mimeType ?? "application/octet-stream";
  const fileTypeInfo = resolveWorkspaceFileType(mimeType, currentVersion?.filename);

  const displayName = document.name;
  const cellPy = density === "compact" ? "py-1.5" : "py-2";
  const col = columns ?? {
    modified: true,
    size: true,
    version: true,
    uploadedBy: false,
  };

  function getCategoryLabel(): string {
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
      case "video":
        return ft("video");
      case "audio":
        return ft("audio");
      case "archive":
        return ft("archive");
      case "text":
        return ft("text");
      default:
        return ft("unknown");
    }
  }

  function handleRowClick(event: React.MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="menu"]')) return;
    onSelect?.(document.id);
  }

  function handleRowKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(document.id);
    }
  }

  return (
    <>
      <tr
        role="row"
        aria-selected={isSelected}
        tabIndex={0}
        data-row-selected={isSelected ? "true" : "false"}
        className={[
          "group cursor-pointer outline-none transition-colors duration-100",
          "border-t border-[var(--border)]",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]",
          isSelected
            ? "border-l-2 border-l-[var(--blue)] bg-[var(--blue-light)]"
            : "hover:bg-[var(--surface-2)]",
        ].join(" ")}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
      >
        <td className={`w-10 pl-4 pr-1 ${cellPy}`}>
          <WorkspaceFileIcon category={fileTypeInfo.category} size="md" />
        </td>

        <td className={`min-w-0 px-2 ${cellPy}`}>
          <div className="flex min-w-0 items-start gap-1">
            <div className="min-w-0 flex-1">
              <p
                className={[
                  "max-w-full truncate text-sm font-medium leading-snug transition-colors duration-100",
                  isSelected
                    ? "text-[var(--blue)]"
                    : "text-[var(--text)] group-hover:text-[var(--blue)]",
                ].join(" ")}
                title={displayName.length > 36 ? displayName : undefined}
              >
                {displayName}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{getCategoryLabel()}</p>
            </div>
            {document.canEditDocument ? (
              <button
                type="button"
                aria-label={tActions("rename")}
                title={tActions("rename")}
                onClick={(event) => {
                  event.stopPropagation();
                  setRenameOpen(true);
                }}
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${renameAffordanceClass(isSelected)}`}
                data-testid="workspace-row-rename"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </td>

        {col.modified ? (
          <td className={`hidden whitespace-nowrap px-4 text-xs text-[var(--text-2)] sm:table-cell ${cellPy}`}>
            {formatWorkspaceDate(document.updatedAt)}
          </td>
        ) : null}

        {col.size ? (
          <td className={`hidden whitespace-nowrap px-4 text-xs tabular-nums text-[var(--text-2)] md:table-cell ${cellPy}`}>
            {currentVersion ? formatWorkspaceFileSize(currentVersion.sizeBytes) : "—"}
          </td>
        ) : null}

        {col.version ? (
          <td className={`hidden whitespace-nowrap px-4 text-xs tabular-nums text-[var(--muted)] lg:table-cell ${cellPy}`}>
            <div className="flex flex-col items-start gap-1">
              <span>{currentVersion ? `v${currentVersion.versionNumber}` : "—"}</span>
              <WorkspaceVersionScanBadge scan={currentVersion?.scan} compact />
            </div>
          </td>
        ) : null}

        {col.uploadedBy ? (
          <td className={`hidden whitespace-nowrap px-4 text-xs text-[var(--text-2)] xl:table-cell ${cellPy}`}>
            —
          </td>
        ) : null}

        <td className={`py-1.5 pl-2 pr-3 text-right ${cellPy}`} onClick={(e) => e.stopPropagation()}>
          <WorkspaceDocumentActions
            document={document}
            layout="row"
            isSelected={isSelected}
            canManageAccess={canManageAccess || document.canManageAccess}
            canEditDocument={document.canEditDocument}
            folders={folders}
            currentFolderLabel={currentFolderLabel}
            workflowCapabilities={workflowCapabilities}
            taskCreateDialogProps={taskCreateDialogProps}
            onCreateRequirement={onCreateRequirement}
          />
        </td>
      </tr>

      {document.canEditDocument ? (
        <WorkspaceDocumentRenameDialog
          open={renameOpen}
          onClose={() => setRenameOpen(false)}
          documentId={document.id}
          currentName={document.name}
        />
      ) : null}
    </>
  );
}
