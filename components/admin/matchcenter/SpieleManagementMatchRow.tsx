"use client";

import { CheckCircle2 } from "lucide-react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { isMatchLive } from "@/lib/matchcenter/match-lifecycle";
import {
  buildHomeReadinessChecklist,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import { cn } from "@/lib/cn";
import {
  SCE_SURFACE_DENSE_PANEL,
  SCE_SURFACE_STANDARD_PANEL,
} from "@/lib/shell/sce-surface-system";

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

function PreparationPanel({
  match,
  assessment,
  openPointsLabel,
}: {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  openPointsLabel: string | null;
}) {
  const homeAway = match.homeAway?.trim().toUpperCase();
  if (homeAway !== "HOME") {
    return null;
  }

  const items = buildHomeReadinessChecklist(match);

  return (
    <div
      className={cn("min-w-0 overflow-hidden", SCE_SURFACE_DENSE_PANEL, "px-3 py-2.5")}
      data-testid="matchcenter-open-points-panel"
    >
      {openPointsLabel ? (
        <p className="text-xs font-semibold text-[var(--foreground)]">{openPointsLabel}</p>
      ) : null}
      <p
        className={cn(
          "text-[0.625rem] font-bold uppercase tracking-wide text-[var(--muted)]",
          openPointsLabel ? "mt-1.5" : undefined,
        )}
      >
        Spielvorbereitung
      </p>
      <ul className="mt-1.5 space-y-1.5" aria-label="Spielvorbereitung">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-xs">
            {item.ready ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            ) : (
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full border border-amber-500/70"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1 leading-snug">
              <span className="text-[var(--muted)]">{item.label}</span>
              {item.ready && item.value ? (
                <span className="mt-0.5 block font-medium text-[var(--text-2)]">{item.value}</span>
              ) : null}
              {!item.ready ? (
                <span className="mt-0.5 block font-medium text-[var(--text-2)]">Offen</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {assessment.teamUnresolved ? (
        <p className="mt-2 text-[0.6875rem] font-medium text-amber-600/90">Team nicht zugeordnet</p>
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

  const fmtCfg = { locale, timezone };
  const scePresentation = resolveSceMatchPresentation({
    match,
    tenantLogoUrl,
    tenantClubName,
    assessment,
    timezone,
  });

  const normalizedHomeAway = match.homeAway?.trim().toUpperCase() ?? null;
  const homeAway: "HOME" | "AWAY" | null =
    normalizedHomeAway === "HOME" || normalizedHomeAway === "AWAY"
      ? normalizedHomeAway
      : null;

  const live = isMatchLive(match);

  const readinessTone =
    status.label === "Bereit"
      ? "ready"
      : status.label.includes("offen")
        ? "open"
        : "neutral";

  const showReadiness = shouldShowReadinessPill({
    homeAway,
    statusLabel: status.label,
    live,
  });

  const cardDensity = compact ? "COMPACT" : "STANDARD";

  return (
    <article
      className={cn(
        "relative flex min-w-0 flex-col gap-2 p-2.5 sm:p-3",
        SCE_SURFACE_STANDARD_PANEL,
        isSelecting && isSelected && "ring-2 ring-emerald-500/40",
      )}
      data-testid={`matchcenter-spielplanung-row-${match.id}`}
      data-sce-matchcenter-composition="stacked-card-operations-below"
    >
      {isSelecting ? (
        <label className="relative z-[2] flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(match.id)}
            className="h-4 w-4 rounded border-[var(--border)]"
            data-testid={`spiele-select-${match.id}`}
          />
          <span className="text-xs text-[var(--muted)]">Auswählen</span>
        </label>
      ) : null}

      {!isSelecting ? (
        <div className="absolute right-2 top-2 z-[2] sm:right-3 sm:top-3">
          <SpieleMatchRowContextMenu
            matchId={match.id}
            detailHref={detailHref}
            wochenplanerHref={wochenplanerHref}
            canManage={canManage}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex flex-col gap-2.5" data-testid={`matchcenter-team-matchup-${match.id}`}>
        <div className="min-w-0 w-full max-md:pr-8">
          <SceMatchCard
            model={scePresentation}
            density={cardDensity}
            fmtCfg={fmtCfg}
            linkToDetail
            className="w-full max-w-none"
            testId={`matchcenter-sce-match-${match.id}`}
          />
        </div>

        <div
          className="flex min-w-0 flex-col gap-2 border-t border-[var(--border)]/45 pt-2.5"
          data-testid={`matchcenter-action-${match.id}`}
        >
          {showReadiness ? (
            <ReadinessPill label={status.label} tone={live ? "ready" : readinessTone} />
          ) : null}
          <PreparationPanel
            match={match}
            assessment={assessment}
            openPointsLabel={
              status.label.includes("offen") ? status.label : null
            }
          />
        </div>
      </div>
    </article>
  );
}
