import "server-only";

import { FinanceDomainError } from "@/lib/finance/errors";
import { evaluatePublicActionTarget } from "@/lib/server/public-action-target-policy";

export {
  evaluatePublicActionTarget,
  PUBLIC_ACTION_EXTERNALLY_REACHABLE_ATTESTATION,
  readPublicActionExternallyReachableAttestation,
  isVercelAppHostname,
} from "@/lib/server/public-action-target-policy";

export type {
  PublicActionTargetEvaluation,
  PublicActionTargetFailureCode,
} from "@/lib/server/public-action-target-policy";

const DISTRIBUTION_PUBLIC_ACTION_UNAVAILABLE_DE =
  "Empfängerlinks sind in dieser Vorschau-Umgebung noch nicht öffentlich erreichbar (Vercel Deployment Protection). " +
  "Bitte die in docs/deployment/stage-preview-migration-runbook.md beschriebene FIN-06E Preview-Konfiguration anwenden " +
  "oder FIN-06E auf STAGE bereitstellen, bevor externe Testempfänger versendet werden.";

export function requirePublicActionTargetForFinanceDistribution(
  processEnv: NodeJS.ProcessEnv = process.env,
): void {
  const evaluation = evaluatePublicActionTarget(processEnv);
  if (evaluation.valid) {
    return;
  }

  throw new FinanceDomainError(
    "FINANCE_PUBLICATION_DISTRIBUTION_UNAVAILABLE",
    DISTRIBUTION_PUBLIC_ACTION_UNAVAILABLE_DE,
    503,
  );
}
