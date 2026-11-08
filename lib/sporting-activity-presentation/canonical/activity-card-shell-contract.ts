import { cn } from "@/lib/cn";
import { SCE_SURFACE_TOKEN_MATCH_CARD } from "@/lib/shell/sce-surface-system";

/** Canonical activity card families (match / training / tournament / club event). */
export const SCE_ACTIVITY_CARD_CATEGORIES = [
  "MATCH",
  "TRAINING",
  "TOURNAMENT",
  "CLUB_EVENT",
] as const;

export type SceActivityCardCategory = (typeof SCE_ACTIVITY_CARD_CATEGORIES)[number];

/**
 * Runtime surface token — aliased to match card surface for infoboard continuity.
 * @see SCE-DS2-04 activity card white refresh
 */
export const SCE_ACTIVITY_CARD_SURFACE_VAR = SCE_SURFACE_TOKEN_MATCH_CARD;

export const SCE_ACTIVITY_CARD_SHELL_ROOT_CLASS = "sce-activity-card-shell";

/**
 * Premium sporting activity card surface — semantic tokens only (DS2-04).
 * Shared by Match, Training, Tournament, Club Event rich densities + programme list shell.
 */
export const SCE_ACTIVITY_CARD_SHELL_CLASS = cn(
  SCE_ACTIVITY_CARD_SHELL_ROOT_CLASS,
  "rounded-2xl border border-[var(--sce-color-border-standard)]",
  "bg-[var(--sce-match-card-surface)]",
  "shadow-[var(--sce-activity-card-shadow)]",
);

/** Backward-compatible alias consumed since SCE-UI-ROLLOUT-01D. */
export const SCE_MATCH_CARD_SHELL_CLASS = SCE_ACTIVITY_CARD_SHELL_CLASS;

/** Programme-list hover — restrained elevation on white canvas. */
export const SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS = cn(
  "transition-[border-color,box-shadow]",
  "motion-safe:hover:border-[var(--sce-color-border-strong)]",
  "motion-safe:hover:shadow-[var(--sce-activity-card-shadow-hover)]",
);

export function sceActivityCardShellClass(options?: {
  interactive?: boolean;
  className?: string;
}): string {
  return cn(
    SCE_ACTIVITY_CARD_SHELL_CLASS,
    options?.interactive && SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS,
    options?.className,
  );
}
