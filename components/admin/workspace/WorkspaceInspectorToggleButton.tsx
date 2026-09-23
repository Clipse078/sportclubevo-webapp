"use client";

import { useTranslations } from "next-intl";

import { useWorkspaceLayoutContext } from "./layout/WorkspaceLayoutContext";

export function WorkspaceInspectorToggleButton() {
  const t = useTranslations("Workspace.layout");
  const layoutContext = useWorkspaceLayoutContext();
  if (!layoutContext) return null;

  return (
    <button
      type="button"
      onClick={layoutContext.toggleInspector}
      className="hidden shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] xl:inline-flex"
      aria-pressed={layoutContext.inspectorOpen}
      data-testid="workspace-inspector-toggle"
    >
      {layoutContext.inspectorOpen ? t("closeInspectorShort") : t("openInspectorShort")}
    </button>
  );
}
