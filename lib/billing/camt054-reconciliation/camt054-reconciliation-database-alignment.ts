import { getRuntimeEnvironment } from "@/lib/env";
import { getDatabaseFingerprintFromUrl } from "@/lib/server/deployment-identity";
import { NativeBillingConflictError } from "@/lib/billing/native-billing-types";

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
    stageFingerprint !== previewFingerprint
  ) {
    throw new NativeBillingConflictError(
      "Die Preview-Umgebung ist nicht mit der STAGE-Datenbank verbunden. " +
        "Der Bankabgleich wurde aus Sicherheitsgründen nicht ausgeführt.",
      { code: "PREVIEW_NOT_TARGETING_STAGE_DB" },
    );
  }
}
