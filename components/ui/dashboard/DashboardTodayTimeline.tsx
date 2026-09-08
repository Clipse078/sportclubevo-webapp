import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { DashboardEmptyState } from "./DashboardEmptyState";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

export type DashboardTodayTimelineItem = TodayScheduleItem & {
  href?: string;
};

export type DashboardTodayTimelineProps = {
  items: DashboardTodayTimelineItem[];
  emptyState?: React.ReactNode;
  compact?: boolean;
  className?: string;
};

function getTypeAccent(type?: TodayScheduleItem["eventType"]): string {
  switch (type) {
    case "MATCH":
      return "var(--sce-secondary)";
    case "TRAINING":
      return "var(--sce-info)";
    case "TOURNAMENT":
      return "var(--sce-warning)";
    case "MEETING":
      return "var(--sce-primary)";
    default:
      return "var(--text-2)";
  }
}

function MetaLine({ meta }: { meta: string }) {
  return (
    <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--text-2)]">{meta}</p>
  );
}

function MatchSides({
  match,
}: {
  match: NonNullable<TodayScheduleItem["matchPresentation"]>;
}) {
  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <ClubLogo logoUrl={match.home.logoUrl} name={match.home.displayName} size="sm" bare />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-[var(--foreground)]">
            {match.home.displayName}
          </p>
        </div>
      </div>
      <p className="pl-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        vs
      </p>
      <div className="flex items-center gap-2.5">
        <ClubLogo logoUrl={match.away.logoUrl} name={match.away.displayName} size="sm" bare />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-[var(--foreground)]">
            {match.away.displayName}
          </p>
        </div>
      </div>
    </div>
  );
}

function TournamentParticipants({
  participants,
}: {
  participants: NonNullable<TodayScheduleItem["tournamentParticipants"]>;
}) {
  const visible = participants.slice(0, 6);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {visible.map((participant, index) => (
        <div
          key={`${participant.displayName}-${index}`}
          className="flex min-w-0 max-w-[calc(50%-0.25rem)] items-center gap-1.5 sm:max-w-[calc(33.333%-0.35rem)]"
        >
          <ClubLogo
            logoUrl={participant.logoUrl}
            name={participant.displayName}
            size="sm"
            bare
          />
          <span className="truncate text-[0.75rem] font-medium text-[var(--text-2)]">
            {participant.displayName}
          </span>
        </div>
      ))}
      {participants.length > visible.length && (
        <span className="text-[0.6875rem] text-[var(--muted)]">
          +{participants.length - visible.length}
        </span>
      )}
    </div>
  );
}

function TimelineContent({
  item,
  accent,
}: {
  item: DashboardTodayTimelineItem;
  accent: string;
}) {
  const isMatch = item.eventType === "MATCH" && item.matchPresentation;
  const isTournament =
    item.eventType === "TOURNAMENT" &&
    item.tournamentParticipants &&
    item.tournamentParticipants.length > 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: accent }}
          >
            {item.competitionLabel || item.typeLabel}
          </span>

          {!isMatch && (
            <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)] sm:text-base">
              {item.title}
            </p>
          )}

          {isMatch && item.matchPresentation && (
            <MatchSides match={item.matchPresentation} />
          )}

          {isTournament && item.tournamentParticipants && (
            <>
              <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)] sm:text-base">
                {item.title}
              </p>
              <TournamentParticipants participants={item.tournamentParticipants} />
            </>
          )}

          {!isMatch && !isTournament && item.subtitle && (
            <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{item.subtitle}</p>
          )}

          {item.meta && <MetaLine meta={item.meta} />}
        </div>

        {item.href && (
          <ChevronRight
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

function TimelineRow({
  item,
  compact,
  isLast,
}: {
  item: DashboardTodayTimelineItem;
  compact?: boolean;
  isLast: boolean;
}) {
  const accent = getTypeAccent(item.eventType);

  const rowClassName = cn(
    "group relative grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4.25rem_minmax(0,1fr)]",
    "rounded-[var(--radius-lg)] px-1 -mx-1",
    "motion-safe:transition-colors motion-safe:duration-150",
    item.href && "motion-safe:hover:bg-[var(--surface-2)]/70",
    !isLast && "border-b border-[var(--border)]/80 pb-4",
    !isLast && (compact ? "mb-0" : "mb-0"),
    isLast ? (compact ? "pb-0" : "pb-0") : undefined,
    compact ? "pt-0" : "pt-0",
  );

  const inner = (
    <>
      <div className="pt-0.5 text-right">
        <p className="font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--foreground)]">
          {item.timeLabel}
        </p>
        {item.endTimeLabel && (
          <p className="mt-0.5 font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]">
            {item.endTimeLabel}
          </p>
        )}
      </div>

      <div className="relative min-w-0 border-l-2 border-[var(--border)] pl-4 sm:pl-5">
        <span
          className="absolute -left-[6px] top-2 h-3 w-3 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)]"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        <TimelineContent item={item} accent={accent} />
      </div>
    </>
  );

  if (item.href) {
    return (
      <li className={rowClassName}>
        <Link href={item.href} className="contents no-underline">
          {inner}
        </Link>
      </li>
    );
  }

  return <li className={rowClassName}>{inner}</li>;
}

/**
 * Premium operational timeline for today's club schedule.
 */
export function DashboardTodayTimeline({
  items,
  emptyState,
  compact = false,
  className,
}: DashboardTodayTimelineProps) {
  if (items.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <DashboardEmptyState
            title="Heute ist nichts geplant"
            description="Trainings, Spiele und Veranstaltungen erscheinen hier, sobald sie im Kalender erfasst sind."
          />
        )}
      </div>
    );
  }

  return (
    <ol className={cn("relative", className)} aria-label="Heutiger Tagesplan">
      {items.map((item, index) => (
        <TimelineRow
          key={item.key}
          item={item}
          compact={compact}
          isLast={index === items.length - 1}
        />
      ))}
    </ol>
  );
}
