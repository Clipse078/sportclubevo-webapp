import { cn } from "@/lib/cn";
import {
  SCE_MATCH_CARD_SHELL_CLASS,
  SCE_MATCH_RICH_DENSITY_SCALE,
  isSceMatchRichCardDensity,
  sceMatchCardBoundedWidthClass,
  type SceMatchRichCardDensity,
  type SceMatchRichDensityScale,
} from "./match-card-rich-density";
import {
  sceActivityLocationIconClass,
  sceActivityLocationTextClass,
} from "./activity-card-semantic-tokens";
import type { SceActivityPresentationDensity } from "./types";

/** Training cards reuse the pitch-opaque activity card surface from 01D. */
export const SCE_TRAINING_CARD_SHELL_CLASS = SCE_MATCH_CARD_SHELL_CLASS;

export type SceTrainingRichCardDensity = SceMatchRichCardDensity;

export type SceTrainingRichDensityScale = {
  maxWidthClass: string;
  shellPaddingClass: string;
  contentSpaceYClass: string;
  fixtureGapYClass: string;
  fixtureGridGapXClass: string;
  identityStackGapClass: string;
  scheduleTextClass: string;
  scheduleIconClass: string;
  typeLabelClass: string;
  titleClass: string;
  teamClass: string;
  contextLineClass: string;
  locationTextClass: string;
  locationIconClass: string;
};

function mapRichScale(density: SceTrainingRichCardDensity): SceTrainingRichDensityScale {
  const match = SCE_MATCH_RICH_DENSITY_SCALE[density];
  return {
    maxWidthClass: match.maxWidthClass,
    shellPaddingClass: match.shellPaddingClass,
    contentSpaceYClass: match.contentSpaceYClass,
    fixtureGapYClass: match.fixtureGapYClass,
    fixtureGridGapXClass: match.fixtureGridGapXClass,
    identityStackGapClass: match.identityStackGapClass,
    scheduleTextClass: match.scheduleTextClass,
    scheduleIconClass: match.scheduleIconClass,
    typeLabelClass: match.competitionTextClass,
    titleClass: match.clubNameClass,
    teamClass: match.scheduleTextClass,
    contextLineClass: match.scheduleTextClass,
    locationTextClass: sceActivityLocationTextClass(match.scheduleTextClass),
    locationIconClass: sceActivityLocationIconClass(match.scheduleIconClass),
  };
}

export const SCE_TRAINING_RICH_DENSITY_SCALE: Record<
  SceTrainingRichCardDensity,
  SceTrainingRichDensityScale
> = {
  HERO: mapRichScale("HERO"),
  STANDARD: mapRichScale("STANDARD"),
  COMPACT: mapRichScale("COMPACT"),
};

export function isSceTrainingRichCardDensity(
  density: SceActivityPresentationDensity,
): density is SceTrainingRichCardDensity {
  return isSceMatchRichCardDensity(density);
}

export function sceTrainingRichDensityScale(
  density: SceTrainingRichCardDensity,
): SceTrainingRichDensityScale {
  return SCE_TRAINING_RICH_DENSITY_SCALE[density];
}

export function sceTrainingCardBoundedWidthClass(density: SceTrainingRichCardDensity): string {
  return sceMatchCardBoundedWidthClass(density);
}

export function sceTrainingMicroShellClass(): string {
  return cn("min-w-0 p-2");
}
