"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import {
  isSceMatchRichCardDensity,
  sceMatchCenterTypographyScale,
} from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import type {
  SceActivityPresentationDensity,
  SceMatchPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";

function resolveScores(model: SceMatchPresentationModel): {
  home: string | null;
  away: string | null;
  combinedLabel: string | null;
} {
  const result = model.result;
  if (!result) {
    return { home: null, away: null, combinedLabel: null };
  }

  if (result.scoreHome != null && result.scoreAway != null) {
    const home = String(result.scoreHome);
    const away = String(result.scoreAway);
    return {
      home,
      away,
      combinedLabel: result.displayLabel?.trim() || `${home}:${away}`,
    };
  }

  const combined = result.displayLabel?.trim();
  if (!combined) {
    return { home: null, away: null, combinedLabel: null };
  }

  const split = combined.split(/[:\-–]/);
  if (split.length >= 2) {
    const home = split[0]?.trim() ?? "";
    const away = split[1]?.trim() ?? "";
    if (home && away) {
      return { home, away, combinedLabel: combined };
    }
  }

  return { home: null, away: null, combinedLabel: combined };
}

function isCompletedWithoutResult(model: SceMatchPresentationModel): boolean {
  if (model.result) {
    return false;
  }
  const lifecycle = model.matchLifecycle ?? model.status;
  return lifecycle?.semantic === "completed";
}

export type SceMatchScorePresentationProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  kickoffLabel?: string;
  className?: string;
  /** Legacy rich stacked card — single-line result typography. */
  presentation?: "reference" | "legacy-inline";
};

export function SceMatchScorePresentation({
  model,
  density,
  kickoffLabel,
  className,
  presentation = "reference",
}: SceMatchScorePresentationProps) {
  const scores = resolveScores(model);
  const centerScale = isSceMatchRichCardDensity(density)
    ? sceMatchCenterTypographyScale(density)
    : sceMatchCenterTypographyScale("STANDARD");

  if (scores.combinedLabel && scores.home != null && scores.away != null) {
    if (presentation === "legacy-inline") {
      return (
        <span
          className={cn("shrink-0 tabular-nums", centerScale.resultTextClass, className)}
          data-testid="sce-match-result"
          data-sce-match-center
          aria-label={`Ergebnis ${scores.combinedLabel}`}
        >
          {scores.combinedLabel}
        </span>
      );
    }

    return (
      <div
        className={cn(SCE_ACTIVITY_REFERENCE_LAYOUT.scoreBoxGridClass, className)}
        data-testid="sce-match-result"
        data-sce-match-center
        aria-label={`Ergebnis ${scores.combinedLabel}`}
      >
        <span className={SCE_ACTIVITY_REFERENCE_LAYOUT.scoreBoxClass} data-testid="sce-match-score-home">
          {scores.home}
        </span>
        <span className={SCE_ACTIVITY_REFERENCE_LAYOUT.scoreSeparatorClass} aria-hidden>
          :
        </span>
        <span className={SCE_ACTIVITY_REFERENCE_LAYOUT.scoreBoxClass} data-testid="sce-match-score-away">
          {scores.away}
        </span>
      </div>
    );
  }

  if (scores.combinedLabel) {
    return (
      <span
        className={cn("shrink-0 tabular-nums", centerScale.resultTextClass, className)}
        data-testid="sce-match-result"
        data-sce-match-center
        aria-label={`Ergebnis ${scores.combinedLabel}`}
      >
        {scores.combinedLabel}
      </span>
    );
  }

  if (isCompletedWithoutResult(model)) {
    return (
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums text-[var(--muted)]",
          centerScale.completedMissingResultClass,
          className,
        )}
        data-testid="sce-match-result"
        data-sce-match-center
        aria-label="Ergebnis nicht verfügbar"
      >
        –
      </span>
    );
  }

  if (kickoffLabel) {
    return (
      <span
        className={cn(SCE_ACTIVITY_REFERENCE_LAYOUT.kickoffBoxClass, className)}
        data-testid="sce-match-kickoff-box"
        data-sce-match-center
      >
        <Clock className={SCE_ACTIVITY_REFERENCE_LAYOUT.kickoffIconClass} aria-hidden />
        <span data-testid="sce-match-list-row-time">{kickoffLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={cn("shrink-0 uppercase text-[var(--muted)]", centerScale.vsTextClass, className)}
      aria-hidden
      data-testid="sce-match-vs"
      data-sce-match-region="separator"
      data-sce-match-center
    >
      VS
    </span>
  );
}
