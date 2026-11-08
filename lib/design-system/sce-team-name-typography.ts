/**
 * SCE-DS2-03 — Team name presentation (uppercase italic display, data unchanged).
 */
import { cn } from "@/lib/cn";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

export const SCE_TEAM_NAME_ROOT_CLASS = "sce-team-name" as const;

export const SCE_TEAM_NAME_DENSITY_MODIFIERS = {
  HERO: "sce-team-name--hero",
  STANDARD: "sce-team-name--standard",
  COMPACT: "sce-team-name--compact",
  MICRO: "sce-team-name--micro",
} as const;

export type SceTeamNameDensity =
  | SceActivityPresentationDensity
  | keyof typeof SCE_TEAM_NAME_DENSITY_MODIFIERS;

function resolveTeamNameDensityModifier(
  density: SceTeamNameDensity | undefined,
): string {
  const key = density ?? "STANDARD";
  if (key in SCE_TEAM_NAME_DENSITY_MODIFIERS) {
    return SCE_TEAM_NAME_DENSITY_MODIFIERS[key as keyof typeof SCE_TEAM_NAME_DENSITY_MODIFIERS];
  }
  return SCE_TEAM_NAME_DENSITY_MODIFIERS.STANDARD;
}

export type SceTeamNameClassOptions = {
  density?: SceTeamNameDensity;
  truncate?: boolean;
  lineClamp?: 1 | 2;
  className?: string;
};

/**
 * Presentation-only team name classes — never mutate stored strings.
 */
export function sceTeamNameClassName({
  density,
  truncate = true,
  lineClamp = 2,
  className,
}: SceTeamNameClassOptions = {}): string {
  return cn(
    SCE_TEAM_NAME_ROOT_CLASS,
    resolveTeamNameDensityModifier(density),
    truncate && lineClamp === 1 && "truncate",
    truncate && lineClamp === 2 && "line-clamp-2",
    truncate && lineClamp !== 1 && lineClamp !== 2 && "min-w-0",
    className,
  );
}
