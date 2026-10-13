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
  sceActivityLocationIconClass,
  sceActivityLocationTextClass,
} from "./activity-card-semantic-tokens";
import type { SceActivityPresentationDensity } from "./types";

export const SCE_CLUB_EVENT_CARD_SHELL_CLASS = SCE_TRAINING_CARD_SHELL_CLASS;

export type SceClubEventRichCardDensity = SceTrainingRichCardDensity;

export type SceClubEventRichDensityScale = SceTrainingRichDensityScale & {
  crestVisualSize: ClubCrestVisualSize | null;
  organiserNameClass: string;
  locationTextClass: string;
  locationIconClass: string;
};

function mapClubEventRichScale(density: SceClubEventRichCardDensity): SceClubEventRichDensityScale {
  const match = SCE_MATCH_RICH_DENSITY_SCALE[density];
  const training = sceTrainingRichDensityScale(density);

  const organiserByDensity: Record<SceClubEventRichCardDensity, string> = {
    HERO: cn("truncate text-sm font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
    STANDARD: cn("truncate text-xs font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
    COMPACT: cn("truncate text-xs font-medium leading-snug", SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS),
  };

  return {
    ...training,
    titleClass: match.clubNameClass,
    crestVisualSize: density === "HERO" ? "planner" : density === "STANDARD" ? "management" : "compact",
    organiserNameClass: organiserByDensity[density],
    locationTextClass: sceActivityLocationTextClass(training.scheduleTextClass),
    locationIconClass: sceActivityLocationIconClass(training.scheduleIconClass),
  };
}

export const SCE_CLUB_EVENT_RICH_DENSITY_SCALE: Record<
  SceClubEventRichCardDensity,
  SceClubEventRichDensityScale
> = {
  HERO: mapClubEventRichScale("HERO"),
  STANDARD: mapClubEventRichScale("STANDARD"),
  COMPACT: mapClubEventRichScale("COMPACT"),
};

export function isSceClubEventRichCardDensity(
  density: SceActivityPresentationDensity,
): density is SceClubEventRichCardDensity {
  return isSceTrainingRichCardDensity(density);
}

export function sceClubEventRichDensityScale(
  density: SceClubEventRichCardDensity,
): SceClubEventRichDensityScale {
  return SCE_CLUB_EVENT_RICH_DENSITY_SCALE[density];
}

export function sceClubEventCardBoundedWidthClass(density: SceClubEventRichCardDensity): string {
  return sceMatchCardBoundedWidthClass(density);
}

export function sceClubEventMicroShellClass(): string {
  return sceTrainingMicroShellClass();
}

export function sceClubEventOrganiserCrestVisualSizeForDensity(
  density: SceActivityPresentationDensity,
  options: { narrowMicro?: boolean; listRow?: boolean; hasLogo?: boolean } = {},
): ClubCrestVisualSize | null {
  if (!options.hasLogo) return null;
  if (density === "MICRO" && options.narrowMicro) return null;
  if (density === "MICRO") return "compact";
  if (options.listRow) return "compact";
  if (isSceMatchRichCardDensity(density)) {
    return SCE_CLUB_EVENT_RICH_DENSITY_SCALE[density].crestVisualSize;
  }
  return null;
}
