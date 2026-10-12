import type { SceActivityPresentationDensity } from "./types";

/** Rich card densities share one DOM skeleton — scale tokens only. */
export type SceMatchRichCardDensity = Extract<
  SceActivityPresentationDensity,
  "HERO" | "STANDARD" | "COMPACT"
>;

export type SceMatchRichDensityScale = {
  /** Tailwind max-width — card must not stretch with full-width surfaces. */
  maxWidthClass: string;
  shellPaddingClass: string;
  contentSpaceYClass: string;
  fixtureGapYClass: string;
  fixtureGridGapXClass: string;
  clubNameClass: string;
  scheduleTextClass: string;
  scheduleIconClass: string;
  vsTextClass: string;
  resultTextClass: string;
  completedMissingResultClass: string;
};

export const SCE_MATCH_RICH_DENSITY_SCALE: Record<
  SceMatchRichCardDensity,
  SceMatchRichDensityScale
> = {
  HERO: {
    maxWidthClass: "max-w-lg",
    shellPaddingClass: "p-4 sm:p-5",
    contentSpaceYClass: "space-y-4",
    fixtureGapYClass: "gap-y-2",
    fixtureGridGapXClass: "gap-x-3",
    clubNameClass: "line-clamp-2 text-base font-semibold leading-snug",
    scheduleTextClass: "text-sm text-[var(--text-2)]",
    scheduleIconClass: "h-4 w-4 shrink-0 text-[var(--muted)]",
    vsTextClass: "text-sm",
    resultTextClass: "text-xl",
    completedMissingResultClass: "text-sm",
  },
  STANDARD: {
    maxWidthClass: "max-w-md",
    shellPaddingClass: "p-3.5 sm:p-4",
    contentSpaceYClass: "space-y-2.5",
    fixtureGapYClass: "gap-y-1",
    fixtureGridGapXClass: "gap-x-2.5",
    clubNameClass: "line-clamp-2 text-sm font-semibold leading-snug",
    scheduleTextClass: "text-xs text-[var(--text-2)]",
    scheduleIconClass: "h-3.5 w-3.5 shrink-0 text-[var(--muted)]",
    vsTextClass: "text-xs",
    resultTextClass: "text-base",
    completedMissingResultClass: "text-xs",
  },
  COMPACT: {
    maxWidthClass: "max-w-sm",
    shellPaddingClass: "p-3 sm:p-3.5",
    contentSpaceYClass: "space-y-2",
    fixtureGapYClass: "gap-y-1",
    fixtureGridGapXClass: "gap-x-2",
    clubNameClass: "line-clamp-2 text-[0.8125rem] font-medium leading-snug",
    scheduleTextClass: "text-xs text-[var(--text-2)]",
    scheduleIconClass: "h-3.5 w-3.5 shrink-0 text-[var(--muted)]",
    vsTextClass: "text-xs",
    resultTextClass: "text-sm",
    completedMissingResultClass: "text-xs",
  },
};

export function isSceMatchRichCardDensity(
  density: SceActivityPresentationDensity,
): density is SceMatchRichCardDensity {
  return density === "HERO" || density === "STANDARD" || density === "COMPACT";
}

export function sceMatchRichDensityScale(
  density: SceMatchRichCardDensity,
): SceMatchRichDensityScale {
  return SCE_MATCH_RICH_DENSITY_SCALE[density];
}

/** Bounded card shell — `w-full` fills grid cells up to max width. */
export function sceMatchCardBoundedWidthClass(density: SceMatchRichCardDensity): string {
  return `w-full ${SCE_MATCH_RICH_DENSITY_SCALE[density].maxWidthClass}`;
}
