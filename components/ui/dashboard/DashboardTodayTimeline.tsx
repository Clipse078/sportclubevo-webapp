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
    <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--text-2)]">{meta}</p>
  );
}

function MatchSides({
  match,
  competitionLabel,
}: {
  match: NonNullable<TodayScheduleItem["matchPresentation"]>;
  competitionLabel?: string;
}) {
  const fixtureLine = competitionLabel
    ? `${competitionLabel} — vs ${match.away.displayName}`
    : `${match.home.displayName} vs ${match.away.displayName}`;

  return (
    <div className="mt-1.5 space-y-1.5">
      <p className="text-[0.875rem] font-semibold leading-snug text-[var(--foreground)]">
        {fixtureLine}
      </p>
      <div className="flex items-center gap-2">
        <ClubLogo logoUrl={match.home.logoUrl} name={match.home.displayName} size="sm" bare />
        <p className="min-w-0 truncate text-[0.8125rem] font-medium text-[var(--text-2)]">
          {match.home.displayName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ClubLogo logoUrl={match.away.logoUrl} name={match.away.displayName} size="sm" bare />
        <p className="min-w-0 truncate text-[0.8125rem] font-medium text-[var(--text-2)]">
          {match.away.displayName}
        </p>
      </div>
    </div>
  );
}

function TournamentParticipants({
  participants,
}: {
  participants: NonNullable<TodayScheduleItem["tournamentParticipants"]>;
}) {
  const visible = participants.slice(0, 8);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visible.map((participant, index) => (
        <div
          key={`${participant.displayName}-${index}`}
          className="flex items-center"
          title={participant.displayName}
        >
          <ClubLogo
            logoUrl={participant.logoUrl}
            name={participant.displayName}
            size="sm"
            bare
          />
        </div>
      ))}
      {participants.length > visible.length && (
        <span className="px-1 text-[0.6875rem] font-medium text-[var(--muted)]">
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
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <span
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: accent }}
          >
            {isMatch ? item.typeLabel : item.competitionLabel || item.typeLabel}
          </span>

          {!isMatch && (
            <p className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
              {item.title}
            </p>
          )}

          {isMatch && item.matchPresentation && (
            <MatchSides
              match={item.matchPresentation}
              competitionLabel={item.competitionLabel}
            />
          )}

          {isTournament && item.tournamentParticipants && (
            <>
              <p className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
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
  isLast,
}: {
  item: DashboardTodayTimelineItem;
  isLast: boolean;
}) {
  const accent = getTypeAccent(item.eventType);

  const rowClassName = cn(
    "group relative grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.75rem_minmax(0,1fr)] sm:gap-x-4",
    "rounded-[var(--radius-md)] px-0.5 -mx-0.5",
    "motion-safe:transition-colors motion-safe:duration-150",
    item.href && "cursor-pointer motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_65%,transparent)]",
    !isLast && "border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] pb-3.5 mb-0",
    "pt-0",
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

      <div className="relative min-w-0 border-l-2 border-[color-mix(in_srgb,var(--border)_90%,transparent)] pl-3.5 sm:pl-4">
        <span
          className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] ring-1 ring-[color-mix(in_srgb,var(--border)_80%,transparent)]"
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
          isLast={index === items.length - 1}
        />
      ))}
    </ol>
  );
}
