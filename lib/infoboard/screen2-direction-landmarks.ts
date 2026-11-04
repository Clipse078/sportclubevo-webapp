/**
 * Screen 2 ÖV direction landmark rasters — tenant presentation mapping only.
 * Generic tenants fall back to arrow-only headings (no landmark image).
 */

export const INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS = {
  allschwilDorf: "/Infoboard/ambient/allschwil-dorf-direction-sign.png",
  basel: "/Infoboard/ambient/basel-direction-sign.png",
} as const;

export type Screen2DirectionLandmarkByGroupId = Readonly<Partial<Record<string, string>>>;

/** FC Allschwil: direction group ids align with {@link FC_ALLSCHWIL_DIRECTION_GROUPS}. */
const FC_ALLSCHWIL_DIRECTION_LANDMARKS: Screen2DirectionLandmarkByGroupId = {
  "allschwil-zentrum": INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.allschwilDorf,
  "bachgraben-basel": INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.basel,
};

const TENANT_DIRECTION_LANDMARKS: Readonly<
  Record<string, Screen2DirectionLandmarkByGroupId>
> = {
  "fc-allschwil": FC_ALLSCHWIL_DIRECTION_LANDMARKS,
};

/**
 * Resolves an approved direction landmark raster for a tenant direction group.
 * Returns null when the tenant has no mapping or the group is unknown.
 */
export function resolveScreen2DirectionLandmarkSrc(
  tenantKey: string | null | undefined,
  directionGroupId: string,
): string | null {
  if (!tenantKey) {
    return null;
  }
  const byGroup = TENANT_DIRECTION_LANDMARKS[tenantKey];
  if (!byGroup) {
    return null;
  }
  return byGroup[directionGroupId] ?? null;
}
