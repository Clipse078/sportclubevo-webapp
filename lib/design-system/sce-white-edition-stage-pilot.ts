import { getRuntimeEnvironment } from "@/lib/env";
import {
  SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT,
} from "@/lib/design-system/sce-ds2-01-meta";
import { isSceWhiteEditionEnabled } from "@/lib/design-system/sce-white-edition-flag";

/** Vercel STAGE custom environment — not NODE_ENV alone. */
export const SCE_WHITE_EDITION_STAGE_PILOT_APP_ENV = "stage" as const;

export const SCE_WHITE_EDITION_STAGE_PILOT_ENV_VAR = "SCE_WHITE_EDITION" as const;

export const SCE_WHITE_EDITION_STAGE_PILOT_ACTIVATION_VALUE = "1" as const;

/**
 * Documents how operators enable the STAGE White Edition pilot.
 * The application never auto-enables the flag from deployment metadata alone.
 */
export const SCE_WHITE_EDITION_STAGE_PILOT_STEPS = [
  "Vercel project: sportclubevo-webapp-stage (STAGE custom environment).",
  "Set APP_ENV=stage (existing STAGE discriminator — not NODE_ENV).",
  `Set ${SCE_WHITE_EDITION_STAGE_PILOT_ENV_VAR}=${SCE_WHITE_EDITION_STAGE_PILOT_ACTIVATION_VALUE} when PO approves pilot visibility.`,
  "Redeploy STAGE; verify authenticated shell root carries data-sce-theme=\"white\".",
  "Leave production/main SCE_WHITE_EDITION unset — default dark v1.0 remains.",
] as const;

export type SceWhiteEditionPilotSnapshot = {
  flagDefaultOff: boolean;
  flagEnabled: boolean;
  isStageRuntime: boolean;
  pilotEligible: boolean;
};

/**
 * Read-only pilot diagnostics for tests and ops docs — does not mutate env or enable the flag.
 */
export function resolveSceWhiteEditionPilotSnapshot(
  processEnv: NodeJS.ProcessEnv = process.env,
): SceWhiteEditionPilotSnapshot {
  const runtime = getRuntimeEnvironment(processEnv);
  const flagEnabled = isSceWhiteEditionEnabled(processEnv);
  const isStageRuntime = runtime.isStage;
  return {
    flagDefaultOff: SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT === false,
    flagEnabled,
    isStageRuntime,
    pilotEligible: isStageRuntime && flagEnabled,
  };
}
