"use client";

import {
  Archive,
  Download,
  FolderInput,
  History,
  Link2,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";

import { WorkspaceAccessManagementDialog } from "./WorkspaceAccessManagementDialog";
import { WorkspaceDocumentDeleteControl } from "./WorkspaceDocumentDeleteControl";
import { WorkspaceDocumentVersionHistoryDialog } from "./WorkspaceDocumentVersionHistoryDialog";
import { WorkspaceFloatingContextMenu } from "./WorkspaceFloatingContextMenu";
import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";

type WorkspaceDocumentActionsProps = {
  document: WorkspaceDocumentListItemDto;
  onSelect?: () => void;
  canDelete?: boolean;
  canManageAccess?: boolean;
  canEditDocument?: boolean;
};

type ActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  comingSoonLabel?: string;
  destructive?: boolean;
};

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  comingSoonLabel,
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

      {disabled && comingSoonLabel ? (
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          {comingSoonLabel}
        </span>
      ) : null}
    </button>
  );
}

export function WorkspaceDocumentActions({
  document: workspaceDocument,
  canDelete = false,
  canManageAccess = false,
  canEditDocument = false,
}: WorkspaceDocumentActionsProps) {
  const t = useTranslations("Workspace.actions");
  const tAccess = useTranslations("Workspace.access");
  const [menuOpen, setMenuOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasDownload = Boolean(workspaceDocument.currentVersion);

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
    setMenuOpen(false);
    await fetch(
      `/api/workspace/documents/${encodeURIComponent(workspaceDocument.id)}/trash`,
      { method: "POST" },
    );
    window.location.reload();
  }

  async function archiveDocument() {
    setMenuOpen(false);
    await fetch(
      `/api/workspace/documents/${encodeURIComponent(workspaceDocument.id)}/archive`,
      { method: "POST" },
    );
    window.location.reload();
  }

  function handleToggleMenu(event: React.MouseEvent) {
    event.stopPropagation();
    setMenuOpen((current) => !current);
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

          <div className="my-1 border-t border-[var(--border)]" role="separator" />

          {canManageAccess ? (
            <>
              <ActionButton
                icon={<Shield className="h-4 w-4" />}
                label={tAccess("manageButton")}
                onClick={openAccessManagement}
              />
              <div className="my-1 border-t border-[var(--border)]" role="separator" />
            </>
          ) : null}

          <ActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t("rename")}
            disabled
            comingSoonLabel={t("comingSoon")}
          />

          <ActionButton
            icon={<FolderInput className="h-4 w-4" />}
            label={t("move")}
            disabled
            comingSoonLabel={t("comingSoon")}
          />

          <ActionButton
            icon={<History className="h-4 w-4" />}
            label={t("versionHistory")}
            onClick={openVersionHistory}
          />

          <ActionButton
            icon={<Link2 className="h-4 w-4" />}
            label="Link kopieren"
            onClick={() => void copyInternalLink()}
          />

          <div className="my-1 border-t border-[var(--border)]" role="separator" />

          {canEditDocument ? (
            <>
              <ActionButton
                icon={<Archive className="h-4 w-4" />}
                label={t("archive")}
                onClick={() => void archiveDocument()}
              />
              <ActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label="In Papierkorb"
                onClick={() => void trashDocument()}
                destructive
              />
            </>
          ) : null}

          {canDelete ? (
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
      </div>

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
    </>
  );
}
