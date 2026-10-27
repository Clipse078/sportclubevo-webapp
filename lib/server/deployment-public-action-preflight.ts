import { publicActionBaseWouldCrossIncompatibleDeployment } from "@/lib/server/public-action-base-url-policy";
import {
  evaluatePublicActionTarget,
  type PublicActionTargetFailureCode,
} from "@/lib/server/public-action-target-policy";
export type PublicActionPreflightViolation = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

function error(code: string, message: string): PublicActionPreflightViolation {
  return { code, severity: "error", message };
}

function warning(code: string, message: string): PublicActionPreflightViolation {
  return { code, severity: "warning", message };
}

function safeReadOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const NOT_EXTERNALLY_REACHABLE_MESSAGE =
  "Finance external distribution is not ready on this Preview/Acceptance deployment: recipient links would require Vercel Deployment Protection login. " +
  "Configure PUBLIC_ACTION_BASE_URL to an unprotected HTTPS origin on this deployment, or set PUBLIC_ACTION_EXTERNALLY_REACHABLE after disabling Preview protection, " +
  "or complete FIN-06E on STAGE production before external recipient UAT. See docs/deployment/stage-preview-migration-runbook.md (FIN-06E Preview recipient access).";

const MISCONFIGURED_PUBLIC_ACTION_BASE_URL_MESSAGE =
  "PUBLIC_ACTION_BASE_URL must not target the canonical tenant host while Preview code diverges from STAGE production, " +
  "and must alias the executing Preview deployment when used for external recipient links.";

/**
 * FIN-06E Preview public-action checks for deployment preflight.
 *
 * Deployability (general feature Preview) is separated from finance external
 * distribution readiness: protected Previews warn when distribution is unavailable
 * unless the operator explicitly configured PUBLIC_ACTION_BASE_URL for FIN-06E UAT.
 */
export function collectPreviewPublicActionPreflightViolations(
  processEnv: NodeJS.ProcessEnv = process.env,
): PublicActionPreflightViolation[] {
  const violations: PublicActionPreflightViolation[] = [];

  if (!publicActionBaseWouldCrossIncompatibleDeployment(processEnv)) {
    return violations;
  }

  const vercelUrl = safeReadOptional(processEnv.VERCEL_URL);
  if (!vercelUrl) {
    violations.push(
      error(
        "PREVIEW_PUBLIC_ACTION_HOST_MISSING",
        "Preview/Acceptance APP_BASE_URL targets the canonical tenant host but VERCEL_URL is missing. " +
          "Public distribution links would target a STAGE runtime that may not match Preview schema/code.",
      ),
    );
  }

  const publicActionTarget = evaluatePublicActionTarget(processEnv);
  if (publicActionTarget.valid) {
    return violations;
  }

  const explicitPublicActionBaseUrl = safeReadOptional(processEnv.PUBLIC_ACTION_BASE_URL);
  const failureCode = publicActionTarget.failureCode;

  if (failureCode === "DEPLOYMENT_PROTECTION") {
    if (explicitPublicActionBaseUrl) {
      violations.push(
        error("PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE", NOT_EXTERNALLY_REACHABLE_MESSAGE),
      );
    } else {
      violations.push(
        warning(
          "FINANCE_EXTERNAL_DISTRIBUTION_NOT_READY",
          NOT_EXTERNALLY_REACHABLE_MESSAGE +
            " This does not block application Preview deployment; distribution send remains fail-closed at runtime.",
        ),
      );
    }
    return violations;
  }

  if (failureCode === "MISCONFIGURED_PUBLIC_ACTION_BASE_URL") {
    violations.push(
      error("PREVIEW_PUBLIC_ACTION_BASE_URL_MISCONFIGURED", MISCONFIGURED_PUBLIC_ACTION_BASE_URL_MESSAGE),
    );
    return violations;
  }

  if (failureCode === "MISSING_DEPLOYMENT_HOST" || failureCode === "CROSS_INCOMPATIBLE_RUNTIME") {
    violations.push(
      error(
        "PREVIEW_PUBLIC_ACTION_TARGET_INVALID",
        `Finance public-action target is not valid for this Preview/Acceptance deployment (${failureCode}).`,
      ),
    );
  }

  return violations;
}

/** True when FIN-06E external distribution may proceed in this runtime. */
export function isFinanceExternalDistributionReady(
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  return evaluatePublicActionTarget(processEnv).valid;
}

export function financeExternalDistributionFailureCode(
  processEnv: NodeJS.ProcessEnv = process.env,
): PublicActionTargetFailureCode | null {
  const evaluation = evaluatePublicActionTarget(processEnv);
  return evaluation.valid ? null : evaluation.failureCode;
}
