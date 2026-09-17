"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Layers, MoreHorizontal, Pencil } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import PlanningWorkflowActionsClient from "@/components/admin/shared/PlanningWorkflowActionsClient";
import PlanningWorkflowBadge from "@/components/admin/shared/PlanningWorkflowBadge";
import TrainingSeriesArchiveButton from "./TrainingSeriesArchiveButton";
import TrainingSeriesDeleteControl from "./TrainingSeriesDeleteControl";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";
import { cn } from "@/lib/cn";

type Props = {
  row: Row;
  wochenplanerHref: string;
  canManage: boolean;
  canDelete: boolean;
  isCoordinator: boolean;
};

function statusBadgeClasses(status: Row["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "INACTIVE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ARCHIVED":
      return "border-slate-200 bg-slate-100 text-slate-500";
  }
}

function statusLabel(status: Row["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Aktiv";
    case "INACTIVE":
      return "Inaktiv";
    case "ARCHIVED":
      return "Archiviert";
  }
}

const GRID =
  "grid grid-cols-1 gap-2 border-b border-[var(--border)] px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(5.5rem,0.75fr)_minmax(0,1fr)_4.5rem_2.5rem] md:items-center md:gap-x-3";

export default function TrainingSeriesManagementRow({
  row,
  wochenplanerHref,
  canManage,
  canDelete,
  isCoordinator,
}: Props) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const editable = canManage && row.status !== "ARCHIVED";

  return (
    <article className={GRID} data-testid={`training-series-row-${row.seriesId}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{row.title}</p>
        <p className="truncate text-xs text-[var(--text-2)]">{row.teamDisplayName}</p>
      </div>
      <p className="text-sm text-[var(--foreground)]">{row.rhythmLabel}</p>
      <p className="text-sm tabular-nums text-[var(--foreground)]">{row.timeLabel}</p>
      <p className="truncate text-sm text-[var(--text-2)]">{row.facilityLabel ?? "—"}</p>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "inline-flex h-5 w-fit items-center rounded-full border px-2 text-[0.62rem] font-semibold",
            statusBadgeClasses(row.status),
          )}
        >
          {statusLabel(row.status)}
        </span>
        {(row.planningStage === "DRAFT" || row.planningStage === "SUBMITTED" ||
          (row.planningStage === "APPROVED" && !isCoordinator)) && (
          <PlanningWorkflowBadge stage={row.planningStage} size="sm" />
        )}
      </div>
      <div className="flex items-center justify-end gap-1">
        {editable ? (
          <Link
            href={buildTrainingSeriesEditHref(row.seriesId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-[var(--surface-2)]"
            aria-label="Serie bearbeiten"
            data-testid={`training-series-edit-${row.seriesId}`}
          >
            <Pencil className="h-3.5 w-3.5 text-[var(--blue)]" />
          </Link>
        ) : null}
        <button
          ref={menuRef}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-[var(--surface-2)]"
          aria-label="Weitere Aktionen"
          data-testid={`training-series-menu-${row.seriesId}`}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <PopoverContent open={menuOpen} onOpenChange={setMenuOpen} anchorRef={menuRef} matchAnchorWidth={false}>
          <div className="min-w-52 py-1 text-sm">
            <Link
              href={buildTrainingSeriesEditHref(row.seriesId)}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Serie bearbeiten
            </Link>
            <Link
              href={`/dashboard/training/series/${row.seriesId}/allocations`}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Ressourcen verwalten
            </Link>
            <Link
              href={wochenplanerHref}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Im Wochenplaner anzeigen
            </Link>
            {editable ? (
              <div className="border-t border-[var(--border)] px-3 py-2">
                <TrainingSeriesArchiveButton seriesId={row.seriesId} seriesTitle={row.title} />
              </div>
            ) : null}
            {row.status !== "ARCHIVED" ? (
              <div className="px-3 py-2">
                <PlanningWorkflowActionsClient
                  recordId={row.seriesId}
                  domain="training"
                  planningStage={row.planningStage}
                  isCoordinator={isCoordinator}
                />
              </div>
            ) : null}
            <div className="border-t border-[var(--border)] px-3 py-2">
              <TrainingSeriesDeleteControl
                seriesId={row.seriesId}
                seriesTitle={row.title}
                canDelete={canDelete}
                variant="inline"
              />
            </div>
          </div>
        </PopoverContent>
      </div>

      {/* Mobile card extras */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
          <Layers className="h-3 w-3" />
          Serie
        </span>
        <Link href={wochenplanerHref} className="text-xs font-medium text-[var(--blue)]">
          Wochenplaner
        </Link>
      </div>
    </article>
  );
}
