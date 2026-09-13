import { getRuntimeEnvironment } from "@/lib/env";
import { getDatabaseFingerprintFromUrl } from "@/lib/server/deployment-identity";
import { NativeBillingConflictError } from "@/lib/billing/native-billing-types";

// Safe host+database identity attested by the SWISS-01H STAGE CLI diagnostic.
// This prevents two equally misconfigured Preview variables from passing.
export const CAMT054_STAGE_DATABASE_FINGERPRINT = "acd3b37682911890";

/**
 * SWISS-01H Preview acceptance requires the same persistent STAGE database as
 * CLI/STAGE dry-runs. PR Preview deployments often ship without the Production
 * DATABASE_URL scope; matching then fails with QRR_NOT_FOUND even when the
 * camt.054 QRR is valid.
 */
export function assertCamt054ReconciliationDatabaseAlignment(
  processEnv: NodeJS.ProcessEnv = process.env,
): void {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });

  if (!runtime.isPreview) {
    return;
  }

  const stageReferenceUrl = processEnv.STAGE_DB_URL?.trim();
  const databaseUrl = processEnv.DATABASE_URL?.trim();
  const stageFingerprint = getDatabaseFingerprintFromUrl(stageReferenceUrl);
  const previewFingerprint = getDatabaseFingerprintFromUrl(databaseUrl);
  if (
    !stageFingerprint ||
    !previewFingerprint ||
    stageFingerprint !== CAMT054_STAGE_DATABASE_FINGERPRINT ||
    previewFingerprint !== CAMT054_STAGE_DATABASE_FINGERPRINT
  ) {
    throw new NativeBillingConflictError(
      "Die Preview-Umgebung ist nicht mit der STAGE-Datenbank verbunden. " +
        "Der Bankabgleich wurde aus Sicherheitsgründen nicht ausgeführt.",
      { code: "PREVIEW_NOT_TARGETING_STAGE_DB" },
    );
  }
}
