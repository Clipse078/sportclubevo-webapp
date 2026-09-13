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
  if (!stageReferenceUrl || !databaseUrl) {
    return;
  }

  const stageFingerprint = getDatabaseFingerprintFromUrl(stageReferenceUrl);
  const previewFingerprint = getDatabaseFingerprintFromUrl(databaseUrl);
  if (!stageFingerprint || !previewFingerprint) {
    return;
  }

  if (stageFingerprint !== previewFingerprint) {
    throw new NativeBillingConflictError(
      "camt.054-Abgleich auf Preview ist nicht mit der STAGE-Datenbank verbunden. " +
        "Die DATABASE_URL dieser Preview-Instanz weicht von STAGE_DB_URL ab " +
        "(Datenbank-Fingerprint stimmt nicht überein). " +
        "Für SWISS-01H Akzeptanz DATABASE_URL und SCE_BILLING_ENCRYPTION_KEY " +
        "im Vercel Preview-Scope auf dieselben Werte wie STAGE Production setzen und neu deployen.",
    );
  }
}
