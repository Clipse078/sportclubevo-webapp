import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { cn } from "@/lib/cn";
import {
  buildTodayMatchMetaLine,
  buildTodayTournamentParticipantSummary,
  formatTodayEventTypeBadge,
} from "@/lib/dashboard/today-event-card-presentation";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";

const CARD_BASE = cn(
  "group relative block rounded-[var(--radius-lg)] border",
  "border-[color-mix(in_srgb,var(--border)_78%,transparent)]",
  "bg-[color-mix(in_srgb,var(--surface)_88%,var(--surface-2)_12%)]",
  "p-3 sm:p-3.5",
  "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-150",
  "focus-within:ring-2 focus-within:ring-[var(--sce-primary)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)]",
);

const CARD_INTERACTIVE = cn(
  CARD_BASE,
  "motion-safe:hover:border-[color-mix(in_srgb,var(--sce-primary)_28%,var(--border))]",
  "motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_72%,var(--surface)_28%)]",
  "motion-safe:hover:shadow-[var(--shadow-xs)]",
);

function EventTimeBadge({
  timeLabel,
  endTimeLabel,
  typeLabel,
  accent,
}: {
  timeLabel: string;
  endTimeLabel?: string;
  typeLabel: string;
  accent: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-start">
      <p className="font-mono text-[0.875rem] font-semibold tabular-nums leading-none text-[var(--foreground)]">
        {timeLabel}
      </p>
      {endTimeLabel && (
        <p className="mt-1 font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]">
          {endTimeLabel}
        </p>
      )}
      <span
        className="mt-1.5 inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: accent }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        {formatTodayEventTypeBadge(typeLabel)}
      </span>
    </div>
  );
}

function TournamentTimeBadge({
  timeLabel,
  endTimeLabel,
  typeLabel,
  accent,
}: {
  timeLabel: string;
  endTimeLabel?: string;
  typeLabel: string;
  accent: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-start">
      <p className="font-mono text-[0.875rem] font-semibold tabular-nums leading-none text-[var(--foreground)]">
        {timeLabel}
      </p>
      {endTimeLabel && (
        <p className="mt-1 font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]">
          {endTimeLabel}
        </p>
      )}
      <span
        className="mt-1.5 inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: accent }}
      >
        <Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />
        {formatTodayEventTypeBadge(typeLabel)}
      </span>
    </div>
  );
}

export function DashboardTodayMatchCard({ item }: { item: DashboardTodayTimelineItem }) {
  const match = item.matchPresentation!;
  const { competition, location } = buildTodayMatchMetaLine({
    competitionLabel: item.competitionLabel,
    meta: item.meta,
  });

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <EventTimeBadge
          timeLabel={item.timeLabel}
          endTimeLabel={item.endTimeLabel}
          typeLabel={item.typeLabel}
          accent="var(--sce-secondary)"
        />

        {item.href && (
          <ChevronRight
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:group-hover:text-[var(--sce-primary)]"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <ClubLogo
            logoUrl={match.home.logoUrl}
            name={match.home.displayName}
            size="md"
            bare
          />
          <p className="w-full truncate text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
            {match.home.displayName}
          </p>
        </div>

        <p
          className="px-0.5 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[var(--text-2)]"
          aria-hidden="true"
        >
          VS
        </p>

        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <ClubLogo
            logoUrl={match.away.logoUrl}
            name={match.away.displayName}
            size="md"
            bare
          />
          <p className="w-full truncate text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
            {match.away.displayName}
          </p>
        </div>
      </div>

      {(competition || location) && (
        <div className="mt-2.5 space-y-0.5 text-center">
          {competition && (
            <p className="text-[0.75rem] font-medium text-[var(--text-2)]">{competition}</p>
          )}
          {location && (
            <p className="text-[0.6875rem] leading-relaxed text-[var(--muted)]">{location}</p>
          )}
        </div>
      )}
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(CARD_INTERACTIVE, "no-underline text-inherit")}
          aria-label={`Spiel ${match.home.displayName} gegen ${match.away.displayName} um ${item.timeLabel}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className={CARD_BASE} aria-label={`Spiel ${match.home.displayName} gegen ${match.away.displayName}`}>
      {content}
    </li>
  );
}

export function DashboardTodayTournamentCard({ item }: { item: DashboardTodayTimelineItem }) {
  const participants = item.tournamentParticipants ?? [];
  const visibleParticipants = participants.slice(0, 6);
  const participantSummary = buildTodayTournamentParticipantSummary(participants.length);
  const accent = "var(--sce-warning)";

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            backgroundColor: "color-mix(in srgb, var(--sce-warning) 14%, transparent)",
            color: accent,
          }}
          aria-hidden="true"
        >
          <Trophy className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
        <TournamentTimeBadge
          timeLabel={item.timeLabel}
          endTimeLabel={item.endTimeLabel}
          typeLabel={item.typeLabel}
          accent={accent}
        />

            {item.href && (
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:group-hover:text-[var(--sce-primary)]"
                aria-hidden="true"
              />
            )}
          </div>

          <p className="mt-2 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
            {item.title}
          </p>

          {item.subtitle && (
            <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{item.subtitle}</p>
          )}

          {visibleParticipants.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {visibleParticipants.map((participant, index) => (
                <div
                  key={`${participant.displayName}-${index}`}
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
              {participants.length > visibleParticipants.length && (
                <span className="px-1 text-[0.6875rem] font-medium text-[var(--muted)]">
                  +{participants.length - visibleParticipants.length}
                </span>
              )}
            </div>
          )}

          {(item.meta || participantSummary) && (
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--muted)]">
              {[item.meta, participantSummary].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(CARD_INTERACTIVE, "no-underline text-inherit")}
          aria-label={`Turnier ${item.title} um ${item.timeLabel}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className={CARD_BASE} aria-label={`Turnier ${item.title}`}>
      {content}
    </li>
  );
}
