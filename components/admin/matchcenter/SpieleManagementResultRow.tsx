"use client";

import Link from "next/link";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { getMatchcenterResultLabel } from "@/lib/matchcenter/match-lifecycle";
import { resolveClubIdentityLogoUrl } from "@/lib/matchcenter/club-identity";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import {
  formatSpieleKickoffDateShort,
  formatSpieleKickoffTime,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import {
  SPIELE_RESULT_LIST_INTERMEDIATE_GRID,
  SPIELE_RESULT_LIST_WIDE_GRID,
} from "./spiele-management-layout";
import { cn } from "@/lib/cn";

type Props = {
  match: MatchcenterMatchSummary;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  canManage: boolean;
};

const GRID = cn(
  "group relative grid min-h-[56px] grid-cols-1 gap-2 border-b border-[var(--border)]/70 px-4 py-3.5 transition-[background-color] duration-150 last:border-b-0 md:gap-x-4",
  SPIELE_RESULT_LIST_INTERMEDIATE_GRID,
  SPIELE_RESULT_LIST_WIDE_GRID,
  "min-[105rem]:items-center",
);

export default function SpieleManagementResultRow({
  match,
  locale,
  timezone,
  tenantLogoUrl = null,
  canManage,
}: Props) {
  const detailHref = `/dashboard/matchcenter/${match.id}`;
  const result = getMatchcenterResultLabel(match);
  const assessment = assessMatchOperationalState(match);
  const status = resolveSpieleStatusPresentation(match, assessment);
  const homeName = resolveMatchcenterCompactSideName(match.home);
  const awayName = resolveMatchcenterCompactSideName(match.away);
  const homeLogoUrl = resolveClubIdentityLogoUrl(match.home, tenantLogoUrl);
  const awayLogoUrl = resolveClubIdentityLogoUrl(match.away, tenantLogoUrl);
  const wochenplanerHref = buildMatchWochenplanerHref({
    startAt: match.startAt,
    teamId: match.teamId,
    timezone,
  });

  return (
    <article
      className={GRID}
      data-testid={`matchcenter-result-row-${match.id}`}
    >
      <div className="relative z-[1] text-sm tabular-nums text-[var(--foreground)] md:col-start-1 md:row-start-1">
        <p className="font-medium">
          {formatSpieleKickoffTime(match.startAt, locale, timezone)}
        </p>
        <p className="text-[0.75rem] text-[var(--muted)]">
          {formatSpieleKickoffDateShort(match.startAt, locale, timezone)}
        </p>
      </div>

      <div className="relative z-[1] min-w-0 md:col-start-2 md:row-start-1 min-[105rem]:col-span-1">
        <Link
          href={detailHref}
          className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={`Details zu ${match.title} anzeigen`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ClubLogo logoUrl={homeLogoUrl} name={homeName} size="sm" bare className="shrink-0" />
            <span
              className={cn(
                "min-w-[3.25rem] flex-1 basis-0 text-[0.875rem] leading-snug md:line-clamp-2 md:whitespace-normal min-[105rem]:truncate min-[105rem]:whitespace-nowrap",
                match.home.isOwnTeam ? "font-semibold text-[var(--foreground)]" : "text-[var(--text-2)]",
              )}
            >
              {homeName}
            </span>
            <span
              className="shrink-0 rounded-md bg-[var(--foreground)] px-2 py-0.5 text-xs font-bold tabular-nums text-white"
              data-testid={`matchcenter-result-${match.id}`}
            >
              {result ?? "–"}
            </span>
            <ClubLogo logoUrl={awayLogoUrl} name={awayName} size="sm" bare className="shrink-0" />
            <span
              className={cn(
                "min-w-[3.25rem] flex-1 basis-0 text-right text-[0.875rem] leading-snug md:line-clamp-2 md:whitespace-normal min-[105rem]:truncate min-[105rem]:whitespace-nowrap",
                match.away.isOwnTeam ? "font-semibold text-[var(--foreground)]" : "text-[var(--text-2)]",
              )}
            >
              {awayName}
            </span>
          </div>
          {match.competitionLabel ? (
            <p className="mt-1 truncate text-[0.75rem] text-[var(--muted)]">{match.competitionLabel}</p>
          ) : null}
        </Link>
      </div>

      <div
        className="relative z-[2] flex items-center justify-end md:col-start-3 md:row-start-1 min-[105rem]:col-start-5"
      >
        <SpieleMatchRowContextMenu
          matchId={match.id}
          detailHref={detailHref}
          wochenplanerHref={wochenplanerHref}
          canManage={canManage}
          showResultAction
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:col-start-2 md:row-start-2 min-[105rem]:hidden">
        <span className="line-clamp-2 break-words text-[0.8125rem] text-[var(--text-2)]">
          {match.location?.trim() || "—"}
        </span>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            status.badgeClassName,
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dotClassName)} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="hidden truncate text-[0.8125rem] text-[var(--text-2)] min-[105rem]:col-start-3 min-[105rem]:block min-[105rem]:col-span-1">
        {match.location?.trim() || "—"}
      </div>

      <div className="hidden min-[105rem]:col-start-4 min-[105rem]:block min-[105rem]:col-span-1">
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            status.badgeClassName,
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dotClassName)} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--surface-2)]/35"
        aria-hidden="true"
      />
    </article>
  );
}
