"use client";

import { Columns3, LayoutList } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  persistWorkspaceListColumns,
  persistWorkspaceListDensity,
  readStoredWorkspaceListColumns,
  readStoredWorkspaceListDensity,
  type WorkspaceListColumnId,
  type WorkspaceListColumnPrefs,
  type WorkspaceListDensity,
} from "@/lib/workspace/ui/workspace-view-preferences";

import { WorkspaceFloatingContextMenu } from "./WorkspaceFloatingContextMenu";

type Props = {
  onDensityChange?: (density: WorkspaceListDensity) => void;
  onColumnsChange?: (columns: WorkspaceListColumnPrefs) => void;
};

export function WorkspaceListViewOptions({ onDensityChange, onColumnsChange }: Props) {
  const t = useTranslations("Workspace.viewOptions");
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState<WorkspaceListDensity>(() =>
    readStoredWorkspaceListDensity(),
  );
  const [columns, setColumns] = useState<WorkspaceListColumnPrefs>(() =>
    readStoredWorkspaceListColumns(),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onDensityChange?.(density);
  }, [density, onDensityChange]);

  useEffect(() => {
    onColumnsChange?.(columns);
  }, [columns, onColumnsChange]);

  function setDensityAndPersist(next: WorkspaceListDensity) {
    setDensity(next);
    persistWorkspaceListDensity(next);
  }

  function toggleColumn(id: WorkspaceListColumnId) {
    const next = { ...columns, [id]: !columns[id] };
    setColumns(next);
    persistWorkspaceListColumns(next);
  }

  const columnDefs: { id: WorkspaceListColumnId; label: string }[] = [
    { id: "modified", label: t("columnModified") },
    { id: "size", label: t("columnSize") },
    { id: "version", label: t("columnVersion") },
    { id: "uploadedBy", label: t("columnUploadedBy") },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuAriaLabel")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
      >
        <LayoutList className="h-3.5 w-3.5" aria-hidden />
        {t("triggerLabel")}
      </button>

      <WorkspaceFloatingContextMenu
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        ariaLabel={t("menuAriaLabel")}
      >
        <div className="min-w-[12rem] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("densitySection")}
          </p>
          <div className="mt-2 flex gap-1">
            {(["comfortable", "compact"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="menuitemradio"
                aria-checked={density === mode}
                onClick={() => {
                  setDensityAndPersist(mode);
                  setOpen(false);
                }}
                className={[
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                  density === mode
                    ? "bg-[var(--blue-light)] text-[var(--blue)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                ].join(" ")}
              >
                {mode === "comfortable" ? t("densityComfortable") : t("densityCompact")}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("columnsSection")}
          </p>
          <ul className="mt-2 space-y-1">
            {columnDefs.map((col) => (
              <li key={col.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-[var(--text-2)] hover:bg-[var(--surface-2)]">
                  <input
                    type="checkbox"
                    checked={columns[col.id]}
                    onChange={() => toggleColumn(col.id)}
                    className="rounded border-[var(--border)]"
                  />
                  <Columns3 className="h-3 w-3 opacity-60" aria-hidden />
                  {col.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </WorkspaceFloatingContextMenu>
    </div>
  );
}
