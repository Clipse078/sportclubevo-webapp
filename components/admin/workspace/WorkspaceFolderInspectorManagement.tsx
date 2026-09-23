"use client";

import { useTranslations } from "next-intl";

import { ArchiveFolderButton } from "@/app/(admin)/dashboard/workspace/ArchiveFolderButton";
import { DeleteFolderButton } from "@/app/(admin)/dashboard/workspace/DeleteFolderButton";
import { TrashFolderButton } from "@/app/(admin)/dashboard/workspace/TrashFolderButton";
import { MoveFolderForm } from "@/components/admin/workspace/MoveFolderForm";
import { RenameFolderForm } from "@/components/admin/workspace/RenameFolderForm";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";

type WorkspaceFolderInspectorManagementProps = {
  folderId: string;
  folderName: string;
  currentParentId: string | null;
  folders: WorkspaceFolderDto[];
  canDelete: boolean;
};

export function WorkspaceFolderInspectorManagement({
  folderId,
  folderName,
  currentParentId,
  folders,
  canDelete,
}: WorkspaceFolderInspectorManagementProps) {
  const t = useTranslations("Workspace.folderManagement");

  return (
    <div className="space-y-4">
      <RenameFolderForm folderId={folderId} currentName={folderName} />

      <div className="border-t border-[var(--border)] pt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("locationSection")}
        </p>
        <MoveFolderForm
          folderId={folderId}
          currentParentId={currentParentId}
          folders={folders}
        />
      </div>

      <div className="border-t border-[var(--border)] pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("destructiveSectionTitle")}
        </p>
        <p className="mb-2 text-[11px] leading-4 text-[var(--muted)]">
          {t("destructiveSectionHint")}
        </p>
        <div className="space-y-2">
          <ArchiveFolderButton
            folderId={folderId}
            folderName={folderName}
            variant="subtle"
          />
          <TrashFolderButton folderId={folderId} folderName={folderName} />
          <p className="text-[11px] leading-4 text-[var(--muted)]">
            {t("archiveNote")}
          </p>
          {canDelete ? (
            <DeleteFolderButton
              folderId={folderId}
              folderName={folderName}
              variant="subtle"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
