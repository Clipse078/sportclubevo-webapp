/**
 * SCE Tournament Planner — layered surface hierarchy (page → workspace → round → fixture).
 * Uses canonical SCE-VISUAL-02 tokens; no tournament-only color literals.
 */
import { cn } from "@/lib/cn";
import { SCE_MATCH_CARD_SHELL_CLASS } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";

/** Primary Spielplan / Planung working canvas — blocks decorative page artwork from bleeding through. */
export const SCE_TOURNAMENT_WORKSPACE_SURFACE_CLASS = cn(
  "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--sce-surface-border)]",
  "bg-[var(--sce-surface-dense)] shadow-[var(--sce-surface-shadow)]",
);

/** Grouped round block inside a workspace. */
export const SCE_TOURNAMENT_ROUND_SURFACE_CLASS = cn(
  "rounded-[var(--radius-lg)] border border-[var(--sce-surface-border-subtle)]",
  "bg-[var(--sce-surface-standard)] p-4 md:p-5",
);

/** Standard Spielplan fixture card — pitch-opaque identity layer (aligned with SceMatchCard). */
export const SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS = cn(
  SCE_MATCH_CARD_SHELL_CLASS,
  "transition-[opacity,box-shadow,border-color]",
  "hover:border-[var(--sce-surface-border-elevated)]",
);

/** Denser Planung list / board fixture shell — same token stack, tighter padding applied in components. */
export const SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS = cn(
  SCE_TOURNAMENT_FIXTURE_CARD_SHELL_CLASS,
  "shadow-[var(--sce-surface-shadow)]",
);

/** Round metadata pill (match count). */
export const SCE_TOURNAMENT_ROUND_COUNT_BADGE_CLASS = cn(
  "inline-flex shrink-0 items-center rounded-[var(--radius-pill)]",
  "border border-[var(--sce-surface-border-subtle)] bg-[var(--sce-surface-elevated)]",
  "px-2.5 py-0.5 text-xs font-medium tabular-nums text-[var(--text-2)]",
);

/** Spielplan output header divider beneath title / actions. */
export const SCE_TOURNAMENT_WORKSPACE_HEADER_DIVIDER_CLASS =
  "border-b border-[var(--sce-surface-border-subtle)] pb-4";

/** Separation between controls and schedule body. */
export const SCE_TOURNAMENT_WORKSPACE_SCHEDULE_DIVIDER_CLASS =
  "border-t border-[var(--sce-surface-border-subtle)] pt-5";
