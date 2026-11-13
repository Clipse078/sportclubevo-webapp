import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "./activity-card-reference-layout";

/**
 * SCE-MATCH-UX-01 — subtle winner/loser emphasis for numeric match scores.
 *
 * Winner numerals read slightly darker; loser slightly lighter; draws stay identical.
 * Does not change score resolution, fixture orientation, or lifecycle semantics.
 */
export type MatchScoreSideEmphasis = "winner" | "loser" | "neutral";

export type ResolvedNumericMatchScore = {
  home: number;
  away: number;
};

export function resolveNumericMatchScore(
  scoreHome: number | null | undefined,
  scoreAway: number | null | undefined,
): ResolvedNumericMatchScore | null {
  if (scoreHome == null || scoreAway == null) {
    return null;
  }
  if (!Number.isFinite(scoreHome) || !Number.isFinite(scoreAway)) {
    return null;
  }
  return { home: scoreHome, away: scoreAway };
}

export function resolveMatchScoreSideEmphasis(
  scores: ResolvedNumericMatchScore,
  side: "home" | "away",
): MatchScoreSideEmphasis {
  const { home, away } = scores;
  if (home === away) {
    return "neutral";
  }
  const homeWins = home > away;
  if (side === "home") {
    return homeWins ? "winner" : "loser";
  }
  return homeWins ? "loser" : "winner";
}

const SCE_MATCH_SCORE_EMPHASIS_MODIFIER: Record<MatchScoreSideEmphasis, string> = {
  winner:
    "text-[var(--sce-match-result-foreground-winner)] border-[color-mix(in_srgb,var(--sce-color-border-strong)_68%,var(--foreground)_32%)]",
  loser:
    "text-[var(--sce-match-result-foreground-loser)] border-[color-mix(in_srgb,var(--sce-color-border-strong)_82%,transparent)] bg-[color-mix(in_srgb,var(--sce-color-surface-standard)_88%,transparent)]",
  neutral: "text-[var(--sce-match-result-foreground)]",
};

const SCE_MATCH_SCORE_INLINE_EMPHASIS_CLASS: Record<MatchScoreSideEmphasis, string> = {
  winner: "text-[var(--sce-match-result-foreground-winner)]",
  loser: "text-[var(--sce-match-result-foreground-loser)]",
  neutral: "text-[var(--sce-match-result-foreground)]",
};

export function sceMatchScoreBoxClassName(emphasis: MatchScoreSideEmphasis): string {
  return cn(SCE_ACTIVITY_REFERENCE_LAYOUT.scoreBoxClass, SCE_MATCH_SCORE_EMPHASIS_MODIFIER[emphasis]);
}

export function sceMatchScoreInlineEmphasisClass(emphasis: MatchScoreSideEmphasis): string {
  return SCE_MATCH_SCORE_INLINE_EMPHASIS_CLASS[emphasis];
}

export function sceMatchScoreSeparatorEmphasisClass(emphasis: MatchScoreSideEmphasis): string {
  return cn(
    SCE_ACTIVITY_REFERENCE_LAYOUT.scoreSeparatorClass,
    emphasis === "neutral"
      ? ""
      : "text-[var(--sce-match-result-foreground)] opacity-80",
  );
}
