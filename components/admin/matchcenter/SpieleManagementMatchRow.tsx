"use client";

import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { resolveClubIdentityLogoUrl } from "@/lib/matchcenter/club-identity";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import { getMatchcenterResultLabel, isMatchLive } from "@/lib/matchcenter/match-lifecycle";
import {
  buildHomeReadinessChecklist,
  buildSpieleTeamContextLine,
  buildSpieleVenueLine,
  formatSpieleEndTime,
  formatSpieleKickoffTime,
  resolveSpieleOperationalEndTime,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import {
  SPIELE_MATCH_ROW_INTERMEDIATE_GRID,
  SPIELE_MATCH_ROW_WIDE_GRID,
} from "./spiele-management-layout";
import { cn } from "@/lib/cn";

type Props = {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  canManage: boolean;
  compact?: boolean;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
};

const TEAM_NAME =
  "min-w-[3.25rem] flex-1 basis-0 text-sm leading-snug md:line-clamp-2 md:whitespace-normal min-[105rem]:truncate min-[105rem]:whitespace-nowrap min-[105rem]:line-clamp-none md:text-base";

function HomeAwayPill({ homeAway }: { homeAway: "HOME" | "AWAY" | null }) {
  if (!homeAway) return null;
  const isHome = homeAway === "HOME";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide",
        isHome
          ? "bg-sky-500/15 text-sky-300"
          : "bg-[var(--surface-2)] text-[var(--muted)]",
      )}
    >
      {isHome ? "Heimspiel" : "Auswärtsspiel"}
    </span>
  );
}

function ReadinessPill({ label, tone }: { label: string; tone: "ready" | "open" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
        tone === "ready" && "bg-emerald-500/15 text-emerald-400",
        tone === "open" && "bg-amber-500/15 text-amber-400",
        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--muted)]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ready" && "bg-emerald-400",
          tone === "open" && "bg-amber-400",
          tone === "neutral" && "bg-[var(--muted)]",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function PreparationColumn({
  match,
  assessment,
  layout,
}: {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  layout: "wide" | "compact";
}) {
  const homeAway = match.homeAway?.trim().toUpperCase();
  const isHome = homeAway === "HOME";
  const isAway = homeAway === "AWAY";

  if (isAway) {
    const venue = buildSpieleVenueLine(match) ?? match.location?.trim();
    if (!venue) {
      return layout === "wide" ? (
        <span className="text-xs text-[var(--muted)]">—</span>
      ) : null;
    }
    return (
      <p
        className={cn(
          "text-xs text-[var(--text-2)]",
          layout === "wide" ? "line-clamp-3 break-words" : "line-clamp-2 break-words",
        )}
      >
        {venue}
      </p>
    );
  }

  if (!isHome) {
    return layout === "wide" ? <span className="text-xs text-[var(--muted)]">—</span> : null;
  }

  const items = buildHomeReadinessChecklist(match);
  const listClass =
    layout === "wide"
      ? "mt-1.5 space-y-1"
      : "mt-1 flex flex-wrap gap-x-3 gap-y-1";

  return (
    <div className="min-w-0">
      {layout === "wide" ? (
        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-[var(--muted)]">
          Matchvorbereitung
        </p>
      ) : null}
      <ul
        className={listClass}
        aria-label="Matchvorbereitung"
      >
        {items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex min-w-[8.5rem] items-start gap-2 text-xs",
              layout === "compact" && "max-w-full flex-1 basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)]",
            )}
          >
            {item.ready ? (
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
            ) : (
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-amber-500/60"
                aria-hidden="true"
              />
            )}
            <span className="shrink-0 text-[var(--muted)]">{item.label}</span>
            <span
              className={cn(
                "min-w-0 break-words font-medium leading-snug",
                item.ready ? "text-[var(--text-2)]" : "text-amber-600/90",
              )}
            >
              {item.ready ? item.value ?? "✓" : "—"}
            </span>
          </li>
        ))}
      </ul>
      {assessment.teamUnresolved ? (
        <p className="mt-1 text-[0.6875rem] text-amber-600">Team nicht zugeordnet</p>
      ) : null}
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
  compact = false,
  isSelecting = false,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const detailHref = `/dashboard/matchcenter/${match.id}`;
  const status = resolveSpieleStatusPresentation(match, assessment);
  const wochenplanerHref = buildMatchWochenplanerHref({
    startAt: match.startAt,
    teamId: match.teamId,
    timezone,
  });

  const kickoff = formatSpieleKickoffTime(match.startAt, locale, timezone);
  const endTime = formatSpieleEndTime(
    resolveSpieleOperationalEndTime(match),
    locale,
    timezone,
  );

  const homeName = resolveMatchcenterCompactSideName(match.home);
  const awayName = resolveMatchcenterCompactSideName(match.away);
  const homeLogoUrl = resolveClubIdentityLogoUrl(match.home, tenantLogoUrl);
  const awayLogoUrl = resolveClubIdentityLogoUrl(match.away, tenantLogoUrl);
  const contextLine = buildSpieleTeamContextLine(match);
  const venueLine = buildSpieleVenueLine(match);

  const normalizedHomeAway = match.homeAway?.trim().toUpperCase() ?? null;
  const homeAway: "HOME" | "AWAY" | null =
    normalizedHomeAway === "HOME" || normalizedHomeAway === "AWAY"
      ? normalizedHomeAway
      : null;

  const live = isMatchLive(match);
  const liveScore = getMatchcenterResultLabel(match);

  const readinessTone =
    status.label === "Bereit"
      ? "ready"
      : status.label.includes("offen")
        ? "open"
        : "neutral";

  const logoSize = compact ? "md" : "lg";

  return (
    <article
      className={cn(
        "group relative grid grid-cols-1 gap-3 border-b border-[var(--border)]/50 px-4 py-4 last:border-b-0",
        SPIELE_MATCH_ROW_INTERMEDIATE_GRID,
        SPIELE_MATCH_ROW_WIDE_GRID,
        isSelecting && isSelected && "bg-emerald-500/5",
      )}
      data-testid={`matchcenter-spielplanung-row-${match.id}`}
    >
      {isSelecting ? (
        <label className="relative z-[2] flex items-center gap-2 md:col-span-3 min-[105rem]:col-span-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(match.id)}
            className="h-4 w-4 rounded border-[var(--border)]"
            data-testid={`spiele-select-${match.id}`}
          />
        </label>
      ) : null}

      <div className="relative z-[1] tabular-nums md:col-start-1 md:row-start-1 min-[105rem]:col-span-1">
        <p className="text-lg font-semibold leading-none text-[var(--foreground)]">{kickoff}</p>
        {endTime && endTime !== kickoff ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{endTime}</p>
        ) : null}
      </div>

      <div className="relative z-[1] min-w-0 md:col-start-2 md:row-start-1 min-[105rem]:col-span-1">
        <Link
          href={detailHref}
          className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={`Details zu ${match.title} anzeigen`}
        >
          {contextLine ? (
            <p className="mb-2 line-clamp-1 text-[0.6875rem] text-[var(--muted)]">{contextLine}</p>
          ) : null}

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <ClubLogo logoUrl={homeLogoUrl} name={homeName} size={logoSize} bare className="shrink-0" />
              <span
                className={cn(
                  TEAM_NAME,
                  match.home.isOwnTeam ? "font-bold text-[var(--foreground)]" : "font-semibold text-[var(--text-2)]",
                )}
              >
                {homeName}
              </span>
            </div>

            <span
              className="shrink-0 px-1 text-xs font-bold uppercase text-[var(--muted)]"
              data-testid={live && liveScore ? `matchcenter-live-score-${match.id}` : undefined}
            >
              {live && liveScore ? liveScore : "VS"}
            </span>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
              <span
                className={cn(
                  TEAM_NAME,
                  "text-right",
                  match.away.isOwnTeam ? "font-bold text-[var(--foreground)]" : "font-semibold text-[var(--text-2)]",
                )}
              >
                {awayName}
              </span>
              <ClubLogo logoUrl={awayLogoUrl} name={awayName} size={logoSize} bare className="shrink-0" />
            </div>
          </div>

          {venueLine ? (
            <p className="mt-2 flex items-start gap-1 text-xs text-[var(--muted)] md:hidden min-[105rem]:flex">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2 break-words">{venueLine}</span>
            </p>
          ) : null}

        </Link>
      </div>

      <div
        className="relative z-[2] flex items-start justify-end md:col-start-3 md:row-start-1 min-[105rem]:col-start-5 min-[105rem]:items-center"
      >
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
        className="relative z-[1] space-y-2 md:col-span-2 md:col-start-2 md:row-start-2 min-[105rem]:hidden"
        data-testid={`matchcenter-action-${match.id}`}
      >
        {venueLine ? (
          <p className="hidden items-start gap-1 text-xs text-[var(--muted)] md:flex min-[105rem]:hidden">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 break-words">{venueLine}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <HomeAwayPill homeAway={homeAway} />
          <ReadinessPill
            label={status.label}
            tone={live ? "ready" : readinessTone}
          />
        </div>
        <PreparationColumn match={match} assessment={assessment} layout="compact" />
      </div>

      <div
        className="hidden min-w-0 flex-wrap items-center gap-1.5 min-[105rem]:col-start-3 min-[105rem]:flex min-[105rem]:col-span-1"
        data-testid={`matchcenter-action-wide-${match.id}`}
      >
        <HomeAwayPill homeAway={homeAway} />
        <ReadinessPill
          label={status.label}
          tone={live ? "ready" : readinessTone}
        />
      </div>

      <div className="hidden min-w-0 min-[105rem]:col-start-4 min-[105rem]:block min-[105rem]:col-span-1">
        <PreparationColumn match={match} assessment={assessment} layout="wide" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-150 group-hover:bg-[var(--surface-2)]/25"
        aria-hidden="true"
      />
    </article>
  );
}
