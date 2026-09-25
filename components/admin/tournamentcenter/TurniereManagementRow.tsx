"use client";

import Link from "next/link";
import { Globe, MapPin, Users } from "lucide-react";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { TournamentOperationalAssessment } from "@/lib/tournaments/operational-state";
import {
  buildTournamentWochenplanerHref,
  isTenantHostedTournament,
  resolveTournamentCategoryAgeLine,
  resolveTournamentOperationalLine,
  resolveTournamentPublicationPresentation,
  resolveTournamentRowCrest,
  resolveTournamentStatusPresentation,
} from "@/lib/tournaments/management-view";
import { formatTournamentDatePresentation } from "@/lib/tournaments/presentation";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import TurniereRowContextMenu from "./TurniereRowContextMenu";
import {
  TURNIERE_ROW_INTERMEDIATE_GRID,
  TURNIERE_ROW_WIDE_GRID,
} from "./turniere-management-layout";
import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { cn } from "@/lib/cn";

type Props = {
  tournament: TournamentDto;
  assessment: TournamentOperationalAssessment;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
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

export default function TurniereManagementRow({
  tournament,
  assessment,
  locale,
  timezone,
  tenantLogoUrl = null,
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
  const crest = resolveTournamentRowCrest(tournament, tenantLogoUrl);
  const categoryLine = resolveTournamentCategoryAgeLine(tournament);
  const operationalSegments = resolveTournamentOperationalLine(tournament, timezone, locale);
  const status = resolveTournamentStatusPresentation(tournament, assessment);
  const publication = resolveTournamentPublicationPresentation(tournament);
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
      className={cn(
        "relative grid gap-3 border-b border-[var(--border)]/60 px-4 py-3 transition last:border-b-0 hover:bg-[var(--surface-2)]/40",
        TURNIERE_ROW_INTERMEDIATE_GRID,
        TURNIERE_ROW_WIDE_GRID,
        compact && "py-2",
      )}
    >
      <div
        className="flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center md:row-span-1"
        aria-hidden
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
        className="hidden shrink-0 md:block min-[105rem]:row-span-1"
        data-testid={`turniere-row-crest-${tournament.id}`}
      >
        <ClubLogo
          logoUrl={crest.logoUrl}
          name={crest.altName}
          size="md"
          bare
          className={cn("h-12 w-12", compact && "h-9 w-9")}
        />
      </div>

      <div className="min-w-0 space-y-1 md:col-span-1 min-[105rem]:col-span-1">
        <div className="flex flex-wrap items-center gap-2">
          <ActivitySceIcon activityKind="TOURNAMENT" size={compact ? 16 : 20} />
          <Link
            href={editHref}
            className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)] min-[105rem]:text-base"
          >
            {tournament.title}
          </Link>
          {isTenantHostedTournament(tournament) ? (
            <span
              className="inline-flex shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[0.625rem] font-semibold text-sky-300"
              data-testid={`turniere-own-badge-${tournament.id}`}
            >
              Eigener Verein
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-2)]">
          {categoryLine ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              <span>{categoryLine}</span>
            </span>
          ) : null}
          {tournament.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              <span className="truncate">{tournament.location}</span>
            </span>
          ) : null}
        </div>

        {!compact ? (
          <p className="text-[0.6875rem] text-[var(--muted)]">
            {operationalSegments.join("   •   ")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-row flex-wrap items-center gap-2 md:col-span-2 md:justify-end min-[105rem]:col-span-1 min-[105rem]:flex-col min-[105rem]:items-end">
        <StatusPill label={status.label} tone={status.tone} />
        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--text-2)]">
          <Globe className="h-3 w-3 opacity-70" aria-hidden="true" />
          {publication.label}
        </span>
      </div>

      <div className="flex justify-end md:row-start-1 md:col-start-4 min-[105rem]:col-start-5 min-[105rem]:row-start-1">
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
