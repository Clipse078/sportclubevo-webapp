import {
  SCE_ACTIVITY_DENSITY_CONTRACT,
  type SceActivityDensityContract,
  type SceActivityDensityDimensionPolicy,
} from "./density";
import type { SceActivityPresentationDensity } from "./types";

export function sceActivityDensityContract(
  density: SceActivityPresentationDensity,
): SceActivityDensityContract {
  return SCE_ACTIVITY_DENSITY_CONTRACT[density];
}

export function isSceActivityDimensionVisible(
  density: SceActivityPresentationDensity,
  dimension: keyof SceActivityDensityContract,
): boolean {
  const policy = SCE_ACTIVITY_DENSITY_CONTRACT[density][dimension];
  return policy !== "hidden";
}

export function sceActivityDimensionPolicy(
  density: SceActivityPresentationDensity,
  dimension: keyof SceActivityDensityContract,
): SceActivityDensityDimensionPolicy {
  return SCE_ACTIVITY_DENSITY_CONTRACT[density][dimension];
}
