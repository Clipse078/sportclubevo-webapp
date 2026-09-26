import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { CircleAlert, MapPin, CheckCircle2 } from "lucide-react";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { TournamentOperationalAssessment } from "@/lib/tournaments/operational-state";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import {
  formatTournamentDatePresentation,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/tournaments/presentation";
import {
  formatTournamentTeamsLabel,
  getTournamentParticipatingTeams,
} from "@/lib/tournaments/team-participation";
import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { cn } from "@/lib/cn";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  DRAFT: "outline",
  SCHEDULED: "info",
  LIVE: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
  POSTPONED: "warning",
  ARCHIVED: "outline",
};

type TournamentOperationalRowProps = {
  tournament: TournamentDto;
  assessment: TournamentOperationalAssessment;
  locale: string;
  timezone: string;
  /** When grouped by date/month, omit the large date column. */
  compactDate?: boolean;
  variant?: "upcoming" | "past";
};

export default function TournamentOperationalRow({
  tournament,
  assessment,
  locale,
  timezone,
  compactDate = false,
  variant = "upcoming",
}: TournamentOperationalRowProps) {
  const dateParts = formatTournamentDatePresentation(
    tournament.startAt,
    tournament.endAt,
    locale,
    timezone,
  );
  const statusLabel = TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status;
  const statusVariant = STATUS_VARIANTS[tournament.status] ?? "default";
  const teams = getTournamentParticipatingTeams(tournament);
  const teamSummary = formatTournamentTeamsLabel(tournament);
  const legacyTeam = tournament.team;
  const primaryTeam = teams[0] ?? legacyTeam;
  const primaryLogo = primaryTeam
    ? teams[0]
      ? tournament.participants.find((p) => p.team?.id === primaryTeam.id)?.logoUrl ?? tournament.teamLogoUrl
      : tournament.teamLogoUrl
    : null;

  const rowTestId =
    variant === "past"
      ? `tournamentcenter-archiv-row-${tournament.id}`
      : `tournamentcenter-row-${tournament.id}`;

  return (
    <article
      data-testid={rowTestId}
      className="relative grid gap-3 px-4 py-3 transition hover:bg-[var(--surface-2)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 lg:px-5"
    >
      {!compactDate ? (
        <div
          className="flex w-[3.25rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center"
          aria-hidden
        >
          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {dateParts.weekdayShort}
          </span>
          <span className="text-lg font-bold leading-none text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
            {dateParts.day}
          </span>
          <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
            {dateParts.monthShort}
          </span>
          <span className="mt-1 text-[0.65rem] font-medium tabular-nums text-[var(--foreground)]">
            {dateParts.timeLabel}
          </span>
        </div>
      ) : (
        <div className="hidden w-[4.5rem] shrink-0 sm:block">
          <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
            {dateParts.timeLabel}
          </span>
        </div>
      )}

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <ActivitySceIcon activityKind="TOURNAMENT" size={16} />
          <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
            {tournament.title}
          </h3>
          {tournament.competitionLabel ? (
            <span className="truncate text-xs text-[var(--muted)]">{tournament.competitionLabel}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-2)]">
          {primaryTeam ? (
            <span
              className="inline-flex max-w-full items-center gap-1.5"
              data-testid={
                variant === "past"
                  ? `tournament-archiv-team-${tournament.id}`
                  : `tournament-team-${tournament.id}`
              }
              title={teamSummary.allLabels.join(", ")}
            >
              <ClubLogo
                logoUrl={primaryLogo}
                name={primaryTeam.name}
                size="sm"
                bare
                className="h-4 w-4 shrink-0"
              />
              <span className="truncate font-medium text-[var(--foreground)]">
                {teamSummary.primary}
                {teamSummary.extraCount > 0 ? ` +${teamSummary.extraCount}` : ""}
              </span>
            </span>
          ) : null}

          {tournament.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <ProductDomainSceIcon name="facility" size={12} className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{tournament.location}</span>
            </span>
          ) : null}

          {tournament.organizerName ? (
            <span
              className="inline-flex min-w-0 items-center gap-1"
              data-testid={`tournament-organizer-${tournament.id}`}
            >
              <ClubLogo
                logoUrl={tournament.organizerLogoUrl}
                name={tournament.organizerName}
                size="sm"
                bare
                className="h-3.5 w-3.5 shrink-0"
              />
              <span className="truncate">{tournament.organizerName}</span>
            </span>
          ) : null}
        </div>

        {variant === "upcoming" && assessment.status === "OPEN" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[var(--sce-warning)]">
              <CircleAlert className="h-3 w-3" aria-hidden />
              {assessment.actionCount === 1
                ? "1 Angabe fehlt"
                : `${assessment.actionCount} Angaben fehlen`}
            </span>
            {assessment.actions.slice(0, 3).map((action) => (
              <Badge key={action.key} variant="warning" size="sm">
                {action.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <Badge variant={statusVariant} size="sm">
          {statusLabel}
        </Badge>
        {variant === "upcoming" && assessment.status === "READY" ? (
          <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-[var(--sce-success)]">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Bereit
          </span>
        ) : null}
      </div>

      <Link
        href={`/dashboard/tournamentcenter/${tournament.id}/edit`}
        aria-label={`Turnier ${tournament.title} öffnen`}
        className={cn(
          "absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2",
        )}
      >
        <span className="sr-only">Turnier {tournament.title} öffnen</span>
      </Link>
    </article>
  );
}
