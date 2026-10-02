"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { getMatchcenterResultLabel, isMatchLive } from "@/lib/matchcenter/match-lifecycle";
import {
  buildHomeReadinessChecklist,
  formatSpieleEndTime,
  formatSpieleKickoffForMatch,
  resolveSpieleOperationalEndTime,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { buildSpieleManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-match-presentation";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import {
  SPIELE_MATCH_ROW_INTERMEDIATE_GRID,
  SPIELE_MATCH_ROW_WIDE_GRID,
} from "./spiele-management-layout";
import { SportingActivityIdentity } from "@/components/sporting-activity/SportingActivityIdentity";
import { cn } from "@/lib/cn";

type Props = {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  canManage: boolean;
  compact?: boolean;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
};

function shouldShowReadinessPill({
  homeAway,
  statusLabel,
  live,
}: {
  homeAway: "HOME" | "AWAY" | null;
  statusLabel: string;
  live: boolean;
}): boolean {
  if (live) return true;
  if (homeAway === "AWAY" && statusLabel === "Auswärtsspiel") {
    return false;
  }
  return true;
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
    return null;
  }

  if (!isHome) {
    return layout === "wide" ? <span className="text-xs text-[var(--muted)]">—</span> : null;
  }

  const items = buildHomeReadinessChecklist(match);
  const listClass =
    layout === "wide"
      ? "mt-1.5 space-y-1"
      : "mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5";

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
              "flex items-start gap-1.5 text-xs",
              layout === "wide" && "min-w-[8.5rem] gap-2",
              layout === "compact" && "max-w-full shrink-0 basis-auto",
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

function StatusPillsRow({
  homeAway,
  statusLabel,
  live,
  readinessTone,
}: {
  homeAway: "HOME" | "AWAY" | null;
  statusLabel: string;
  live: boolean;
  readinessTone: "ready" | "open" | "neutral";
}) {
  const showReadiness = shouldShowReadinessPill({
    homeAway,
    statusLabel,
    live,
  });

  if (!showReadiness) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <ReadinessPill label={statusLabel} tone={live ? "ready" : readinessTone} />
    </div>
  );
}

export default function SpieleManagementMatchRow({
  match,
  assessment,
  locale,
  timezone,
  tenantLogoUrl = null,
  tenantClubName = null,
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

  const kickoff = formatSpieleKickoffForMatch(match, locale, timezone);
  const endTime = formatSpieleEndTime(
    resolveSpieleOperationalEndTime(match),
    locale,
    timezone,
  );

  const activityPresentation = buildSpieleManagementActivityPresentation(match, {
    tenantClubName,
  });

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

  const competitionLabel = match.competitionLabel?.trim();

  return (
    <article
      className={cn(
        "group relative grid grid-cols-1 gap-2 border-b border-[var(--border)]/60 px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--surface-2)]/40",
        SPIELE_MATCH_ROW_INTERMEDIATE_GRID,
        SPIELE_MATCH_ROW_WIDE_GRID,
        compact && "py-2",
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
        <p className="text-base font-semibold leading-none text-[var(--foreground)]">{kickoff}</p>
        {endTime && endTime !== kickoff ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{endTime}</p>
        ) : null}
      </div>

      <div className="relative z-[1] min-w-0 md:col-start-2 md:row-start-1 min-[105rem]:col-span-1">
        <Link
          href={detailHref}
          className="block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={`Details zu ${match.title} anzeigen`}
        >
          <div data-testid={`matchcenter-team-matchup-${match.id}`}>
            <SportingActivityIdentity
              presentation={activityPresentation}
              mode="management"
              primaryWrap
            />
          </div>
          {live && liveScore ? (
            <p
              className="mt-1 text-xs font-bold tabular-nums text-[var(--foreground)]"
              data-testid={`matchcenter-live-score-${match.id}`}
            >
              Ergebnis {liveScore}
            </p>
          ) : null}
          {competitionLabel ? (
            <p className="mt-1 line-clamp-1 text-[0.6875rem] text-[var(--muted)]">{competitionLabel}</p>
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
        className="relative z-[1] flex min-w-0 flex-col gap-1 md:col-span-2 md:col-start-2 md:row-start-2 min-[105rem]:col-start-3 min-[105rem]:col-span-1 min-[105rem]:row-start-1 min-[105rem]:justify-center"
        data-testid={`matchcenter-action-${match.id}`}
      >
        <StatusPillsRow
          homeAway={homeAway}
          statusLabel={status.label}
          live={live}
          readinessTone={readinessTone}
        />
      </div>

      <div className="relative z-[1] min-w-0 md:col-span-2 md:col-start-2 md:row-start-3 min-[105rem]:col-start-4 min-[105rem]:col-span-1 min-[105rem]:row-start-1">
        <PreparationColumn
          match={match}
          assessment={assessment}
          layout={compact ? "compact" : "wide"}
        />
      </div>

    </article>
  );
}
