import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { cn } from "@/lib/cn";
import {
  buildTodayTournamentParticipantSummary,
  formatTodayEventTypeBadge,
} from "@/lib/dashboard/today-event-card-presentation";
import { DashboardVenueMetadata } from "./DashboardVenueMetadata";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";
import type { CommandCenterClubSide } from "@/lib/dashboard/command-center-presentation";

const MATCH_ACCENT = "var(--sce-secondary)";
const TOURNAMENT_ACCENT = "#a5b4fc";
const TOURNAMENT_ACCENT_BG = "rgba(129, 140, 248, 0.16)";

const CARD_BASE = cn(
  "group relative block rounded-[var(--radius-lg)] border",
  "border-[color-mix(in_srgb,var(--border)_78%,transparent)]",
  "bg-[color-mix(in_srgb,var(--surface)_88%,var(--surface-2)_12%)]",
  "px-3 py-2.5 sm:px-4 sm:py-3",
  "motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-150",
  "focus-within:ring-2 focus-within:ring-[var(--sce-primary)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)]",
);

const CARD_INTERACTIVE = cn(
  CARD_BASE,
  "motion-safe:hover:border-[color-mix(in_srgb,var(--sce-primary)_28%,var(--border))]",
  "motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_72%,var(--surface)_28%)]",
  "motion-safe:hover:shadow-[var(--shadow-xs)]",
);

function EventTypeBadge({
  typeLabel,
  accent,
  icon,
}: {
  typeLabel: string;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em]"
      style={{
        color: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
      }}
    >
      {icon}
      {formatTodayEventTypeBadge(typeLabel)}
    </span>
  );
}

function EventTimeHeader({
  timeLabel,
  endTimeLabel,
  typeLabel,
  accent,
  typeIcon,
  trailing,
  competition,
}: {
  timeLabel: string;
  endTimeLabel?: string;
  typeLabel: string;
  accent: string;
  typeIcon?: ReactNode;
  trailing?: React.ReactNode;
  competition?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-mono text-base font-bold tabular-nums leading-none text-[var(--foreground)] sm:text-[1.0625rem]">
          {timeLabel}
        </p>
        <EventTypeBadge typeLabel={typeLabel} accent={accent} icon={typeIcon} />
        {endTimeLabel && (
          <p className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]">
            bis {endTimeLabel}
          </p>
        )}
        {competition && (
          <p className="min-w-0 truncate text-[0.75rem] font-semibold text-[var(--text-2)] sm:max-w-[14rem]">
            {competition}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}

function FixtureSide({
  side,
  align = "start",
}: {
  side: CommandCenterClubSide;
  align?: "start" | "end";
}) {
  const primary = side.clubLine ?? side.displayName;
  const secondary = side.teamLine;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "end" && "flex-row-reverse text-right",
      )}
    >
      <ClubLogo
        logoUrl={side.logoUrl}
        name={side.displayName}
        size="md"
        bare
      />
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-bold leading-snug text-[var(--foreground)] sm:text-[0.875rem]">
          {primary}
        </p>
        {secondary && (
          <p className="truncate text-[0.6875rem] font-medium leading-snug text-[var(--text-2)]">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardTodayMatchCard({ item }: { item: DashboardTodayTimelineItem }) {
  const match = item.matchPresentation!;
  const competition = item.competitionLabel?.trim() || match.competitionLabel?.trim();
  const venueGroups = item.venuePresentation?.groups ?? [];

  const content = (
    <>
      <EventTimeHeader
        timeLabel={item.timeLabel}
        endTimeLabel={item.endTimeLabel}
        typeLabel={item.typeLabel}
        accent={MATCH_ACCENT}
        competition={competition}
        trailing={
          item.href ? (
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:group-hover:text-[var(--sce-primary)]"
              aria-hidden="true"
            />
          ) : undefined
        }
      />

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <FixtureSide side={match.home} />

        <p
          className="self-center px-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-xs"
          aria-hidden="true"
        >
          VS
        </p>

        <FixtureSide side={match.away} align="end" />
      </div>

      {venueGroups.length > 0 && (
        <div className="mt-2 border-t border-[color-mix(in_srgb,var(--border)_85%,transparent)] pt-2">
          <DashboardVenueMetadata groups={venueGroups} compact />
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
  const venueGroups = item.venuePresentation?.groups ?? [];

  const content = (
    <div className="flex items-start gap-2.5">
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{
          backgroundColor: TOURNAMENT_ACCENT_BG,
          color: TOURNAMENT_ACCENT,
        }}
        aria-hidden="true"
      >
        <Trophy className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <EventTimeHeader
          timeLabel={item.timeLabel}
          endTimeLabel={item.endTimeLabel}
          typeLabel={item.typeLabel}
          accent={TOURNAMENT_ACCENT}
          typeIcon={<Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />}
          trailing={
            item.href ? (
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:group-hover:text-[var(--sce-primary)]"
                aria-hidden="true"
              />
            ) : undefined
          }
        />

        <p className="mt-1.5 text-[0.9375rem] font-bold leading-snug text-[var(--foreground)] sm:text-base">
          {item.title}
        </p>

        {item.subtitle && (
          <p className="mt-0.5 text-[0.75rem] font-medium text-[var(--text-2)]">{item.subtitle}</p>
        )}

        {visibleParticipants.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
              <span className="px-0.5 text-[0.6875rem] font-medium text-[var(--muted)]">
                +{participants.length - visibleParticipants.length}
              </span>
            )}
          </div>
        )}

        {(participantSummary || venueGroups.length > 0) && (
          <div className="mt-2 space-y-1.5 border-t border-[color-mix(in_srgb,var(--border)_85%,transparent)] pt-2">
            {participantSummary && (
              <p className="text-[0.6875rem] font-medium text-[var(--text-2)]">
                {participantSummary}
              </p>
            )}
            {venueGroups.length > 0 && <DashboardVenueMetadata groups={venueGroups} compact />}
          </div>
        )}
      </div>
    </div>
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
