"use client";

import { FolderInput, MoreHorizontal, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ArchiveFolderButton } from "@/app/(admin)/dashboard/workspace/ArchiveFolderButton";
import { DeleteFolderButton } from "@/app/(admin)/dashboard/workspace/DeleteFolderButton";
import { TrashFolderButton } from "@/app/(admin)/dashboard/workspace/TrashFolderButton";
import { MoveFolderForm } from "@/components/admin/workspace/MoveFolderForm";
import { RenameFolderForm } from "@/components/admin/workspace/RenameFolderForm";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";

import { WorkspaceFloatingContextMenu } from "./WorkspaceFloatingContextMenu";

type Props = {
  folderId: string;
  folderName: string;
  currentParentId: string | null;
  folders: WorkspaceFolderDto[];
  canDelete: boolean;
};

export function WorkspaceFolderInspectorActions({
  folderId,
  folderName,
  currentParentId,
  folders,
  canDelete,
}: Props) {
  const t = useTranslations("Workspace.folderManagement");
  const tActions = useTranslations("Workspace.actions");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"rename" | "move" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-3">
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("folderActionsAria")}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          {t("folderActionsLabel")}
        </button>
        <WorkspaceFloatingContextMenu
          open={open}
          onOpenChange={setOpen}
          anchorRef={triggerRef}
          ariaLabel={t("folderActionsAria")}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            onClick={() => {
              setOpen(false);
              setPanel("rename");
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            {tActions("rename")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            onClick={() => {
              setOpen(false);
              setPanel("move");
            }}
          >
            <FolderInput className="h-4 w-4" aria-hidden />
            {tActions("move")}
          </button>
          <div className="my-1 border-t border-[var(--border)]" role="separator" />
          <div className="px-2 py-1">
            <ArchiveFolderButton folderId={folderId} folderName={folderName} variant="subtle" />
          </div>
          <div className="px-2 py-1">
            <TrashFolderButton folderId={folderId} folderName={folderName} />
          </div>
          {canDelete ? (
            <div className="border-t border-[var(--border)] px-2 py-1">
              <DeleteFolderButton folderId={folderId} folderName={folderName} variant="subtle" />
            </div>
          ) : null}
        </WorkspaceFloatingContextMenu>
      </div>

      {panel === "rename" ? (
        <RenameFolderForm folderId={folderId} currentName={folderName} />
      ) : null}
      {panel === "move" ? (
        <MoveFolderForm folderId={folderId} currentParentId={currentParentId} folders={folders} />
      ) : null}
    </div>
  );
}
