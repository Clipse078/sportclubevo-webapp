/**
 * Client-safe SCE completion progress presentation (count-based rollups).
 * Display percent is floored; bar fill uses the exact ratio; 100% only when fully complete.
 */

export type SceCompletionCountSuffix = "erledigt" | "Zielen erreicht" | "Aufgaben erledigt";

const COUNT_CAPTION_RE = /^(\d+)\s+von\s+(\d+)\s+/;

export function parseVereinsentwicklungCountCaption(
  caption: string | null | undefined,
): { completed: number; total: number } | null {
  if (!caption?.trim()) return null;
  const match = caption.trim().match(COUNT_CAPTION_RE);
  if (!match) return null;
  const completed = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total < 0) return null;
  return { completed, total };
}

export function computeSceDisplayPercent(completed: number, total: number): number | null {
  if (total <= 0) return null;
  if (completed >= total) return 100;
  return Math.floor((completed / total) * 100);
}

/** Bar fill width from the true ratio (may differ slightly from floored display percent). */
export function computeSceProgressBarPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (completed / total) * 100);
}

export function formatSceCompletionCountPhrase(
  completed: number,
  total: number,
  suffix: SceCompletionCountSuffix = "erledigt",
): string {
  return `${completed} von ${total} ${suffix}`;
}

export function formatSceCompletionInlineCaption(
  completed: number,
  total: number,
  suffix: SceCompletionCountSuffix = "erledigt",
): string {
  const displayPercent = computeSceDisplayPercent(completed, total);
  if (displayPercent == null) return "";
  return `${displayPercent}% – ${formatSceCompletionCountPhrase(completed, total, suffix)}`;
}

export function sceCompletionFromCaption(
  caption: string | null | undefined,
  emptyLabel: string,
  suffix: SceCompletionCountSuffix = "erledigt",
): {
  empty: boolean;
  completed: number;
  total: number;
  displayPercent: number | null;
  barPercent: number;
  inlineCaption: string;
  ariaValueText: string;
} {
  if (!caption?.trim() || caption.trim() === emptyLabel) {
    return {
      empty: true,
      completed: 0,
      total: 0,
      displayPercent: null,
      barPercent: 0,
      inlineCaption: "",
      ariaValueText: emptyLabel,
    };
  }
  const counts = parseVereinsentwicklungCountCaption(caption);
  if (!counts) {
    return {
      empty: true,
      completed: 0,
      total: 0,
      displayPercent: null,
      barPercent: 0,
      inlineCaption: "",
      ariaValueText: caption,
    };
  }
  const { completed, total } = counts;
  const displayPercent = computeSceDisplayPercent(completed, total);
  const inlineCaption = formatSceCompletionInlineCaption(completed, total, suffix);
  return {
    empty: false,
    completed,
    total,
    displayPercent,
    barPercent: computeSceProgressBarPercent(completed, total),
    inlineCaption,
    ariaValueText: inlineCaption,
  };
}