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
import {
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
  sceActivityLocationIconClass,
  sceActivityLocationTextClass,
} from "./activity-card-semantic-tokens";
import type { SceActivityPresentationDensity } from "./types";

/** Tournament cards reuse the same rich-density scale as Training (01E) / Match (01D). */
export const SCE_TOURNAMENT_CARD_SHELL_CLASS = SCE_TRAINING_CARD_SHELL_CLASS;

export type SceTournamentRichCardDensity = SceTrainingRichCardDensity;

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
    HERO: cn("truncate text-sm font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
    STANDARD: cn("truncate text-xs font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
    COMPACT: cn("truncate text-xs font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
  };

  const hauptteamByDensity: Record<SceTournamentRichCardDensity, string> = {
    HERO: cn("truncate text-sm font-semibold leading-snug", SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS),
    STANDARD: cn("truncate text-xs font-semibold leading-snug", SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS),
    COMPACT: cn("truncate text-[0.6875rem] font-semibold leading-snug", SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS),
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
      SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS,
    ),
    locationTextClass: sceActivityLocationTextClass(training.scheduleTextClass),
    locationIconClass: sceActivityLocationIconClass(training.scheduleIconClass),
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
    return "compact";
  }
  if (density === "MICRO") {
    return options?.narrowMicro ? null : "compact";
  }
  if (isSceMatchRichCardDensity(density)) {
    return SCE_TOURNAMENT_RICH_DENSITY_SCALE[density].crestVisualSize;
  }
  return "compact";
}
