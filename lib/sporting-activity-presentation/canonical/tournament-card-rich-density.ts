import type { ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import {
  SCE_MATCH_RICH_DENSITY_SCALE,
  isSceMatchRichCardDensity,
  sceMatchCardBoundedWidthClass,
  type SceMatchRichCardDensity,
} from "./match-card-rich-density";
import {
  SCE_TRAINING_CARD_SHELL_CLASS,
  isSceTrainingRichCardDensity,
  sceTrainingCardBoundedWidthClass,
  sceTrainingMicroShellClass,
  sceTrainingRichDensityScale,
  type SceTrainingRichCardDensity,
  type SceTrainingRichDensityScale,
} from "./training-card-rich-density";
import type { SceActivityPresentationDensity } from "./types";

/** Tournament cards reuse the same rich-density scale as Training (01E) / Match (01D). */
export const SCE_TOURNAMENT_CARD_SHELL_CLASS = SCE_TRAINING_CARD_SHELL_CLASS;

export type SceTournamentRichCardDensity = SceTrainingRichCardDensity;

const TEAM_CONTEXT_FOREGROUND =
  "text-[color-mix(in_srgb,var(--sce-info)_88%,var(--foreground)_12%)]";

const LOCATION_FOREGROUND =
  "text-[color-mix(in_srgb,var(--sce-info)_55%,var(--text-2)_45%)]";

export type SceTournamentRichDensityScale = SceTrainingRichDensityScale & {
  crestVisualSize: ClubCrestVisualSize;
  organiserNameClass: string;
  hauptteamNameClass: string;
  hauptteamIconClass: string;
  locationTextClass: string;
  locationIconClass: string;
};

function mapTournamentRichScale(density: SceTournamentRichCardDensity): SceTournamentRichDensityScale {
  const match = SCE_MATCH_RICH_DENSITY_SCALE[density];
  const training = sceTrainingRichDensityScale(density);

  const organiserByDensity: Record<SceTournamentRichCardDensity, string> = {
    HERO: "truncate text-sm font-medium leading-snug text-[var(--text-2)]",
    STANDARD: "truncate text-xs font-medium leading-snug text-[var(--text-2)]",
    COMPACT: "truncate text-xs font-medium leading-snug text-[var(--text-2)]",
  };

  const hauptteamByDensity: Record<SceTournamentRichCardDensity, string> = {
    HERO: cn("truncate text-sm font-semibold leading-snug", TEAM_CONTEXT_FOREGROUND),
    STANDARD: cn("truncate text-xs font-semibold leading-snug", TEAM_CONTEXT_FOREGROUND),
    COMPACT: cn("truncate text-[0.6875rem] font-semibold leading-snug", TEAM_CONTEXT_FOREGROUND),
  };

  return {
    ...training,
    titleClass: match.clubNameClass,
    crestVisualSize:
      density === "HERO" ? "planner" : density === "STANDARD" ? "management" : "compact",
    organiserNameClass: organiserByDensity[density],
    hauptteamNameClass: hauptteamByDensity[density],
    hauptteamIconClass: cn(
      "shrink-0 opacity-80",
      density === "HERO" ? "h-4 w-4" : "h-3.5 w-3.5",
      TEAM_CONTEXT_FOREGROUND,
    ),
    locationTextClass: cn(training.scheduleTextClass, LOCATION_FOREGROUND),
    locationIconClass: cn(training.scheduleIconClass, LOCATION_FOREGROUND),
  };
}

export const SCE_TOURNAMENT_RICH_DENSITY_SCALE: Record<
  SceTournamentRichCardDensity,
  SceTournamentRichDensityScale
> = {
  HERO: mapTournamentRichScale("HERO"),
  STANDARD: mapTournamentRichScale("STANDARD"),
  COMPACT: mapTournamentRichScale("COMPACT"),
};

export function isSceTournamentRichCardDensity(
  density: SceActivityPresentationDensity,
): density is SceTournamentRichCardDensity {
  return isSceTrainingRichCardDensity(density);
}

export function sceTournamentRichDensityScale(
  density: SceTournamentRichCardDensity,
): SceTournamentRichDensityScale {
  return SCE_TOURNAMENT_RICH_DENSITY_SCALE[density];
}

export function sceTournamentCardBoundedWidthClass(density: SceTournamentRichCardDensity): string {
  return sceTrainingCardBoundedWidthClass(density);
}

export function sceTournamentMicroShellClass(): string {
  return sceTrainingMicroShellClass();
}

/** Organiser crest sizing — tournament organiser is not a match fixture crest. */
export function sceTournamentOrganiserCrestVisualSizeForDensity(
  density: SceActivityPresentationDensity,
  options?: { narrowMicro?: boolean; listRow?: boolean },
): ClubCrestVisualSize | null {
  if (options?.listRow) {
    return "planner";
  }
  if (density === "MICRO") {
    return options?.narrowMicro ? null : "compact";
  }
  if (isSceMatchRichCardDensity(density)) {
    return SCE_TOURNAMENT_RICH_DENSITY_SCALE[density].crestVisualSize;
  }
  return "compact";
}
