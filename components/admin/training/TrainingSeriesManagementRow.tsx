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
  "group relative grid min-h-[56px] grid-cols-1 gap-2 border-b border-[var(--border)]/70 px-4 py-3.5 transition-[background-color] duration-150 last:border-b-0 md:grid-cols-[minmax(0,1.85fr)_minmax(7.5rem,0.9fr)_minmax(7.75rem,0.85fr)_minmax(0,1.15fr)_minmax(5.75rem,0.75fr)_2.75rem] md:items-center md:gap-x-4";

export default function TrainingSeriesManagementRow({
  row,
  wochenplanerHref,
  canManage,
  canDelete,
}: Props) {
  const singleSeries = row.seriesEntries.length === 1 ? row.seriesEntries[0] : null;
  const editable = canManage && row.status !== "ARCHIVED";
  const editHref = singleSeries ? buildTrainingSeriesEditHref(singleSeries.seriesId) : null;
  const status = trainingManagementStatusPresentation(row.status);
  const identityAccent = resolveTeamIdentityAccentClass(row.teamSeasonId);
  const timeDetails = row.timeDetailLines?.join(" · ");

  const identityBlock = (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem]",
          identityAccent,
        )}
        aria-hidden="true"
      >
        <Users className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
          {row.title}
        </p>
        <p className="truncate text-[0.8125rem] leading-snug text-[var(--text-2)]">{row.contextLabel}</p>
      </div>
    </div>
  );

  return (
    <article
      className={GRID}
      data-testid={`training-team-row-${row.teamSeasonId}`}
      data-series-id={row.seriesId}
    >
      <div className="relative z-[1] min-w-0 md:col-span-1">
        {editable && editHref ? (
          <Link
            href={editHref}
            className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            data-testid={`training-series-edit-${singleSeries!.seriesId}`}
          >
            {identityBlock}
          </Link>
        ) : (
          identityBlock
        )}
      </div>

      <TrainingWeekdayPills weekdays={row.weekdays} className="md:col-span-1" />

      <div className="text-sm tabular-nums text-[var(--foreground)] md:col-span-1">
        {timeDetails ? (
          <p title={timeDetails} aria-label={`${row.timeLabel}: ${timeDetails}`}>
            {row.timeLabel}
          </p>
        ) : (
          <p>{row.timeLabel}</p>
        )}
      </div>

      <TrainingFacilityManagementCell
        label={row.facilityLabel}
        extraCount={row.facilityExtraCount}
        className="md:col-span-1"
      />

      <div className="flex items-center md:col-span-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            status.badgeClassName,
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dotClassName)} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="relative z-[1] flex items-center justify-end md:col-span-1">
        <TrainingSeriesRowContextMenu
          teamLabel={row.teamDisplayName}
          wochenplanerHref={wochenplanerHref}
          seriesEntries={row.seriesEntries}
          canManage={canManage}
          canDelete={canDelete}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--surface-2)]/35"
        aria-hidden="true"
      />
    </article>
  );
}
