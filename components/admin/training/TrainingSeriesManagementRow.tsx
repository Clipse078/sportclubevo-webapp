"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import TrainingSeriesRowContextMenu from "./TrainingSeriesRowContextMenu";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";
import { cn } from "@/lib/cn";

type Props = {
  row: Row;
  wochenplanerHref: string;
  canManage: boolean;
  canDelete: boolean;
};

function statusPresentation(status: Row["status"]): { label: string; className: string } {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Aktiv",
        className: "text-emerald-400/90 bg-emerald-500/10 ring-1 ring-emerald-500/20",
      };
    case "INACTIVE":
      return {
        label: "Inaktiv",
        className: "text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20",
      };
    case "ARCHIVED":
      return {
        label: "Archiviert",
        className: "text-[var(--muted)] bg-[var(--surface-2)] ring-1 ring-[var(--border)]",
      };
  }
}

const GRID =
  "group relative grid min-h-[56px] grid-cols-1 gap-2 border-b border-[var(--border)]/80 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(6rem,0.75fr)_minmax(7rem,0.85fr)_minmax(0,1fr)_5.5rem_2.75rem] md:items-center md:gap-x-4";

export default function TrainingSeriesManagementRow({
  row,
  wochenplanerHref,
  canManage,
  canDelete,
}: Props) {
  const editable = canManage && row.status !== "ARCHIVED";
  const editHref = buildTrainingSeriesEditHref(row.seriesId);
  const status = statusPresentation(row.status);

  return (
    <article className={GRID} data-testid={`training-series-row-${row.seriesId}`}>
      <div className="relative z-[1] min-w-0 md:col-span-1">
        {editable ? (
          <Link
            href={editHref}
            className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            data-testid={`training-series-edit-${row.seriesId}`}
          >
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">{row.title}</p>
            <p className="truncate text-xs text-[var(--text-2)]">{row.teamDisplayName}</p>
          </Link>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">{row.title}</p>
            <p className="truncate text-xs text-[var(--text-2)]">{row.teamDisplayName}</p>
          </div>
        )}
      </div>

      <p className="text-sm tabular-nums text-[var(--foreground)]">{row.rhythmLabel}</p>

      <div className="text-sm tabular-nums text-[var(--foreground)]">
        {row.timeLines ? (
          <ul className="space-y-0.5">
            {row.timeLines.map((line) => (
              <li key={line} className="leading-tight">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p>{row.timeLabel}</p>
        )}
      </div>

      <p className="truncate text-sm text-[var(--text-2)]">{row.facilityLabel ?? "—"}</p>

      <div className="flex flex-col items-start gap-1">
        <span
          className={cn(
            "inline-flex h-5 items-center rounded px-1.5 text-[0.65rem] font-medium leading-none",
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="relative z-[1] flex items-center justify-end gap-1">
        {editable ? (
          <Link
            href={editHref}
            aria-label="Serie bearbeiten"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] opacity-0 transition-all",
              "group-hover:opacity-100 group-hover:border-[var(--border)] group-hover:bg-[var(--surface-2)] group-hover:text-[var(--foreground)]",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
            )}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        <TrainingSeriesRowContextMenu
          seriesId={row.seriesId}
          seriesTitle={row.title}
          wochenplanerHref={wochenplanerHref}
          canManage={canManage}
          canDelete={canDelete}
          editable={editable}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-none transition-colors group-hover:bg-[var(--surface-2)]/35 md:rounded-none" aria-hidden="true" />
    </article>
  );
}
