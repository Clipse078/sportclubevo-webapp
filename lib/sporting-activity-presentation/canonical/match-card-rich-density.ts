import { cn } from "@/lib/cn";
import type { ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { SCE_SURFACE_TOKEN_MATCH_CARD } from "@/lib/shell/sce-surface-system";
import {
  SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
  SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  sceActivityLocationIconClass,
  sceActivityLocationTextClass,
} from "./activity-card-semantic-tokens";
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
  identityStackGapClass: string;
  crestVisualSize: ClubCrestVisualSize;
  clubNameClass: string;
  competitionTextClass: string;
  scheduleTextClass: string;
  scheduleIconClass: string;
  locationTextClass: string;
  locationIconClass: string;
  vsTextClass: string;
  resultTextClass: string;
  completedMissingResultClass: string;
};

/** Canonical bounded match card surface — pitch-opaque identity layer (no backdrop blur). */
export const SCE_MATCH_CARD_SHELL_CLASS = cn(
  "rounded-xl border border-[var(--sce-surface-border-elevated)]",
  "bg-[var(--sce-match-card-surface)] shadow-[var(--sce-surface-shadow-elevated)]",
);

/** Resolved CSS variable name for guardrails and design-system docs. */
export const SCE_MATCH_CARD_SURFACE_VAR = SCE_SURFACE_TOKEN_MATCH_CARD;

function buildMatchRichScale(
  density: SceMatchRichCardDensity,
  sizes: Pick<
    SceMatchRichDensityScale,
    | "maxWidthClass"
    | "shellPaddingClass"
    | "contentSpaceYClass"
    | "fixtureGapYClass"
    | "fixtureGridGapXClass"
    | "identityStackGapClass"
    | "crestVisualSize"
    | "clubNameClass"
    | "competitionTextClass"
    | "scheduleTextClass"
    | "scheduleIconClass"
    | "vsTextClass"
    | "resultTextClass"
    | "completedMissingResultClass"
  >,
): SceMatchRichDensityScale {
  return {
    ...sizes,
    locationTextClass: sceActivityLocationTextClass(sizes.scheduleTextClass),
    locationIconClass: sceActivityLocationIconClass(sizes.scheduleIconClass),
  };
}

export const SCE_MATCH_RICH_DENSITY_SCALE: Record<
  SceMatchRichCardDensity,
  SceMatchRichDensityScale
> = {
  HERO: buildMatchRichScale("HERO", {
    maxWidthClass: "max-w-lg",
    shellPaddingClass: "p-4 sm:p-5",
    contentSpaceYClass: "space-y-3.5",
    fixtureGapYClass: "gap-y-2",
    fixtureGridGapXClass: "gap-x-3.5",
    identityStackGapClass: "gap-2",
    crestVisualSize: "detail",
    clubNameClass: cn(
      "line-clamp-2 text-[1.0625rem] font-semibold leading-snug",
      SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
    ),
    competitionTextClass: cn(
      "line-clamp-2 text-[0.6875rem] font-medium leading-snug",
      SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
    ),
    scheduleTextClass: cn("text-sm font-medium", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    scheduleIconClass: cn("h-4 w-4 shrink-0", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    vsTextClass: cn(
      "text-[0.6875rem] font-medium uppercase tracking-[0.12em]",
      SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
    ),
    resultTextClass:
      "text-5xl font-bold tabular-nums tracking-tight text-[var(--sce-match-result-foreground)]",
    completedMissingResultClass: "text-sm font-semibold",
  }),
  STANDARD: buildMatchRichScale("STANDARD", {
    maxWidthClass: "max-w-md",
    shellPaddingClass: "p-3.5 sm:p-4",
    contentSpaceYClass: "space-y-2.5",
    fixtureGapYClass: "gap-y-1.5",
    fixtureGridGapXClass: "gap-x-3",
    identityStackGapClass: "gap-1.5",
    crestVisualSize: "planner",
    clubNameClass: cn(
      "line-clamp-2 text-sm font-semibold leading-snug",
      SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
    ),
    competitionTextClass: cn(
      "line-clamp-2 text-[0.6875rem] font-medium leading-snug",
      SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
    ),
    scheduleTextClass: cn("text-xs font-medium", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    scheduleIconClass: cn("h-3.5 w-3.5 shrink-0", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    vsTextClass: cn(
      "text-[0.6875rem] font-medium uppercase tracking-[0.1em]",
      SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
    ),
    resultTextClass:
      "text-3xl font-bold tabular-nums tracking-tight text-[var(--sce-match-result-foreground)]",
    completedMissingResultClass: "text-xs font-semibold",
  }),
  COMPACT: buildMatchRichScale("COMPACT", {
    maxWidthClass: "max-w-sm",
    shellPaddingClass: "p-3 sm:p-3.5",
    contentSpaceYClass: "space-y-2",
    fixtureGapYClass: "gap-y-1",
    fixtureGridGapXClass: "gap-x-2.5",
    identityStackGapClass: "gap-1.5",
    crestVisualSize: "management",
    clubNameClass: cn(
      "line-clamp-2 text-[0.8125rem] font-semibold leading-snug",
      SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
    ),
    competitionTextClass: cn(
      "line-clamp-2 text-[0.625rem] font-medium leading-snug",
      SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
    ),
    scheduleTextClass: cn("text-xs font-medium", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    scheduleIconClass: cn("h-3.5 w-3.5 shrink-0", SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS),
    vsTextClass: cn(
      "text-[0.625rem] font-medium uppercase tracking-[0.08em]",
      SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
    ),
    resultTextClass:
      "text-2xl font-bold tabular-nums tracking-tight text-[var(--sce-match-result-foreground)]",
    completedMissingResultClass: "text-xs font-semibold",
  }),
};

/** Inline MICRO fixture — same typography contract as rich densities. */
export type SceMatchMicroDensityScale = Pick<
  SceMatchRichDensityScale,
  "vsTextClass" | "resultTextClass" | "completedMissingResultClass"
>;

export const SCE_MATCH_MICRO_DENSITY_SCALE: SceMatchMicroDensityScale = {
  vsTextClass: cn(
    "text-[0.625rem] font-medium uppercase tracking-[0.08em]",
    SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS,
  ),
  resultTextClass:
    "text-lg font-bold tabular-nums tracking-tight text-[var(--sce-match-result-foreground)]",
  completedMissingResultClass: "text-xs font-semibold",
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

export function sceMatchCrestVisualSizeForDensity(
  density: SceActivityPresentationDensity,
): ClubCrestVisualSize {
  if (isSceMatchRichCardDensity(density)) {
    return SCE_MATCH_RICH_DENSITY_SCALE[density].crestVisualSize;
  }
  return "compact";
}

export function sceMatchCenterTypographyScale(
  density: SceActivityPresentationDensity,
): SceMatchMicroDensityScale | Pick<SceMatchRichDensityScale, "vsTextClass" | "resultTextClass" | "completedMissingResultClass"> {
  if (density === "MICRO") {
    return SCE_MATCH_MICRO_DENSITY_SCALE;
  }
  const richDensity = isSceMatchRichCardDensity(density) ? density : "COMPACT";
  const scale = SCE_MATCH_RICH_DENSITY_SCALE[richDensity];
  return {
    vsTextClass: scale.vsTextClass,
    resultTextClass: scale.resultTextClass,
    completedMissingResultClass: scale.completedMissingResultClass,
  };
}
