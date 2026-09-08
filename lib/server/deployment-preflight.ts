/**
 * Fail-closed deployment preflight validation.
 *
 * Validates environment consistency before a build or deployment proceeds.
 * Returns a typed result so the CLI runner and tests can inspect violations
 * independently.
 *
 * Design contract:
 * - Tolerant of incomplete local/test environments (no errors, only warnings).
 * - Fails non-zero for deployed or semi-deployed contexts with serious issues.
 * - Never contacts a database or external service.
 * - Never prints secret values.
 */

import { getRuntimeEnvironment } from "@/lib/env";
import { classifyDatabaseTarget } from "@/lib/server/operational-database-guard";

export type PreflightSeverity = "error" | "warning";

export type PreflightViolation = {
  code: string;
  severity: PreflightSeverity;
  message: string;
};

export type PreflightResult = {
  /** true when no errors are present (warnings are allowed). */
  pass: boolean;
  violations: PreflightViolation[];
};

function error(code: string, message: string): PreflightViolation {
  return { code, severity: "error", message };
}

function warning(code: string, message: string): PreflightViolation {
  return { code, severity: "warning", message };
}

function safeReadOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function extractDatabaseHost(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Run the deployment preflight checks against the supplied environment.
 *
 * Does NOT mutate state or contact external services.
 */
export function runDeploymentPreflight(
  processEnv: NodeJS.ProcessEnv = process.env,
): PreflightResult {
  const violations: PreflightViolation[] = [];

  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });

  // In local/test environments we only emit advisory warnings — never hard
  // errors that would break `npm run build` on a developer machine.
  const isDeployedContext =
    runtime.isDeployed ||
    runtime.isPreview ||
    runtime.isAcceptance ||
    runtime.isStage ||
    runtime.isProd;

  const addViolation = isDeployedContext
    ? (v: PreflightViolation) => violations.push(v)
    : (v: PreflightViolation) =>
        violations.push({ ...v, severity: "warning" as const });

  // ── (1) Environment classification ──────────────────────────────────────
  if (runtime.isUnknown && isDeployedContext) {
    addViolation(
      error(
        "ENV_UNKNOWN",
        "Deployed runtime environment classification is unknown. " +
          "Check APP_ENV and VERCEL_ENV/VERCEL_TARGET_ENV values.",
      ),
    );
  }

  // ── (2) Required auth configuration for deployed runtimes ───────────────
  if (isDeployedContext) {
    if (!runtime.hasNextAuthSecret) {
      addViolation(
        error(
          "AUTH_SECRET_MISSING",
          "NEXTAUTH_SECRET (or AUTH_SECRET) is not configured. " +
            "Authentication will fail closed.",
        ),
      );
    }

    if (!runtime.hasDatabaseUrl) {
      addViolation(
        error(
          "DATABASE_URL_MISSING",
          "DATABASE_URL is not configured for a deployed runtime.",
        ),
      );
    }
  }

  // ── (3) DATABASE_URL structural integrity ────────────────────────────────
  const rawDatabaseUrl = safeReadOptional(processEnv.DATABASE_URL);
  if (rawDatabaseUrl) {
    const dbTarget = classifyDatabaseTarget(rawDatabaseUrl);
    if (dbTarget === "unknown") {
      addViolation(
        error(
          "DATABASE_URL_MALFORMED",
          "DATABASE_URL is present but not a valid postgresql:// URL.",
        ),
      );
    }

    // Warn if a deployed, non-local environment uses a loopback database
    if (isDeployedContext && dbTarget === "local") {
      addViolation(
        error(
          "DATABASE_LOCALHOST_IN_DEPLOYMENT",
          "DATABASE_URL points to a local/loopback host in a deployed context.",
        ),
      );
    }
  }

  // ── (4) APP_ENV vs Vercel environment consistency ────────────────────────
  const configuredAppEnv =
    safeReadOptional(processEnv.APP_ENV)?.toLowerCase() ?? null;
  const vercelEnv =
    safeReadOptional(processEnv.VERCEL_ENV)?.toLowerCase() ?? null;
  const vercelTargetEnv =
    safeReadOptional(processEnv.VERCEL_TARGET_ENV)?.toLowerCase() ?? null;

  if (
    vercelEnv === "preview" &&
    vercelTargetEnv === null &&
    configuredAppEnv !== null &&
    configuredAppEnv !== "preview"
  ) {
    addViolation(
      error(
        "ENV_APP_ENV_VERCEL_MISMATCH",
        `APP_ENV=${configuredAppEnv} is set on a plain Vercel Preview deployment ` +
          `(VERCEL_ENV=preview, no VERCEL_TARGET_ENV). ` +
          `The canonical classifier overrides APP_ENV to "preview" for non-custom Preview deployments. ` +
          `Remove APP_ENV from the Preview scope or use a Vercel Custom Environment.`,
      ),
    );
  }

  // ── (5) Acceptance/STAGE cross-contamination detection ───────────────────
  // When the operator has provided explicit reference host variables we can
  // detect cross-environment database wiring. This does not hardcode any
  // specific host — it uses only the env vars the operator supplies.
  const acceptanceDatabaseHost = safeReadOptional(
    processEnv.ACCEPTANCE_DATABASE_HOST,
  );
  const currentDatabaseHost = rawDatabaseUrl
    ? extractDatabaseHost(rawDatabaseUrl)
    : null;

  if (acceptanceDatabaseHost && currentDatabaseHost && rawDatabaseUrl) {
    const isPointingAtAcceptance =
      currentDatabaseHost.toLowerCase() ===
      acceptanceDatabaseHost.toLowerCase();

    if (runtime.isStage && isPointingAtAcceptance) {
      addViolation(
        error(
          "STAGE_TARGETING_ACCEPTANCE_DB",
          "STAGE environment is targeting an Acceptance database host. " +
            "This is a cross-environment contamination. Verify DATABASE_URL.",
        ),
      );
    }

    if (runtime.isProd && isPointingAtAcceptance) {
      addViolation(
        error(
          "PROD_TARGETING_ACCEPTANCE_DB",
          "PROD environment is targeting an Acceptance database host. " +
            "Verify DATABASE_URL.",
        ),
      );
    }

    if (runtime.isAcceptance && !isPointingAtAcceptance) {
      addViolation(
        error(
          "ACCEPTANCE_NOT_TARGETING_ACCEPTANCE_DB",
          "Acceptance environment DATABASE_URL does not match the expected " +
            "Acceptance database host. Verify DATABASE_URL and ACCEPTANCE_DATABASE_HOST.",
        ),
      );
    }
  }

  // ── (6) STAGE_DB_URL reference check ────────────────────────────────────
  // If operator has set STAGE_DB_URL for diagnostics, flag if a non-STAGE
  // deployment appears to be connecting to the same host.
  const stageReferenceUrl = safeReadOptional(processEnv.STAGE_DB_URL);
  if (stageReferenceUrl && currentDatabaseHost && rawDatabaseUrl) {
    const stageReferenceHost = extractDatabaseHost(stageReferenceUrl);
    if (stageReferenceHost) {
      const isPointingAtStage =
        currentDatabaseHost.toLowerCase() === stageReferenceHost.toLowerCase();

      if (runtime.isAcceptance && isPointingAtStage) {
        addViolation(
          error(
            "ACCEPTANCE_TARGETING_STAGE_DB",
            "Acceptance environment DATABASE_URL appears to target the STAGE database host. " +
              "This is a cross-environment contamination. Verify DATABASE_URL.",
          ),
        );
      }

      if (runtime.isPreview && isPointingAtStage) {
        addViolation(
          error(
            "PREVIEW_TARGETING_STAGE_DB",
            "Preview environment DATABASE_URL appears to target the STAGE database host. " +
              "Preview must not target persistent STAGE data.",
          ),
        );
      }
    }
  }

  // ── (7) Unsupported runtime classification ───────────────────────────────
  if (runtime.isUnknown && !isDeployedContext) {
    violations.push(
      warning(
        "ENV_UNKNOWN_LOCAL",
        "APP_ENV is set to an unknown/unsupported value. " +
          "Use one of: local, test, preview, acceptance, stage, prod.",
      ),
    );
  }

  const pass = violations.every((v) => v.severity !== "error");
  return { pass, violations };
}
