"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { TournamentOperationalAssessment } from "@/lib/tournaments/operational-state";
import {
  buildTournamentWochenplanerHref,
  resolveTournamentPublicationPresentation,
  resolveTournamentStatusPresentation,
} from "@/lib/tournaments/management-view";
import { formatTournamentDatePresentation } from "@/lib/tournaments/presentation";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { resolveSceTournamentPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/tournament";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { buildSceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/status";
import type { SceTournamentPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import {
  formatFixtureDateLine,
  formatFixtureTime,
} from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import TurniereRowContextMenu from "./TurniereRowContextMenu";
import {
  TURNIERE_ROW_ACTION_CELL,
  TURNIERE_ROW_CONTEXT_CELL,
  TURNIERE_ROW_DATE_CELL,
  TURNIERE_ROW_IDENTITY_CELL,
  TURNIERE_ROW_INTERMEDIATE_GRID,
  TURNIERE_ROW_WIDE_GRID,
} from "./turniere-management-layout";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { cn } from "@/lib/cn";

type Props = {
  tournament: TournamentDto;
  assessment: TournamentOperationalAssessment;
  locale: string;
  timezone: string;
  tenantClubName?: string | null;
  canManage: boolean;
  compact?: boolean;
  variant?: "upcoming" | "past";
};

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
        tone === "planned" && "bg-emerald-500/15 text-emerald-400",
        tone === "preparation" && "bg-sky-500/15 text-sky-300",
        tone === "live" && "bg-emerald-500/20 text-emerald-300",
        tone === "danger" && "bg-red-500/15 text-red-400",
        tone === "warning" && "bg-amber-500/15 text-amber-400",
        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--muted)]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "planned" && "bg-emerald-400",
          tone === "preparation" && "bg-sky-400",
          tone === "live" && "bg-emerald-300",
          tone === "danger" && "bg-red-400",
          tone === "warning" && "bg-amber-400",
          tone === "neutral" && "bg-[var(--muted)]",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function resolveRowLocationLine(model: SceTournamentPresentationModel): string | undefined {
  const stripped = { ...model.location, hostOrOrganiser: undefined };
  return formatSceActivityLocationHierarchy(stripped, { includeHostClub: false }) || undefined;
}

function TurniereRowContextZone({
  model,
  locale,
  timezone,
  statusLabel,
  statusTone,
  publicationLabel,
}: {
  model: SceTournamentPresentationModel;
  locale: string;
  timezone: string;
  statusLabel: string;
  statusTone: string;
  publicationLabel: string;
}) {
  const fmtCfg = { locale, timezone };
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;
  const dateLine = formatFixtureDateLine(startAt, fmtCfg);
  const timeLine =
    formatSportingActivityTimeRange({
      startLabel: formatFixtureTime(startAt, fmtCfg),
      endLabel: endAt ? formatFixtureTime(endAt, fmtCfg) : undefined,
    }) ?? formatFixtureTime(startAt, fmtCfg);
  const locationLine = resolveRowLocationLine(model);

  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-testid="turniere-row-context-zone"
      data-sce-tournament-list-row-context
    >
      <div className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text-2)]">
        <p className="inline-flex min-w-0 items-center gap-1.5 font-medium" data-testid="turniere-row-context-date">
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 truncate">{dateLine}</span>
        </p>
        <p className="inline-flex min-w-0 items-center gap-1.5 font-mono tabular-nums" data-testid="turniere-row-context-time">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span>{timeLine}</span>
        </p>
        {locationLine ? (
          <p
            className="inline-flex min-w-0 items-start gap-1.5 text-[color-mix(in_srgb,var(--sce-info)_55%,var(--text-2)_45%)]"
            data-testid="turniere-row-context-location"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="min-w-0 line-clamp-2">{locationLine}</span>
          </p>
        ) : null}
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="turniere-row-status-zone"
        data-sce-tournament-list-row-status
      >
        <StatusPill label={statusLabel} tone={statusTone} />
        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--text-2)]">
          <ProductDomainSceIcon name="website" size={12} className="h-3 w-3 opacity-70" />
          {publicationLabel}
        </span>
      </div>
    </div>
  );
}

export default function TurniereManagementRow({
  tournament,
  assessment,
  locale,
  timezone,
  tenantClubName = null,
  canManage,
  compact = false,
  variant = "upcoming",
}: Props) {
  const dateParts = formatTournamentDatePresentation(
    tournament.startAt,
    tournament.endAt,
    locale,
    timezone,
  );
  const status = resolveTournamentStatusPresentation(tournament, assessment);
  const publication = resolveTournamentPublicationPresentation(tournament);
  const sceTournamentPresentation = resolveSceTournamentPresentation({
    tournament,
    tenantClubName,
  });
  const presentationWithStatus = status.label
    ? {
        ...sceTournamentPresentation,
        status: buildSceActivityPresentationStatus({
          domain: tournament.status,
          label: status.label,
        }),
      }
    : sceTournamentPresentation;
  const editHref = `/dashboard/tournamentcenter/${tournament.id}/edit`;
  const wochenplanerHref = buildTournamentWochenplanerHref({
    startAt: tournament.startAt,
    teamId: tournament.team?.id ?? tournament.participants.find((p) => p.team)?.team?.id,
    timezone,
  });

  const rowTestId =
    variant === "past"
      ? `turniere-archiv-row-${tournament.id}`
      : `turniere-row-${tournament.id}`;

  return (
    <article
      data-testid={rowTestId}
      data-sce-tournament-list-row
      className={cn(
        "relative grid gap-3 border-b border-[var(--border)]/60 px-4 py-3 transition last:border-b-0 hover:bg-[var(--surface-2)]/40",
        TURNIERE_ROW_INTERMEDIATE_GRID,
        TURNIERE_ROW_WIDE_GRID,
        compact && "py-2",
      )}
    >
      <div
        className={cn(
          "flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center",
          TURNIERE_ROW_DATE_CELL,
        )}
        aria-hidden
        data-testid="turniere-row-date-block"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {dateParts.weekdayShort}
        </span>
        <span
          className="text-xl font-bold leading-none text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {dateParts.day}
        </span>
        <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
          {dateParts.monthShort}
        </span>
      </div>

      <div
        className={cn("relative z-[1] min-w-0", TURNIERE_ROW_IDENTITY_CELL)}
        data-testid={`turniere-row-identity-${tournament.id}`}
      >
        <SceTournamentCard
          model={presentationWithStatus}
          density="COMPACT"
          fmtCfg={{ locale, timezone }}
          linkToDetail={false}
          showStatus={false}
          surface="list-row"
          testId={`turniere-sce-card-${tournament.id}`}
        />
      </div>

      <div className={cn(TURNIERE_ROW_CONTEXT_CELL)}>
        <TurniereRowContextZone
          model={presentationWithStatus}
          locale={locale}
          timezone={timezone}
          statusLabel={status.label}
          statusTone={status.tone}
          publicationLabel={publication.label}
        />
      </div>

      <div className={cn(TURNIERE_ROW_ACTION_CELL)}>
        <TurniereRowContextMenu
          tournamentId={tournament.id}
          editHref={editHref}
          wochenplanerHref={wochenplanerHref}
          canManage={canManage}
        />
      </div>

      <Link
        href={editHref}
        aria-label={`Turnier ${tournament.title} öffnen`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
      >
        <span className="sr-only">Turnier {tournament.title} öffnen</span>
      </Link>
    </article>
  );
}
