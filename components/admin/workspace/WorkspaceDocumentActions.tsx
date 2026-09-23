"use client";

import {
  Archive,
  Download,
  FileUp,
  History,
  Link2,
  MoreHorizontal,
  Pencil,
  Shield,
  Star,
  Trash2,
  FolderInput,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";
import type { DocumentInspectorWorkflowCapabilitiesDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import ContextualTaskCreateTrigger from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTrigger";

import { WorkspaceAccessManagementDialog } from "./WorkspaceAccessManagementDialog";
import { WorkspaceDocumentDeleteControl } from "./WorkspaceDocumentDeleteControl";
import { WorkspaceDocumentVersionHistoryDialog } from "./WorkspaceDocumentVersionHistoryDialog";
import { WorkspaceDocumentRenameDialog } from "./WorkspaceDocumentRenameDialog";
import { WorkspaceDocumentMoveDialog } from "./WorkspaceDocumentMoveDialog";
import { WorkspaceFloatingContextMenu } from "./WorkspaceFloatingContextMenu";
import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import { useOptionalWorkspaceFavoritesContext } from "./WorkspaceCollaborationProvider";
import { WorkspaceFavoriteToggle } from "./WorkspaceFavoriteToggle";
import { useWorkspaceUploadContext } from "./WorkspaceUploadContext";

type WorkspaceDocumentActionsProps = {
  document: WorkspaceDocumentListItemDto;
  onSelect?: () => void;
  canDelete?: boolean;
  canManageAccess?: boolean;
  canEditDocument?: boolean;
  showPermanentDelete?: boolean;
  folders?: WorkspaceFolderDto[];
  currentFolderLabel?: string;
  layout?: "menu" | "row";
  workflowCapabilities?: DocumentInspectorWorkflowCapabilitiesDto;
  taskCreateDialogProps?: Omit<
    ContextualTaskCreateDialogProps,
    "open" | "onOpenChange"
  > | null;
  onCreateRequirement?: () => void;
  isSelected?: boolean;
};

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  destructive = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50 ${
        destructive
          ? "text-[var(--sce-danger)] hover:text-[var(--sce-danger)]"
          : "text-[var(--text-2)] hover:text-[var(--foreground)]"
      }`}
    >
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

function rowQuickClass(isSelected: boolean): string {
  return [
    "pointer-coarse:opacity-100 opacity-0 transition-opacity duration-100",
    "group-hover:opacity-100 group-focus-within:opacity-100",
    isSelected ? "opacity-100" : "",
  ].join(" ");
}

export function WorkspaceDocumentActions({
  document: workspaceDocument,
  canDelete = false,
  canManageAccess = false,
  canEditDocument = false,
  showPermanentDelete = false,
  folders = [],
  currentFolderLabel = "",
  layout = "menu",
  workflowCapabilities = { canCreateTask: false, canCreateRequirement: false },
  taskCreateDialogProps = null,
  onCreateRequirement,
  isSelected = false,
}: WorkspaceDocumentActionsProps) {
  const t = useTranslations("Workspace.actions");
  const tAccess = useTranslations("Workspace.access");
  const tCmd = useTranslations("Workspace.commandBar");
  const router = useRouter();
  const upload = useWorkspaceUploadContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const favoritesContext = useOptionalWorkspaceFavoritesContext();

  const hasDownload = Boolean(workspaceDocument.currentVersion);
  const isFavorited = favoritesContext?.isFavorite("DOCUMENT", workspaceDocument.id) ?? false;

  function downloadDocument() {
    if (!hasDownload) return;
    setMenuOpen(false);
    window.location.assign(
      `/api/workspace/documents/${encodeURIComponent(workspaceDocument.id)}/download`,
    );
  }

  function openVersionHistory() {
    setMenuOpen(false);
    setVersionHistoryOpen(true);
  }

  function openAccessManagement() {
    setMenuOpen(false);
    setAccessOpen(true);
  }

  async function copyInternalLink() {
    const path = buildWorkspaceInternalLink({
      type: "document",
      documentId: workspaceDocument.id,
    });
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setMenuOpen(false);
  }

  async function trashDocument() {
    if (!window.confirm(t("trashConfirm"))) {
      return;
    }
    setMenuOpen(false);
    const res = await fetch(
      `/api/workspace/documents/${encodeURIComponent(workspaceDocument.id)}/trash`,
      { method: "POST" },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? t("actionFailed"));
      return;
    }
    router.refresh();
  }

  async function archiveDocument() {
    setMenuOpen(false);
    const res = await fetch(
      `/api/workspace/documents/${encodeURIComponent(workspaceDocument.id)}/archive`,
      { method: "POST" },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? t("actionFailed"));
      return;
    }
    router.refresh();
  }

  function handleToggleMenu(event: React.MouseEvent) {
    event.stopPropagation();
    setMenuOpen((current) => !current);
  }

  const menu = (
    <WorkspaceFloatingContextMenu
      open={menuOpen}
      onOpenChange={setMenuOpen}
      anchorRef={triggerRef}
      ariaLabel={t("menuAriaLabel", { name: workspaceDocument.name })}
    >
      <ActionButton
        icon={<Download className="h-4 w-4" />}
        label={t("download")}
        onClick={downloadDocument}
        disabled={!hasDownload}
      />

      {favoritesContext ? (
        <ActionButton
          icon={<Star className={`h-4 w-4 ${isFavorited ? "fill-amber-500 text-amber-500" : ""}`} />}
          label={isFavorited ? t("removeFavorite") : t("addFavorite")}
          onClick={() => {
            setMenuOpen(false);
            void favoritesContext.toggleFavorite("DOCUMENT", workspaceDocument.id);
          }}
        />
      ) : null}

      <ActionButton
        icon={<Link2 className="h-4 w-4" />}
        label={tCmd("copyLink")}
        onClick={() => void copyInternalLink()}
      />

      <div className="my-1 border-t border-[var(--border)]" role="separator" />

      {canEditDocument ? (
        <ActionButton
          icon={<FileUp className="h-4 w-4" />}
          label={t("newVersion")}
          onClick={() => {
            setMenuOpen(false);
            upload.openNewVersionFilePicker(workspaceDocument.id);
          }}
        />
      ) : null}

      <ActionButton
        icon={<History className="h-4 w-4" />}
        label={t("versionHistory")}
        onClick={openVersionHistory}
      />

      {workflowCapabilities.canCreateTask && taskCreateDialogProps ? (
        <div
          className="px-1 py-0.5"
          onClick={() => setMenuOpen(false)}
          onKeyDown={() => setMenuOpen(false)}
        >
          <ContextualTaskCreateTrigger
            variant="menuItem"
            label={t("createTask")}
            {...taskCreateDialogProps}
          />
        </div>
      ) : null}

      {workflowCapabilities.canCreateRequirement && onCreateRequirement ? (
        <ActionButton
          icon={<FileUp className="h-4 w-4" />}
          label={t("createRequirement")}
          onClick={() => {
            setMenuOpen(false);
            onCreateRequirement();
          }}
        />
      ) : null}

      {(canManageAccess || canEditDocument) && (
        <div className="my-1 border-t border-[var(--border)]" role="separator" />
      )}

      {canManageAccess ? (
        <ActionButton
          icon={<Shield className="h-4 w-4" />}
          label={tAccess("manageButton")}
          onClick={openAccessManagement}
        />
      ) : null}

      {canEditDocument ? (
        <>
          <ActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t("rename")}
            onClick={() => {
              setMenuOpen(false);
              setRenameOpen(true);
            }}
          />
          <ActionButton
            icon={<FolderInput className="h-4 w-4" />}
            label={t("move")}
            onClick={() => {
              setMenuOpen(false);
              setMoveOpen(true);
            }}
          />
        </>
      ) : null}

      {canEditDocument ? (
        <>
          <div className="my-1 border-t border-[var(--border)]" role="separator" />
          <ActionButton
            icon={<Archive className="h-4 w-4" />}
            label={t("archive")}
            onClick={() => void archiveDocument()}
          />
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t("trash")}
            onClick={() => void trashDocument()}
            destructive
          />
        </>
      ) : null}

      {showPermanentDelete && canDelete ? (
        <>
          <div className="my-1 border-t border-[var(--border)]" role="separator" />
          <WorkspaceDocumentDeleteControl
            documentId={workspaceDocument.id}
            documentName={workspaceDocument.name}
            canDelete={canDelete}
          />
        </>
      ) : null}
    </WorkspaceFloatingContextMenu>
  );

  const dialogs = (
    <>
      <WorkspaceDocumentVersionHistoryDialog
        documentId={workspaceDocument.id}
        documentName={workspaceDocument.name}
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        canRestore={canEditDocument}
      />

      {canManageAccess ? (
        <WorkspaceAccessManagementDialog
          open={accessOpen}
          onClose={() => setAccessOpen(false)}
          resourceType="DOCUMENT"
          resourceId={workspaceDocument.id}
          resourceName={workspaceDocument.name}
        />
      ) : null}

      {canEditDocument ? (
        <>
          <WorkspaceDocumentRenameDialog
            open={renameOpen}
            onClose={() => setRenameOpen(false)}
            documentId={workspaceDocument.id}
            currentName={workspaceDocument.name}
          />
          <WorkspaceDocumentMoveDialog
            open={moveOpen}
            onClose={() => setMoveOpen(false)}
            documentId={workspaceDocument.id}
            documentName={workspaceDocument.name}
            currentFolderId={workspaceDocument.folderId}
            currentFolderLabel={currentFolderLabel}
            folders={folders}
          />
        </>
      ) : null}
    </>
  );

  if (layout === "row") {
    return (
      <>
        <div
          className="relative flex w-[7.25rem] shrink-0 items-center justify-end gap-0.5"
          data-row-selected={isSelected ? "true" : "false"}
          onClick={(e) => e.stopPropagation()}
        >
          {hasDownload ? (
            <button
              type="button"
              aria-label={t("download")}
              title={t("download")}
              onClick={downloadDocument}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${rowQuickClass(isSelected)}`}
            >
              <Download className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
          )}

          <div className={isFavorited ? "opacity-100" : rowQuickClass(isSelected)}>
            <WorkspaceFavoriteToggle
              resourceType="DOCUMENT"
              resourceId={workspaceDocument.id}
              className="h-8 w-8"
            />
          </div>

          <div className={rowQuickClass(isSelected)}>
            <button
              ref={triggerRef}
              type="button"
              aria-label={t("menuAriaLabel", { name: workspaceDocument.name })}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={handleToggleMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {menu}
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          aria-label={t("menuAriaLabel", { name: workspaceDocument.name })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={handleToggleMenu}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {menu}
      </div>
      {dialogs}
    </>
  );
}
