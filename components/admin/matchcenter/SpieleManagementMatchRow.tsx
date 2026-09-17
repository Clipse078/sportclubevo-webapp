"use client";

import Link from "next/link";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { resolveClubIdentityLogoUrl } from "@/lib/matchcenter/club-identity";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import { getMatchcenterResultLabel, isMatchLive } from "@/lib/matchcenter/match-lifecycle";
import {
  buildHomeResourceDetailLine,
  formatSpieleKickoffDateShort,
  formatSpieleKickoffTime,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import { cn } from "@/lib/cn";

type Props = {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  canManage: boolean;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
};

const GRID =
  "group relative grid min-h-[56px] grid-cols-1 gap-2 border-b border-[var(--border)]/70 px-4 py-3.5 transition-[background-color] duration-150 last:border-b-0 md:grid-cols-[minmax(5.5rem,0.55fr)_minmax(0,1.85fr)_minmax(0,1fr)_minmax(5.75rem,0.85fr)_3rem] md:items-center md:gap-x-4";

function MatchupStack({
  match,
  tenantLogoUrl,
}: {
  match: MatchcenterMatchSummary;
  tenantLogoUrl?: string | null;
}) {
  const homeName = resolveMatchcenterCompactSideName(match.home);
  const awayName = resolveMatchcenterCompactSideName(match.away);
  const homeLogoUrl = resolveClubIdentityLogoUrl(match.home, tenantLogoUrl);
  const awayLogoUrl = resolveClubIdentityLogoUrl(match.away, tenantLogoUrl);
  const live = isMatchLive(match);
  const liveScore = getMatchcenterResultLabel(match);

  const renderSide = (
    side: typeof match.home,
    name: string,
    logoUrl: string | null,
  ) => (
    <div className="flex min-w-0 items-center gap-2">
      <ClubLogo logoUrl={logoUrl} name={name} size="sm" bare className="shrink-0" />
      <span
        className={cn(
          "min-w-0 truncate text-[0.875rem] leading-tight",
          side.isOwnTeam
            ? "font-semibold text-[var(--foreground)]"
            : "text-[var(--text-2)]",
        )}
      >
        {name}
      </span>
    </div>
  );

  return (
    <div className="min-w-0 space-y-1">
      {renderSide(match.home, homeName, homeLogoUrl)}
      <div className="flex items-center gap-2 pl-0.5">
        <span
          className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]"
          data-testid={live && liveScore ? `matchcenter-live-score-${match.id}` : undefined}
        >
          {live && liveScore ? liveScore : "vs"}
        </span>
        {match.competitionLabel ? (
          <span className="truncate text-[0.75rem] text-[var(--muted)]">
            {match.competitionLabel}
          </span>
        ) : null}
      </div>
      {renderSide(match.away, awayName, awayLogoUrl)}
    </div>
  );
}

export default function SpieleManagementMatchRow({
  match,
  assessment,
  locale,
  timezone,
  tenantLogoUrl = null,
  canManage,
  isSelecting = false,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const detailHref = `/dashboard/matchcenter/${match.id}`;
  const status = resolveSpieleStatusPresentation(match, assessment);
  const resourceLine =
    status.detailLine ?? buildHomeResourceDetailLine(match);
  const wochenplanerHref = buildMatchWochenplanerHref({
    startAt: match.startAt,
    teamId: match.teamId,
    timezone,
  });

  const dateShort = formatSpieleKickoffDateShort(match.startAt, locale, timezone);
  const timeLabel = formatSpieleKickoffTime(match.startAt, locale, timezone);

  return (
    <article
      className={cn(GRID, isSelecting && isSelected && "bg-emerald-500/5")}
      data-testid={`matchcenter-spielplanung-row-${match.id}`}
    >
      {isSelecting ? (
        <label className="relative z-[2] flex items-center gap-2 md:col-span-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(match.id)}
            className="h-4 w-4 rounded border-[var(--border)]"
            data-testid={`spiele-select-${match.id}`}
          />
        </label>
      ) : null}

      <div className="relative z-[1] text-sm tabular-nums text-[var(--foreground)] md:col-span-1">
        <p className="font-medium">{timeLabel}</p>
        <p className="text-[0.75rem] text-[var(--muted)]">{dateShort}</p>
      </div>

      <div className="relative z-[1] min-w-0 md:col-span-1">
        <Link
          href={detailHref}
          className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={`Details zu ${match.title} anzeigen`}
        >
          <MatchupStack match={match} tenantLogoUrl={tenantLogoUrl} />
        </Link>
      </div>

      <div className="text-[0.8125rem] leading-snug text-[var(--text-2)] md:col-span-1">
        {resourceLine ? <p className="truncate">{resourceLine}</p> : <span className="text-[var(--muted)]">—</span>}
      </div>

      <div
        className="flex flex-col gap-0.5 md:col-span-1"
        data-testid={`matchcenter-action-${match.id}`}
      >
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            status.badgeClassName,
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dotClassName)} aria-hidden="true" />
          {status.label}
        </span>
        {assessment.teamUnresolved ? (
          <span className="text-[0.75rem] text-amber-700">Team nicht zugeordnet</span>
        ) : null}
      </div>

      <div className="relative z-[2] flex items-center justify-end md:col-span-1">
        {!isSelecting ? (
          <SpieleMatchRowContextMenu
            matchId={match.id}
            detailHref={detailHref}
            wochenplanerHref={wochenplanerHref}
            canManage={canManage}
          />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--surface-2)]/35"
        aria-hidden="true"
      />
    </article>
  );
}
