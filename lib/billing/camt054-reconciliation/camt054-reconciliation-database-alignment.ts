import { getRuntimeEnvironment } from "@/lib/env";
import { getDatabaseFingerprintFromUrl } from "@/lib/server/deployment-identity";
import { NativeBillingConflictError } from "@/lib/billing/native-billing-types";

// Safe host+database identity attested by the SWISS-01H STAGE CLI diagnostic.
// This prevents two equally misconfigured Preview variables from passing.
export const CAMT054_STAGE_DATABASE_FINGERPRINT = "acd3b37682911890";

export type Camt054PreviewRuntimeDiagnostics = {
  vercelEnv: string | null;
  appEnv: string;
  deploymentCommit: string | null;
  databaseFingerprint: string | null;
  stageDatabaseFingerprint: string | null;
  databaseAligned: boolean;
  legalEntityKey: string;
  legalEntityFound: boolean | null;
  acceptanceInvoiceFound: boolean | null;
  acceptancePaymentInstructionFound: boolean | null;
};

export class Camt054PreviewRuntimeConflictError extends NativeBillingConflictError {
  readonly diagnostics: Camt054PreviewRuntimeDiagnostics;

  constructor(
    message: string,
    code: "PREVIEW_NOT_TARGETING_STAGE_DB" | "STAGE_ACCEPTANCE_DATA_MISSING",
    diagnostics: Camt054PreviewRuntimeDiagnostics,
  ) {
    super(message, { code });
    this.diagnostics = diagnostics;
  }
}

/**
 * SWISS-01H Preview acceptance requires the same persistent STAGE database as
 * CLI/STAGE dry-runs. PR Preview deployments often ship without the Production
 * DATABASE_URL scope; matching then fails with QRR_NOT_FOUND even when the
 * camt.054 QRR is valid.
 */
export function assertCamt054ReconciliationDatabaseAlignment(
  processEnv: NodeJS.ProcessEnv = process.env,
  legalEntityKey = "",
): Camt054PreviewRuntimeDiagnostics | null {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });

  if (!runtime.isPreview) {
    return null;
  }

  const stageReferenceUrl = processEnv.STAGE_DB_URL?.trim();
  const databaseUrl = processEnv.DATABASE_URL?.trim();
  const stageFingerprint = getDatabaseFingerprintFromUrl(stageReferenceUrl);
  const previewFingerprint = getDatabaseFingerprintFromUrl(databaseUrl);
  const databaseAligned =
    stageFingerprint === CAMT054_STAGE_DATABASE_FINGERPRINT &&
    previewFingerprint === CAMT054_STAGE_DATABASE_FINGERPRINT;
  const diagnostics: Camt054PreviewRuntimeDiagnostics = {
    vercelEnv: runtime.vercelEnv,
    appEnv: runtime.appEnv,
    deploymentCommit: processEnv.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    databaseFingerprint: previewFingerprint,
    stageDatabaseFingerprint: stageFingerprint,
    databaseAligned,
    legalEntityKey,
    legalEntityFound: null,
    acceptanceInvoiceFound: null,
    acceptancePaymentInstructionFound: null,
  };

  if (!databaseAligned) {
    throw new Camt054PreviewRuntimeConflictError(
      "Die Preview-Umgebung ist nicht mit der STAGE-Datenbank verbunden. " +
        "Der Bankabgleich wurde aus Sicherheitsgründen nicht ausgeführt.",
      "PREVIEW_NOT_TARGETING_STAGE_DB",
      diagnostics,
    );
  }

  return diagnostics;
}
