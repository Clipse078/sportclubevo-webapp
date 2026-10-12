import {
  SCE_TRAINING_CARD_SHELL_CLASS,
  SCE_TRAINING_RICH_DENSITY_SCALE,
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

export type SceTournamentRichDensityScale = SceTrainingRichDensityScale;

export const SCE_TOURNAMENT_RICH_DENSITY_SCALE: Record<
  SceTournamentRichCardDensity,
  SceTournamentRichDensityScale
> = SCE_TRAINING_RICH_DENSITY_SCALE;

export function isSceTournamentRichCardDensity(
  density: SceActivityPresentationDensity,
): density is SceTournamentRichCardDensity {
  return isSceTrainingRichCardDensity(density);
}

export function sceTournamentRichDensityScale(
  density: SceTournamentRichCardDensity,
): SceTournamentRichDensityScale {
  return sceTrainingRichDensityScale(density);
}

export function sceTournamentCardBoundedWidthClass(density: SceTournamentRichCardDensity): string {
  return sceTrainingCardBoundedWidthClass(density);
}

export function sceTournamentMicroShellClass(): string {
  return sceTrainingMicroShellClass();
}
