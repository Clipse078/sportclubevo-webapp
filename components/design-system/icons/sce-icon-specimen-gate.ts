/**
 * SCE icon specimen availability guard.
 *
 * Internal design-system surface at `/dashboard/dev/sce-icons`.
 *
 * Allowed:
 *   - Local development (NODE_ENV === "development")
 *   - Ordinary Vercel Preview deployments (VERCEL_ENV=preview)
 *   - STAGE (APP_ENV=stage on a Vercel production deployment)
 *
 * Denied:
 *   - Real production (APP_ENV=prod)
 *   - Other deployed runtimes that fail environment classification
 */

import { getRuntimeEnvironment } from "@/lib/env";

export function isSceIconSpecimenAvailable(
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  if (processEnv.NODE_ENV === "development") {
    return true;
  }

  const runtime = getRuntimeEnvironment(processEnv);

  if (runtime.isPreview) {
    return true;
  }

  if (runtime.isStage) {
    return true;
  }

  return false;
}
