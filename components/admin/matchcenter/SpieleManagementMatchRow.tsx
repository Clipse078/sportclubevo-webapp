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
}: {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
}) {
  const homeAway = match.homeAway?.trim().toUpperCase();
  if (homeAway !== "HOME") {
    return null;
  }

  const items = buildHomeReadinessChecklist(match);

  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-2)]/30 px-3 py-2.5">
      <p className="text-[0.625rem] font-bold uppercase tracking-wide text-[var(--muted)]">
        Matchvorbereitung
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1" aria-label="Matchvorbereitung">
        {items.map((item) => (
          <li key={item.key} className="flex min-w-[8.5rem] items-start gap-1.5 text-xs">
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
        "relative flex min-w-0 flex-col gap-2.5",
        isSelecting && isSelected && "rounded-xl ring-2 ring-emerald-500/40",
      )}
      data-testid={`matchcenter-spielplanung-row-${match.id}`}
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

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1" data-testid={`matchcenter-team-matchup-${match.id}`}>
          <SceMatchCard
            model={scePresentation}
            density={cardDensity}
            fmtCfg={fmtCfg}
            linkToDetail
            testId={`matchcenter-sce-match-${match.id}`}
          />
        </div>
        {!isSelecting ? (
          <div className="relative z-[2] shrink-0 pt-1">
            <SpieleMatchRowContextMenu
              matchId={match.id}
              detailHref={detailHref}
              wochenplanerHref={wochenplanerHref}
              canManage={canManage}
            />
          </div>
        ) : null}
      </div>

      <div
        className="flex min-w-0 flex-col gap-2 border-t border-[var(--border)]/50 pt-2.5"
        data-testid={`matchcenter-action-${match.id}`}
      >
        {showReadiness ? (
          <ReadinessPill label={status.label} tone={live ? "ready" : readinessTone} />
        ) : null}
        <PreparationPanel match={match} assessment={assessment} />
      </div>
    </article>
  );
}
