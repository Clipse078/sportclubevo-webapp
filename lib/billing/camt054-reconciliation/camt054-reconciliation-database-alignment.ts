import { NativeBillingConflictError } from "@/lib/billing/native-billing-types";
import {
  requireBillingDataEnvironment,
  resolveRuntimeIdentity,
  RuntimeDataEnvironmentError,
} from "@/lib/server/runtime-identity";

export type Camt054PreviewRuntimeDiagnostics = {
  vercelEnv: string | null;
  appEnv: string;
  deploymentEnvironment: string;
  dataEnvironment: string;
  deploymentCommit: string | null;
  databaseFingerprint: string | null;
  stageDatabaseFingerprint: null;
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
 * Preview billing is intentionally allowed to operate on STAGE data, but only
 * when the canonical data-environment and effective Prisma DB identity are
 * both explicit and attested.
 */
export function assertCamt054ReconciliationDatabaseAlignment(
  processEnv: NodeJS.ProcessEnv = process.env,
  legalEntityKey = "",
): Camt054PreviewRuntimeDiagnostics | null {
  const identity = resolveRuntimeIdentity(processEnv, legalEntityKey);

  if (identity.deploymentEnvironment !== "PREVIEW") {
    return null;
  }

  const diagnostics: Camt054PreviewRuntimeDiagnostics = {
    vercelEnv: identity.vercelEnvironment,
    appEnv: identity.deploymentEnvironment.toLowerCase(),
    deploymentEnvironment: identity.deploymentEnvironment,
    dataEnvironment: identity.dataEnvironment,
    deploymentCommit: identity.commitSha,
    databaseFingerprint: identity.databaseFingerprint,
    stageDatabaseFingerprint: null,
    databaseAligned: identity.databaseFingerprintMatchesConfiguredTarget,
    legalEntityKey,
    legalEntityFound: null,
    acceptanceInvoiceFound: null,
    acceptancePaymentInstructionFound: null,
  };

  try {
    requireBillingDataEnvironment("STAGE", processEnv);
  } catch (error) {
    const reason =
      error instanceof RuntimeDataEnvironmentError ? ` (${error.code})` : "";
    throw new Camt054PreviewRuntimeConflictError(
      "Preview ist nicht explizit und nachweisbar mit der STAGE-Datenumgebung verbunden. " +
        `Der Bankabgleich wurde aus Sicherheitsgründen nicht ausgeführt${reason}.`,
      "PREVIEW_NOT_TARGETING_STAGE_DB",
      diagnostics,
    );
  }

  return diagnostics;
}
