"use client";

import {
  ChevronDown,
  Download,
  FileUp,
  History,
  Link2,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { WorkspaceCommandContextState } from "@/lib/workspace/command/workspace-command-context";
import type { DocumentInspectorWorkflowCapabilitiesDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import ContextualTaskCreateTrigger from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTrigger";

import { Button } from "@/components/ui/Button";
import { WorkspaceFloatingContextMenu } from "./WorkspaceFloatingContextMenu";
import {
  CreateFolderMenuItem,
  CreateWorkspaceFolderDialog,
} from "./CreateWorkspaceFolderDialog";
import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";
import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";

type WorkspaceCommandBarProps = {
  context: WorkspaceCommandContextState;
  selectedDocument: WorkspaceDocumentListItemDto | null;
  onOpenVersionHistory?: () => void;
  workflowCapabilities?: DocumentInspectorWorkflowCapabilitiesDto;
  taskCreateDialogProps?: Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> | null;
  onCreateRequirement?: () => void;
};

export function WorkspaceCommandBar({
  context,
  selectedDocument,
  onOpenVersionHistory,
  workflowCapabilities = { canCreateTask: false, canCreateRequirement: false },
  taskCreateDialogProps = null,
  onCreateRequirement,
}: WorkspaceCommandBarProps) {
  const t = useTranslations("Workspace.commandBar");
  const tActions = useTranslations("Workspace.actions");
  const {
    canUpload,
    isUploading,
    isUploadingNewVersion,
    openFilePicker,
    openNewVersionFilePicker,
  } = useWorkspaceUploadContext();

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);

  const isArchivedOrTrash =
    context.lifecycleView === "archived" || context.lifecycleView === "trash";

  const documentSelected =
    context.selection.kind === "DOCUMENT" && selectedDocument != null;

  function downloadSelected() {
    if (!selectedDocument?.currentVersion) return;
    window.location.assign(
      `/api/workspace/documents/${encodeURIComponent(selectedDocument.id)}/download`,
    );
  }

  async function copyDocumentLink() {
    if (!selectedDocument) return;
    const path = buildWorkspaceInternalLink({
      type: "document",
      documentId: selectedDocument.id,
    });
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setOverflowOpen(false);
  }

  if (isArchivedOrTrash) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-2.5"
        role="toolbar"
        aria-label={t("toolbarAriaLabel")}
      >
        <p className="text-xs text-[var(--text-2)]">{t("lifecycleReadOnlyHint")}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-2.5"
        role="toolbar"
        aria-label={t("toolbarAriaLabel")}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {documentSelected ? (
            <>
              {context.capabilities.canDownloadDocument ? (
                <Button
                  type="button"
                  variant="primary"
                  iconLeft={<Download className="h-4 w-4" />}
                  onClick={downloadSelected}
                >
                  {tActions("download")}
                </Button>
              ) : null}
              {context.capabilities.canUploadNewVersion ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={isUploadingNewVersion}
                  iconLeft={!isUploadingNewVersion ? <FileUp className="h-4 w-4" /> : undefined}
                  onClick={() => openNewVersionFilePicker(selectedDocument!.id)}
                  data-testid="workspace-command-new-version"
                >
                  {tActions("newVersion")}
                </Button>
              ) : null}
              {context.capabilities.canOpenVersionHistory ? (
                <Button
                  type="button"
                  variant="secondary"
                  iconLeft={<History className="h-4 w-4" />}
                  onClick={() => onOpenVersionHistory?.()}
                >
                  {tActions("versionHistory")}
                </Button>
              ) : null}
              {workflowCapabilities.canCreateTask && taskCreateDialogProps ? (
                <ContextualTaskCreateTrigger
                  variant="toolbar"
                  label="+ Aufgabe"
                  {...taskCreateDialogProps}
                />
              ) : null}
              {workflowCapabilities.canCreateRequirement && onCreateRequirement ? (
                <button
                  type="button"
                  data-testid="workspace-command-create-requirement"
                  onClick={onCreateRequirement}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)]/80 px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                >
                  + Anforderung
                </button>
              ) : null}
            </>
          ) : (
            <>
              {!canUpload && !context.capabilities.canCreateFolder ? (
                <p className="text-xs text-[var(--text-2)]" title={t("noEditPermissionHint")}>
                  {t("noEditPermissionHint")}
                </p>
              ) : null}
              {context.capabilities.canCreateFolder ? (
                <>
                  <button
                    ref={createTriggerRef}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] disabled:opacity-50"
                    aria-haspopup="menu"
                    aria-expanded={createMenuOpen}
                    onClick={() => setCreateMenuOpen((v) => !v)}
                  >
                    {t("newMenu")}
                    <ChevronDown className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                  </button>
                  <WorkspaceFloatingContextMenu
                    open={createMenuOpen}
                    onOpenChange={setCreateMenuOpen}
                    anchorRef={createTriggerRef}
                    ariaLabel={t("newMenuAriaLabel")}
                  >
                    <CreateFolderMenuItem
                      onSelect={() => {
                        setCreateMenuOpen(false);
                        setCreateDialogOpen(true);
                      }}
                    />
                  </WorkspaceFloatingContextMenu>
                </>
              ) : null}

              {canUpload ? (
                <Button
                  type="button"
                  variant="primary"
                  loading={isUploading}
                  iconLeft={!isUploading ? <Upload className="h-4 w-4" /> : undefined}
                  onClick={openFilePicker}
                  aria-label={t("uploadLabel")}
                >
                  {isUploading ? t("uploadingLabel") : t("uploadLabel")}
                </Button>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {documentSelected && context.capabilities.canCopyDocumentLink ? (
            <button
              ref={overflowTriggerRef}
              type="button"
              aria-label={t("overflowAriaLabel")}
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}

          <WorkspaceFloatingContextMenu
            open={overflowOpen}
            onOpenChange={setOverflowOpen}
            anchorRef={overflowTriggerRef}
            ariaLabel={t("overflowAriaLabel")}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              onClick={() => void copyDocumentLink()}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t("copyLink")}
            </button>
          </WorkspaceFloatingContextMenu>
        </div>
      </div>

      <CreateWorkspaceFolderDialog
        mode="child"
        parentId={context.folderId}
        destinationLabel={context.folderName}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
