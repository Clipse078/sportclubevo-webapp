/**
 * Canonical runtime/deployment identity resolver.
 *
 * Returns a fully typed, safe description of the current deployment: git
 * provenance, Vercel metadata, SCE environment classification, database
 * identity fingerprint (no secrets), and auth configuration presence.
 *
 * NEVER exposes: DATABASE_URL, DB username/password, NEXTAUTH_SECRET,
 * auth tokens, or any password hash.
 */

import { createHash } from "node:crypto";
import {
  getPublicEnvironmentLabel,
  getRuntimeEnvironment,
  type AppEnv,
} from "@/lib/env";

export type IdentityValidationStatus = "PASS" | "FAIL";

export type DeploymentIdentity = {
  /** VERCEL_GIT_COMMIT_SHA if available; null in local/CI without Vercel. */
  commitSha: string | null;
  /** VERCEL_GIT_COMMIT_REF (branch/tag) if available. */
  commitRef: string | null;
  /** VERCEL_DEPLOYMENT_ID if available. */
  deploymentId: string | null;
  /** VERCEL_URL (deployment-scoped host, no protocol) if available. */
  deploymentUrl: string | null;
  /** Raw VERCEL_ENV value: "production" | "preview" | "development" | null */
  vercelEnv: string | null;
  /** Raw VERCEL_TARGET_ENV value when present (custom Vercel env name). */
  vercelTargetEnv: string | null;

  /** Canonical SCE environment label. */
  appEnvironment: ReturnType<typeof getPublicEnvironmentLabel>;
  /** Internal AppEnv classification. */
  appEnvRaw: AppEnv;
  /** Whether this runtime was determined to be a deployed (Vercel) instance. */
  isDeployed: boolean;

  /** Database hostname only — no user, password, port, or database name. */
  databaseHost: string | null;
  /**
   * Deterministic fingerprint derived from database host + database name.
   * Same database → same fingerprint. Different databases → different
   * fingerprints. No secret material is included.
   */
  databaseFingerprint: string | null;

  /** Auth configuration presence (no values). */
  authConfigured: {
    hasNextAuthSecret: boolean;
    hasDatabaseUrl: boolean;
    hasNextAuthUrl: boolean;
    hasAppBaseUrl: boolean;
  };

  /**
   * PASS when all required auth configuration is present and the environment
   * classification is valid for the current deployment context.
   * FAIL otherwise — a login failure in this deployment state is expected.
   */
  identityValid: IdentityValidationStatus;
  /**
   * Human-readable list of conditions that caused identityValid=FAIL.
   * Empty when identityValid=PASS.
   */
  identityViolations: string[];
};

function safeReadOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function extractDatabaseHost(
  databaseUrl: string | undefined,
): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname || null;
  } catch {
    return null;
  }
}

function extractDatabaseName(
  databaseUrl: string | undefined,
): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    const pathname = new URL(raw).pathname;
    const name = pathname.replace(/^\//, "").split("?")[0];
    return name || null;
  } catch {
    return null;
  }
}

function buildDatabaseFingerprint(
  host: string | null,
  dbName: string | null,
): string | null {
  if (!host && !dbName) return null;
  const input = `${host ?? ""}:${dbName ?? ""}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function computeIdentityViolations(
  runtime: ReturnType<typeof getRuntimeEnvironment>,
  processEnv: NodeJS.ProcessEnv,
): string[] {
  const violations: string[] = [];

  if (runtime.isUnknown && runtime.isDeployed) {
    violations.push(
      "Deployed runtime has no valid environment classification (APP_ENV unknown or missing).",
    );
  }

  if (!runtime.hasDatabaseUrl) {
    violations.push("DATABASE_URL is not configured.");
  }

  if (!runtime.hasNextAuthSecret) {
    violations.push("NEXTAUTH_SECRET (or AUTH_SECRET) is not configured.");
  }

  if (runtime.isDeployed && !runtime.isLocal) {
    if (!runtime.appBaseUrl && !runtime.nextAuthUrl) {
      violations.push(
        "Neither APP_BASE_URL nor NEXTAUTH_URL is configured for a deployed runtime.",
      );
    }
  }

  // Vercel_ENV=preview but APP_ENV explicitly overrides to a persistent env
  const configuredAppEnv = safeReadOptional(processEnv.APP_ENV)?.toLowerCase();
  const vercelEnv = safeReadOptional(processEnv.VERCEL_ENV)?.toLowerCase();
  const vercelTargetEnv = safeReadOptional(
    processEnv.VERCEL_TARGET_ENV,
  )?.toLowerCase();

  if (
    vercelEnv === "preview" &&
    vercelTargetEnv === null &&
    (configuredAppEnv === "stage" || configuredAppEnv === "prod")
  ) {
    violations.push(
      `APP_ENV=${configuredAppEnv} is incompatible with VERCEL_ENV=preview on a non-custom-environment deployment. The runtime is classified as preview.`,
    );
  }

  // Acceptance env must align with VERCEL_TARGET_ENV
  if (
    runtime.isAcceptance &&
    vercelTargetEnv !== null &&
    vercelTargetEnv !== "acceptance"
  ) {
    violations.push(
      `Environment classified as acceptance but VERCEL_TARGET_ENV=${vercelTargetEnv}.`,
    );
  }

  return violations;
}

/**
 * Resolves the canonical deployment identity for the current runtime.
 *
 * Safe to call from any server context. Never throws — returns best-effort
 * metadata even when configuration is incomplete.
 */
export function resolveDeploymentIdentity(
  processEnv: NodeJS.ProcessEnv = process.env,
): DeploymentIdentity {
  const runtime = getRuntimeEnvironment({
    ...processEnv,
    NODE_ENV: processEnv.NODE_ENV ?? "development",
  });

  const databaseUrl = safeReadOptional(processEnv.DATABASE_URL);
  const databaseHost = extractDatabaseHost(databaseUrl ?? undefined);
  const databaseName = extractDatabaseName(databaseUrl ?? undefined);
  const databaseFingerprint = buildDatabaseFingerprint(databaseHost, databaseName);

  const identityViolations = computeIdentityViolations(runtime, processEnv);
  const identityValid: IdentityValidationStatus =
    identityViolations.length === 0 ? "PASS" : "FAIL";

  return {
    commitSha: safeReadOptional(processEnv.VERCEL_GIT_COMMIT_SHA),
    commitRef: safeReadOptional(processEnv.VERCEL_GIT_COMMIT_REF),
    deploymentId: safeReadOptional(processEnv.VERCEL_DEPLOYMENT_ID),
    deploymentUrl: safeReadOptional(processEnv.VERCEL_URL),
    vercelEnv: runtime.vercelEnv,
    vercelTargetEnv: runtime.vercelTargetEnv,

    appEnvironment: getPublicEnvironmentLabel(runtime.appEnv),
    appEnvRaw: runtime.appEnv,
    isDeployed: runtime.isDeployed,

    databaseHost,
    databaseFingerprint,

    authConfigured: {
      hasNextAuthSecret: runtime.hasNextAuthSecret,
      hasDatabaseUrl: runtime.hasDatabaseUrl,
      hasNextAuthUrl: Boolean(runtime.nextAuthUrl),
      hasAppBaseUrl: Boolean(runtime.appBaseUrl),
    },

    identityValid,
    identityViolations,
  };
}
