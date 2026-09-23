"use client";

import { useTranslations } from "next-intl";

export function WorkspaceEmptyInspectorPanel() {
  const t = useTranslations("Workspace.folderDetails");

  return (
    <aside className="flex min-h-[320px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[var(--text)]">{t("panelTitle")}</h2>
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <p className="text-sm text-[var(--text-2)]">{t("noItemSelected")}</p>
      </div>
    </aside>
  );
}
