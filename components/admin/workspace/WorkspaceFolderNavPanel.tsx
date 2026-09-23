import { FolderClosed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CreateRootFolderDialog } from "./CreateRootFolderDialog";
import { WorkspaceFolderTreePanel } from "./WorkspaceFolderTreePanel";
import { WorkspaceSidebarNavigation } from "./WorkspaceSidebarNavigation";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";

type Props = {
  folders: WorkspaceFolderDto[];
  selectedFolderId: string | null;
  canManage: boolean;
};

export async function WorkspaceFolderNavPanel({
  folders,
  selectedFolderId,
  canManage,
}: Props) {
  const t = await getTranslations("Workspace.folders");

  const tree =
    folders.length > 0 ? (
      <WorkspaceFolderTreePanel
        folders={folders}
        selectedFolderId={selectedFolderId}
        canManage={canManage}
      />
    ) : (
      <div className="px-2 py-2">
        <div className="flex min-h-32 flex-col items-center justify-center px-4 py-6 text-center">
          <FolderClosed className="h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-[var(--text)]">{t("noFoldersTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-2)]">
            {t("noFoldersDescription")}
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--border)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderClosed className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--text)]">{t("workspaceNavTitle")}</h2>
          </div>
          {canManage ? <CreateRootFolderDialog /> : null}
        </div>
      </div>
      <WorkspaceSidebarNavigation>{tree}</WorkspaceSidebarNavigation>
    </div>
  );
}
