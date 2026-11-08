"use client";

import { useCallback, useMemo, useState } from "react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import { isMatchLive } from "@/lib/matchcenter/match-lifecycle";
import { resolveSpieleStatusPresentation } from "@/lib/matchcenter/management-view";
import {
  resolveSceMatchPresentation,
  sceMatchCardOperationalDetailsPanelId,
} from "@/lib/sporting-activity-presentation/canonical";
import { buildMatchWochenplanerHref } from "@/lib/matchcenter/wochenplaner-deep-links";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import {
  SceMatchCardCollapsibleOperationalDetails,
  SceMatchCardReadinessToggle,
} from "@/components/sporting-activity/SceMatchCardCollapsibleOperationalDetails";
import { SceProgrammeActivityCardShell } from "@/components/sporting-activity/SceProgrammeActivityCardShell";
import SpieleMatchRowContextMenu from "./SpieleMatchRowContextMenu";
import SpieleManagementMatchPreparationPanel from "./SpieleManagementMatchPreparationPanel";
import { cn } from "@/lib/cn";

const LIST_ROW_CARD_CLASS = "border-0 bg-transparent p-0 shadow-none";

type Props = {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  tenantClubName?: string | null;
  canManage: boolean;
  canManageOperationalAllocations?: boolean;
  pitchHallFacilityGroups?: FacilityGroup[];
  dressingRoomFacilityGroups?: FacilityGroup[];
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

export default function SpieleManagementMatchRow({
  match,
  assessment,
  locale,
  timezone,
  tenantLogoUrl = null,
  tenantClubName = null,
  canManage,
  canManageOperationalAllocations = false,
  pitchHallFacilityGroups = [],
  dressingRoomFacilityGroups = [],
  compact = false,
  isSelecting = false,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const [pendingMatch, setPendingMatch] = useState<MatchcenterMatchSummary | null>(null);

  const handleLiveMatchChange = useCallback((next: MatchcenterMatchSummary) => {
    setPendingMatch(next);
  }, []);

  const effectiveMatch = useMemo(() => {
    if (!pendingMatch) return match;
    const serverAligned =
      (pendingMatch.operational.pitchCode ?? null) === (match.operational.pitchCode ?? null) &&
      (pendingMatch.operational.homeDressingRoomCode ?? null) ===
        (match.operational.homeDressingRoomCode ?? null) &&
      (pendingMatch.operational.awayDressingRoomCode ?? null) ===
        (match.operational.awayDressingRoomCode ?? null) &&
      pendingMatch.visibility.infoboardVisible === match.visibility.infoboardVisible;
    return serverAligned ? match : pendingMatch;
  }, [match, pendingMatch]);

  const effectiveAssessment = useMemo(
    () => assessMatchOperationalState(effectiveMatch),
    [effectiveMatch],
  );

  const detailHref = `/dashboard/matchcenter/${match.id}`;
  const status = resolveSpieleStatusPresentation(effectiveMatch, effectiveAssessment);
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
  const operationalPanelId = sceMatchCardOperationalDetailsPanelId(match.id);
  const hasCollapsiblePreparation = homeAway === "HOME";
  const canEditInlinePreparation =
    canManageOperationalAllocations &&
    pitchHallFacilityGroups.length > 0 &&
    dressingRoomFacilityGroups.length > 0;

  const fixtureCard = (
    <SceMatchCard
      model={scePresentation}
      density={cardDensity}
      fmtCfg={fmtCfg}
      linkToDetail
      surface="list-row"
      listRowPresentation="programme-fixture"
      scopeTeamId={match.teamId}
      className={LIST_ROW_CARD_CLASS}
      testId={`matchcenter-sce-match-${match.id}`}
    />
  );

  return (
    <SceProgrammeActivityCardShell
      density="STANDARD"
      testId={`matchcenter-spielplanung-row-${match.id}`}
      className={cn(
        "relative min-w-0 w-full",
        isSelecting && isSelected && "ring-2 ring-emerald-500/40",
      )}
      data-sce-matchcenter-composition={
        hasCollapsiblePreparation
          ? "collapsible-card-operations-below"
          : "stacked-card-operations-below"
      }
      data-sce-activity-card-layout="horizontal-full-width"
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

      <div className="min-w-0" data-testid={`matchcenter-team-matchup-${match.id}`}>
        {hasCollapsiblePreparation ? (
          <SceMatchCardCollapsibleOperationalDetails
            matchId={match.id}
            panelId={operationalPanelId}
            testId={`matchcenter-collapsible-${match.id}`}
            summary={fixtureCard}
            summaryControl={
              showReadiness
                ? ({ expanded, toggle, panelId }) => (
                    <SceMatchCardReadinessToggle
                      panelId={panelId}
                      expanded={expanded}
                      onToggle={toggle}
                      testId={`matchcenter-readiness-toggle-${match.id}`}
                    >
                      <ReadinessPill
                        label={status.label}
                        tone={live ? "ready" : readinessTone}
                      />
                    </SceMatchCardReadinessToggle>
                  )
                : undefined
            }
            details={
              <div data-testid={`matchcenter-action-${match.id}`}>
                <SpieleManagementMatchPreparationPanel
                  key={`${match.id}:${match.operational.pitchCode ?? ""}:${match.operational.homeDressingRoomCode ?? ""}:${match.operational.awayDressingRoomCode ?? ""}:${match.visibility.infoboardVisible ? "1" : "0"}`}
                  match={match}
                  assessment={assessment}
                  pitchHallFacilityGroups={pitchHallFacilityGroups}
                  dressingRoomFacilityGroups={dressingRoomFacilityGroups}
                  canManageOperationalAllocations={canEditInlinePreparation}
                  canManagePublication={canManage}
                  onLiveMatchChange={canEditInlinePreparation ? handleLiveMatchChange : undefined}
                />
              </div>
            }
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="min-w-0 w-full max-md:pr-8">{fixtureCard}</div>
            {showReadiness ? (
              <div data-testid={`matchcenter-action-${match.id}`}>
                <ReadinessPill label={status.label} tone={live ? "ready" : readinessTone} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SceProgrammeActivityCardShell>
  );
}
