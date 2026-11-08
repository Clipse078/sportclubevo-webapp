import {
  SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT,
} from "@/lib/design-system/sce-ds2-01-meta";
import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";

const TRUTHY = new Set(["1", "true", "yes", "on"]);

/**
 * Server/build-time gate for DS 2.0 White Edition tokens.
 * Default off until PO sets `SCE_WHITE_EDITION=1` on the target environment.
 */
export function isSceWhiteEditionEnabled(
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = processEnv[SCE_DS2_WHITE_EDITION.featureFlagEnv]?.trim().toLowerCase();
  if (!raw) {
    return SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT;
  }
  return TRUTHY.has(raw);
}

export function sceWhiteEditionThemeDataAttributes():
  | Record<typeof SCE_DS2_WHITE_EDITION.themeDataAttribute, typeof SCE_DS2_WHITE_EDITION.themeValue>
  | undefined {
  if (!isSceWhiteEditionEnabled()) {
    return undefined;
  }
  return {
    [SCE_DS2_WHITE_EDITION.themeDataAttribute]: SCE_DS2_WHITE_EDITION.themeValue,
  };
}
