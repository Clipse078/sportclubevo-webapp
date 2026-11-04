/**
 * Screen 1 ambient raster assets — decorative backgrounds only.
 * Paths use the canonical `public/Infoboard` directory (capital I).
 */

import type { InfoboardDisplayTheme } from "@/lib/publishing/infoboard/display-theme";
import type { PublishingEventType } from "@/lib/publishing/event-types";

export const INFOBOARD_AMBIENT_ASSET_PATHS = {
  header: "/Infoboard/ambient/infoboard-header-ambient.png",
  jumbotron: "/Infoboard/ambient/infoboard-jumbotron-ambient.png",
  darkOperational: "/Infoboard/ambient/infoboard-dark-background.png",
  match: "/Infoboard/ambient/infoboard-match-ambient.png",
  tournament: "/Infoboard/ambient/infoboard-tournament-ambient.png",
  training: "/Infoboard/ambient/infoboard-training-ambient.png",
} as const;

export type InfoboardActivityAmbientKind = "MATCH" | "TOURNAMENT" | "TRAINING";

const ACTIVITY_AMBIENT_BY_TYPE: Partial<
  Record<PublishingEventType, (typeof INFOBOARD_AMBIENT_ASSET_PATHS)[keyof typeof INFOBOARD_AMBIENT_ASSET_PATHS]>
> = {
  MATCH: INFOBOARD_AMBIENT_ASSET_PATHS.match,
  TOURNAMENT: INFOBOARD_AMBIENT_ASSET_PATHS.tournament,
  TRAINING: INFOBOARD_AMBIENT_ASSET_PATHS.training,
};

export function resolveActivityAmbientSrc(
  eventType: PublishingEventType,
  theme: InfoboardDisplayTheme = "DARK",
): string | null {
  const lightSrc = ACTIVITY_AMBIENT_BY_TYPE[eventType];
  if (lightSrc == null) {
    return null;
  }
  if (theme === "DARK") {
    return INFOBOARD_AMBIENT_ASSET_PATHS.darkOperational;
  }
  return lightSrc;
}

export function isInfoboardActivityAmbientKind(
  value: string,
): value is InfoboardActivityAmbientKind {
  return value === "MATCH" || value === "TOURNAMENT" || value === "TRAINING";
}
