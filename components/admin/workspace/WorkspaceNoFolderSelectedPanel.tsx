"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

import { CreateRootFolderDialog } from "./CreateRootFolderDialog";

type Props = {
  hasFolders: boolean;
  canManage: boolean;
};

export function WorkspaceNoFolderSelectedPanel({ hasFolders, canManage }: Props) {
  const t = useTranslations("Workspace.folders");

  return (
    <section className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
          <LockKeyhole className="h-7 w-7 text-[var(--blue)]" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-[var(--text)]">
          {hasFolders ? t("selectFolder") : t("welcomeTitle")}
        </h2>

        <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">
          {hasFolders ? t("selectFolderDescription") : t("welcomeDescription")}
        </p>

        {canManage && !hasFolders ? (
          <div className="mt-6">
            <CreateRootFolderDialog />
          </div>
        ) : null}

        {!canManage && !hasFolders ? (
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">{t("noPermissionNote")}</p>
        ) : null}
      </div>
    </section>
  );
}
