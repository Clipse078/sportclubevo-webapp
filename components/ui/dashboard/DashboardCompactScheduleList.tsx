"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { cn } from "@/lib/cn";
import {
  buildCompactSchedulePrimaryLine,
  DASHBOARD_TODAY_PREVIEW_LIMIT,
} from "@/lib/dashboard/compact-schedule-presentation";
import {
  formatTodayEventTypeBadge,
  buildTodayTournamentParticipantSummary,
} from "@/lib/dashboard/today-event-card-presentation";
import {
  MAX_VISIBLE_TOURNAMENT_LOGOS,
  sliceTournamentParticipantLogos,
} from "@/lib/dashboard/tournament-participant-logos";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";

export type DashboardCompactScheduleListProps = {
  items: DashboardTodayTimelineItem[];
  initialLimit?: number;
  viewAllHref?: string;
  emptyState?: React.ReactNode;
  className?: string;
};

function CompactMatchLogos({ item }: { item: DashboardTodayTimelineItem }) {
  const match = item.matchPresentation;
  if (!match) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1" aria-hidden="true">
      <ClubLogo logoUrl={match.home.logoUrl} name={match.home.displayName} size="sm" bare />
      <span className="text-[0.625rem] font-bold text-[var(--muted)]">vs</span>
      <ClubLogo logoUrl={match.away.logoUrl} name={match.away.displayName} size="sm" bare />
    </span>
  );
}

function CompactTournamentRow({ item }: { item: DashboardTodayTimelineItem }) {
  const participants = item.tournamentParticipants ?? [];
  const { visible, overflowCount } = sliceTournamentParticipantLogos(
    participants,
    MAX_VISIBLE_TOURNAMENT_LOGOS,
  );
  const summary = buildTodayTournamentParticipantSummary(participants.length);

  return (
    <div className="mt-0.5 min-w-0">
      <p className="truncate text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
        {item.title}
      </p>
      {item.subtitle && (
        <p className="truncate text-[0.6875rem] leading-snug text-[var(--text-2)]">{item.subtitle}</p>
      )}
      {visible.length > 0 && (
        <div className="mt-1 flex max-w-full flex-wrap items-center gap-1">
          {visible.map((participant, index) => (
            <div key={`${participant.displayName}-${index}`} title={participant.displayName}>
              <ClubLogo
                logoUrl={participant.logoUrl}
                name={participant.displayName}
                size="sm"
                bare
              />
            </div>
          ))}
          {overflowCount > 0 && (
            <span className="shrink-0 text-[0.6875rem] font-medium text-[var(--muted)]">
              +{overflowCount}
            </span>
          )}
        </div>
      )}
      {summary && (
        <p className="mt-0.5 truncate text-[0.6875rem] leading-snug text-[var(--muted)]">{summary}</p>
      )}
    </div>
  );
}

function CompactScheduleRow({ item }: { item: DashboardTodayTimelineItem }) {
  const isTournament = item.eventType === "TOURNAMENT";
  const isMatch = item.eventType === "MATCH" && item.matchPresentation;
  const primaryLine = buildCompactSchedulePrimaryLine(item);

  const rowInner = (
    <>
      <p className="w-[3.25rem] shrink-0 text-right font-mono text-[0.8125rem] font-semibold leading-snug tabular-nums text-[var(--foreground)]">
        {item.timeLabel}
      </p>
      <p
        className="w-[4.75rem] shrink-0 text-[0.625rem] font-bold uppercase leading-snug tracking-[0.08em] text-[var(--text-2)]"
        aria-hidden="true"
      >
        {formatTodayEventTypeBadge(item.typeLabel)}
      </p>
      <div className="min-w-0 flex-1">
        {isTournament ? (
          <CompactTournamentRow item={item} />
        ) : (
          <div className="flex min-w-0 items-start gap-2">
            {isMatch && <CompactMatchLogos item={item} />}
            <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-snug text-[var(--foreground)]">
              {primaryLine}
            </p>
          </div>
        )}
      </div>
      {item.href && (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors group-hover:text-[var(--sce-primary)]"
          aria-hidden="true"
        />
      )}
    </>
  );

  const rowClassName = cn(
    "group grid grid-cols-[3.25rem_4.75rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[var(--radius-md)] px-0.5 py-1.5",
    isTournament && "items-start",
    "border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] last:border-b-0",
    item.href &&
      "motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)]",
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className={cn(rowClassName, "no-underline")}>
          {rowInner}
        </Link>
      </li>
    );
  }

  return <li className={rowClassName}>{rowInner}</li>;
}

export function DashboardCompactScheduleList({
  items,
  initialLimit = DASHBOARD_TODAY_PREVIEW_LIMIT,
  viewAllHref = "/dashboard/planner/day",
  emptyState,
  className,
}: DashboardCompactScheduleListProps) {
  const visibleItems = useMemo(
    () => items.slice(0, initialLimit),
    [initialLimit, items],
  );

  const hiddenCount = Math.max(0, items.length - initialLimit);

  if (items.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <DashboardEmptyState
            title="Heute ist nichts geplant"
            description="Trainings, Spiele und Veranstaltungen erscheinen hier kompakt."
          />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <ol className="min-w-0" aria-label="Kompakter Tagesplan">
        {visibleItems.map((item) => (
          <CompactScheduleRow key={item.key} item={item} />
        ))}
      </ol>
      {hiddenCount > 0 && (
        <Link
          href={viewAllHref}
          className="mt-1 inline-flex text-[0.8125rem] font-medium text-[var(--sce-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        >
          Alle {items.length} anzeigen →
        </Link>
      )}
    </div>
  );
}
