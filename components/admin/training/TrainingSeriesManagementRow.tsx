"use client";

import Link from "next/link";
import TrainingSeriesRowContextMenu from "./TrainingSeriesRowContextMenu";
import TrainingWeekdayPills from "./TrainingWeekdayPills";
import TrainingFacilityManagementCell from "./TrainingFacilityManagementCell";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSeriesManagementRow as Row } from "@/lib/training/management-series-view";
import {
  resolveTeamIdentityAccentClass,
  trainingManagementStatusPresentation,
} from "@/lib/training/management-presentation";
import { cn } from "@/lib/cn";
import { Users } from "lucide-react";

type Props = {
  row: Row;
  wochenplanerHref: string;
  canManage: boolean;
  canDelete: boolean;
};

const GRID =
  "group relative grid min-h-[58px] grid-cols-1 gap-2 border-b border-[var(--border)]/80 px-4 py-3 transition-[background-color] duration-150 last:border-b-0 md:grid-cols-[minmax(0,1.75fr)_minmax(7.25rem,0.95fr)_minmax(7.5rem,0.95fr)_minmax(0,1.1fr)_5.5rem_2.5rem] md:items-center md:gap-x-4";

export default function TrainingSeriesManagementRow({
  row,
  wochenplanerHref,
  canManage,
  canDelete,
}: Props) {
  const editable = canManage && row.status !== "ARCHIVED";
  const editHref = buildTrainingSeriesEditHref(row.seriesId);
  const resourcesHref = `${editHref}#training-series-ressourcen`;
  const status = trainingManagementStatusPresentation(row.status);
  const identityAccent = resolveTeamIdentityAccentClass(row.teamSeasonId);

  const identityBlock = (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          identityAccent,
        )}
        aria-hidden="true"
      >
        <Users className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          {row.title}
        </p>
        <p className="truncate text-xs text-[var(--text-2)]">{row.teamDisplayName}</p>
      </div>
    </div>
  );

  return (
    <article className={GRID} data-testid={`training-series-row-${row.seriesId}`}>
      <div className="relative z-[1] min-w-0 md:col-span-1">
        {editable ? (
          <Link
            href={editHref}
            className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            data-testid={`training-series-edit-${row.seriesId}`}
          >
            {identityBlock}
          </Link>
        ) : (
          identityBlock
        )}
      </div>

      <TrainingWeekdayPills weekdays={row.weekdays} className="md:col-span-1" />

      <div className="text-sm tabular-nums text-[var(--foreground)] md:col-span-1">
        {row.timeLines ? (
          <ul className="space-y-0.5" aria-label="Unterschiedliche Zeiten">
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

      <TrainingFacilityManagementCell
        label={row.facilityLabel}
        extraCount={row.facilityExtraCount}
        className="md:col-span-1"
      />

      <div className="flex items-center gap-2 md:col-span-1">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dotClassName)} aria-hidden="true" />
        <span className="text-sm text-[var(--foreground)]">{status.label}</span>
      </div>

      <div className="relative z-[1] flex items-center justify-end md:col-span-1">
        <TrainingSeriesRowContextMenu
          seriesId={row.seriesId}
          seriesTitle={row.title}
          wochenplanerHref={wochenplanerHref}
          resourcesHref={resourcesHref}
          canManage={canManage}
          canDelete={canDelete}
          editable={editable}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--surface-2)]/40"
        aria-hidden="true"
      />
    </article>
  );
}
