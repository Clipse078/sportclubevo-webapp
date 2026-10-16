import { cn } from "@/lib/cn";
import { SCE_MATCH_CARD_SHELL_CLASS } from "./match-card-rich-density";

export type SceProgrammeActivityShellDensity = "COMPACT" | "STANDARD";

/** Shared programme-list activity card shell — same family as Resultate SceMatchCard. */
export const SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS = cn(
  SCE_MATCH_CARD_SHELL_CLASS,
  "relative min-w-0 w-full transition-colors motion-safe:hover:border-[var(--border-strong)]",
);

/**
 * R5.4 — restrained row emphasis without accent stacking on day/group containers.
 * Use for calendar sync / next-upcoming only — not route selection.
 */
export const SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS =
  "ring-1 ring-[var(--border-strong)] shadow-[var(--sce-surface-shadow-elevated)]";

const PROGRAMME_SHELL_PADDING: Record<SceProgrammeActivityShellDensity, string> = {
  /** Dashboard Mein Programm preview — efficient vertical rhythm. */
  COMPACT: "p-2 sm:p-2.5",
  /** Full programme workspaces — aligned with Resultate COMPACT card padding. */
  STANDARD: "p-3 sm:p-3.5",
};

export function sceProgrammeActivityCardShellClass(
  density: SceProgrammeActivityShellDensity,
  className?: string,
): string {
  return cn(SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS, PROGRAMME_SHELL_PADDING[density], className);
}
